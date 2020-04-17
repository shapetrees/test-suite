const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const RExtra = require('./util/rdf-extra')
const LdpConf = JSON.parse(require('fs').readFileSync('./servers.json', 'utf-8')).find(
  conf => conf.name === "LDP"
);
const C = require('./util/constants');
const fileSystem = new (require('./filesystems/fs-promises-utf8'))(LdpConf.documentRoot, LdpConf.indexFile)
const Blueprint = require('./util/blueprint')(fileSystem)
const Ecosystem = new (require('./ecosystems/simple-apps'))('Apps/', Blueprint);

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
      const lstat = await fileSystem.lstat(new URL(filePath, rootUrl))
            .catch(e => {
              const error = new RExtra.NotFoundError(req.originalUrl, 'queried resource', `${req.method} ${req.originalUrl}`);
              error.status = 404;
              throw error;
            });
      const links = parseLinks(req);
      if (req.method === 'POST') {
        const parent = await new Blueprint.managedContainer(new URL(req.originalUrl, rootUrl))
              .finish();
        // console.log(parent.url.href, parent.graph.getQuads())

        // otherwise store a new resource or create a new blueprint
        const typeLink = links.type.substr(C.ns_ldp.length);
        const toAdd = await firstAvailableFile(rootUrl, filePath, req.headers.slug || typeLink);
        const {host, port} = parseHost(req);
        const isStomp = !!links.blueprint;
        const isContainer = typeLink === 'Container' || isStomp;
        const newPath = path.join(req.originalUrl.substr(1), toAdd) + (isContainer ? '/' : '');
        const location = `http://${host}:${port}/${newPath}`;
        const blueprint = isStomp
              ? new Blueprint.remoteBlueprint(new URL(links.blueprint), LdpConf.cache)
              : await parent.getRootedBlueprint(LdpConf.cache);

        if (isStomp) {
          // Try to re-use an old blueprint.
          const oldLocation = parent.reuseBlueprint(blueprint);
          const payloadGraph = await RExtra.parseRdf(
            req.body.toString('utf8'),
            new URL(oldLocation || location),
            req.headers['content-type']
          );

          let directory;
          if (oldLocation) {
            // Register the new app and return the location.
            directory = new URL(oldLocation).pathname.substr(1);
          } else {
            await blueprint.fetch();
            const container = await blueprint.instantiateStatic(blueprint.getRdfRoot(), rootUrl,
                                                                newPath, '.', parent);
            parent.indexInstalledBlueprint(location, blueprint.url);
            await parent.write();
            directory = newPath;
          }
          const appData = Blueprint.parseInstatiationPayload(payloadGraph)
          const [added, prefixes] = await Ecosystem.registerInstance(appData, blueprint, directory);
          const rebased = await RExtra.serializeTurtle(added, parent.url, prefixes);

          res.setHeader('Location', oldLocation || location);
          res.status(201); // wanted 304 but it doesn't permit a body
          res.setHeader('Content-type', 'text/turtle');
          res.send(rebased) // respPayload)
        } else {
          // add a resource to a Container

          await blueprint.fetch();
          const pathWithinBlueprint = blueprint.path.concat([toAdd]).join('/');
          const step = blueprint.matchingStep(blueprint.getRdfRoot(), req.headers.slug);
          let payload = req.body.toString('utf8');
          if (typeLink == 'NonRDFSource') {
            payload = req.body.toString('utf8');
            // what to we validate for non-rdf sources? https://github.com/solid/specification/issues/108
          } else {
            payload = req.body.toString('utf8');
            if (!step.shape)
              // @@issue: is a step allowed to not have a shape?
              throw new RExtra.BlueprintStructureError(this.url, `${RExtra.renderRdfTerm(step.node)} has no foot:shape property`);
            await blueprint.validate(step.shape.value, req.headers['content-type'], payload, new URL(location), new URL(links.root, location).href);
          }
          if (typeLink !== step.type)
            throw new RExtra.ManagedError(`Resource POSTed with link type=${typeLink} while ${step.node.value} expects a ${step.type}`, 422);
          if (typeLink === 'Container') {
            const dir = await blueprint.instantiateStatic(step.node, rootUrl, newPath, pathWithinBlueprint, parent);
            await dir.merge(payload, new URL(location));
            await dir.write()
          } else {
            // it would be nice to trim the location to allow for conneg
            await fileSystem.write(new URL(path.join(filePath, toAdd), rootUrl), payload, {encoding: 'utf8'})
          }

          parent.addMember(location, blueprint.url);
          await parent.write();

          res.setHeader('Location', location);
          res.status(201);
          res.send();
        }
      } else {
        if (lstat.isDirectory())
          req.url = fileSystem.getIndexFilePath(new URL(req.url, rootUrl));
        next()
      }
    } catch (e) {
      /* istanbul ignore else */
      if (e instanceof RExtra.ManagedError) {
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
      list => new Blueprint.managedContainer(new URL(d.path, new URL('http://localhost/')), d.title, null, null).finish().then(
        container => list.concat([container.newDir])
      )
    )
    , Promise.resolve([])
  );
}

async function firstAvailableFile (rootUrl, fromPath, slug) {
  let unique = 0;
  let tested;
  while (await fileSystem.exists(
    new URL(path.join(
      fromPath,
      tested = slug + (
        unique > 0
          ? '-' + unique
          : ''
      )
    ), rootUrl)
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
