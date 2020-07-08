#!/usr/bin/env node

const Fs = require('fs')
const Relateurl = require('relateurl')
const Jsonld = require('jsonld')
const N3 = require("n3");
const { namedNode, literal, defaultGraph, quad } = N3.DataFactory;
const Ns = {
  tree: 'http://www.w3.org/ns/shapetree#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  ldp: 'http://www.w3.org/ns/ldp#',
}

const UseHTTP = false
const [Base, Fetch, LdLibraryDocumentLoader] = UseHTTP
      ? [
        new URL('http://localhost/checkouts/shapetrees/test-suite/'),
        require('node-fetch'),
        Jsonld.documentLoaders.node()
      ]
      : [
        new URL('http://a.example/'),
        // simulate fetch by reading from a filesystem relative path
        async function (url) {
          const path = url.pathname.substr(1)
          console.warn(`read ${path}`)
          const body = await Fs.promises.readFile(path + '.jsonld', 'utf8')
          return {
            text: function () {
              return Promise.resolve(body)
            }
          }
        },
        null
        ]

/* Parse and index a ShapeTree. url should be an @id in the JSONLD.
 */
class ShapeTree {
  constructor (url) {
    this.url = url // step in a ShapeTree
    this.ids = {} // @id index for entire ShapeTree
    this.ready = load.call(this) // promise to say we've loaded url

    async function load () {
      const resp = await Fetch(this.url)
      const text = await resp.text()
      // const tree = JSON.parse(text) // if it's JSON, we can shortcut the graph parser
      const tree = await ShapeTree.parse(this.url, text)
      this.indexStep(tree)
      return this
    }
  }

  static async get (url) {
    const cachename = noHash(url)
    if (ShapeTree.cache && cachename in ShapeTree.cache)
      return ShapeTree.cache[cachename]
    const ret = await new ShapeTree(url).ready
    if (ShapeTree.cache)
      ShapeTree.cache[cachename] = ret
    return ret
  }

  indexStep (step) {
    this.ids[step['@id']] = step
    if ('contents' in step)
      step.contents.forEach(child => this.indexStep(child))
  }

  walkReferences (from, via = []) {
    const _ShapeTree = this
    return generate(from, via)

    // js generator function
    async function *generate (from, via = []) {
      const queue = _ShapeTree.ids[from].references || []
      for (let at = 0; at < queue.length; ++at) {
        const step = queue[at]
        yield Promise.resolve({ step, via })
        const stepName = step['treeStep']

        // some links may be URLs out of this ShapeTree
        const urlMatch = stepName.match(/([^#]+)(#.*)/)
        if (urlMatch) {
          // parse a new ShapeTree
          const [undefined, rel, fragment] = urlMatch
          const t = await ShapeTree.get(new URL(rel, _ShapeTree.url))
          const it = t.walkReferences(fragment, via.concat(step))

          // walk its iterator responses
          let iterResponse
          while (!(iterResponse = await it.next()).done)
            yield iterResponse.value
        } else {
          // in-tree link to recursively call this generator
          yield *generate(stepName, via.concat(step))
        }
      }
    }
  }

  static async parse (node, text) {
    const g = new N3.Store()
    const p1 = new Promise((acc, rej) => {
      setTimeout(() => acc(5), 200)
    })
    g.addQuads(await Jsonld.toRDF(JSON.parse(text), {
      // format: "application/nquads",
      base: node.href,
      documentLoader: async (url, options) => {
        if (UseHTTP)
          return LdLibraryDocumentLoader(url, options)
        if (ShapeTree.cache && url in ShapeTree.cache)
          return { contextUrl: null, document: JSON.parse(ShapeTree.cache[url]), documentUrl: url }
        const resp = await Fetch(new URL(url))
        const text = await resp.text()
        if (ShapeTree.cache)
          ShapeTree.cache[url] = text // !! heterogeneous cache
        return { contextUrl: null, document: JSON.parse(text), documentUrl: url }
      }
    }))
    const contents = namedNode(Ns.tree + 'contents')
    const root = g.getQuads(null, contents, null).find(
      q => g.getQuads(null, contents, q.subject).length === 0
    ).subject
    const docUrl = noHash(node)

    const str = sz => one(sz).value
    const sht = sz => shorten(one(sz).value)
    const cnt = sz => visitStep(stepRules, sz, true)
    const ref = sz => visitStep(referenceRules, sz, false)
    const one = sz => sz.length === 1
          ? sz[0]
          : (() => {throw Error(`Expected one object, got [${sz.map(s => s.value).join(', ')}]`)})()
    const referenceRules = [
      { predicate: Ns.tree + 'treeStep'    , attr: 'treeStep'    , f: sht },
      { predicate: Ns.tree + 'shapePath'   , attr: 'shapePath'   , f: str },
    ]
    const stepRules = [
      { predicate: Ns.tree + 'expectedType', attr: 'expectedType', f: sht },
      { predicate: Ns.rdfs + 'label'       , attr: 'name'        , f: str },
      { predicate: Ns.tree + 'uriTemplate' , attr: 'uriTemplate' , f: str },
      { predicate: Ns.tree + 'shape'       , attr: 'shape'       , f: sht },
      { predicate: Ns.tree + 'contents'    , attr: 'contents'    , f: cnt },
      { predicate: Ns.tree + 'references'  , attr: 'references'  , f: ref },
    ]

    const ret = visitStep(stepRules, [root], true)[0]
    return Object.assign({"@context": "../ns/shapeTreeContext"}, ret)

    function visitStep (rules, subjects, includeId) {
      return subjects.map(s => {
        const byPredicate = g.getQuads(s, null, null).reduce((acc, q) => {
          const p = q.predicate.value
          if (!(p in acc))
            acc[p] = []
          acc[p].push(q.object)
          return acc
        }, {})
        const ret = includeId
              ? {'@id': shorten(s.value)}
              : {}
        return rules.reduce((acc, rule) => {
          const p = rule.predicate
          if (p in byPredicate)
            acc[rule.attr] = rule.f(byPredicate[p])
          return acc
        }, ret)
      })
    }

    function shorten (urlStr) {
      for (const prefix in Ns) {
        const ns = Ns[prefix]
        if (urlStr.startsWith(ns)) {
          const localname = urlStr.substr(ns.length)
          if (localname.match(/^[a-zA-Z]+$/))
            return prefix === ''
            ? localname
            : prefix + ':' + localname
        }
      }
      if (new URL(node.href).host === new URL(urlStr).host) // https://github.com/stevenvachon/relateurl/issues/28
        return Relateurl.relate(node.href, urlStr, { output: Relateurl.ROOT_PATH_RELATIVE })
      return urlStr
    }
  }

}

function noHash (url) {
  const u = url.href
  return new URL(u.substr(0, u.length - url.hash.length))
}

async function test (from) {
  const st = await ShapeTree.get(from)
  const it = st.walkReferences('#org')
  const result = []

  // here are two ways to iterate the responses:
  if (false) {
    for await (const answer of it)
      result.push(answer)
  } else {
    let iterResponse
    while (!(iterResponse = await it.next()).done)
      result.push(iterResponse.value)
  }
  return { from, result }
}

ShapeTree.cache = {} // allow ShapeTree to load resources once.
const Tests = [
  // stand-alone ShapeTree
  new URL('solidApps/staticRoot/gh-flat/gh-flat-ShapeTree#org', Base),
  // same ShapeTree split into two chunks
  new URL('solidApps/staticRoot/gh-flat/gh-flat-ShapeTree-split-org#org', Base),
]
Promise.all(Tests.map(
  u => test(u)
    // .then(renderTest)
)).then(tests => tests.forEach(renderTest))

function renderTest (t) {
  console.log(`\n--- Test ${t.from.href} ---`)
  return t.result.map(renderAnswer)
}
function renderAnswer (answer) {
  console.log(
    answer//.step.treeStep, answer.via.map(v => v.treeStep)
  )
  return answer
}
