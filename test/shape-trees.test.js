'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const LdpConf = JSON.parse(Fse.readFileSync('./servers/config.json', 'utf-8')).LDP;
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness');
H.init(TestRoot)
/* It's easier to debug functions here than to wait for them in the tests.
  .then(async () => {
    debugger;
    process.exit(0); // to end test run
  });
*/

installIn('shape-trees.test');
installIn('shape-trees.test/some/deep/path');

function installIn (installDir) {
  describe(`test/shape-trees.test.js - installed in ${installDir}`, function () {
    before(() => H.ensureTestDirectory(installDir));
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
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist',
                 name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
                 body: '@prefix x: <>\n@@bad Turtle@@', mediaType: 'text/turtle',
                 status: 422, location: 'N/A', entries: ['Unexpected "@@bad" on line 2']});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`should fail with bad JSON`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist',
                 name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
                 body: '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}', mediaType: 'application/ld+json',
                 status: 422, location: 'N/A', entries: ['Unexpected token @']});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`should fail with bad JSONLD`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShouldNotExist',
                 name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
                 body: '{\n  "foo": 1,\n  "@id": 2\n}', mediaType: 'application/ld+json',
                 status: 422, location: 'N/A', entries: ['"@id" value must a string']});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShouldNotExist/`, accept: 'text/turtle', entries: ['ShouldNotExist']},
        ]);
      });

      describe(`PUT tests`, () => {
        describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`, () => {
          H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-PUT-tests',
                   name: 'GhApp', url: 'http://store.example/gh', shapeTreePath: 'gh-deep/gh-deep-ShapeTree#root',
                   status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`});
          H.find([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
          ])
        });

        describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`, () => {
          H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/`, slug: 'ericprud',
                  type: 'Container', bodyURL: 'test/apps/gh-deep/ericprud-user.ttl', root: {'@id': '#ericprud'},
                  status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`});
          H.find([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`, accept: 'text/turtle', entries: ['users/ericprud']},
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/`, accept: 'text/turtle', entries: ['users/ericprud/subscriptions']},
          ]);
          H.dontFind([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscr1.ttl']},
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
          ]);
          describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/`, slug: 'subscr1.ttl',
                    type: 'Resource', bodyURL: 'test/apps/gh-deep/libxml-annot-repo.ttl', root: {'@id': '#libxml-annot'},
                    status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/subscr1.ttl`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscription_url', 'updated_at']},
            ])
          })
        });

        describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`, () => {
          H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/`, slug: 'ericprud',
                  type: 'Container', bodyURL: 'test/apps/gh-deep/ericprud-user.ttl', root: {'@id': '#ericprud'},
                  status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`});
          H.find([
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud/`, accept: 'text/turtle', entries: ['users/ericprud']},
            {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/users/ericprud-1/`, accept: 'text/turtle', entries: ['users/ericprud-1']},
          ])
        });

        describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/ hiearchy`, () => {
          describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/`, slug: 'ericprud',
                    type: 'Container', bodyURL: 'test/apps/gh-deep/ericprud-org.ttl', root: {'@id': '#ericprud'},
                    status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`, accept: 'text/turtle', entries: ['repos/ericprud']},
            ]);
            H.dontFind([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg']},
            ]);
          })
          describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/`, slug: 'jsg',
                    type: 'Container', bodyURL: 'test/apps/gh-deep/jsg.ttl', root: {'@id': '#jsg'},
                    status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`});
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
          describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, () => {
            H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/`, slug: '1.ttl',
                    type: 'Resource', bodyURL: 'test/apps/gh-deep/jsg-issue1.ttl', root: {'@id': '#issue1'},
                    status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
            ]),
            H.dontFind([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/2.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues/2.ttl']},
            ]);
          })


          describe('successful PUT to replace managed LDPR', () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`,
                   type: 'Resource', bodyURL: 'test/shape-trees/jsg-issue1-03.ttl', root: {'@id': '#issue1'},
                   status: 201});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T03:00:00Z"\\^\\^xsd:dateTime']},
            ]);
          });

          describe('successful PUT to create managed LDPR', () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1-new.ttl`,
                   type: 'Resource', bodyURL: 'test/apps/gh-deep/jsg-issue1.ttl', root: {'@id': '#issue1'},
                   status: 201});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/issues/1-new.ttl`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T01:00:00Z"\\^\\^xsd:dateTime']},
            ]);
          });

          describe('successful PUT to replace managed LDPC', () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`,
                   type: 'Container', bodyURL: 'test/shape-trees/jsg-03.ttl', root: {'@id': '#jsg'},
                   status: 201});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg/`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T03:00:00Z"\\^\\^xsd:dateTime']},
            ]);
          });

          describe(`successful PUT to create managed LDPC`, () => {
            H.put({path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg-put/`,
                   type: 'Container', bodyURL: 'test/shape-trees/jsg-put.ttl', root: {'@id': '#jsg'},
                   status: 201});
            H.find([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg-put/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg-put/issues/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg-put/issues']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg-put/labels/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg-put/labels']},
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg-put/milestones/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg-put/milestones']},
            ]),
            H.dontFind([
              {path: `${Path.join('/', installDir, '/')}ShapeMaps-PUT-tests/repos/ericprud/jsg-put/issues/1.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg-put/issues']},
            ]);
          })

          xit('successful PUT to replace instance root LDPC', () => { }); // @issue - should this be allowed?

          describe('handle POSTs to unmanaged Containers', () => {
            describe(`post ${Path.join('/', installDir, '/')}Unmanaged/`, () => {
              H.post({path: `${Path.join('/', installDir, '/')}`, slug: 'Unmanaged',
                      type: 'Container', bodyURL: 'test/empty.ttl',
                      status: 201, location: `${Path.join('/', installDir, '/')}Unmanaged/`});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
              ])
            });
            describe(`post ${Path.join('/', installDir, '/')}Unmanaged/Ericprud/`, () => {
              H.post({path: `${Path.join('/', installDir, '/')}Unmanaged/`, slug: 'Ericprud',
                      type: 'Container', bodyURL: 'test/apps/gh-deep/ericprud-user.ttl',
                      status: 201, location: `${Path.join('/', installDir, '/')}Unmanaged/Ericprud/`});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/Ericprud/`, accept: 'text/turtle', entries: ['Unmanaged/Ericprud']},
              ])
            });
            describe(`post ${Path.join('/', installDir, '/')}Unmanaged/m33.jpeg`, () => {
              H.post({path: `${Path.join('/', installDir, '/')}Unmanaged/`, slug: 'm33.jpeg',
                      type: 'NonRDFSource', bodyURL: 'test/apps/photo/320px-Infrared_Triangulum_Galaxy_(M33).jpg', mediaType: 'image/jpeg',
                      status: 201, location: `${Path.join('/', installDir, '/')}Unmanaged/m33.jpeg`});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/m33.jpeg`, accept: 'image/jpeg', entries: []},
              ]);
            });
          });

          describe('handle PUTs to unmanaged Containers', () => {
            describe('successful PUT to create unmanaged LDPC', () => {
              H.put({path: `${Path.join('/', installDir, '/')}Unmanaged/issues/`,
                     type: 'Container', bodyURL: 'test/shape-trees/jsg-02.ttl', root: {'@id': '#jsg'},
                     status: 201});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/issues/`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T02:00:00Z"\\^\\^xsd:dateTime']},
              ]);
            });
            describe('successful PUT to replace unmanaged LDPC', () => {
              H.put({path: `${Path.join('/', installDir, '/')}Unmanaged/issues/`,
                     type: 'Container', bodyURL: 'test/shape-trees/jsg-03.ttl', root: {'@id': '#jsg'},
                     status: 201});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/issues/`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T03:00:00Z"\\^\\^xsd:dateTime']},
              ]);
            });
            describe('successful PUT to create unmanaged LDPR', () => {
              H.put({path: `${Path.join('/', installDir, '/')}Unmanaged/issues/1.ttl`,
                     type: 'Resource', bodyURL: 'test/apps/gh-deep/jsg-issue1.ttl', root: {'@id': '#issue1'},
                     status: 201});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/issues/1.ttl`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T01:00:00Z"\\^\\^xsd:dateTime']},
              ]);
            });
            describe('successful PUT to replace unmanaged LDPR', () => {
              H.put({path: `${Path.join('/', installDir, '/')}Unmanaged/issues/1.ttl`,
                     type: 'Resource', bodyURL: 'test/shape-trees/jsg-issue1-03.ttl', root: {'@id': '#issue1'},
                     status: 201});
              H.find([
                {path: `${Path.join('/', installDir, '/')}Unmanaged/issues/1.ttl`, accept: 'text/turtle', entries: [':updated_at "2019-12-18T03:00:00Z"\\^\\^xsd:dateTime']},
              ]);
            });
          });

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
      describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-nonexistent-shape',
                 name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeMissingSchema#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/`, slug: 'ref-1.ttl',
                type: 'Resource', bodyURL: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                status: 424, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ref-1.ttl`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonexistent-shape/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ hierarchy -- can't GET referenced shape`, () => {
      describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-unGETtable-shape',
                 name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeMissingShape#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/`, slug: 'ref-1.ttl',
                type: 'Resource', bodyURL: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                status: 424, location: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ref-1.ttl`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-unGETtable-shape/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    // a successful PLANT followed by non-conformant POSTs
    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ hierarchy -- POSTed data does not validate`, () => {
      describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-nonconformant-posts',
                 name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/PhotoAlbumShapeTree#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      // A POST with a Slug which doesn't match any URI template gets a 422 and no created resource.
      describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/malformed-ref-1 -- Does not match available ShapeTree steps`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, slug: 'malformed-ref-1.ttl',
                type: 'Resource', bodyURL: 'test/shape-trees/malformed-ref-1.ttl', root: {'@id': ''},
                status: 422, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/malformed-ref-1.ttl`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/malformed-ref-1.ttl`, accept: 'text/turtle', entries: ['malformed-ref-1.ttl', 'status']},
        ]);
      });
      // A POST of a schema-invalid resource gets a 424 and no created resource.
      describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-invalid-2 -- misspelled caption property`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, slug: 'ref-invalid-2.ttl',
                type: 'Resource', bodyURL: 'test/shape-trees/ref-invalid-2.ttl', root: {'@id': '#ref1'},
                status: 422, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-invalid-2.ttl`, entries: ['http://photo.example/ns#caption\\b']});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-invalid-2.ttl`, accept: 'text/turtle', entries: ['ref-invalid-2.ttl', 'status']},
        ]);
      });
      // A POST of a ShapeTree-invalid resource gets a 424 and no created resource.
      describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-valid-3 -- type link is Container when Resource expected`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/`, slug: 'ref-valid-3.ttl',
                type: 'Container', bodyURL: 'test/shape-trees/ref-valid-3.ttl', root: {'@id': '#ref1'},
                status: 422, location: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-valid-3.ttl`, entries: ['expects a Resource']});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-nonconformant-posts/ref-valid-3.ttl`, accept: 'text/turtle', entries: ['ref-valid-3.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/ hierarchy -- malformed shapeTree: two static names`, () => {
      describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-malformed-shapeTree-two-names',
                 name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeTwoStaticNames#root',
                 status: 424, location: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-two-names/`, accept: 'text/turtle', entries: ['ShapeMaps-malformed-shapeTree-two-names']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ hierarchy -- malformed shapeTree: two nested static names`, () => {
      describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-malformed-shapeTree-nested-two-names',
                 name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeNestedTwoStaticNames#root',
                 status: 424, location: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`, accept: 'text/turtle', entries: ['ShapeMaps-malformed-shapeTree-nested-two-names']},
        ]);
      });
      // If we didn't want static analysis, a POST onto a malformed shapeTree would get a 424 and no created resource.
      if (false)
      xdescribe(`post ${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/`, slug: 'ref-1.ttl',
                type: 'Container', bodyURL: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                status: 424, location: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ref-1.ttl`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-malformed-shapeTree-nested-two-names/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

    describe(`create ${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ hierarchy -- shapeTree step has no shape property`, () => {
      describe(`plant ${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'ShapeMaps-missing-shape-property',
                 name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'bad/ShapeTreeNoShapeProperty#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`post ${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/`, slug: 'ref-1.ttl',
                type: 'Resource', bodyURL: 'test/shape-trees/ref-1.ttl', root: {'@id': ''},
                status: 424, location: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ref-1.ttl`});
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}ShapeMaps-missing-shape-property/ref-1.ttl`, accept: 'text/turtle', entries: ['ref-1.ttl', 'status']},
        ]);
      });
    });

  })
}

