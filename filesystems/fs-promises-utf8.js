const Fs = require('fs');
const Path = require('path');


class fsPromiseUtf8 {
  constructor (docRoot, indexFile, rdfInterface) {
    // Make sure there's only one filesystem interface for given docRoot.
    // This will need to be moved to an async function if multiple apps
    // use a filesystem to coordinate access.
    const key = docRoot;
    if (fsPromiseUtf8[key])
      return fsPromiseUtf8[key];

    this.docRoot = docRoot;
    this.indexFile = indexFile;
    this._rdfInterface = rdfInterface;
    fsPromiseUtf8[key] = this;
    this.promises = {}; // hash[path, list[promises]]
    this._hashCode = `fsPromiseUtf8(${JSON.stringify(key)})`; // Math.floor(Math.random()*2**32).toString(16); // identifies this singleton
  }

  hashCode () { return this._hashCode; }

  async read (url) {
    return Fs.promises.readFile(Path.join(this.docRoot, url.pathname), 'utf8');
  }

  async write (url, body) {
    return Fs.promises.writeFile(Path.join(this.docRoot, url.pathname), body, {encoding: 'utf8'});
  }

  getIndexFilePath (url) { // This is in the public API 'cause the static file server needs it.
    return Path.join(url.pathname, this.indexFile);
  }

  async readContainer (url, prefixes) {
    const text = await Fs.promises.readFile(Path.join(this.docRoot, this.getIndexFilePath(url)), 'utf8');
    return this._rdfInterface.parseTurtle(text, url, prefixes);
  }

  async writeContainer (graph, url, prefixes) {
    const body = await this._rdfInterface.serializeTurtle(graph, url, prefixes);
    return Fs.promises.writeFile(Path.join(this.docRoot, this.getIndexFilePath(url)), body, {encoding: 'utf8'});
  }

  async remove (url) {
    return Fs.promises.unlink(Path.join(this.docRoot, url.pathname));
  }

  async exists (url) {
    return Fs.promises.stat(Path.join(this.docRoot, url.pathname)).then(s => true, e => false);
  }

  async rstat (url) {
    const lstat = await Fs.promises.lstat(Path.join(this.docRoot, url.pathname));
    return { isContainer: lstat.isDirectory() };
  }

  async ensureContainer (url, prefixes, title) {
    const _fsPromiseUtf8 = this;
    return Fs.promises.mkdir(Path.join(this.docRoot, url.pathname)).then(
      async () => {
        const g = await makeContainer();
        return [true, g];
      },
      async e => {
        /* istanbul ignore else */
        if (e.code === 'EEXIST') {
          try {
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
      const graph = await _fsPromiseUtf8._rdfInterface.parseTurtle(body, url, prefixes);
      _fsPromiseUtf8.writeContainer(graph, url, prefixes);
      return graph;
    }
  }

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
}

module.exports = fsPromiseUtf8;
