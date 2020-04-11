function FootprintFunctions (fileSystem) {

const Path = require('path');
const Fetch = require('node-fetch');
const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const C = require('./constants');
const UriTemplate = require('uri-template-lite').URI.Template;
const ShExCore = require('@shexjs/core')
const ShExParser = require('@shexjs/parser')
const RExtra = require('../util/rdf-extra')

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


/** LocalResource - a resource that has a nominal directory but is always resolved by a filesystem path
 * https://github.com/mgtitimoli/await-mutex
 */
class LocalResource {
  constructor (url, path) {
    if (!(url instanceof URL)) throw Error(`url ${url} must be an instance of URL`);
    this.url = url.href;
    this.prefixes = {};
    this.graph = null;
    this.path = path;
    this._mutex = new Mutex()
  }

  async serialize () {
    return await RExtra.serializeTurtle(this.graph, this.url, this.prefixes)
  }

}

/** LocalContainer - a local LDP-C
 */
class LocalContainer extends LocalResource {
  constructor (rootUrl, urlPath, title, footprintUrl, footprintInstancePath) {
    if (!(rootUrl instanceof URL))
      throw Error(`rootUrl ${rootUrl} must be an instance of URL`);
    if (!(rootUrl.pathname.endsWith('/')))
      throw Error(`rootUrl ${rootUrl} must end with '/'`);
    if (footprintUrl && !(footprintUrl instanceof URL))
      throw Error(`footprintUrl ${footprintUrl} must be an instance of URL`);

    super(new URL(urlPath, rootUrl), urlPath);
    this.graph = new N3.Store();
    this.subdirs = [];

    this.finish = async () => {
      // if (!await fileSystem.exists(this.path)) \__ %%1: yields so even in one thread, someone else can always mkdir first
      //   await fileSystem.mkdir(this.path);     /   Solid needs a transactions so folks don't trump each other's Containers
      const unlock = await this._mutex.lock();
      this.newDir = await fileSystem.ensureDir(this.path);
      try {
        const text = await fileSystem.readContainer(this.path)
        const g = await RExtra.parseTurtle(text, this.url, this.prefixes)
        this.graph.addQuads(g.getQuads());
      } catch (e) {
        /* istanbul ignore next */ if (e.code !== 'ENOENT') throw e;
        const c = makeContainer(title, footprintUrl, footprintInstancePath, this.prefixes);
        const s = await RExtra.parseTurtle(c, this.url, this.prefixes)
        this.graph.addQuads(s.getQuads());
        const container = await RExtra.serializeTurtle(this.graph, this.url, this.prefixes);
        await fileSystem.writeContainer(this.path, container);
      }
      unlock();
      return /*this*/ new Promise((acc, rej) => { // !!DELME sleep for a bit to surface bugs
        setTimeout(() => {
          acc(this)
        }, 20);
      });

      function makeContainer (title, footprintUrl, footprintInstancePath, prefixes) {
        Object.assign(prefixes, {
          ldp: C.ns_ldp,
          xsd: C.ns_xsd,
          foot: C.ns_foot,
          dc: C.ns_dc,
        });
        const footprintTriple = footprintUrl
              ? ` ;
   foot:footprintRoot <${footprintUrl.href}> ;
   foot:footprintInstancePath "${footprintInstancePath}" ;
   foot:footprintInstanceRoot <${Path.relative(footprintInstancePath, '')}>` : '';
        return `
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix foot: <${C.ns_foot}>.

<>
   a ldp:BasicContainer ;
   dcterms:title "${title}"${footprintTriple} .
`
      }

    }
  }

  async fetch () {
    const unlock = await this._mutex.lock();
    const text = await fileSystem.readContainer(this.path).then(
      x => { unlock(); return x; },
      e => /* istanbul ignore next */ { unlock(); throw e; }
    );
    this.graph = await RExtra.parseTurtle(text, this.url, this.prefixes);
    return this
  }

  async write () {
    const text = await this.serialize();
    const unlock = await this._mutex.lock();
    await fileSystem.writeContainer(this.path, text).then(
      x => { unlock(); return x; },
      e => /* istanbul ignore next */ { unlock(); throw e; }
    );
    return this
  }

  async remove () {
    const unlock = await this._mutex.lock();
    return fileSystem.remove(this.path).then(
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
    const g2 = payload instanceof N3.Store ? payload : await RExtra.parseTurtle(payload, base, {});
    this.graph.addQuads(g2.getQuads());
    return this
  }

  addMember (location, footprintUrl) {
    this.graph.addQuad(namedNode(this.url), namedNode(C.ns_ldp + 'contains'), namedNode(location));
    return this
  }

  removeMember (location, footprintUrl) {
    this.graph.removeQuad(namedNode(this.url), namedNode(C.ns_ldp + 'contains'), namedNode(location));
    return this
  }

  indexInstalledFootprint (location, footprintUrl) {
    this.graph.addQuad(namedNode(location), namedNode(C.ns_foot + 'footprintRoot'), namedNode(footprintUrl.href));
    return this
  }

  reuseFootprint (footprint) {
    const q = expectOne(this.graph, null, namedNode(C.ns_foot + 'footprintRoot'), namedNode(footprint.url.href), true);
    return q ? q.subject.value : null;
  }

  async getRootedFootprint (cacheDir) {
    const path = expectOne(this.graph, namedNode(this.url), namedNode(C.ns_foot + 'footprintInstancePath'), null).object.value;
    const root = expectOne(this.graph, namedNode(this.url), namedNode(C.ns_foot + 'footprintRoot'), null).object.value;
    return new RemoteFootprint(new URL(root), cacheDir, path.split(/\//))
  }
}

class RemoteResource {
  constructor (url, cacheDir) {
    if (!(url instanceof URL)) throw Error(`url ${url} must be an instance of URL`);
    this.url = url;
    this.prefixes = {};
    this.graph = null;
    this.cacheDir = cacheDir;
    this.cachePath = Path.join(cacheDir, cacheName(url.href));
  }

  async fetch () {
    let text, mediaType;
    if (!await fileSystem.exists(this.cachePath)) {
      // The first time this url was seen, put the mime type and payload in the cache.

      const resp = await Fetch(this.url.href);
      text = await resp.text();
      if (!resp.ok)
        throw Error(`GET ${this.url.href} returned ${resp.status} ${resp.statusText}\n${text}`);
      mediaType = resp.headers.get('content-type').split(/ *;/)[0];

      // Is there any real return on treating the cacheDir as a Container?
      await fileSystem.write(this.cachePath, `${mediaType}\n\n${text}`)
    } else {
      // Pull mime type and payload from cache.

      const cache = await fileSystem.read(this.cachePath);
      [mediaType, text] = cache.match(/([^\n]+)\n\n(.*)/s).slice(1);
    }
    /* istanbul ignore next */switch (mediaType) {
      case 'application/ld+json':
      // parse the JSON-LD into n-triples
      this.graph = await RExtra.parseJsonLd(text, this.url.href);
      break;
      case 'text/turtle':
      /* istanbul ignore next */this.graph = await RExtra.parseTurtle (text, this.url.href, this.prefixes);
      /* istanbul ignore next */break;
      /* istanbul ignore next */
      default:
      throw Error(`unknown media type ${mediaType} when parsing ${this.url.href}`)
    }
    return this
  }
}

/** reference to a footprint stored remotely
 *
 * @param url: URL string locating footprint
 * @param path: refer to a specific node in the footprint hierarchy
 *
 * A footprint has contents:
 *     [] a rdf:FootprintRoot, ldp:BasicContainer ; foot:contents
 *
 * The contents may be ldp:Resources:
 *         [ a ldp:Resource ;
 *           foot:uriTemplate "{labelName}.ttl" ;
 *           foot:shape gh:LabelShape ] ],
 * or ldp:Containers, which may either have
 * n nested static directories:
 *         [ a ldp:BasicContainer ;
 *           rdfs:label "repos" ;
 *           foot:contents ... ] ,
 *         [ a ldp:BasicContainer ;
 *           rdfs:label "users" ;
 *           foot:contents ... ]
 * or one dynamically-named member:
 *         [ a ldp:BasicContainer ;
 *           foot:uriTemplate "{userName}" ;
 *           foot:shape gh:PersonShape ;
 *           foot:contents ]
 */
class RemoteFootprint extends RemoteResource {
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
      const cqz = this.graph.getQuads(node, namedNode(C.ns_foot + 'contents'), null);
      // Find the element which either
      return cqz.find(
        q =>
          // matches the current label in the path
        this.graph.getQuads(q.object, namedNode(C.ns_rdfs + 'label'), literal(name)).length === 1
          ||
          // or has a uriTemplate (so it should be the sole element in the contents)
        this.graph.getQuads(q.object, namedNode(C.ns_foot + 'uriTemplate'), null).length === 1
      ).object
    }, namedNode(this.url.href));
  }

  /** firstChild - return the first contents.
   * @returns: { type, name, uriTemplate, shape, contents }
   */
  matchingStep (footprintNode, slug) {
    const contents = this.graph.getQuads(footprintNode, namedNode(C.ns_foot + 'contents'))
          .map(q => q.object);
    const choices = contents
          .filter(
            step => !slug ||
              new UriTemplate(
                this.graph.getQuads(step, namedNode(C.ns_foot + 'uriTemplate'))
                  .map(q2 => q2.object.value)[0]
              ).match(slug)
          );
    if (choices.length === 0)
      throw new RExtra.UriTemplateMatchError(slug, [], `No match in ${contents.map(t => t.value).join(', ')}`);
    /* istanbul ignore if */
    if (choices.length > 1) // @@ Could have been caught by static analysis of footprint.
      throw new RExtra.UriTemplateMatchError(slug, [], `Ambiguous match against ${contents.map(t => t.value).join(', ')}`);
    const g = this.graph;
    const typeNode = obj('type')
    const ret = {
      node: choices[0],
      typeNode: typeNode,
      name: obj('name'),
      uriTemplate: obj('uriTemplate'),
      shape: obj('shape'),
      contents: this.graph.getQuads(choices[0], C.ns_foot + 'contents', null).map(t => t.object)
    };
    /* istanbul ignore else */ if (typeNode)
      ret.type = typeNode.value.replace(C.ns_ldp, '');
    return ret;

    function obj (property) {
      const q = expectOne(g, choices[0], namedNode(C.ns_foot + property), null, true);
      return q ? q.object : null;
    }
  }


  /** instantiateStatic - make all containers implied by the footprint.
   * @param {RDFJS.Store} footprintGraph - context footprint in an RDF Store.
   * @param {RDFJS node} stepNode - subject of ldp:contents arcs of the LDP-Cs to be created.
   * @param {URL} rootUrl - root of the resource hierarchy (path === '/')
   * @param {string} resourcePath - filesystem path, e.g. "Share/AppStore1/repos/someOrg/someRepo"
   * @param {URL} footprintUrl - URL of context footprint
   * @param {string} pathWithinFootprint. e.g. "repos/someOrg/someRepo"
   */
  async instantiateStatic (stepNode, rootUrl, resourcePath, pathWithinFootprint, parent) {
    const ret = await new LocalContainer(rootUrl, resourcePath + Path.sep,
                                         `index for nested resource ${pathWithinFootprint}`,
                                         this.url, pathWithinFootprint).finish();
    try {
      parent.addMember(new URL('/' + resourcePath, rootUrl).href, stepNode.url);
      ret.addSubdirs(await Promise.all(this.graph.getQuads(stepNode, C.ns_foot + 'contents', null).map(async t => {
        const nested = t.object;
        const labelT = expectOne(this.graph, nested, namedNode(C.ns_rdfs + 'label'), null, true);
        if (!labelT)
          return;
        const toAdd = labelT.object.value;
        const step = new RemoteFootprint(this.url, this.cacheDir, Path.join(pathWithinFootprint, toAdd));
        step.graph = this.graph;
        return await step.instantiateStatic(nested, rootUrl, Path.join(resourcePath, toAdd), step.path, ret);
      })));
      parent.write(); // returns a promise
      return ret
    } catch (e) {
      await ret.remove(); // remove the Container
      parent.removeMember(new URL('/' + resourcePath, rootUrl).href, stepNode.url);
      if (e instanceof RExtra.ManagedError)
        throw e;
      throw new RExtra.FootprintStructureError(rootUrl.href, e.message);
    }
  }

  async validate (shape, mediaType, text, base, node) {
    const prefixes = {};
    const payloadGraph = mediaType === 'text/turtle'
          ? await RExtra.parseTurtle(text, base.href, prefixes)
          : await RExtra.parseJsonLd(text, base.href);

    // shape is a URL with a fragement. shapeBase is that URL without the fragment.
    const shapeBase = new URL(shape);
    shapeBase.hash = '';
    let schemaResp = await Fetch(shapeBase); // throws if unresolvable
    if (!schemaResp.ok) // throws on 404
      throw new RExtra.NotFoundError(shape, 'schema', await schemaResp.text())
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
      throw new RExtra.MissingShapeError(shape, e.message);
    }
    if ('errors' in res)
      throw new RExtra.ValidationError(node, shape, ShExCore.Util.errsToSimple(res).join('\n'));
  }
}

function parseInstatiationPayload (graph) {
  const stomped = expectOne(graph, null, namedNode(C.ns_ldp + 'app'), null).object;
  const name = expectOne(graph, stomped, namedNode(C.ns_ldp + 'name'), null).object;
  return {
    stomped: stomped.value,
    name: name.value
  };
}


/** Utility functions and classes visible only in this module
 */

function expectOne (g, s, p, o, nullable = false) {

  // Throw if s, p or o is an invalid query parameter.
  // This is fussier than N3.js.
  const rendered = ([s, p, o]).map(RExtra.renderRdfTerm).join(' ')

  const res = g.getQuads(s, p, o);
  if (res.length === 0) {
    if (nullable)
      return null;
    throw Error(`no matches for { ${rendered} }`);
  }
  if (res.length > 1)
    throw Error(`expected one answer to { ${rendered} }; got ${res.length}`);
  return res[0];
}

function cacheName (url) {
  return url.replace(/[^a-zA-Z0-9_-]/g, '');
}

  const fsHash = fileSystem.hashCode();
  if (FootprintFunctions[fsHash])
    return FootprintFunctions[fsHash];

  return FootprintFunctions[fsHash] = {
    local: LocalResource,
    remote: RemoteResource,
    remoteFootprint: RemoteFootprint,
    localContainer: LocalContainer,
    parseInstatiationPayload
  }
}

module.exports = FootprintFunctions;
