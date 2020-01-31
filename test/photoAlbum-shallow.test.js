'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const Footprint = require('../util/footprint');
const C = require('../util/constants');
const Confs = JSON.parse(Fse.readFileSync('./servers.json', 'utf-8'));
const LdpConf = Confs.find(c => c.name === "LDP");
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness')();

installIn('Shared/photo');
installIn('Shared/photo/public');

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

  describe(`create ${Path.join('/', installDir, '/')}Albums2019/ hierarchy`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Albums2019/`, () => {
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Albums2019', name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/photo/PhotoAlbumFootprint#root`,
               status: 201, location: `${Path.join('/', installDir, '/')}Albums2019/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Albums2019/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Albums2019/ref-1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Albums2019/`, slug: 'ref-1.ttl',
              body: 'test/photo/ref-1.ttl', root: {'@id': ''},
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

