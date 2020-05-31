const Fs = require('fs');
const Path = require('path');
const Log = require('debug')('fsPromise');
const Details = Log.extend('details');

class fsPromise {
  constructor (docRoot, indexFile, rdfInterface, encoding = 'utf8') {
    // Make sure there's only one filesystem interface for given docRoot.
    // This will need to be moved to an async function if multiple apps
    // use a filesystem to coordinate access.
    const key = docRoot;
    if (fsPromise[key])
      return fsPromise[key];

    this.docRoot = docRoot;
    this.indexFile = indexFile;
    this._rdfInterface = rdfInterface;
    this._encoding = encoding;
    fsPromise[key] = this;
    this.promises = {}; // hash[path, list[promises]]
    this._hashCode = `fsPromise(${JSON.stringify(key)})`; // Math.floor(Math.random()*2**32).toString(16); // identifies this singleton
  }

  hashCode () { return this._hashCode; }

  // Status

  /** rstat:object - Describe existing resource.
   * @returns: {
   *   isContainer - whether the resource is a Container
   * }
   * @throws: resource does not exist
   * to test for existance, use
   *     rstat(myUrl).then(stat => true, e => false)
   */
  async rstat (url) {
    const lstat = await Fs.promises.lstat(Path.join(this.docRoot, url.pathname));
    return { isContainer: lstat.isDirectory() };
  }


  // R/W/D Resources

  /** read:string - Read contents of resource.
   * @returns: contents
   * @throws: resource does not exist
   */
  async read (url) {
    return Fs.promises.readFile(Path.join(this.docRoot, url.pathname), this._encoding);
  }

  /** write:undefined - Write contents to resource.
   * @param body: contents to be written
   * @throws: resource does not exist
   */
  async write (url, body) {
    Details('write(<%s>, "%s...")', url.pathname, body.substr(0, 60).replace(/\n/g, '\\n'));
    return Fs.promises.writeFile(Path.join(this.docRoot, url.pathname), body, {encoding: this._encoding});
  }

  /** invent:[URL, undefined] - create a new ldp:Resource
   * @param parentUrl:URL - URL of parent Container
   * @param requestedName:string - suggested name for created Container
   * @param body:string - contents of Resource
   * @param mediaType:string - media type of Resource
   * @returns: [newly-minuted name, undefined]
   */
  async invent (parentUrl, requestedName, body, mediaType) {
    return firstAvailable(parentUrl, requestedName, this.docRoot, 'Resource',
                          url => this.write(url, body));
  }

  /** remove:undefined - Delete resource.
   * @throws: resource does not exist
   */
  async remove (url) {
    return Fs.promises.unlink(Path.join(this.docRoot, url.pathname));
  }

  // R/W/D Containers

  /** readContainer:RDFJS Store - Read body of Container.
   * @returns: body parsed as RDF
   * @param prefixes: where to capures prefixes from parsing
   * @throws:
   *   resource does not exist
   *   parser failures
   */
  async readContainer (url, prefixes) {
    const text = await Fs.promises.readFile(Path.join(this.docRoot, this.getIndexFilePath(url)), this._encoding);
    return this._rdfInterface.parseTurtle(text, url, prefixes);
  }

  /** writeContainer:undefined - Read body of Container.
   * @param graph: data to be written
   * @param prefixes: prefixes to be used in serialization
   * @throws:
   *   resource does not exist
   *   serializer failures
   */
  async writeContainer (url, graph, prefixes) {
    Details('writeContainer(<%s>, Store() with %d quads, %s)', url.pathname, graph.size, JSON.stringify(prefixes))
    const body = await this._rdfInterface.serializeTurtle(graph, url, prefixes);
    return Fs.promises.writeFile(Path.join(this.docRoot, this.getIndexFilePath(url)), body, {encoding: this._encoding});
  }

  /** inventContainer:[URL, Store] - create a new ldp:Resource
   * @param parentUrl:URL - URL of parent Container
   * @param requestedName:string - suggested name for created Container
   *   requestedName is expected to include a trailing '/'
   * @param title:string - suggsted title for created Container
   * @param prefixes:object - where to place prefixes parsed from Container body
   * @returns: [newly-minuted URL, Container graph]
   */
  async inventContainer (parentUrl, requestedName, title, prefixes = {}) {
    Details('inventContainer(<${parentUrl.pathname}>, "${requestedName}", "${title}", ${JSON.stringify(prefixes)})');
    return firstAvailable(parentUrl, requestedName, this.docRoot, 'Container',
                          async url => (await this.ensureContainer(url, prefixes, title))[1]); // just the Container graph.
  }

  /** remove:undefined - Recursively remove a Container.
   * @throws: resource does not exist
   */
  async removeContainer (url) {
    const path = Path.join(this.docRoot, url.pathname);
    const files = await Fs.promises.readdir(path);
    for (const f of files) {
      const child = Path.join(path, f);
      const lstat = await Fs.promises.lstat(child);
      const childUrl = new URL(f, url);
      if (lstat.isDirectory()) {
        childUrl.pathname += '/'
        await this.removeContainer(childUrl);
      } else {
        await this.remove(childUrl);
      }
    }
    await Fs.promises.rmdir(path);
  }


  /** ensureContainer:object - Make Container with invented contents if it doesn't already exist.
   * @param prefixes: prefixes helpful for serialization.
   * @param title: dc:title property to add to invented contents.
   * @returns: [
   *   boolean - whether Container is new (didn't exist),
   *   RDFJS Store - data either read from Container or written to Container
   * ]
   * @throws:
   *   resource does not exist
   *   serializer failures
   */
  async ensureContainer (url, prefixes, title) {
    const funcDetails = Details.extend(`ensureContainer(<${url.pathname}>, ${JSON.stringify(prefixes)}, "title")`);
    funcDetails('');
    const _fsPromise = this;
    return Fs.promises.mkdir(Path.join(this.docRoot, url.pathname)).then(
      async () => {
        const g = await makeContainer();
        return [true, g];
      },
      async e => {
        /* istanbul ignore else */
        if (e.code === 'EEXIST') {
          try {
            funcDetails('this.readContainer(<%s>, %s)', url.pathname, JSON.stringify(prefixes));
            const g = await this.readContainer(url, prefixes);
            return [false, g];
          } catch (e) {
            const g = await makeContainer();
            return [true, g];
          }
        }
        /* istanbul ignore next */
        throw e;
      }
    )

    async function makeContainer () {
      const body = `
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.

<> a ldp:BasicContainer;
   dcterms:title "${title}".
`;
      const graph = await _fsPromise._rdfInterface.parseTurtle(body, url, prefixes);
      funcDetails('writeContainer(<%s>, Store with %d quads, %s)', url.pathname, graph.size, JSON.stringify(prefixes));
      _fsPromise.writeContainer(url, graph, prefixes);
      return graph;
    }
  }

  /** getIndexFilePath:string - Get the index Resource for a given Container.
   */
  getIndexFilePath (url) { // This is in the public API 'cause the static file server needs it.
    return Path.join(url.pathname, this.indexFile);
  }
}

async function exists (path) {
  return Fs.promises.stat(path).then(s => true, e => false);
}

/** firstAvailable:string|* - find a name for a new container member
 * @returns: name if f is null, f(name) otherwise
 */
async function firstAvailable (parentUrl, slug, docRoot, type, f) {
  let unique = 0;
  let name;
  while (await exists(Path.join(docRoot,
    new URL(
      name = (slug || type) + (
        unique > 0
          ? '-' + unique
          : ''
      ) + (type === 'Container' ? '/' : ''), parentUrl).pathname)
  ))
    ++unique;
  return [name, await f(new URL(name, parentUrl))];
}

module.exports = fsPromise;
