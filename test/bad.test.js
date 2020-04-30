'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const C = require('../util/constants');
const Confs = JSON.parse(Fse.readFileSync('./servers.json', 'utf-8'));
const LdpConf = Confs.find(c => c.name === "LDP");
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness')();

installIn(LdpConf.shared);
// installIn('some/deep/path');

function installIn (installDir) {
  describe(`test/bad.test.js - installed in ${installDir}`, async function () {
    await H.ensureTestDirectory(installDir, TestRoot);

    describe('initial state', () => {
      H.find([
        // {path: '/', accept: 'text/turtle', entries: ['root']},
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: [installDir]},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}bad-nonconformant-POST/`, type: 'text/html', entries: ['bad-nonconformant-POST']},
      ]);
      it('should fail to delete /', async () => {
        try {
          const resp = await H.tryDelete('/');
          console.assert(resp.status === 405);
        } catch (e) {
          console.assert(e.status === 405);
        }
      });
      it('should fail to delete /doesnotexist', async () => {
        try {
          const resp = await H.tryDelete('/doesnotexist');
          console.assert(resp.status === 404);
        } catch (e) {
          console.assert(e.status === 404);
        }
      });
    });

    describe('STOMP', function () {
      describe(`should fail with bad Turtle`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getShapeTree: () => new URL('cal/GoogleShapeTree#top', H.getAppStoreBase()),
                 status: 422, location: 'N/A', body: '@prefix x: <>\n@@bad Turtle@@', mediaType: 'text/turtle', entries: ['Unexpected "@@bad" on line 2']},
                expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`should fail with bad JSON`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getShapeTree: () => new URL('cal/GoogleShapeTree#top', H.getAppStoreBase()),
                 status: 422, location: 'N/A', body: '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}', mediaType: 'application/ld+json', entries: ['Unexpected token @']},
                expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`should fail with bad JSONLD`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getShapeTree: () => new URL('cal/GoogleShapeTree#top', H.getAppStoreBase()),
                 status: 422, location: 'N/A', body: '{\n  "foo": 1,\n  "@id": 2\n}', mediaType: 'application/ld+json', entries: ['"@id" value must a string']},
                expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}bad-nonexistent-shape/ hierarchy -- schema does not contain shape`, () => {
      describe(`create ${Path.join('/', installDir, '/')}bad-nonexistent-shape/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'bad-nonexistent-shape', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('bad/ShapeTreeMissingSchema#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}bad-nonexistent-shape/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}bad-nonexistent-shape/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}bad-nonexistent-shape/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-nonexistent-shape/`, slug: 'ref-1.ttl',
                body: 'test/bad/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}bad-nonexistent-shape/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-nonexistent-shape/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}bad-unGETtable-shape/ hierarchy -- can't GET referenced shape`, () => {
      describe(`create ${Path.join('/', installDir, '/')}bad-unGETtable-shape/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'bad-unGETtable-shape', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('bad/ShapeTreeMissingShape#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}bad-unGETtable-shape/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}bad-unGETtable-shape/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}bad-unGETtable-shape/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-unGETtable-shape/`, slug: 'ref-1.ttl',
                body: 'test/bad/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}bad-unGETtable-shape/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-unGETtable-shape/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    // a successful STOMP followed by non-conformant POSTs
    describe(`create ${Path.join('/', installDir, '/')}bad-nonconformant-posts/ hierarchy -- POSTed data does not validate`, () => {
      describe(`create ${Path.join('/', installDir, '/')}bad-nonconformant-posts/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'bad-nonconformant-posts', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('bad/PhotoAlbumShapeTree#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      // A POST with a Slug which doesn't match any URI template gets a 422 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}bad-nonconformant-posts/malformed-ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/`, slug: 'malformed-ref-1.ttl',
                body: 'test/bad/malformed-ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/malformed-ref-1.ttl`},
               expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/malformed-ref-1.ttl`, accept: 'text/turtle', entries: ['malformed-ref-1.ttl', 'status']},
        ]);
      });
      // A POST of an invalid resource gets a 424 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}bad-nonconformant-posts/ref-invalid-2`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/`, slug: 'ref-invalid-2.ttl',
                body: 'test/bad/ref-invalid-2.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/ref-invalid-2.ttl`},
               expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/ref-invalid-2.ttl`, accept: 'text/turtle', entries: ['ref-invalid-2.ttl', 'status']},
        ]);
      });
      // A POST of an invalid resource gets a 424 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}bad-nonconformant-posts/ref-valid-3`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/`, slug: 'ref-valid-3.ttl',
                body: 'test/bad/ref-valid-3.ttl', root: {'@id': ''},
                type: 'Container', location: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/ref-valid-3.ttl`},
               expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-nonconformant-posts/ref-valid-3.ttl`, accept: 'text/turtle', entries: ['ref-valid-3.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}bad-malformed-shapeTree-two-names/ hierarchy -- malformed shapeTree: two static names`, () => {
      describe(`create ${Path.join('/', installDir, '/')}bad-malformed-shapeTree-two-names/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'bad-malformed-shapeTree-two-names', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('bad/ShapeTreeTwoStaticNames#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-two-names/`},
                expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-two-names/`, accept: 'text/turtle', entries: ['bad-malformed-shapeTree-two-names']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/ hierarchy -- malformed shapeTree: two nested static names`, () => {
      describe(`create ${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'bad-malformed-shapeTree-nested-two-names', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('bad/ShapeTreeNestedTwoStaticNames#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/`, accept: 'text/turtle', entries: ['ShapeTreeNestedTwoStaticNames', 'shapeTreeInstancePath', 'shapeTreeInstanceRoot']},
        ]);
      });
      // A POST onto a malformed shapeTree gets a 424 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/`, slug: 'ref-1.ttl',
                body: 'test/bad/ref-1.ttl', root: {'@id': ''},
                type: 'Container', location: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-malformed-shapeTree-nested-two-names/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}bad-missing-shape-property/ hierarchy -- shapeTree step has no shape property`, () => {
      describe(`create ${Path.join('/', installDir, '/')}bad-missing-shape-property/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'bad-missing-shape-property', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('bad/ShapeTreeNoShapeProperty#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}bad-missing-shape-property/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}bad-missing-shape-property/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}bad-missing-shape-property/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}bad-missing-shape-property/`, slug: 'ref-1.ttl',
                body: 'test/bad/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}bad-missing-shape-property/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}bad-missing-shape-property/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
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

