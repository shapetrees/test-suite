/** Permissive Fetch which allows (ignores) self-signed certificates.
 */

const Fetch = require('node-fetch');
module.exports = function (url, options = {}) {
  return url.protocol === 'https:'
    ? Fetch(url, Object.assign({
      agent: new require("https").Agent({
        rejectUnauthorized: false
      })
    }, options))
    : Fetch(url, options);
};
