const createError = require('http-errors');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const Footprint = require('./util/footprint');
const C = require('./util/constants');
const conf = JSON.parse(fs.readFileSync('./servers.json', 'utf-8')).find(
  conf => conf.name === "LDP"
);

initializeFilesystem();
// start the server
const ldpServer = express();
ldpServer.use(bodyParser.raw({ type: 'text/turtle', limit: '50mb' }));
ldpServer.use(bodyParser.raw({ type: 'application/ld+json', limit: '50mb' }));

ldpServer.use(async function (req, res, next) {
  try {
    const rootUrl = new URL(`${req.protocol}://${req.headers.host}/`);
    //TODO: why is originalUrl required below instead of url
    const filePath = path.join(conf.documentRoot, req.originalUrl);
    const stat = await fs.promises.lstat(filePath)
          .catch(e => { throw createError(404, req.originalUrl) });
    const links = parseLinks(req);
    if (req.method === 'POST') {
      const parent = await new Footprint.localContainer(new URL(req.originalUrl, rootUrl),
                                                       req.originalUrl,
                                                       conf.documentRoot, C.indexFile).fetch();
      // console.log(parent.url, parent.graph.getQuads())

      // otherwise store a new resource or create a new footprint
      const typeLink = links.type.substr(C.ns_ldp.length);
      const toAdd = firstAvailableFile(filePath, req.headers.slug || typeLink);
      const newPath = path.join(req.originalUrl.substr(1), toAdd);
      const {host, port} = parseHost(req);
      const isStomp = !!links.footprint;
      const isContainer = typeLink === 'Container' || isStomp;
      const location = `http://${host}:${port}/${newPath}` + (isContainer ? '/' : '');
      const footprint = isStomp
            ? new Footprint.remoteFootprint(new URL(links.footprint), conf.cache)
            : await parent.getRootedFootprint(conf.cache);

      if (isStomp) {
        // Try to re-use an old footprint.
        const oldLocation = parent.reuseFootprint(footprint);
        if (oldLocation) {
          // Register the new app and return the location.
          const oldDirectory = path.join(conf.documentRoot, new URL(oldLocation).pathname.slice(0, -1));
          const appInfo = await parent.registerApp(footprint,
                                                   oldDirectory,
                                                   req.body.toString('utf8'),
                                                   oldLocation, req.headers['content-type'],
                                                   parent.url);
          res.setHeader('Location', oldLocation);
          res.status(201); // wanted 304 but it doesn't permit a body
          res.setHeader('Content-type', 'text/turtle');
          res.send(appInfo)
        } else {
          await footprint.fetch();
          const container = await footprint.instantiateStatic(footprint.getRdfRoot(), rootUrl,
                                                              newPath, conf.documentRoot, '.', parent);
          const directory = path.parse(container.path).dir;
          const appInfo = await parent.registerApp(footprint,
                                                   directory,
                                                   req.body.toString('utf8'),
                                                   location, req.headers['content-type'],
                                                   parent.url);
          
          res.setHeader('Location', location);
          res.status(201);
          res.setHeader('Content-type', 'text/turtle');
          res.send(appInfo);
        }
      } else {
        // add a resource to a Container

        await footprint.fetch();
        const pathWithinFootprint = footprint.path.concat([toAdd]).join('/');
        const stepNode = footprint.matchingStep(footprint.getRdfRoot(), req.headers.slug);
        const payload = req.body.toString('utf8');
        await footprint.validate(stepNode, req.headers['content-type'], payload, new URL(location), new URL(links.root, location).href);
        if (typeLink === 'Container') {
          const dir = footprint.instantiateStatic(stepNode, rootUrl, newPath, conf.documentRoot, pathWithinFootprint, parent);
          await dir.merge(payload, location);
          await dir.write()
        } else {
          // it would be nice to trim the location to allow for conneg
          await fs.promises.writeFile(path.join(filePath, toAdd), payload, {encoding: 'utf8'})
        }

        parent.addMember(location, footprint.url);
        await parent.write();

        res.setHeader('Location', location);
        res.status(201);
        res.send();
      }
    } else {
      if (stat.isDirectory())
        req.url += C.indexFile;
      next()
    }
  } catch (e) {
    // console.warn(e.stack)
    return next(e)
  }    
});

//TODO: is this an appropriate use of static?
ldpServer.use(express.static(conf.documentRoot, {a: 1}));

// all done

function initializeFilesystem () {
  ([
    {path: conf.documentRoot, title: "pre-installed root"},
    {path: path.join(conf.documentRoot, "Apps"), title: "Apps Container"},
    {path: path.join(conf.documentRoot, "Cache"), title: "Cache Container"},
    {path: path.join(conf.documentRoot, "shared"), title: "Shared Container"},
  ]).forEach(d => {
    /* istanbul ignore if */if (!fs.existsSync(d.path))
      new Footprint.localContainer(new URL('http://localhost/'), '/', d.path, C.indexFile, d.title, null, null)
  })
}

function firstAvailableFile (fromPath, slug) {
  let unique = 0;
  let tested;
  while (fs.existsSync(
    path.join(
      fromPath,
      tested = slug + (
        unique > 0
          ? '-' + unique
          : ''
      )
    )
  ))
    ++unique;
  return tested
}

/*
 * returns e.g. {"type": "http://...#Container", "rel": "..."}
 */
function parseLinks (req) {
  const linkHeader = req.headers.link;
  if (!linkHeader) return {};
  const components = linkHeader.split(/<(.*?)> *; *rel *= *"(.*?)" *,? */);
  components.shift(); // remove empty match before pattern captures.
  // return {type: C.ns_ldp + 'Container'}
  const ret = {  };
  for (i = 0; i < components.length; i+=3)
    ret[components[i+1]] = components[i];
  return ret
  /* functional equivalent is tedious:
  return linkHeader.split(/(?:<(.*?)> *; *rel *= *"(.*?)" *,? *)/).filter(s => s).reduce(
    (acc, elt) => {
      if (acc.val) {
        acc.map[elt] = acc.val;
        return {map: acc.map, val: null};
      } else {
        return {map: acc.map, val: elt}
      }
    }, {map:{}, val:null}
  ).map
  */
}

function parseHost (req) {
  const hostHeader = req.headers.host;
  /* istanbul ignore next */
  const [host, port = 80] = hostHeader.split(/:/);
  return { host, port }
}

module.exports = ldpServer;
module.exports.initializeFilesystem = initializeFilesystem;
