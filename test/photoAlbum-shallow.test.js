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
  describe(`test/photoAlbum-shallow.test.js installed in ${installDir}`, function () {
    before(() => H.ensureTestDirectory(installDir, TestRoot));

    describe('initial state', () => {
      H.find([
        // {path: '/', accept: 'text/turtle', entries: ['root']},
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Albums2019/`, type: 'text/html', entries: ['Albums2019']},
      ]);
    });

    describe(`create ${Path.join('/', installDir, '/')}Albums2019/ hierarchy`, () => {
      describe(`create ${Path.join('/', installDir, '/')}Albums2019/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getShapeTree: () => new URL('album/PhotoAlbumShapeTree#root', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}Albums2019/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}Albums2019/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}Albums2019/ref-1`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}Albums2019/`, slug: 'ref-1.ttl',
                body: 'test/album/ref-1.ttl', root: {'@id': ''},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}Albums2019/ref-1.ttl`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}Albums2019/ref-1.ttl`, accept: 'text/turtle', entries: ['tag', 'rightAscension']},
        ]);
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}Albums2019/ref-2.ttl`, accept: 'text/turtle', entries: ['Albums2019/ref-2.ttl']},
        ]);
      });
    });
  })
}

