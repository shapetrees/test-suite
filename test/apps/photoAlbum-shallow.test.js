'use strict';

const LdpConf = JSON.parse(require('fs-extra').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);

describe(`test/apps/photoAlbum-shallow.test.js installed in ${LdpConf.shared}`, function () {
  before(() => H.ensureTestDirectory(LdpConf.shared));

  describe('initial state', () => {
    H.find([
      // {path: '/', accept: 'text/turtle', entries: ['root']},
      {path: `/${LdpConf.shared}/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
    ]);
    H.dontFind([
      {path: `/${LdpConf.shared}/Albums2019/`, type: 'text/html', entries: ['Albums2019']},
    ]);
  });

  describe(`create /${LdpConf.shared}/Albums2019/ hierarchy`, () => {
    describe(`create /${LdpConf.shared}/Albums2019/`, () => {
      H.plant({path: `/${LdpConf.shared}/`, slug: 'Albums2019',
               name: 'PhotoAlbumApp', url: 'http://store.example/PhotoAlbumApp', shapeTreePath: 'album/PhotoAlbumShapeTree#root',
               status: 201, location: `/${LdpConf.shared}/Albums2019/`});
      H.find([
        {path: `/${LdpConf.shared}/Albums2019/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
      ]);
    });
    describe(`create /${LdpConf.shared}/Albums2019/ref-1`, () => {
      H.post({path: `/${LdpConf.shared}/Albums2019/`, slug: 'ref-1.ttl',
              bodyURL: 'test/apps/album/ref-1.ttl', root: {'@id': ''},
              status: 201, type: 'Resource', location: `/${LdpConf.shared}/Albums2019/ref-1.ttl`});
      H.find([
        {path: `/${LdpConf.shared}/Albums2019/ref-1.ttl`, accept: 'text/turtle', entries: ['tag', 'rightAscension']},
      ]);
      H.dontFind([
        {path: `/${LdpConf.shared}/Albums2019/ref-2.ttl`, accept: 'text/turtle', entries: ['Albums2019/ref-2.ttl']},
      ]);
    });
  });
});

