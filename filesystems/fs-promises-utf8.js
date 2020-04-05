const Fs = require('fs');
const Path = require('path');
module.exports = {
  read: async path => Fs.promises.readFile(path, 'utf8'),
  write: async (path, body) => Fs.promises.writeFile(path, body, {encoding: 'utf8'}),
  exists: async path => Fs.promises.stat(path).then(s => true, e => false),
  ensureDir: async path => {
    try {
      await Fs.promises.mkdir(path)
      return true
    } catch (e) {
      return false
    }
  },
  remove: async path => {
    // use Sync functions to avoid race conditions
    return new Promise((acc, rej) => {
      Fs.readdirSync(path).forEach(
        f =>
          Fs.unlinkSync(Path.join(path, f))
      );
      Fs.rmdirSync(path);
      acc(true)
    })
  },
}
