'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const LdpConf = JSON.parse(Fse.readFileSync('./servers/config.json', 'utf-8')).LDP;
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness');
H.init(TestRoot);

installIn(LdpConf.shared);
installIn('some/deep/path');

function installIn (installDir) {
  describe(`test/shape-trees.test.js - installed in ${installDir}`, function () {
    before(() => H.ensureTestDirectory(installDir, TestRoot));

    describe('initial state', () => {
      H.find([
        // {path: '/', accept: 'text/turtle', entries: ['root']},
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: [installDir]},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-POST/`, type: 'text/html', entries: ['ShapeMaps-nonconformant-POST']},
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

    describe('PLANT', function () {
      describe(`should fail with bad Turtle`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
                 status: 422, location: 'N/A', body: '@prefix x: <>\n@@bad Turtle@@', mediaType: 'text/turtle', entries: ['Unexpected "@@bad" on line 2']},
                expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`should fail with bad JSON`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
                 status: 422, location: 'N/A', body: '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}', mediaType: 'application/ld+json', entries: ['Unexpected token @']},
                expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`should fail with bad JSONLD`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
                 status: 422, location: 'N/A', body: '{\n  "foo": 1,\n  "@id": 2\n}', mediaType: 'application/ld+json', entries: ['"@id" value must a string']},
                expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });


      describe(`PUT tests`, () => {
        describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`, () => {
          H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-PUT-tests', name: 'GhApp', url: 'http://store.example/gh', shapeTreePath: 'gh/ghShapeTree#root',
                   status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`});
          H.find([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
          ])
        });

        describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`, () => {
          H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/`, slug: 'ericprud', type: 'Container',
                  body: 'test/apps/gh/ericprud-user.ttl', root: {'@id': '#ericprud'},
                  parms: {userName: 'ericprud'}, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`});
          H.find([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`, accept: 'text/turtle', entries: ['users/ericprud']},
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/`, accept: 'text/turtle', entries: ['users/ericprud/subscriptions']},
          ]);
          H.dontFind([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscr1.ttl']},
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
          ]);
          describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/`, slug: 'subscr1.ttl',
                    body: 'test/apps/gh/ericprud-subscr1.ttl', root: {'@id': '#subscr-1'},
                    type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/subscr1.ttl`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscription_url', 'updated_at']},
            ])
          })
        });

        describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`, () => {
          H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/`, slug: 'ericprud', type: 'Container',
                  body: 'test/apps/gh/ericprud-user.ttl', root: {'@id': '#ericprud'},
                  parms: {userName: 'ericprud'}, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`});
          H.find([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`, accept: 'text/turtle', entries: ['users/ericprud']},
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`, accept: 'text/turtle', entries: ['users/ericprud-1']},
          ])
        });


        describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/ hiearchy`, () => {
          describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/`, slug: 'ericprud', type: 'Container',
                    body: 'test/apps/gh/ericprud-org.ttl', root: {'@id': '#ericprud'},
                    parms: {userName: 'ericprud'}, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`, accept: 'text/turtle', entries: ['repos/ericprud']},
            ]);
            H.dontFind([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg']},
            ]);
          })
          describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`, slug: 'jsg',
                    body: 'test/apps/gh/jsg.ttl', root: {'@id': '#jsg'},
                    type: 'Container', location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/labels/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/labels']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/milestones/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/milestones']},
            ]),
            H.dontFind([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
            ]);
          })
          describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/`, slug: '1.ttl',
                    body: 'test/apps/gh/jsg-issue1.ttl', root: {'@id': '#issue1'},
                    type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
            ]),
            H.dontFind([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/2.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues/2.ttl']},
            ]);
          })


          describe('successful PUT to replace LDPR', () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`,
                   body: 'test/shape-trees/jsg-issue1-b.ttl', root: {'@id': '#issue1'},
                   type: 'Resource'});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T12:48:00Z"\\^\\^xsd:dateTime']},
            ]);
          });

          describe('successful PUT to create LDPR', () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1-new.ttl`,
                   body: 'test/apps/gh/jsg-issue1.ttl', root: {'@id': '#issue1'},
                   type: 'Resource'});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1-new.ttl`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T11:48:00Z"\\^\\^xsd:dateTime']},
            ]);
          });

          describe('successful PUT to replace managed LDPC', () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`,
                   body: 'test/shape-trees/jsg-b.ttl', root: {'@id': '#jsg'},
                   type: 'Container'});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T12:57:51Z"\\^\\^xsd:dateTime']},
            ]);
          });
          xit('successful PUT to create managed LDPC', () => { });
          xit('successful PUT to replace instance root LDPC', () => { });

          describe('successful DELETE of LDPR', () => {
            it('should delete a file', async () => {
              const resp = await H.tryDelete(`${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`);
              H.expect(resp.ok).to.be.true;
            });

            it('successful DELETE of instance root LDPC', async () => {
              const resp = await H.tryDelete(`${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`);
              H.expect(resp.ok).to.be.true;
            });
          });
        });
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ hierarchy -- schema does not contain shape`, () => {
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-nonexistent-shape', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeMissingSchema#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`, slug: 'ref-1.ttl',
                body: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ hierarchy -- can't GET referenced shape`, () => {
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-unGETtable-shape', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeMissingShape#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`, slug: 'ref-1.ttl',
                body: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    // a successful PLANT followed by non-conformant POSTs
    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ hierarchy -- POSTed data does not validate`, () => {
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-nonconformant-posts', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/PhotoAlbumShapeTree#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      // A POST with a Slug which doesn't match any URI template gets a 422 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/malformed-ref-1 -- Does not match available ShapeTree steps`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, slug: 'malformed-ref-1.ttl',
                body: 'test/shape-trees/malformed-ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/malformed-ref-1.ttl`},
               expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/malformed-ref-1.ttl`, accept: 'text/turtle', entries: ['malformed-ref-1.ttl', 'status']},
        ]);
      });
      // A POST of a schema-invalid resource gets a 424 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-invalid-2 -- misspelled caption property`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, slug: 'ref-invalid-2.ttl',
                body: 'test/shape-trees/ref-invalid-2.ttl', root: {'@id': '#ref1'},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-invalid-2.ttl`, entries: ['http://photo.example/ns#caption\\b']},
               expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-invalid-2.ttl`, accept: 'text/turtle', entries: ['ref-invalid-2.ttl', 'status']},
        ]);
      });
      // A POST of a ShapeTree-invalid resource gets a 424 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-valid-3 -- type link is Container when Resource expected`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, slug: 'ref-valid-3.ttl',
                body: 'test/shape-trees/ref-valid-3.ttl', root: {'@id': '#ref1'},
                type: 'Container', location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-valid-3.ttl`, entries: ['expects a Resource']},
               expectFailure(422));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-valid-3.ttl`, accept: 'text/turtle', entries: ['ref-valid-3.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/ hierarchy -- malformed shapeTree: two static names`, () => {
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-malformed-shapeTree-two-names', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeTwoStaticNames#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/`},
                expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/`, accept: 'text/turtle', entries: ['ShapeMaps-malformed-shapeTree-two-names']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ hierarchy -- malformed shapeTree: two nested static names`, () => {
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-malformed-shapeTree-nested-two-names', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeNestedTwoStaticNames#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`, accept: 'text/turtle', entries: ['ShapeTreeNestedTwoStaticNames', 'shapeTreeInstancePath', 'shapeTreeInstanceRoot']},
        ]);
      });
      // A POST onto a malformed shapeTree gets a 424 and no created resource.
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`, slug: 'ref-1.ttl',
                body: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                type: 'Container', location: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ hierarchy -- shapeTree step has no shape property`, () => {
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-missing-shape-property', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeNoShapeProperty#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`, slug: 'ref-1.ttl',
                body: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ref-1.ttl`},
               expectFailure(424));
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

  })
}

function expectFailure (statusCode) {
  return async function (t, resp) {
    const body = await resp.text();
    H.expect(resp.ok).to.deep.equal(false);
    // H.expect(resp.redirects).to.deep.equal([]);
    H.expect(resp.status).to.deep.equal(statusCode);
    const error = JSON.parse(body);
    (t.entries || []).map(
      p => H.expect(error.message).match(new RegExp(p))
    )
  }
}

