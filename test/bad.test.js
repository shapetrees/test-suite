'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const Footprint = require('../util/footprint');
const C = require('../util/constants');
const Confs = JSON.parse(Fse.readFileSync('./servers.json', 'utf-8'));
const LdpConf = Confs.find(c => c.name === "LDP");
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness')();

installIn('Shared/bad');
// installIn('Shared/bad/public');

function installIn (installDir) {
describe(`install in ${installDir || 'root'}`, function () {
  installDir.split(/\//).filter(d => !!d).reduce(
    (parent, dir) => {
      const ret = Path.join(parent, dir);
      if (!Fse.existsSync(Path.join(TestRoot, ret)))
        new Footprint.localContainer(new URL('http://localhost/'), ret + Path.sep, TestRoot, C.indexFile, "pre-installed " + ret);
      return ret
    }, "");

  describe('initial state', () => {
    H.find([
      // {path: '/', accept: 'text/turtle', entries: ['root']},
      {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: [`pre-installed ${installDir}`]},
    ]);
    H.dontFind([
      {path: `${Path.join('/', installDir, '/')}Albums2019/`, type: 'text/html', entries: ['Albums2019']},
    ]);
  });

  describe('STOMP', function () {
    describe(`should fail with bad Turtle`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`,
               status: 422, location: 'N/A', body: '@prefix x: <>\n@@bad Turtle@@', mediaType: 'text/turtle', entries: ['Unexpected "@@bad" on line 2']},
              expectFailure(422));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
      ]);
    });

    describe(`should fail with bad JSON`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`,
               status: 422, location: 'N/A', body: '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}', mediaType: 'application/ld+json', entries: ['Unexpected token @']},
              expectFailure(422));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
      ]);
    });

    describe(`should fail with bad JSONLD`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`,
               status: 422, location: 'N/A', body: '{\n  "foo": 1,\n  "@id": 2\n}', mediaType: 'application/ld+json', entries: ['"@id" value must a string']},
              expectFailure(422));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
      ]);
    });
  });

  describe(`create ${Path.join('/', installDir, '/')}Albums2019/ hierarchy -- missing schema`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/bad/FootprintMissingSchema#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Albums2019/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Albums2019/ref-1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019/`, slug: 'ref-1.ttl',
              body: 'test/bad/ref-1.ttl', root: {'@id': ''},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Albums2019/ref-1.ttl`},
             expectFailure(424));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
      ]);
    });
  });

  describe(`create ${Path.join('/', installDir, '/')}Albums2019-1/ hierarchy -- referenced shape does not findable`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-1/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/bad/FootprintMissingShape#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019-1/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Albums2019-1/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-1/ref-1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019-1/`, slug: 'ref-1.ttl',
              body: 'test/bad/ref-1.ttl', root: {'@id': ''},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Albums2019-1/ref-1.ttl`},
             expectFailure(424));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019-1/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
      ]);
    });
  });

  describe(`create ${Path.join('/', installDir, '/')}Albums2019-2/ hierarchy -- nonconformant POST`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-2/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/bad/PhotoAlbumFootprint#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019-2/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Albums2019-2/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
      ]);
    });
    // A POST with a Slug which doesn't match any URI template gets a 422 and no created resource.
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-2/malformed-ref-1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019-2/`, slug: 'malformed-ref-1.ttl',
              body: 'test/bad/malformed-ref-1.ttl', root: {'@id': ''},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Albums2019-2/malformed-ref-1.ttl`},
             expectFailure(422));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019-2/malformed-ref-1.ttl`, accept: 'text/turtle', entries: ['malformed-ref-1.ttl', 'status']},
      ]);
    });
    // A POST of an invalid resource gets a 424 and no created resource.
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-2/ref-invalid-2`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019-2/`, slug: 'ref-invalid-2.ttl',
              body: 'test/bad/ref-invalid-2.ttl', root: {'@id': ''},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Albums2019-2/ref-invalid-2.ttl`},
             expectFailure(422));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019-2/ref-invalid-2.ttl`, accept: 'text/turtle', entries: ['ref-invalid-2.ttl', 'status']},
      ]);
    });
  });

  describe(`create ${Path.join('/', installDir, '/')}Albums2019-3/ hierarchy -- malformed footprint: two static names`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-3/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/bad/FootprintTwoStaticNames#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019-3/`},
              expectFailure(424));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019-3/`, accept: 'text/turtle', entries: ['Albums2019-3']},
      ]);
    });
  });

  describe(`create ${Path.join('/', installDir, '/')}Albums2019-3/ hierarchy -- malformed footprint: two nested static names`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-3/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/bad/FootprintNestedTwoStaticNames#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019-3/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Albums2019-3/`, accept: 'text/turtle', entries: ['FootprintNestedTwoStaticNames', 'footprintInstancePath', 'footprintInstanceRoot']},
      ]);
    });
    // A POST onto a malformed footprint gets a 424 and no created resource.
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-3/ref-1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019-3/`, slug: 'ref-1.ttl',
              body: 'test/bad/ref-1.ttl', root: {'@id': ''},
              type: 'Container', location: `${Path.join('/', installDir, '/')}Albums2019-3/ref-1.ttl`},
             expectFailure(424));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019-3/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
      ]);
    });
  });

  describe(`create ${Path.join('/', installDir, '/')}Albums2019-4/ hierarchy -- no shape property`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-4/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/bad/FootprintNoShapeProperty#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019-4/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Albums2019-4/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Albums2019-4/ref-1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019-4/`, slug: 'ref-1.ttl',
              body: 'test/bad/ref-1.ttl', root: {'@id': ''},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Albums2019-4/ref-1.ttl`},
             expectFailure(424));
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019-4/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
      ]);
    });
  });

})
}

function expectFailure (statusCode) {
  return function (t, resp) {
    H.expect(resp.ok).to.deep.equal(false);
    H.expect(resp.redirects).to.deep.equal([]);
    H.expect(resp.statusCode).to.deep.equal(statusCode);
    const error = JSON.parse(resp.text);
    (t.entries || []).map(
      p => H.expect(error.message).match(new RegExp(p))
    )
  }
}

