'use strict';
const Util = require('util');
const Fse = require('fs-extra');
const Path = require('path');
const expect = require('chai').expect;

const ShExCore = require('@shexjs/core');
const ShExUtil = ShExCore.Util;
const ShExValidator = ShExCore.Validator;

const RdfSerialization = require('../shapetree.js/lib/rdf-serialization');
const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const Confs = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8'));
const Prefixes = require('../shapetree.js/lib/prefixes');
const Storage = new (require('../shapetree.js/storage/fs-promises'))(Confs.LDP.documentRoot, Confs.LDP.indexFile, RdfSerialization, 'utf8');
const FetchSelfSigned = require('../shapetree.js/storage/fetch-self-signed')(require('node-fetch'));
let Fetch = FetchSelfSigned; // overwritten for client-side ShapeTree support

let ShapeTree = null; // require('../shapetree.js/lib/shape-tree')(Storage, RdfSerialization, require('../shapetree.js/storage/fetch-self-signed')(require('node-fetch')));

// Writer for debugging
const Relateurl = require('relateurl');
const TestPrefixes = {
  ldp: Prefixes.ns_ldp,
  xsd: Prefixes.ns_xsd,
  tree: Prefixes.ns_tree,
};

let LdpBase
let AppStoreBase
let DocRoot
let Resolve
let Initialized = new Promise((resolve, reject) => {
  Resolve = resolve;
})


  const ret = {
    init,
    plant,
    post,
    put,
    find,
    dontFind,
    walkReferencedTrees,
    walkReferencedResources,
    tryGet,
    tryPost,
    tryDelete,
    xplant,
    xpost,
    xput,
    xfind,
    xdontFind,
    dumpStatus,
    expect,
    ensureTestDirectory,

    // more intimate API used by local.test.js
    LdpConf: Confs.LDP,
    Storage,
    contentType,

    // not available until init.initialized resolves
    ldpBase: null,
    appStoreBase: null,
    ShapeTree: null,
  };
module.exports =  ret;

  function init (docRoot) {
    DocRoot = docRoot;

    let appStoreInstance; // static server for schemas and ShapeTrees
    let ldpInstance; // test server

    init.initialized = init.initialized || startBothServers();
    before(() => init.initialized);

    async function startBothServers () {
      const appStoreServer = require('../servers/AppStore');
      // For test code coverage, add a fake path for AppStore server to serve.
      appStoreServer.configure(null, ['fakeUrlPath:fakeFilePath']);
      [appStoreInstance, AppStoreBase] = startServer(Confs.AppStore, appStoreServer, process.env.PORT || 0);
      ret.appStoreBase = AppStoreBase;

      // Tests ignore TLS certificates with fetch-self-signed.
      // Could instead: process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
      const ldpServer = require('../servers/LDP');
      [ldpInstance, LdpBase] = startServer(Confs.LDP, ldpServer, 0);
      ret.ldpBase = LdpBase;
      ldpServer.setBase(ldpServer, LdpBase);
      ret.ShapeTree = ShapeTree = (await ldpServer.initialized).shapeTree;

      if (process.env.SHAPETREE === 'fetch') {
        const fsModule = require('../shapetree.js/storage/ldp-proxy');
        const fs = new fsModule(LdpBase, RdfSerialization, FetchSelfSigned);
        Fetch = await require('../shapetree.js/lib/shape-tree-fetch')(fs, RdfSerialization, FetchSelfSigned, LdpBase, Confs.LDP);
      }

      Resolve();
    }

    after(() => {
      if (ldpInstance) { ldpInstance.close(); ldpInstance = null; }
      if (appStoreInstance) { appStoreInstance.close(); appStoreInstance = null; }
    });

    return init.initialized;

    function startServer (conf, server, port) {
      const instance = conf.protocol === 'http'
            ? require('http').createServer(server) // For HTTP, server is first parameter.
            : require('https').createServer({ // For HTTPS, server is second parameter!
              key: Fse.readFileSync(conf.keyFilePath),
              cert: Fse.readFileSync(conf.certFilePath)
            }, server);
      instance.listen(port);
      const base = new URL(`${conf.protocol}://localhost:${instance.address().port}`);
      return [instance, base];
    }
  }

  function contentType (resp) {
    const ct = resp.headers.get('content-type');
    return ct ? ct.split(/; */)[0] : null;
  }

  /**
   * NOTE: hard-coded for text/turtle
   */
  async function expectSuccessfulPlant (t, resp) {
    // render failure message so we can see what went wrong
    const body = await resp.text();
    if (resp.status !== t.status) await dumpStatus(resp, body);
    expect(resp.status).to.equal(t.status);
    if (t.status >= 200 && t.status < 300) {
      const locationUrl = new URL(resp.headers.get('location'));
      expect(locationUrl.pathname).to.equal(t.location);
      expect(resp.headers.get('link')).to.equal(null);
      expect(contentType(resp)).to.equal('text/turtle');
      expect(installedIn(body, locationUrl, new URL(t.path, LdpBase).href).length).to.equal(1);
      expect(resp.ok).to.equal(true); // last 'cause it's the least informative
    } else {
      const error = JSON.parse(body);
      (t.entries || []).map(
        p => expect(error.message).match(new RegExp(p))
      )
    }
  }

  async function expectSuccessfulPt (t, resp) {
    // render failure message so we can see what went wrong
    const body = await resp.text();
    if (resp.status !== t.status) await dumpStatus(resp, body);
    expect(resp.status).to.equal(t.status);
    if (t.status >= 200 && t.status < 300) {
      if (t.location)
        expect(new URL(resp.headers.get('location')).pathname).to.equal(t.location);
      expect(resp.headers.get('link')).to.equal(null);
      if (resp.headers.get('content-length'))
        expect(resp.headers.get('content-length')).to.equal('0');
      expect(body).to.equal('')
      expect(resp.ok).to.equal(true); // last 'cause it's the least informative
    } else {
      const error = JSON.parse(body);
      (t.entries || []).map(
        p => expect(error.message).match(new RegExp(p))
      )
    }
  }

  const failMark = (t) => t.status >= 200 && t.status < 300 ? '' : '!';

  function plant (t, testResponse = expectSuccessfulPlant) {
    it('should ' + failMark(t) + 'PLANT ' + t.path + (t.slug || '-TBD-'), async () => {
      const shapeTreeURL = new URL(t.shapeTreePath, AppStoreBase);
      const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                    `<${shapeTreeURL}>; rel="shapeTree"`];
      let mediaType = t.mediaType || 'text/turtle';
      const registration = t.body || `PREFIX ldp: <http://www.w3.org/ns/ldp#>
[] ldp:app <${t.url}> .
<${t.url}> ldp:name "${t.name}" .
`;
      const resp = await tryPost(new URL(t.path, LdpBase.href), mediaType, registration, link, t.slug);
      await testResponse(t, resp);
    })
  }

  async function pt (t, method, dispatch, testResponse) {
    if (t.mkdirs)
      t.mkdirs.forEach(d => Fse.mkdirSync(Path.join(DocRoot, d)));

    let link = [`<http://www.w3.org/ns/ldp#${t.type}>; rel="type"`];
    let mediaType = t.mediaType || 'text/turtle';
    if (t.root)
      link.push(`<${t.root['@id']}>; rel="root"`);
    const body = 'bodyURL' in t
          ? Fse.readFileSync(t.bodyURL, 'utf8')
          : `PREFIX ldp: <http://www.w3.org/ns/ldp#>\n<> a ldp:${t.type} ; ldp:path "${t.path}" .\n`;
    const resp = await dispatch(new URL(t.path, LdpBase), mediaType, body, link, t.slug);
    if (t.mkdirs)
      t.mkdirs.forEach(d => Fse.rmdirSync(Path.join(DocRoot, d)));
    await testResponse(t, resp);
  }

  function post (t, testResponse = expectSuccessfulPt) {
    it('should ' + failMark(t) + 'POST ' + t.path + (t.slug || '-TBD-'),
       () => pt(t, 'POST', tryPost, testResponse)
      );
  }

  function put (t, testResponse = expectSuccessfulPt) {
    it('should ' + failMark(t) + 'PUT ' + t.path,
       () => pt(t, 'PUT', tryPut, testResponse)
      );
  }

  function find (tests) {
    tests.forEach(t => {
      it('should GET ' + t.path, async () => {
        const resp = await tryGet(new URL(t.path, LdpBase.href), t.accept);
        const body = await resp.text();

        // render failure message so we can see what went wrong
        if (resp.status !== 200) await dumpStatus(resp, body);
        // expect(resp.ok).to.equal(true);
        expect(resp.status).to.equal(200);
        expect(resp.headers.get('link')).to.equal(
          t.path.endsWith('/')
            ? '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
          : null
        );
        expect(contentType(resp)).to.equal(t.accept);
        expect(parseInt(resp.headers.get('content-length'), 10)).greaterThan(10);
        t.entries.map(
          p => expect(body).match(new RegExp(p))
        )
      })
    })
  }

  function dontFind (tests) {
    tests.forEach(t => {
      it('should !GET ' + t.path, async () => {
        const resp = await tryGet(new URL(t.path, LdpBase.href), 'text/turtle');
        const body = await resp.text();

        // render failure message so we can see what went wrong
        if (resp.status !== 404) await dumpStatus(resp, body);
        expect(resp.status).to.equal(404);
        // expect(resp.links).to.deep.equal({});
        expect(contentType(resp)).to.equal('application/json');
        expect(parseInt(resp.headers.get('content-length'), 10)).greaterThan(10);
        t.entries.map(
          p => expect(body).match(new RegExp(p))
        )
      })
    })
  }

  function walkReferencedTrees (t) {
    it('should traverse shapetree references (walkReferencedTrees)', async () => {
      const shapeTreeStep = new URL(t.path, AppStoreBase);
      const expected = t.expect.map(exp => ({
        treeStep: new URL(exp.treeStep, shapeTreeStep),
        shapePath: exp.shapePath
      }));
      const f = new ShapeTree.RemoteShapeTree(shapeTreeStep);
      await f.fetch();
      const got = [... await f.walkReferencedTrees()];
      expect(got).to.deep.equal(expected);
    });
  }

  function walkReferencedResources (t) {
    it('should traverse referenced shapetree instance members (walkReferencedResources(start))', async () => {
      const shapeTreeStep = new URL(t.path, AppStoreBase);
      const expected = t.expect.map(exp => ({
        treeStep: new URL(exp.treeStep, shapeTreeStep),
        shapePath: exp.shapePath
      }));
      const f = new ShapeTree.RemoteShapeTree(shapeTreeStep);
      await f.fetch();
      const got = [... await f.walkReferencedTrees()];
      expect(got).to.deep.equal(expected);
    });
  }

  async function tryGet (url, accept) {
    const opts = {
      headers: { accept }
    }
    const resp = await Fetch(new URL(url, LdpBase), integrateHeaders(opts));
    resp.request = {url, method: 'GET', headers: opts.headers};
    return resp;
  }

  async function tryPut (url, contentType = 'text/turtle', body, link) {
    const opts = {
      method: 'PUT',
      headers: { link: link, 'content-type': contentType },
      body: body
    }
    const resp = await Fetch(new URL(url, LdpBase), integrateHeaders(opts));
    resp.request = {url, method: 'PUT', headers: opts.headers};
    return resp;
  }

  async function tryPost (url, contentType = 'text/turtle', body, link, slug) {
    const opts = {
      method: 'POST',
      headers: { link: link, 'content-type': contentType },
      body: body
    }
    if (slug)
      opts.headers.slug = slug;
    const resp = await Fetch(new URL(url, LdpBase), integrateHeaders(opts));
    resp.request = {url, method: 'POST', headers: opts.headers};
    return resp;
  }

  async function tryDelete (path) {
    return Fetch(new URL(path, LdpBase), integrateHeaders({method: 'DELETE'}));
  }

  function integrateHeaders (opts = {}) {
    if (!('HEADERSFILE' in process.env))
      return opts;
    opts.headers = opts.headers || {};
    const h = Fse.readFileSync(process.env.HEADERSFILE, 'utf8');
    const pairs = h.split(/\n/).filter(
      s => s.length
    ).map(
      line => line.split(/^(.*?): ?(.*)$/).slice(1)
    );
    pairs.forEach(
      pair => opts.headers[pair[0]] = pair[1]
    );
    return opts;
  }

  function installedIn (body, location, base) {
    const graph = new N3.Store();
    const parser = new N3.Parser({baseIRI: base, format: 'text/turtle', blankNodePrefix: '' })
    const qz = parser.parse(body);
    graph.addQuads(qz);
    return graph.getQuads(null, DataFactory.namedNode(Prefixes.ns_tree + 'installedIn'), null).filter(q => {
      const appTz = graph.getQuads(q.object, DataFactory.namedNode(Prefixes.ns_tree + 'shapeTreeInstancePath'), DataFactory.namedNode(location.href))
      return appTz.length === 1;
    });
  }

  // disabled versions of above functions
  function xplant (t) {
    xit('should PLANT ' + t.path, async () => { })
  }
  function xpost (t) {
    xit('should POST ' + t.path, async () => { })
  }
  function xput (t) {
    xit('should PUT ' + t.path, async () => { })
  }
  function xfind (tests) {
    tests.forEach(t => { xit('should GET ' + t.path, async () => { }) })
  }
  function xdontFind (tests) {
    tests.forEach(t => { xit('should !GET ' + t.path, async () => { }) })
  }

  /** Ensure installDir is available on the server.
   * This is kinda crappy 'cause it mixes ShapeTrees in but it saves a lot of typing to have it here.
   */
async function ensureTestDirectory (installDir, docRoot) { if (docRoot) console.warn(Error('HERE'))
    await Initialized;
    return installDir.split(/\//).filter(d => !!d).reduce(
      async (promise, dir) => {
        return promise.then(async parent => {
          const ret = Path.join(parent, dir);
          if (!Fse.existsSync(Path.join(Confs.LDP.documentRoot, ret)))
            await new ShapeTree.Container(new URL(ret + Path.sep, LdpBase), '/' + ret).ready;
          return ret
        })
      }, Promise.resolve(''));
  }

function dumpStatus (resp, body) {
  console.warn(`${resp.request.method} ${resp.request.url} ${Util.inspect(resp.request.headers)} =>
 ${resp.status} ${Util.inspect(resp.headers)}

${body}`);
  }

function serializeTurtleSync999 (graph, base, prefixes) {
  if (graph instanceof Array)    // either an N3.Store
    graph = new N3.Store(graph); // or an Array of quads

  // Create RegExp to test for matching namespaces
  // Is this faster than !Object.values(prefixes).find(ns => q[t].value.startsWith(ns) ?
  const p = new RegExp('^(?:' + Object.values(prefixes).map(
    ns => ns.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  ).map(
    nsr => '(?:' + nsr + ')'
  ).join('|') + ')')

  const writer = new N3.Writer({ prefixes });
  writer.addQuads(graph.getQuads().map(q => {
    const terms = ['subject', 'object'];
    terms.forEach(t => {
      if (q[t].termType === 'NamedNode' // term is an IRI
          && !q[t].value.match(p))      // no applicable prefix
        q[t] = namedNode(Relateurl.relate(base, q[t].value, { output: Relateurl.ROOT_PATH_RELATIVE }))
    });
    return q
  }));
  let text
  writer.end((error, result) => {
    /* istanbul ignore next */
    if (error)
      throw Error(error);
    else
      text = result
  });
  return text;
}

