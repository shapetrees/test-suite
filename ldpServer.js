
// Express server
const Express = require('express');
const Cors = require('cors');
const BodyParser = require('body-parser');
// const Morgan = require('morgan');

// Logging
const Debug = require('debug');
const Log = Debug('LDP');

const path = require('path');

// Local ecosystem
const LdpConf = JSON.parse(require('fs').readFileSync('./servers.json', 'utf-8')).find(
  conf => conf.name === "LDP"
);
const C = require('./util/constants');
const RExtra = require('./util/rdf-extra')
const FileSystem = new (require('./filesystems/fs-promises-utf8'))(LdpConf.documentRoot, LdpConf.indexFile, RExtra)
const ShapeTree = require('./util/shape-tree')(FileSystem, RExtra, require('./util/fetch-self-signed'))
const Ecosystem = new (require('./ecosystems/simple-apps'))('Apps/', ShapeTree, RExtra);

// Prepare server
let initialized;
const ldpServer = Express();
let Base = null
ldpServer.setBase = function (server, base) {
  Base = base;
  initialized = Ecosystem.initialize(Base, LdpConf);
  Log(`Listening on ${base.href}`);
}

// Export server
module.exports = ldpServer;
module.exports.initialized = initialized;

runServer();
// All done

async function runServer () {

  // Enable pre-flight request for DELETE request.
  const CorsHandler = Cors({
    credentials: true,
    origin: function (origin, callback) {
      // allow any origin
      callback(null, true)
      // else callback(new Error(`origin ${origin} not allowed by CORS`))
    },
    method: 'DELETE',
  });
  ldpServer.use(function (req, res, next) {
    Log('cors', req.method, req.originalUrl);
    return CorsHandler(req, res, next);
  })
  ldpServer.use(BodyParser.raw({ type: 'text/turtle', limit: '50mb' }));
  ldpServer.use(BodyParser.raw({ type: 'application/ld+json', limit: '50mb' }));

  ldpServer.use(async function (req, res, next) {
    try {
      Log('main', req.method, req.originalUrl)
      const rootUrl = new URL(`${req.protocol}://${req.headers.host.replace(/^127.0.0.1/, 'localhost')}/`);
      //TODO: why is originalUrl required below instead of url
      const filePath = req.originalUrl.replace(/^\//, '');
      const postedUrl = new URL(filePath, rootUrl)
      const lstat = await FileSystem.lstat(postedUrl)
            .catch(e => {
              const error = new RExtra.NotFoundError(req.originalUrl, 'queried resource', `${req.method} ${req.originalUrl}`);
              error.status = 404;
              throw error;
            });
      const links = parseLinks(req);
      if (req.method === 'POST') {
        // Store a new resource or create a new ShapeTree
        const parent = await new ShapeTree.managedContainer(postedUrl).finish();

        const typeLink = links.type.substr(C.ns_ldp.length); // links.type ? links.type.substr(C.ns_ldp.length) : null;
        const toAdd = await firstAvailableFile(postedUrl, req.headers.slug, typeLink);
        const isPlant = !!links.shapeTree;
        const isContainer = typeLink === 'Container' || isPlant;
        const newPath = path.join(filePath, toAdd) + (isContainer ? '/' : '');
        let location = new URL(newPath, Base); // `https://${host}:${port}/${newPath}`;
        const shapeTree = isPlant
              ? new ShapeTree.remoteShapeTree(new URL(links.shapeTree), LdpConf.cache)
              : await parent.getRootedShapeTree(LdpConf.cache);

        if (isPlant) {
          Log('plant', links.shapeTree)
          const payloadGraph = await RExtra.parseRdf(
            req.body.toString('utf8'), postedUrl, req.headers['content-type']
          );

          // Ask ecosystem if we can re-use an old ShapeTree.
          const reusedLocation = Ecosystem.reuseShapeTree(parent, shapeTree);
          if (reusedLocation) {
            location = reusedLocation;
            Log('plant reusing', location.pathname.substr(1));
          } else {
            Log('plant creating', location.pathname.substr(1));
            await shapeTree.fetch();
            const container = await shapeTree.instantiateStatic(shapeTree.getRdfRoot(), location, '.', parent);
            Ecosystem.indexInstalledShapeTree(parent, location, shapeTree.url);
            await parent.write();
          }
          res.setHeader('Location', location.href);
          res.status(201); // Should ecosystem be able to force a 304 Not Modified ?

          // The ecosystem consumes the payload and provides a response.
          const appData = Ecosystem.parseInstatiationPayload(payloadGraph);
          const [responseGraph, prefixes] = await Ecosystem.registerInstance(appData, shapeTree, location);
          const rebased = await RExtra.serializeTurtle(responseGraph, parent.url, prefixes);
          res.setHeader('Content-type', 'text/turtle');
          res.send(rebased) // respPayload)
        } else {
          // add a resource to a Container

          await shapeTree.fetch();
          const pathWithinShapeTree = shapeTree.path.concat([toAdd]).join('/');
          const step = shapeTree.matchingStep(shapeTree.getRdfRoot(), req.headers.slug);
          let payload = req.body.toString('utf8');
          if (typeLink == 'NonRDFSource') {
            payload = req.body.toString('utf8');
            // what to we validate for non-rdf sources? https://github.com/solid/specification/issues/108
          } else {
            payload = req.body.toString('utf8');
            if (!step.shape)
              // @@issue: is a step allowed to not have a shape?
              throw new RExtra.ShapeTreeStructureError(this.url, `${RExtra.renderRdfTerm(step.node)} has no tree:shape property`);
            await shapeTree.validate(step.shape.value, req.headers['content-type'], payload, location, new URL(links.root, location).href);
          }
          if (typeLink !== step.type)
            throw new RExtra.ManagedError(`Resource POSTed with link type=${typeLink} while ${step.node.value} expects a ${step.type}`, 422);
          if (typeLink === 'Container') {
            const dir = await shapeTree.instantiateStatic(step.node, location, pathWithinShapeTree, parent);
            await dir.merge(payload, location);
            await dir.write()
          } else {
            // it would be nice to trim the location to allow for conneg
            await FileSystem.write(location, payload, {encoding: 'utf8'})
          }

          parent.addMember(location.href, shapeTree.url);
          await parent.write();

          res.setHeader('Location', location.href);
          res.status(201);
          res.send();
        }
      } else if (req.method === 'DELETE') {
        const doomed = postedUrl;
        if (doomed.pathname === '/') {
          res.status(405);
          res.send();
        } else {
          const parentUrl = new URL('..', doomed);
          const parent = await new ShapeTree.managedContainer(parentUrl)
                .finish();
          if (lstat.isDirectory()) {
            // Read the container
            const container = await new ShapeTree.managedContainer(doomed).finish();
            // If it's the root of a ShapeTree instance,
            if (container.shapeTreeInstanceRoot
                && container.shapeTreeInstanceRoot.href === container.url.href)
              // Tell the ecosystem to unindex it.
              Ecosystem.unindexInstalledShapeTree(parent, doomed, container.shapeTreeUrl);
            await FileSystem.removeContainer(postedUrl);
          } else {
            await FileSystem.remove(postedUrl);
          }
          parent.removeMember(doomed.href, null);
          await parent.write();
          res.status(200);
          res.send();
        }
      } else {
        if (lstat.isDirectory()) { // should be isContainer()
          req.url = FileSystem.getIndexFilePath(new URL(req.url, rootUrl));
          res.header('link' , '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"');
          res.header('access-control-expose-headers' , 'link');
        }
        // Fall through to express.static.
        next()
      }
    } catch (e) {
      /* istanbul ignore else */
      if (e instanceof RExtra.ManagedError) {
        /* istanbul ignore if */
        if (e.message.match(/^\[object Object\]$/))
          console.warn('fix up error invocation for:\n', e.stack);
      } else {
        console.warn('unmanaged exception: ' + (e.stack || e.message))
        e.status = e.status || 500;
      }
      return next(e)
    }    
  });

  // Use express.static for GETs on Resources and Containers.
  ldpServer.use(Express.static(LdpConf.documentRoot, {a: 1}));

  // Error handler expects structured error to build a JSON @@LD response.
  ldpServer.use(function (err, req, res, next) {
    res.status(err.status)
    res.json({
      message: err.message,
      error: err,
      stack: err.stack
    });
  });
}

async function firstAvailableFile (postedUrl, slug, type) {
  let unique = 0;
  let tested;
  while (await FileSystem.exists(
    new URL(
      tested = (slug || type) + (
        unique > 0
          ? '-' + unique
          : ''
      ), postedUrl)
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
