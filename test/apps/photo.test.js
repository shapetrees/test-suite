'use strict';

const LdpConf = JSON.parse(require('fs-extra').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);

describe(`test/apps/photo.test.js installid in ${LdpConf.shared}`, function () {
  before(() => H.ensureTestDirectory(LdpConf.shared));

  describe('initial state', () => {
    H.find([
      // {path: '/', accept: 'text/turtle', entries: ['root']},
      {path: `/${LdpConf.shared}/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
    ]);
    H.dontFind([
      {path: `/${LdpConf.shared}/Photos2020-01/`, type: 'text/html', entries: ['Photos2020-01']},
    ]);
  });

  describe(`create /${LdpConf.shared}/Photos2020-01/ hierarchy`, () => {
    describe(`create /${LdpConf.shared}/Photos2020-01/`, () => {
      H.plant({path: `/${LdpConf.shared}/`, slug: 'Photos2020-01', name: 'PhotoApp', url: 'http://store.example/PhotoApp', shapeTreePath: 'photo/PhotoShapeTree#root',
               status: 201, location: `/${LdpConf.shared}/Photos2020-01/`});
      H.find([
        {path: `/${LdpConf.shared}/Photos2020-01/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
      ]);
    });
    describe(`create /${LdpConf.shared}/Photos2020-01/m33`, () => {
      H.post({path: `/${LdpConf.shared}/Photos2020-01/`, slug: 'm33.jpeg',
              body: 'test/apps/photo/320px-Infrared_Triangulum_Galaxy_(M33).jpg', mediaType: 'image/jpeg',
              type: 'NonRDFSource', location: `/${LdpConf.shared}/Photos2020-01/m33.jpeg`});
      H.find([
        {path: `/${LdpConf.shared}/Photos2020-01/m33.jpeg`, accept: 'image/jpeg', entries: []},
      ]);
      H.dontFind([
        {path: `/${LdpConf.shared}/Photos2020-01/m32.jpeg`, accept: 'text/turtle', entries: ['Photos2020-01/m32.jpeg']},
      ]);
    });
  });
});

