const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const Fs = require('fs');
const LdpConf = JSON.parse(require('fs').readFileSync('./servers.json', 'utf-8')).find(
  conf => conf.name === "LDP"
);
const C = require('./util/constants');
const fileSystem = new (require('./filesystems/fs-promises-utf8'))(LdpConf.documentRoot, LdpConf.indexFile)
const Footprint = require('./util/footprint')(fileSystem)
const Ecosystem = new (require('./ecosystems/simple-apps'))('Apps/', Footprint);

let initializePromise
const ldpServer = express();

main();

async function main () {
  initializePromise = initializeFilesystem();
  // console.log('SERVER', await initializePromise)

  // start the server
  ldpServer.use(bodyParser.raw({ type: 'text/turtle', limit: '50mb' }));
  ldpServer.use(bodyParser.raw({ type: 'application/ld+json', limit: '50mb' }));

  ldpServer.use(async function (req, res, next) {
    try {
      const rootUrl = new URL(`${req.protocol}://${req.headers.host}/`);
      //TODO: why is originalUrl required below instead of url
      const filePath = req.originalUrl.replace(/^\//, '');
      const lstat = await fileSystem.lstat(filePath)
            .catch(e => {
              const error = new Footprint.NotFoundError(req.originalUrl, 'queried resource', `{req.method} {req.originalUrl}`);
              error.status = 404;
              throw error;
            });
      const links = parseLinks(req);
      if (req.method === 'POST') {
        const parent = await (await new Footprint.localContainer(new URL(req.originalUrl, rootUrl),
                                                                 req.originalUrl).finish()).fetch();
        // console.log(parent.url, parent.graph.getQuads())

        // otherwise store a new resource or create a new footprint
        const typeLink = links.type.substr(C.ns_ldp.length);
        const toAdd = await firstAvailableFile(filePath, req.headers.slug || typeLink);
        const newPath = path.join(req.originalUrl.substr(1), toAdd);
        const {host, port} = parseHost(req);
        const isStomp = !!links.footprint;
        const isContainer = typeLink === 'Container' || isStomp;
        const location = `http://${host}:${port}/${newPath}` + (isContainer ? '/' : '');
        const footprint = isStomp
              ? new Footprint.remoteFootprint(new URL(links.footprint), LdpConf.cache)
              : await parent.getRootedFootprint(LdpConf.cache);

        if (isStomp) {
          // Try to re-use an old footprint.
          const oldLocation = parent.reuseFootprint(footprint);
          const payloadGraph = await Footprint.ParseRdf(
            req.body.toString('utf8'),
            oldLocation || location,
            req.headers['content-type']
          );

          let directory;
          if (oldLocation) {
            // Register the new app and return the location.
            directory = new URL(oldLocation).pathname.substr(1);
          } else {
            await footprint.fetch();
            const container = await footprint.instantiateStatic(footprint.getRdfRoot(), rootUrl,
                                                                newPath, '.', parent);
            parent.indexInstalledFootprint(location, footprint.url);
            await parent.write();
            directory = container.path;
          }
          const appData = Footprint.getAppData(payloadGraph)
          const [added, prefixes] = await Ecosystem.registerInstance(appData, footprint, directory);
          const rebased = await Footprint.serializeTurtle(added, parent.url, prefixes);

          res.setHeader('Location', oldLocation || location);
          res.status(201); // wanted 304 but it doesn't permit a body
          res.setHeader('Content-type', 'text/turtle');
          res.send(rebased) // respPayload)
        } else {
          // add a resource to a Container

          await footprint.fetch();
          const pathWithinFootprint = footprint.path.concat([toAdd]).join('/');
          const step = footprint.matchingStep(footprint.getRdfRoot(), req.headers.slug);
          let payload = req.body.toString('utf8');
          if (typeLink == 'NonRDFSource') {
            payload = req.body.toString('utf8');
            // what to we validate for non-rdf sources? https://github.com/solid/specification/issues/108
          } else {
            payload = req.body.toString('utf8');
            if (!step.shape)
              // @@issue: is a step allowed to not have a shape?
              throw new Footprint.FootprintStructureError(this.url, `${Footprint.renderRdfTerm(step.node)} has no foot:shape property`);
            await footprint.validate(step.shape.value, req.headers['content-type'], payload, new URL(location), new URL(links.root, location).href);
          }
          if (typeLink !== step.type)
            throw new Footprint.ManagedError(`Resource POSTed with ${typeLink} while ${step.node.value} expects a ${step.type}`, 422);
          if (typeLink === 'Container') {
            const dir = await footprint.instantiateStatic(step.node, rootUrl, newPath, pathWithinFootprint, parent);
            await dir.merge(payload, location);
            await dir.write()
          } else {
            // it would be nice to trim the location to allow for conneg
            await fileSystem.write(path.join(filePath, toAdd), payload, {encoding: 'utf8'})
          }

          parent.addMember(location, footprint.url);
          await parent.write();

          res.setHeader('Location', location);
          res.status(201);
          res.send();
        }
      } else {
        if (lstat.isDirectory())
          req.url = fileSystem.getIndexFilePath(req.url);
        next()
      }
    } catch (e) {
      /* istanbul ignore else */
      if (e instanceof Footprint.ManagedError) {
        e.status = e.status;
        /* istanbul ignore if */
        if (e.message.match(/\[object Object\]/))
          console.warn('fix up error invocation for:\n', e.stack);
      } else {
        console.warn('unexpected exception: ' + (e.stack || e.message))
        e.status = e.status || 500;
      }
      return next(e)
    }    
  });

  //TODO: is this an appropriate use of static?
  ldpServer.use(express.static(LdpConf.documentRoot, {a: 1}));
  ldpServer.use(function errorHandler (err, req, res, next) {
    res.status(err.status)
    res.json({
      message: err.message,
      error: err
    });
  });
}
// all done

async function initializeFilesystem () {
  return ([
    {path: './', title: "pre-installed root"},
    {path: "./Apps/", title: "Apps Container"},
    {path: "./Cache/", title: "Cache Container"},
    {path: "./Shared/", title: "Shared Container"},
  ]).reduce(
    (p, d) => p.then(
      list => new Footprint.localContainer(new URL('http://localhost/'), d.path, d.title, null, null).finish().then(
        container => list.concat([container.newDir])
      )
    )
    , Promise.resolve([])
  );
}

async function firstAvailableFile (fromPath, slug) {
  let unique = 0;
  let tested;
  while (await fileSystem.exists(
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
module.exports.initializePromise = initializePromise
