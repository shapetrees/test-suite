const Fs = require('fs');
const Path = require('path');


class fsPromiseUtf8 {
  constructor (docRoot, indexFile) {
    // Make sure there's only one filesystem interface for given docRoot.
    // This will need to be moved to an async function if multiple apps
    // use a filesystem to coordinate access.
    const key = docRoot;
    if (fsPromiseUtf8[key])
      return fsPromiseUtf8[key];

    this.docRoot = docRoot;
    this.indexFile = indexFile;
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

  getIndexFilePath (url) { return Path.join(url.pathname, this.indexFile); } // to pass to a static file server

  async readContainer (url) {
    return Fs.promises.readFile(Path.join(this.docRoot, this.getIndexFilePath(url)), 'utf8');
  }

  async writeContainer (url, body) {
    return Fs.promises.writeFile(Path.join(this.docRoot, this.getIndexFilePath(url)), body, {encoding: 'utf8'});
  }

  async exists (url) {
    return Fs.promises.stat(Path.join(this.docRoot, url.pathname)).then(s => true, e => false);
  }

  async lstat (url) {
    return Fs.promises.lstat(Path.join(this.docRoot, url.pathname));
  }

  async ensureDir (url) {
    return Fs.promises.mkdir(Path.join(this.docRoot, url.pathname)).then(
      () => true,
      e => {
        /* istanbul ignore else */
        if (e.code === 'EEXIST')
          return false;
        /* istanbul ignore next */
        throw e;
      }
    )
  }

  async remove (url) {
    // use Sync functions to avoid race conditions
    return new Promise((acc, rej) => {
      Fs.readdirSync(Path.join(this.docRoot, url.pathname)).forEach(
        f =>
          Fs.unlinkSync(Path.join(this.docRoot, url.pathname, f))
      );
      Fs.rmdirSync(Path.join(this.docRoot, url.pathname));
      acc(true);
    })
  }
}

module.exports = fsPromiseUtf8;
