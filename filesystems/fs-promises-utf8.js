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

  async read (path) {
    return Fs.promises.readFile(Path.join(this.docRoot, path), 'utf8');
  }

  async write (path, body) {
    return Fs.promises.writeFile(Path.join(this.docRoot, path), body, {encoding: 'utf8'});
  }

  getIndexFilePath (path) { return Path.join(path, this.indexFile); } // to pass to a static file server

  async readContainer (path) {
    return Fs.promises.readFile(Path.join(this.docRoot, this.getIndexFilePath(path)), 'utf8');
  }

  async writeContainer (path, body) {
    return Fs.promises.writeFile(Path.join(this.docRoot, this.getIndexFilePath(path)), body, {encoding: 'utf8'});
  }

  async exists (path) {
    return Fs.promises.stat(Path.join(this.docRoot, path)).then(s => true, e => false);
  }

  async lstat (path) {
    return Fs.promises.lstat(Path.join(this.docRoot, path));
  }

  async ensureDir (path) {
    return Fs.promises.mkdir(Path.join(this.docRoot, path)).then(
      () => true,
      e => {
        if (e.code === 'EEXIST')
          return false;
        throw e;
      }
    )
  }

  async remove (path) {
    // use Sync functions to avoid race conditions
    return new Promise((acc, rej) => {
      Fs.readdirSync(Path.join(this.docRoot, path)).forEach(
        f =>
          Fs.unlinkSync(Path.join(this.docRoot, path, f))
      );
      Fs.rmdirSync(Path.join(this.docRoot, path));
      acc(true);
    })
  }
}

module.exports = fsPromiseUtf8;
