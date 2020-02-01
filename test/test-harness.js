'use strict';
const Util = require('util');
const Fse = require('fs-extra');
const Path = require('path');
const expect = require('chai').expect;
const Superagent = require('superagent');

const ShExCore = require('@shexjs/core');
const ShExUtil = ShExCore.Util;
const ShExValidator = ShExCore.Validator;

const N3 = require("n3");
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const C = require('../util/constants');

// Writer for debugging
const Relateurl = require('relateurl');
const TestPrefixes = {
  ldp: C.ns_ldp,
  xsd: C.ns_xsd,
  foot: C.ns_foot,
};

let Base
let DocRoot
let StaticPort

module.exports = function () {
  function init (docRoot) {
    DocRoot = docRoot;

    let appStoreInstance; // static server for schemas and footprints
    let ldpInstance; // test server

    before(() => {
      const appStoreServer = require('../appStoreServer');
      appStoreServer.init();
      appStoreInstance = appStoreServer.listen(0);
      StaticPort = appStoreInstance.address().port

      const ldpServer = require('../ldpServer');
      ldpInstance = ldpServer.listen(0);
      Base = `http://127.0.0.1:${ldpInstance.address().port}`;
      // LdpService.port = ldpInstance.address().port
    });

    after(() => {
      if (ldpInstance) ldpInstance.close()
      if (appStoreInstance) appStoreInstance.close()
    });
  }

  function getBase () { return Base; }
  function getStaticPort () { return StaticPort; }

  /**
   * NOTE: hard-coded for text/turtle
   */
  function expectSuccessfulStomp (t, resp) {
    // render failure message so we can see what went wrong
    const successCodes = [201, 304];
    if (successCodes.indexOf(resp.statusCode) === -1) resp.statusCode = dumpStatus(resp);
    // expect(successCodes).to.deep.equal( expect.arrayContaining([resp.statusCode]) );
    expect(resp.redirects).to.deep.equal([]);
    expect(resp.statusCode).to.deep.equal(t.status);
    expect(new URL(resp.headers.location).pathname).to.deep.equal(t.location);
    expect(resp.links).to.deep.equal({});
    expect(resp.headers['content-type']).match(/^text\/turtle/);
    const expectedPath = Path.join(DocRoot, t.location.slice(0, -1));
    expect(installedInPath(resp, expectedPath, Base + t.path).length).to.deep.equal(1);
  }

  function stomp (t, testResponse = expectSuccessfulStomp) {
    it('should STOMP ' + t.path + (t.slug || '-TBD-'), async () => {
      const footprintURL = t.getFootprint();
      const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                    `<${footprintURL}>; rel="footprint"`];
      let mediaType = t.mediaType || 'text/turtle';
      const registration = t.body || `PREFIX ldp: <http://www.w3.org/ns/ldp#>
[] ldp:app <${t.url}> .
<${t.url}> ldp:name "${t.name}" .
`
      const resp = await trySend(Base + t.path, link, t.slug, registration, mediaType);
      testResponse(t, resp);
    })
  }

  function expectSuccessfulPost (t, resp) {
    // render failure message so we can see what went wrong
    if (!resp.ok) resp.ok = dumpStatus(resp);
    expect(resp.ok).to.deep.equal(true);
    expect(resp.redirects).to.deep.equal([]);
    expect(resp.statusCode).to.deep.equal(201);
    expect(new URL(resp.headers.location).pathname).to.deep.equal(t.location);
    expect(resp.links).to.deep.equal({});
    if ('content-length' in resp.headers)
      expect(resp.headers['content-length']).to.deep.equal('0');
    expect(resp.text).to.deep.equal('')
  }

  function post (t, testResponse = expectSuccessfulPost) {
    it('should POST ' + t.path, async () => {// if (t.debug) { console.warn('starting debugger'); debugger }
      if (t.mkdirs)
        t.mkdirs.forEach(d => Fse.mkdirSync(Path.join(DocRoot, d)));

      let link = [`<http://www.w3.org/ns/ldp#${t.type}>; rel="type"`];
      let mediaType = t.mediaType || 'text/turtle';
      if (t.type !== 'NonRDFSource')
        link.push(`<${t.root['@id']}>; rel="root"`);
      const body = 'body' in t
            ? Fse.readFileSync(t.body, 'utf8')
            : `PREFIX ldp: <http://www.w3.org/ns/ldp#>\n<> a ldp:${t.type} ; ldp:path "${t.path}" .\n`;
      const resp = await trySend(Base + t.path, link, t.slug, body, mediaType);
      if (t.mkdirs)
        t.mkdirs.forEach(d => Fse.rmdirSync(Path.join(DocRoot, d)));
      testResponse(t, resp);
    })
  }

  function find (tests) {
    tests.forEach(t => {
      it('should GET ' + t.path, async () => {
        const resp = await tryGet(Base + t.path, t.accept);

        // render failure message so we can see what went wrong
        if (!resp.ok) resp.ok = dumpStatus(resp);
        expect(resp.ok).to.deep.equal(true);
        expect(resp.redirects).to.deep.equal([]);
        expect(resp.statusCode).to.deep.equal(200);
        expect(resp.links).to.deep.equal({});
        expect(resp.type).to.deep.equal(t.accept);
        expect(parseInt(resp.headers['content-length'], 10)).greaterThan(10);
        t.entries.map(
          p => expect(resp.text).match(new RegExp(p))
        )
      })
    })
  }

  function dontFind (tests) {
    tests.forEach(t => {
      it('should !GET ' + t.path, async () => {
        const resp = await tryGet(Base + t.path, 'text/turtle');

        // render failure message so we can see what went wrong
        if (resp.statusCode !== 404) resp.statusCode = dumpStatus(resp);
        expect(resp.statusCode).to.deep.equal(404);
        expect(resp.redirects).to.deep.equal([]);
        expect(resp.links).to.deep.equal({});
        expect(resp.type).to.deep.equal('application/json');
        expect(parseInt(resp.headers['content-length'], 10)).greaterThan(10);
        t.entries.map(
          p => expect(resp.text).match(new RegExp(p))
        )
      })
    })
  }

  async function tryGet (url, accept) {
    try {
      return await Superagent.get(url)
        .set('Accept', accept)
    } catch (e) {
      // if (!e.response)
      //   console.warn('HERE', e);
      return e.response
    }
  }

  async function trySend (url, link, slug, body, contentType = 'text/turtle') {
    try {
      const req = Superagent.post(url)
            .set('link', link)
            .set('content-type', contentType);
      if (slug)
        req.set('slug', slug);
      integrateHeaders(req); // console.warn(body);
      return await req.send(body)
    } catch (e) {
      return e.response
    }
  }

  function integrateHeaders (req) {
    if (!('HEADERS' in process.env))
      return
    const h = Fse.readFileSync(process.env.HEADERS, 'utf8');
    const pairs = h.split(/\n/).filter(
      s => s.length
    ).map(
      line => line.split(/^(.*?): ?(.*)$/).slice(1)
    );
    pairs.forEach(
      pair => req.set(pair[0], pair[1])
    );
  }

  function installedInPath (resp, path, base) {
    const graph = new N3.Store();
    const parser = new N3.Parser({baseIRI: base, format: 'text/turtle', blankNodePrefix: '' })
    const qz = parser.parse(resp.text);
    graph.addQuads(qz);
    return graph.getQuads(null, DataFactory.namedNode(C.ns_foot + 'installedIn'), null).filter(q => {
      const appTz = graph.getQuads(q.object, DataFactory.namedNode(C.ns_foot + 'footprintInstancePath'), DataFactory.literal(path))
      return appTz.length === 1;
    });
  }

  // disabled versions of above functions
  function xstomp (t) {
    xit('should STOMP ' + t.path, async () => { })
  }
  function xpost (t) {
    xit('should POST ' + t.path, async () => { })
  }
  function xfind (tests) {
    tests.forEach(t => { xit('should GET ' + t.path, async () => { }) })
  }
  function xdontFind (tests) {
    tests.forEach(t => { xit('should !GET ' + t.path, async () => { }) })
  }

  function dumpStatus (resp) {
    return `${resp.request.method} ${resp.request.url} =>
 ${resp.status} ${Util.inspect(resp.headers)}

${resp.text}`
  }
  return {
    init,
    getBase,
    getStaticPort,
    stomp,
    post,
    find,
    dontFind,
    tryGet,
    trySend,
    xstomp,
    xpost,
    xfind,
    xdontFind,
    dumpStatus,
    expect
  }
}

function serializeTurtleSync (graph, base, prefixes) {
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

