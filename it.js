#!/usr/bin/env node

const Fs = require('fs')
const Path = require('path')
const Jsonld = require('jsonld')
const Base = new URL('http://a.example/')

/* simulate fetch by reading from a filesystem relative path
 */
async function Fetch (url) {
  const path = url.pathname.substr(1)
  console.warn(`read ${path}`)
  return await Fs.promises.readFile(path + '.jsonld')
}

/* Parse and index a ShapeTree. url should be an @id in the JSONLD.
 */
class ShapeTree {
  constructor (url) {
    this.url = url // step in a ShapeTree
    this.ids = {} // @id index for entire ShapeTree
    this.ready = load.call(this) // promise to say we've loaded url

    async function load () {
      const tree = JSON.parse(await Fetch(this.url))
      this.indexStep(tree)
      return this
    }
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
          const t = await new ShapeTree(new URL(rel, _ShapeTree.url)).ready
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
}

async function test (from) {
  const st = await new ShapeTree(from).ready
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

// a stand-alone and a split out ShapeTree
const Tests = [
  new URL('solidApps/staticRoot/gh-flat/gh-flat-ShapeTree#org', Base),
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
