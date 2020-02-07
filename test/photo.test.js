'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const Footprint = require('../util/footprint');
const C = require('../util/constants');
const Confs = JSON.parse(Fse.readFileSync('./servers.json', 'utf-8'));
const LdpConf = Confs.find(c => c.name === "LDP");
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness')();

installIn('Shared');

function installIn (installDir) {
describe(`test/photo.test.js installid in ${installDir}`, function () {
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
      {path: `${Path.join('/', installDir, '/')}Photos2020-01/`, type: 'text/html', entries: ['Photos2020-01']},
    ]);
  });

  describe(`create ${Path.join('/', installDir, '/')}Photos2020-01/ hierarchy`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Photos2020-01/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Photos2020-01', name: 'PhotoApp', url: 'http://store.example/PhotoApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/photo/PhotoFootprint#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Photos2020-01/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Photos2020-01/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Photos2020-01/m33`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Photos2020-01/`, slug: 'm33.jpeg',
              body: 'test/photo/320px-Infrared_Triangulum_Galaxy_(M33).jpg', mediaType: 'image/jpeg',
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
