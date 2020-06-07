/**
 * environment: SHAPETREE=client disables ShapeTree support.
 */

// Express server
const Express = require('express');
const Cors = require('cors');
const BodyParser = require('body-parser');
// const Morgan = require('morgan');

// Logging
const Debug = require('debug');
const Log = Debug('LDP');
const Details = Log.extend('details');

// Local ecosystem
const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Prefixes = require('../shapetree.js/lib/prefixes');
const RdfSerialization = require('../shapetree.js/lib/rdf-serialization')
const Errors = require('../shapetree.js/lib/rdf-errors');
const Storage = new (require('../shapetree.js/storage/fs-promises'))(LdpConf.documentRoot, LdpConf.indexFile, RdfSerialization)
const CallCachingFetch = (url, /* istanbul ignore next */options = {}) => Ecosystem.cachingFetch(url, options); // avoid circular dependency on ShapeTree and Ecosystem.
const ShapeTree = require('../shapetree.js/lib/shape-tree')(Storage, RdfSerialization, require('../shapetree.js/storage/fetch-self-signed')(CallCachingFetch))
const Ecosystem = new (require('../shapetree.js/ecosystems/simple-apps'))(Storage, ShapeTree, RdfSerialization);

const NoShapeTrees = process.env.SHAPETREE === 'fetch';

// Prepare server
const ldpServer = Express();
let Base = null
ldpServer.setBase = function (server, base) {
  Base = base;
  module.exports.initialized = Ecosystem.createSystemHierarchy(Base, LdpConf).then(hierarchy => ({ hierarchy, shapeTree: ShapeTree }));
  Log(`Listening on ${base.href}`);
}

// Export server
module.exports = ldpServer;

runServer();
// All done

let RequestNumber = 0;

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
    // Log('cors', req.method, req.url);
    return CorsHandler(req, res, next);
  })
  ldpServer.use(BodyParser.raw({ type: 'text/turtle', limit: '50mb' }));
  ldpServer.use(BodyParser.raw({ type: 'application/ld+json', limit: '50mb' }));

  ldpServer.use(async function expressHandler (req, res, next) {
    // console.warn(`+ LDP server ${req.method} ${req.url} ${['PUT', 'POST'].indexOf(req.method) !== -1 ? JSON.stringify(req.body.toString('utf8')) : ''}`);
    const requestUrl = new URL(req.url.replace(/^\//, ''), Base)
    const links = parseLinks(req);
    const requestSummary = `expressHandler#${++RequestNumber}(${links.shapeTree && req.method === 'POST' ? 'PLANT' : req.method} ${req.headers.slug ? (req.headers.slug + ' to ') : ''}${req.url})`;
    Log('+ %s', requestSummary);
    const funcDetails = Details.extend(requestSummary);
    funcDetails('');
    const rstat = await rstatOrNull(requestUrl);

    try {
      switch (req.method) {

      case 'POST': {
        // Make sure POSTed URL exists.
        throwIfNotFound(rstat, requestUrl, req.method);
        // Store a new resource or create a new ShapeTree
        funcDetails(`parentContainer = ShapeTree.loadContainer(<${requestUrl.pathname}>)`);
        const parentContainer = NoShapeTrees
              ? await new ShapeTree.Container(requestUrl).ready
              : await ShapeTree.loadContainer(requestUrl);

        const ldpType = links.type.substr(Prefixes.ns_ldp.length); // links.type ? links.type.substr(Prefixes.ns_ldp.length) : null;
        const requestedName = (req.headers.slug || ldpType) + (ldpType === 'Container' ? '/' : '');
        const payload = req.body.toString('utf8');
        const mediaType = req.headers['content-type'];

        const isPlantRequest = !!links.shapeTree;
        if (!NoShapeTrees && isPlantRequest) {

          // Parse payload early so we can throw before creating a ShapeTree instance.
          const payloadGraph = await RdfSerialization.parseRdf(
            payload, requestUrl, mediaType
          );

          // Create ShapeTree instance and tell ecosystem about it.
          const shapeTreeUrl = new URL(links.shapeTree, requestUrl); // !! should respect anchor per RFC5988 §5.2
          // Ask ecosystem if we can re-use an old ShapeTree instance.
          let location = Ecosystem.reuseShapeTree(parentContainer, shapeTreeUrl)
          if (location) {
            Log('plant reused', location.pathname.substr(1));
          } else {
            funcDetails(`parentContainer.plantShapeTreeInstance(<${shapeTreeUrl.href}>, "${requestedName.replace(/\/$/, '')}", n3.Store() with ${payloadGraph.size} quads)`);
            location = await parentContainer.plantShapeTreeInstance(shapeTreeUrl, requestedName.replace(/\/$/, ''), payloadGraph);

            funcDetails(`indexInstalledShapeTree(parentContainer, <${location.pathname}>, <${shapeTreeUrl.href}>)`);
            Ecosystem.indexInstalledShapeTree(parentContainer, location, shapeTreeUrl);
            funcDetails(`parentContainer.write()`);
            await parentContainer.write();
            Log('plant created', location.pathname.substr(1));
          }

          // The ecosystem consumes the payload and provides a response.
          const appData = Ecosystem.parseInstatiationPayload(payloadGraph);
          funcDetails(`Ecosystem.registerInstance(appData, shapeTreeUrl, location)`);
          const [responseGraph, prefixes] = await Ecosystem.registerInstance(appData, shapeTreeUrl, location);
          const rebased = await RdfSerialization.serializeTurtle(responseGraph, parentContainer.url, prefixes);
          funcDetails(`parentContainer.addMember(<${location.pathname}>)`);
          parentContainer.addMember(location.href);
          funcDetails(`parentContainer.write()`);
          await parentContainer.write();

          res.setHeader('Location', location.href);
          res.status(201); // Should ecosystem be able to force a 304 Not Modified ?
          res.setHeader('Content-type', 'text/turtle');
          res.send(rebased);
        } else {

          // Validate the posted data according to the ShapeTree rules.
          const approxLocation = new URL(requestedName, requestUrl);
          const entityUrl = new URL(links.root, approxLocation); // !! should respect anchor per RFC5988 §5.2
          const [payloadGraph, finishContainer] =
                await parentContainer.validatePayload(payload, approxLocation, mediaType, ldpType, entityUrl);

          let location = null;
          if (ldpType === 'Container') {

            // If it's a Container, create the container and add the POSTed payload.
            const container = await parentContainer.nestContainer(req.headers.slug, `POSTed Container`); // storage picks a name
            location = container.url;
            await finishContainer(container);
            await container.merge(payloadGraph, location);
            await container.write()

          } else {

            // Write any non-Container verbatim.
            location = await parentContainer.nest(req.headers.slug, payload, mediaType);
          }

          // Add to POSTed container.
          funcDetails(`parentContainer.addMember(<${location.pathname}>)`);
          parentContainer.addMember(location.href);
          funcDetails(`parentContainer.write()`);
          await parentContainer.write();

          res.setHeader('Location', location.href);
          res.status(201);
          res.send();
        }
        break;
      }

      case 'PUT': {
        // Store a new resource or create a new ShapeTree
        const parentUrl = new URL(requestUrl.pathname.endsWith('/') ? '..' : '.', requestUrl);
        const pstat = rstatOrNull(parentUrl);
        await throwIfNotFound(pstat, requestUrl, req.method);
        const parentContainer = NoShapeTrees
              ? await new ShapeTree.Container(parentUrl, `Container for ${parentUrl.pathname}`).ready
              : await ShapeTree.loadContainer(parentUrl);

        const ldpType = requestUrl.pathname.endsWith('/') ? 'Container' : 'Resource';
        let location = requestUrl;

        {

          // Validate the posted data according to the ShapeTree rules.
          const entityUrl = new URL(links.root, location); // !! should respect anchor per RFC5988 §5.2
          const payload = req.body.toString('utf8');
          const mediaType = req.headers['content-type'];
          const [payloadGraph, finishContainer] =
                await parentContainer.validatePayload(payload, location, mediaType, ldpType, entityUrl);

          if (ldpType === 'Container') {

            // If it's a Container, create the container and override its graph with the POSTed payload.
            const container = await new ShapeTree.Container(location, `unmanaged Container ${location.pathname}`).ready;
            await finishContainer(container);
            container.graph = payloadGraph;
            await container.write()

          } else {

            // Write any non-Container verbatim.
            await Storage.write(location, payload, {encoding: 'utf8'});

          }

          // Add to POSTed container.
          parentContainer.addMember(location.href);
          await parentContainer.write();

          res.status(201);
          res.send();
        }
      }
        break;

      case 'DELETE': {
        const doomed = requestUrl;
        if (doomed.pathname === '/') {
          res.status(405);
          res.send();
        } else {
          // Get status of DELETEd URL.
          throwIfNotFound(rstat, requestUrl, req.method);
          const parentUrl = new URL(doomed.pathname.endsWith('/') ? '..' : '.', doomed);
          const parentContainer = NoShapeTrees
                ? await new ShapeTree.Container(parentUrl).ready
                : await ShapeTree.loadContainer(parentUrl);
          if (rstat.isContainer) {
            // Read the container
            const container = NoShapeTrees
              ? await new ShapeTree.Container(doomed).ready
              : await ShapeTree.loadContainer(doomed);
            // If it's the root of a ShapeTree instance,
            if (container.shapeTreeInstanceRoot
                && container.shapeTreeInstanceRoot.href === container.url.href)
              // Tell the ecosystem to unindex it.
              Ecosystem.unindexInstalledShapeTree(parentContainer, doomed, container.shapeTreeUrl);
            await Storage.removeContainer(requestUrl);
          } else {
            await Storage.remove(requestUrl);
          }
          parentContainer.removeMember(doomed.href, null);
          await parentContainer.write();
          res.status(200);
          res.send();
        }
        break;
      }

      case 'GET': {
        // Get status of request URL.
        throwIfNotFound(rstat, requestUrl, req.method);
        if (rstat.isContainer) { // should be isContainer()
          req.url = Storage.getIndexFilePath(new URL(req.url, Base));
          res.header('link' , '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"');
          res.header('access-control-expose-headers' , 'link');
        }
        // Fall through to express.static.
        next()
        break;
      }
      }
      Log('- %s => ok', requestSummary);
      // console.warn(`- LDP server ${req.method} ${req.url} ${res.statusCode}`);
    } catch (e) {
      Log('! %s !> %d %s', requestSummary, e.status || 500, e.message);
      // console.warn(`! LDP server ${req.method} ${req.url} ${e.status || 500} ${e}`);
      /* istanbul ignore else */
      if (e instanceof Errors.ManagedError) {
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

function throwIfNotFound (rstat, url, method) {
  if (rstat)
    return;
  const error = new Errors.NotFoundError(url, 'queried resource', `${method} ${url.pathname}`);
  error.status = 404;
  throw error;
}

async function rstatOrNull (url) {
  try {
    return await Storage.rstat(url);
  } catch (e) {
    return null;
  }
}

/*
 * returns e.g. {"type": "http://...#Container", "rel": "..."}
 */
function parseLinks (req) {
  const linkHeader = req.headers.link;
  if (!linkHeader) return {};
  const components = linkHeader.split(/<(.*?)> *; *rel *= *"(.*?)" *,? */);
  components.shift(); // remove empty match before pattern captures.
  const ret = {  };
  for (i = 0; i < components.length; i+=3)
    ret[components[i+1]] = components[i];
  return ret
  /* functional equivalent is tedious to maintain:
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

