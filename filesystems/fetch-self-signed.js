/** Permissive Fetch which allows (ignores) self-signed certificates.
 */

const Https = new require("https");

module.exports = function (nextFetch) {
  return function (url, options = {}) {
    return url.protocol === 'https:'
      ? nextFetch(url, Object.assign({
        agent: Https.Agent({
          rejectUnauthorized: false
        })
      }, options))
      : nextFetch(url, options);
  }
}
