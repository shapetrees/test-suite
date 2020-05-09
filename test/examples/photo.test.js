'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const LdpConf = JSON.parse(Fse.readFileSync('./servers/config.json', 'utf-8')).LDP;
const TestRoot = LdpConf.documentRoot;
const H = require('../test-harness');
H.init(TestRoot);

installIn(LdpConf.shared);

function installIn (installDir) {
  describe(`test/photo.test.js installid in ${installDir}`, function () {
    before(() => H.ensureTestDirectory(installDir, TestRoot));

    describe('initial state', () => {
      H.find([
        // {path: '/', accept: 'text/turtle', entries: ['root']},
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Photos2020-01/`, type: 'text/html', entries: ['Photos2020-01']},
      ]);
    });

    describe(`create ${Path.join('/', installDir, '/')}Photos2020-01/ hierarchy`, () => {
      describe(`create ${Path.join('/', installDir, '/')}Photos2020-01/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'Photos2020-01', name: 'PhotoApp', url: 'http://store.example/PhotoApp', shapeTreePath: 'photo/PhotoShapeTree#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}Photos2020-01/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}Photos2020-01/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}Photos2020-01/m33`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}Photos2020-01/`, slug: 'm33.jpeg',
                body: 'test/examples/photo/320px-Infrared_Triangulum_Galaxy_(M33).jpg', mediaType: 'image/jpeg',
                type: 'NonRDFSource', location: `${Path.join('/', installDir, '/')}Photos2020-01/m33.jpeg`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}Photos2020-01/m33.jpeg`, accept: 'image/jpeg', entries: []},
        ]);
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}Photos2020-01/m32.jpeg`, accept: 'text/turtle', entries: ['Photos2020-01/m32.jpeg']},
        ]);
      });
    });
  })
}

