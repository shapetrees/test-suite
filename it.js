#!/usr/bin/env node

/**
 * experiments with ShapeTree loaders and iterators
 */

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
          const body = await Fs.promises.readFile(path + '.jsonld', 'utf8')
          return {
            text: function () {
              return Promise.resolve(body)
            }
          }
        },
        null
        ]

class RemoteResource {
  constructor (url) {
    if (!(url instanceof URL)) throw Error(`url ${url} must be an instance of URL`);
    this.url = url // step in a ShapeTree
    this.prefixes = {};
    this.graph = new N3.Store();
    // this.ready = this.fetch()
  }

  async fetch () {
    const resp = await Fetch(this.url)
    const text = await resp.text()
    // const tree = JSON.parse(text) // if it's JSON, we can shortcut the graph parser
    this.graph.addQuads(await Jsonld.toRDF(JSON.parse(text), {
      base: this.url.href,
      documentLoader: async (urlString, options) => {
        const docString = noHash(new URL(urlString)).href
        if (RemoteShapeTree.cache) {
          if (!(docString in RemoteShapeTree.cache))
            RemoteShapeTree.cache[docString] = new Promise(async (acc, rej) => {
              acc(fetchDoc())
            })
          const document = await RemoteShapeTree.cache[docString]
          return { contextUrl: null, document, documentUrl: urlString }
        } else {
          const document = await fetchDoc()
          return { contextUrl: null, document, documentUrl: urlString }
        }

        async function fetchDoc () {
          console.warn(`documentHandler.load ${docString}`)
          let document = null
          if (UseHTTP) {
            document = (await LdLibraryDocumentLoader(docString, options)).document
          } else {
            const resp = await Fetch(new URL(docString))
            document = await resp.text()
          }
          // console.warn(`documentHandler loaded ${docString}`)
          return document
        }
      }
    }))
  }
}

/* Parse and index a RemoteShapeTree. url should be an @id in the JSONLD.
 */
class RemoteShapeTree extends RemoteResource {
  constructor (url) {
    super(url)
    this.ids = {} // @id index for entire ShapeTree
  }

  static async get (url) {
    const docString = noHash(url).href
    if (RemoteShapeTree.cache && docString in RemoteShapeTree.cache)
      return RemoteShapeTree.cache[docString]
    const ret = await new RemoteShapeTree(url).fetch()
    if (RemoteShapeTree.cache)
      RemoteShapeTree.cache[docString] = ret
    return ret
  }

  async fetch () {
    console.warn(`new RemoteShapeTree.load ${this.url.href}`)
    await super.fetch()
    const tree = await this.parse()
    this.indexStep(tree)
    return this
  }

  indexStep (step) {
    this.ids[step['@id'].href] = step
    if ('contents' in step)
      step.contents.forEach(child => this.indexStep(child))
  }

  walkReferencedTrees (from, via = []) {
    const _RemoteShapeTree = this
    return generate(from, via)

    // js generator function
    async function *generate (from, via = []) {
      const queue = _RemoteShapeTree.ids[from.href].references || []
      for (let at = 0; at < queue.length; ++at) {
        const reference = queue[at]
        yield Promise.resolve({ reference, via })
        const stepName = reference['treeStep']

        // some links may be URLs out of this RemoteShapeTree
        if (noHash(stepName).href === noHash(_RemoteShapeTree.url).href) {
          // in-tree link to recursively call this generator
          yield *generate(stepName, via.concat(reference))
        } else {
          // parse a new RemoteShapeTree
          const t = await RemoteShapeTree.get(stepName)
          const it = t.walkReferencedTrees(stepName, via.concat(reference))

          // walk its iterator responses
          let iterResponse
          while (!(iterResponse = await it.next()).done)
            yield iterResponse.value
        }
      }
    }
  }

  async parse () {
    const _RemoteShapeTree = this
    const p1 = new Promise((acc, rej) => {
      setTimeout(() => acc(5), 200)
    })
    const contents = namedNode(Ns.tree + 'contents')
    const root = this.graph.getQuads(null, contents, null).find(
      q => this.graph.getQuads(null, contents, q.subject).length === 0
    ).subject

    const str = sz => one(sz).value
    const sht = sz => new URL(one(sz).value)
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
        const byPredicate = _RemoteShapeTree.graph.getQuads(s, null, null).reduce((acc, q) => {
          const p = q.predicate.value
          if (!(p in acc))
            acc[p] = []
          acc[p].push(q.object)
          return acc
        }, {})
        const ret = includeId
              ? {'@id': new URL(s.value)}
              : {}
        return rules.reduce((acc, rule) => {
          const p = rule.predicate
          if (p in byPredicate)
            acc[rule.attr] = rule.f(byPredicate[p])
          return acc
        }, ret)
      })
    }

    // handy function, not currently used
    function shorten999 (urlStr) {
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
      if (new URL(_RemoteShapeTree.url.href).host === new URL(urlStr).host) // https://github.com/stevenvachon/relateurl/issues/28
        return Relateurl.relate(_RemoteShapeTree.url.href, urlStr, { output: Relateurl.ROOT_PATH_RELATIVE })
      return urlStr
    }
  }

}

function noHash (url) {
  const u = url.href
  return new URL(u.substr(0, u.length - url.hash.length))
}

async function test (from) {
  const st = await RemoteShapeTree.get(from)
  const it = st.walkReferencedTrees(from)
  const result = []

  // here are two ways to iterate the responses:
  if (true) {
    // `for await` idiom hides .done check and dereferences .value
    for await (const answer of it)
      result.push(answer)
  } else {
    let iterResponse
    while (!(iterResponse = await it.next()).done)
      result.push(iterResponse.value)
  }
  return { from, result }
}

RemoteShapeTree.cache = {} // allow RemoteShapeTree to load resources once.
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
  console.log(JSON.stringify(t.result, null, 2))
  return t.result.map(renderAnswer)
}
function renderAnswer (answer) {
  if (false)
  console.log(
    answer//.step.treeStep, answer.via.map(v => v.treeStep)
  )
  return answer
}
