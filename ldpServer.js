
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
    // Log('cors', req.method, req.url);
    return CorsHandler(req, res, next);
  })
  ldpServer.use(BodyParser.raw({ type: 'text/turtle', limit: '50mb' }));
  ldpServer.use(BodyParser.raw({ type: 'application/ld+json', limit: '50mb' }));

  ldpServer.use(async function (req, res, next) {
    try {
      Log('handle', req.method, req.url)
      const postedUrl = new URL(req.url.replace(/^\//, ''), Base)
      const lstat = await FileSystem.lstat(postedUrl)
            .catch(e => {
              const error = new RExtra.NotFoundError(req.url, 'queried resource', `${req.method} ${req.url}`);
              error.status = 404;
              throw error;
            });
      const links = parseLinks(req);

      switch (req.method) {

      case 'POST': {
        // Store a new resource or create a new ShapeTree
        const postedContainer = await new ShapeTree.managedContainer(postedUrl).finish();

        const isPlant = !!links.shapeTree;
        const ldpType = links.type.substr(C.ns_ldp.length); // links.type ? links.type.substr(C.ns_ldp.length) : null;
        const toAdd = await firstAvailableFile(postedUrl, req.headers.slug, ldpType);
        let location = new URL(toAdd + (
          (ldpType === 'Container' || isPlant) ? '/' : ''
        ), postedUrl);

        if (isPlant) {
          // Parse payload early so we can throw before creating a ShapeTree instance.
          const payloadGraph = await RExtra.parseRdf(
            req.body.toString('utf8'), postedUrl, req.headers['content-type']
          );

          // Create ShapeTree instance and tell ecosystem about it.
          const shapeTreeUrl = new URL(links.shapeTree, postedUrl); // !! should respect anchor per RFC5988 §5.2
          location = await plantShapeTreeInstance(shapeTreeUrl, req, postedContainer, location);
          res.setHeader('Location', location.href);
          res.status(201); // Should ecosystem be able to force a 304 Not Modified ?

          // The ecosystem consumes the payload and provides a response.
          const appData = Ecosystem.parseInstatiationPayload(payloadGraph);
          const [responseGraph, prefixes] = await Ecosystem.registerInstance(appData, shapeTreeUrl, location);
          const rebased = await RExtra.serializeTurtle(responseGraph, postedContainer.url, prefixes);
          res.setHeader('Content-type', 'text/turtle');
          res.send(rebased);
        } else {
          // Validate the posted data according to the ShapeTree rules.

          const entityUrl = new URL(links.root, location); // !! should respect anchor per RFC5988 §5.2
          const payload = req.body.toString('utf8');
          const dirMaker = await validatePost(entityUrl, payload, req, postedContainer, location, toAdd, ldpType);

          if (ldpType === 'Container') {
            // If it's a Container, create the container and add the POSTed payload.

            const dir = await dirMaker();
            await dir.merge(payload, location);
            await dir.write()
          } else {
            // Write any non-Container verbatim.

            await FileSystem.write(location, payload, {encoding: 'utf8'})
          }

          // Add to POSTed container.
          postedContainer.addMember(location.href);
          await postedContainer.write();

          res.setHeader('Location', location.href);
          res.status(201);
          res.send();
        }
        break;
      }

      case 'DELETE': {
        const doomed = postedUrl;
        if (doomed.pathname === '/') {
          res.status(405);
          res.send();
        } else {
          const parentUrl = new URL('..', doomed);
          const postedContainer = await new ShapeTree.managedContainer(parentUrl)
                .finish();
          if (lstat.isDirectory()) {
            // Read the container
            const container = await new ShapeTree.managedContainer(doomed).finish();
            // If it's the root of a ShapeTree instance,
            if (container.shapeTreeInstanceRoot
                && container.shapeTreeInstanceRoot.href === container.url.href)
              // Tell the ecosystem to unindex it.
              Ecosystem.unindexInstalledShapeTree(postedContainer, doomed, container.shapeTreeUrl);
            await FileSystem.removeContainer(postedUrl);
          } else {
            await FileSystem.remove(postedUrl);
          }
          postedContainer.removeMember(doomed.href, null);
          await postedContainer.write();
          res.status(200);
          res.send();
        }
        break;
      }

      case 'GET':
        if (lstat.isDirectory()) { // should be isContainer()
          req.url = FileSystem.getIndexFilePath(new URL(req.url, Base));
          res.header('link' , '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"');
          res.header('access-control-expose-headers' , 'link');
        }
        // Fall through to express.static.
        next()
        break;

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

/** Create (plant) a ShapeTree instance.
 */
async function plantShapeTreeInstance (shapeTreeUrl, req, postedContainer, location) {
  Log('plant', shapeTreeUrl.href)

  // Ask ecosystem if we can re-use an old ShapeTree instance.
  const reusedLocation = Ecosystem.reuseShapeTree(postedContainer, shapeTreeUrl);
  if (reusedLocation) {
    location = reusedLocation;
    Log('plant reusing', location.pathname.substr(1));
  } else {
    Log('plant creating', location.pathname.substr(1));

    // Populate a ShapeTree object.
    const shapeTree = new ShapeTree.remoteShapeTree(shapeTreeUrl, LdpConf.cache);
    await shapeTree.fetch();

    // Create and register ShapeTree instance.
    await shapeTree.instantiateStatic(shapeTree.getRdfRoot(), location, '.', postedContainer);
    Ecosystem.indexInstalledShapeTree(postedContainer, location, shapeTreeUrl);
    await postedContainer.write();
  }
  return location;
}

/** Validate POST according to step in ShapeTree.
 */
async function validatePost (entityUrl, payload, req, postedContainer, location, toAdd, ldpType) {

  // Get ShapeTree object from the container we're POSTing to.
  const shapeTree = await postedContainer.getRootedShapeTree(LdpConf.cache);
  await shapeTree.fetch();

  // Find the corresponding step.
  const pathWithinShapeTree = shapeTree.path.concat([toAdd]).join('/');
  const step = shapeTree.matchingStep(shapeTree.getRdfRoot(), req.headers.slug);
  console.assert(!step.name); // can post to static resources.
  Log('POST managed by', step.uriTemplate.value);

  // Validate the payload
  if (ldpType !== step.type)
    throw new RExtra.ManagedError(`Resource POSTed with link type=${ldpType} while ${step.node.value} expects a ${step.type}`, 422);
  if (ldpType == 'NonRDFSource') {
    // if (step.shape)
    //   throw new RExtra.ShapeTreeStructureError(this.url, `POST of NonRDFSource to ${RExtra.renderRdfTerm(step.node)} which has a tree:shape property`);
  } else {
    if (!step.shape)
      // @@issue: is a step allowed to not have a shape?
      throw new RExtra.ShapeTreeStructureError(this.url, `${RExtra.renderRdfTerm(step.node)} has no tree:shape property`);
    await shapeTree.validate(step.shape.value, req.headers['content-type'], payload, location, entityUrl.href);
  }

  // Return a lambda for creating a containers mandated by the ShapeTree.
  return () => shapeTree.instantiateStatic(step.node, location, pathWithinShapeTree, postedContainer);
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
