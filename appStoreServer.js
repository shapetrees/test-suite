/* simple static server
 *
 * invocation: require('./appStoreServer').init(conf)
 *   @param conf - an optional config like:
 *     {
 *       "name": "MyAppStore",
 *       "description": "my app store static content",
 *       "bin": "appStoreServer.js",
 *       "documentRoot": "myTests/staticContent"
 *     }
 *     defaults to parsing ./servers.json and finding name === 'AppStore;
 * N.B. typical express apps are started without an init().
 */

const createError = require('http-errors');
const express = require('express');
const fs = require('fs');
const path = require('path');

const appStoreServer = express();
appStoreServer.init = (confP) => {
  const conf = confP ? confP : JSON.parse(fs.readFileSync('./servers.json', 'utf-8')).find(
    conf => conf.name === "AppStore"
  );

  appStoreServer.use(require('serve-favicon')('favicon.ico'));
  // appStoreServer.use(require('morgan')('dev'));

  /* rewrite URL to match existing resources
   */
  appStoreServer.use(async function (req, res, next) {
    const parsedPath = path.parse(req.url);
    const relativePath = path.join(conf.documentRoot, parsedPath.dir);
    try {
      const files = await fs.promises.readdir(relativePath);

      // exact match
      if (files.indexOf(parsedPath.base) !== -1)
        return next();

      // matches up to '.'
      // TODO: should do conneg if there are more than one match
      const stem = files.find(
        f => f.startsWith(parsedPath.base) && f[parsedPath.base.length] === '.'
      );

      if (stem) {
        req.url = path.join(parsedPath.dir, stem);
        return next()
      }

      // no match
      // createError(404, req.originalUrl)
      next(createError(404, path.join(relativePath, parsedPath.base)))
    } catch (e) {
      console.warn('unexpected exception: ' + (e.stack || e.message))
      e.status = e.status || 500;
      next(e)
    }
  });

  ;

  /* use the static server
   */
  appStoreServer.use(express.static(conf.documentRoot, {
    setHeaders: function (res, path, stat) {
      res.set('x-timestamp', Date.now())
    }
  }));

  appStoreServer.use(function errorHandler (err, req, res, next) {
    res.status(err.status) //  || 500
    res.json({
      message: err.message,
      error: err
    });
  });
}
module.exports = appStoreServer;
