/** ShapeTree - simple structure to associate resource hiearchies with shapes and media types
 *
 * This library provides:
 *   ManagedContainer - an LDPC under ShapeTree control
 *   RemoteShapeTree - a parsed ShapeTree structure
 */

function ShapeTreeFunctions (fileSystem, rdfInterface) {

const Path = require('path');
const Fetch = require('node-fetch');
const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const C = require('./constants');
const UriTemplate = require('uri-template-lite').URI.Template;
const ShExCore = require('@shexjs/core')
const ShExParser = require('@shexjs/parser')

class Mutex {
  constructor() {
    this._locking = Promise.resolve();
    this._locks = 0;
  }

  lock () {
    this._locks += 1;
    let unlockNext;
    let willLock = new Promise(resolve => unlockNext = () => {
      this._locks -= 1;
      resolve();
    });
    let willUnlock = this._locking.then(() => unlockNext);
    this._locking = this._locking.then(() => willLock);
    return willUnlock;
  }
}


/** ManagedContainer - an LDPC with shapeTrees
 */
class ManagedContainer {
  constructor (url, title, shapeTreeUrl = null, shapeTreeInstancePath = null) {
    if (!(url instanceof URL))
      throw Error(`url ${url} must be an instance of URL`);
    if (!(url.pathname.endsWith('/')))
      throw Error(`url ${url} must end with '/'`);
    if (url.pathname.endsWith('//'))
      throw Error(`url ${url} ends with '//'`);
    if (shapeTreeUrl && !(shapeTreeUrl instanceof URL))
      throw Error(`shapeTreeUrl ${shapeTreeUrl} must be an instance of URL`);
    this.url = url;
    this,shapeTreeUrl = shapeTreeUrl;
    this.shapeTreeInstancePath = shapeTreeInstancePath;
    this.shapeTreeInstanceRoot = null;
    if (this.shapeTreeInstancePath)
      this.shapeTreeInstanceRoot = new URL(Path.relative(shapeTreeInstancePath, ''), shapeTreeUrl);
    this.prefixes = {};
    this._mutex = new Mutex()
    this.graph = new N3.Store();
    this.subdirs = [];

    this.finish = async () => {
      // if (!await fileSystem.exists(this.path)) \__ %%1: yields so even in one thread, someone else can always mkdir first
      //   await fileSystem.mkdir(this.path);     /   Solid needs a transactions so folks don't trump each other's Containers
      const unlock = await this._mutex.lock();
      const [newDir, containerGraph] = await fileSystem.ensureContainer(this.url, this.prefixes, title);
      this.graph.addQuads(containerGraph.getQuads());
      if (newDir && shapeTreeUrl) {
        const c = containerText(title, shapeTreeUrl, shapeTreeInstancePath, this.prefixes);
        const s = await rdfInterface.parseTurtle(c, this.url, this.prefixes)
        this.graph.addQuads(s.getQuads());
        await fileSystem.writeContainer(this.graph, this.url, this.prefixes);
      } else {
        this.shapeTreeInstanceRoot = asUrl('shapeTreeInstanceRoot');
        this.shapeTreeInstancePath = asLiteral('shapeTreeInstancePath');
        this.shapeTreeUrl = asUrl('shapeTreeRoot');

        function asUrl (p) {
          const ret = rdfInterface.zeroOrOne(containerGraph, namedNode(url.href), namedNode(C.ns_tree + p), null);
          return ret ? new URL(ret.object.value) : null;
        }

        function asLiteral (p) {
          const ret = rdfInterface.zeroOrOne(containerGraph, namedNode(url.href), namedNode(C.ns_tree + p), null);
          return ret ? ret.object.value : null;
        }
      }
      unlock();
      return /*this*/ new Promise((acc, rej) => { // !!DELME sleep for a bit to surface bugs
        setTimeout(() => {
          acc(this)
        }, 20);
      });

      function containerText (title, shapeTreeUrl, shapeTreeInstancePath, prefixes) {
        return `
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix tree: <${C.ns_tree}>.

<>
   tree:shapeTreeRoot <${shapeTreeUrl.href}> ;
   tree:shapeTreeInstancePath "${shapeTreeInstancePath}" ;
   tree:shapeTreeInstanceRoot <${Path.relative(shapeTreeInstancePath, '')}> .
`
      }

    }
  }

  async write () {
    const unlock = await this._mutex.lock();
    await fileSystem.writeContainer(this.graph, this.url, this.prefixes).then(
      x => { unlock(); return x; },
      e => /* istanbul ignore next */ { unlock(); throw e; }
    );
    return this
  }

  async remove () {
    const unlock = await this._mutex.lock();
    return fileSystem.removeContainer(this.url).then(
      x => { unlock(); return x; },
      e => /* istanbul ignore next */ { unlock(); throw e; }
    );
  }

  addSubdirs (addUs) {
    this.subdirs.push(...addUs);
    return this
  }

  async merge (payload, base) {
    // istanbul ignore next
    const g2 = payload instanceof N3.Store ? payload : await rdfInterface.parseTurtle(payload, base, this.prefixes);
    this.graph.addQuads(g2.getQuads());
    return this
  }

  addMember (location, shapeTreeUrl) {
    this.graph.addQuad(namedNode(this.url.href), namedNode(C.ns_ldp + 'contains'), namedNode(location));
    return this
  }

  removeMember (location, shapeTreeUrl) {
    this.graph.removeQuad(namedNode(this.url.href), namedNode(C.ns_ldp + 'contains'), namedNode(location));
    return this
  }

  async getRootedShapeTree (cacheDir) {
    const path = rdfInterface.one(this.graph, namedNode(this.url.href), namedNode(C.ns_tree + 'shapeTreeInstancePath'), null).object.value;
    const root = rdfInterface.one(this.graph, namedNode(this.url.href), namedNode(C.ns_tree + 'shapeTreeRoot'), null).object.value;
    return new RemoteShapeTree(new URL(root), cacheDir, path.split(/\//))
  }
}

class RemoteResource {
  constructor (url, cacheDir) {
    if (!(url instanceof URL)) throw Error(`url ${url} must be an instance of URL`);
    this.url = url;
    this.prefixes = {};
    this.graph = null;
    this.cacheDir = cacheDir;
    this.cachePath = Path.join('/', cacheDir, cacheName(url.href));
  }

  async fetch () {
    let text, mediaType;
    if (!await fileSystem.exists(new URL(this.cachePath, this.url))) {
      // The first time this url was seen, put the mime type and payload in the cache.

      const resp = await Fetch(this.url.href);
      if (!resp.ok)
        throw await rdfInterface.makeHttpError('GET', this.url.href, 'schema', resp);
      text = await resp.text();
      mediaType = resp.headers.get('content-type').split(/ *;/)[0];

      // Is there any real return on treating the cacheDir as a Container?
      await fileSystem.write(new URL(this.cachePath, this.url), `${mediaType}\n\n${text}`);
    } else {
      // Pull mime type and payload from cache.

      const cache = await fileSystem.read(new URL(this.cachePath, this.url));
      [mediaType, text] = cache.match(/([^\n]+)\n\n(.*)/s).slice(1);
    }
    /* istanbul ignore next */switch (mediaType) {
      case 'application/ld+json':
      // parse the JSON-LD into n-triples
      this.graph = await rdfInterface.parseJsonLd(text, this.url);
      break;
      case 'text/turtle':
      /* istanbul ignore next */this.graph = await rdfInterface.parseTurtle (text, this.url, this.prefixes);
      /* istanbul ignore next */break;
      /* istanbul ignore next */
      default:
      throw Error(`unknown media type ${mediaType} when parsing ${this.url.href}`)
    }
    return this
  }
}

/** reference to a ShapeTree stored remotely
 *
 * @param url: URL string locating ShapeTree
 * @param path: refer to a specific node in the ShapeTree hierarchy
 *
 * A ShapeTree has contents:
 *     [] a rdf:ShapeTreeRoot, ldp:BasicContainer ; tree:contents
 *
 * The contents may be ldp:Resources:
 *         [ a ldp:Resource ;
 *           tree:uriTemplate "{labelName}.ttl" ;
 *           tree:shape gh:LabelShape ] ],
 * or ldp:Containers, which may either have
 * n nested static directories:
 *         [ a ldp:BasicContainer ;
 *           rdfs:label "repos" ;
 *           tree:contents ... ] ,
 *         [ a ldp:BasicContainer ;
 *           rdfs:label "users" ;
 *           tree:contents ... ]
 * or one dynamically-named member:
 *         [ a ldp:BasicContainer ;
 *           tree:uriTemplate "{userName}" ;
 *           tree:shape gh:PersonShape ;
 *           tree:contents ]
 */
class RemoteShapeTree extends RemoteResource {
  constructor (url, cacheDir, path = []) {
    super(url, cacheDir);
    this.path = path
  }

  /** getRdfRoot - Walk through the path elements to find the target node.
   */
  getRdfRoot () {
    return this.path.reduce((node, name) => {
      if (name === '.')
        return node;
      // Get the contents of the node being examined
      const cqz = this.graph.getQuads(node, namedNode(C.ns_tree + 'contents'), null);
      // Find the element which either
      return cqz.find(
        q =>
          // matches the current label in the path
        this.graph.getQuads(q.object, namedNode(C.ns_rdfs + 'label'), literal(name)).length === 1
          ||
          // or has a uriTemplate (so it should be the sole element in the contents)
        this.graph.getQuads(q.object, namedNode(C.ns_tree + 'uriTemplate'), null).length === 1
      ).object
    }, namedNode(this.url.href));
  }

  /** firstChild - return the first contents.
   * @returns: { type, name, uriTemplate, shape, contents }
   */
  matchingStep (shapeTreeNode, slug) {
    const contents = this.graph.getQuads(shapeTreeNode, namedNode(C.ns_tree + 'contents'))
          .map(q => q.object);
    const choices = contents
          .filter(
            step => !slug ||
              new UriTemplate(
                this.graph.getQuads(step, namedNode(C.ns_tree + 'uriTemplate'))
                  .map(q2 => q2.object.value)[0]
              ).match(slug)
          );
    if (choices.length === 0)
      throw new rdfInterface.UriTemplateMatchError(slug, [], `No match in ${contents.map(t => t.value).join(', ')}`);
    /* istanbul ignore if */
    if (choices.length > 1) // @@ Could have been caught by static analysis of ShapeTree.
      throw new rdfInterface.UriTemplateMatchError(slug, [], `Ambiguous match against ${contents.map(t => t.value).join(', ')}`);
    const g = this.graph;
    const typeNode = obj('expectedType')
    const ret = {
      node: choices[0],
      typeNode: typeNode,
      name: obj('name'),
      uriTemplate: obj('uriTemplate'),
      shape: obj('shape'),
      contents: this.graph.getQuads(choices[0], C.ns_tree + 'contents', null).map(t => t.object)
    };
    /* istanbul ignore else */ if (typeNode)
      ret.type = typeNode.value.replace(C.ns_ldp, '');
    return ret;

    function obj (property) {
      const q = rdfInterface.zeroOrOne(g, choices[0], namedNode(C.ns_tree + property), null);
      return q ? q.object : null;
    }
  }


  /** instantiateStatic - make all containers implied by the ShapeTree.
   * @param {RDFJS.Store} shapeTreeGraph - context ShapeTree in an RDF Store.
   * @param {RDFJS node} stepNode - subject of ldp:contents arcs of the LDP-Cs to be created.
   * @param {URL} rootUrl - root of the resource hierarchy (path === '/')
   * @param {string} resourcePath - filesystem path, e.g. "Share/AppStore1/repos/someOrg/someRepo"
   * @param {URL} shapeTreeUrl - URL of context ShapeTree
   * @param {string} pathWithinShapeTree. e.g. "repos/someOrg/someRepo"
   */
  async instantiateStatic (stepNode, rootUrl, resourcePath, pathWithinShapeTree, parent) {
    const ret = await new ManagedContainer(new URL(resourcePath, rootUrl),
                                           `index for nested resource ${pathWithinShapeTree}`,
                                           this.url, pathWithinShapeTree).finish();
    try {
      parent.addMember(ret.url.href, stepNode.url);
      ret.addSubdirs(await Promise.all(this.graph.getQuads(stepNode, C.ns_tree + 'contents', null).map(async t => {
        const nested = t.object;
        const labelT = rdfInterface.zeroOrOne(this.graph, nested, namedNode(C.ns_rdfs + 'label'), null);
        if (!labelT)
          return;
        const toAdd = labelT.object.value;
        const step = new RemoteShapeTree(this.url, this.cacheDir, Path.join(pathWithinShapeTree, toAdd));
        step.graph = this.graph;
        return await step.instantiateStatic(nested, rootUrl, Path.join(resourcePath, toAdd, '/'), step.path, ret);
      })));
      parent.write(); // returns a promise
      return ret
    } catch (e) {
      await ret.remove(); // remove the Container
      parent.removeMember(ret.url.href, stepNode.url);
      if (e instanceof rdfInterface.ManagedError)
        throw e;
      throw new rdfInterface.ShapeTreeStructureError(rootUrl.href, e.message);
    }
  }

  async validate (shape, mediaType, text, base, node) {
    const prefixes = {};
    const payloadGraph = mediaType === 'text/turtle'
          ? await rdfInterface.parseTurtle(text, base, prefixes)
          : await rdfInterface.parseJsonLd(text, base);

    // shape is a URL with a fragement. shapeBase is that URL without the fragment.
    const shapeBase = new URL(shape);
    shapeBase.hash = '';
    let schemaResp = await Fetch(shapeBase); // throws if unresolvable
    if (!schemaResp.ok) // throws on 404
      throw new rdfInterface.NotFoundError(shape, 'schema', await schemaResp.text())
    const schemaType = schemaResp.headers.get('content-type');
    const schemaPrefixes = {}
    const schema = ShExParser.construct(shapeBase.href, schemaPrefixes, {})
          .parse(await schemaResp.text());
    const v = ShExCore.Validator.construct(schema);
    // console.warn(JSON.stringify(payloadGraph.getQuads(), null, 2))
    let res
    try {
      res = v.validate(ShExCore.Util.makeN3DB(payloadGraph), node, shape);
    } catch (e) {
      throw new rdfInterface.MissingShapeError(shape, e.message);
    }
    if ('errors' in res) {
      // We could log this helpful server-side debugging info:
      //   console.warn(ShExCore.Util.errsToSimple(res).join('\n'));
      //   console.warn(`<${node}>@<${shape}>`);
      //   console.warn(payloadGraph.getQuads().map(q => (['subject', 'predicate', 'object']).map(pos => q[pos].value).join(' ')).join('\n'));
      throw new rdfInterface.ValidationError(node, shape, ShExCore.Util.errsToSimple(res).join('\n'));
    }
  }
}

/** private function to calculate cache names.
 */
function cacheName (url) {
  return url.replace(/[^a-zA-Z0-9_-]/g, '');
}


  const fsHash = fileSystem.hashCode();
  if (ShapeTreeFunctions[fsHash])
    return ShapeTreeFunctions[fsHash];

  return ShapeTreeFunctions[fsHash] = {
    remoteShapeTree: RemoteShapeTree,
    managedContainer: ManagedContainer,
  }
}

module.exports = ShapeTreeFunctions;
