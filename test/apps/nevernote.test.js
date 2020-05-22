'use strict';

const LdpConf = JSON.parse(require('fs-extra').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);

describe(`test/apps/nevernote.test.js installid in ${LdpConf.shared}`, function () {
  before(() => H.ensureTestDirectory(LdpConf.shared));

  describe('initial state', () => {
    H.find([
      // {path: '/', accept: 'text/turtle', entries: ['root']},
      {path: `/${LdpConf.shared}/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
    ]);
    H.dontFind([
      {path: `/${LdpConf.shared}/NeverNotes/`, type: 'text/html', entries: ['NeverNotes']},
    ]);
  });

  describe(`create /${LdpConf.shared}/NeverNotes/ hierarchy`, () => {
    describe(`create /${LdpConf.shared}/NeverNotes/`, () => {
      H.plant({path: `/${LdpConf.shared}/`, slug: 'NeverNotes',
               name: 'NeverNoteApp', url: 'http://store.example/NeverNoteApp', shapeTreePath: 'nevernote/NeverNoteShapeTree#root',
               status: 201, location: `/${LdpConf.shared}/NeverNotes/`});
      H.find([
        {path: `/${LdpConf.shared}/NeverNotes/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
      ]);
    });
    describe(`create /${LdpConf.shared}/NeverNotes/note1/`, () => {
      H.post({path: `/${LdpConf.shared}/NeverNotes/`, slug: 'note1',
              type: 'Container', bodyURL: 'test/apps/nevernote/note1.ttl', root: {'@id': '#note1'},
              status: 201, location: `/${LdpConf.shared}/NeverNotes/note1/`});
      H.find([
        {path: `/${LdpConf.shared}/NeverNotes/note1/`, accept: 'text/turtle', entries: []},
      ]);
      H.dontFind([
        {path: `/${LdpConf.shared}/NeverNotes/note2/`, accept: 'text/turtle', entries: ['NeverNotes/note2/']},
        {path: `/${LdpConf.shared}/NeverNotes/note1/img-M33_IR.jpg`, accept: 'text/turtle', entries: ['NeverNotes/note1/img-M33_IR.jpg']},
        {path: `/${LdpConf.shared}/NeverNotes/note1/inc-M33_IR.ttl`, accept: 'text/turtle', entries: ['NeverNotes/note1/inc-M33_IR.ttl']},
      ]);
    });
    describe(`create /${LdpConf.shared}/NeverNotes/note1/img-M33_IR.jpg`, () => {
      H.post({path: `/${LdpConf.shared}/NeverNotes/note1/`, slug: 'img-M33_IR.jpg',
              type: 'NonRDFSource', bodyURL: 'test/apps/nevernote/img-M33_IR.jpg', mediaType: 'image/jpeg',
              status: 201, location: `/${LdpConf.shared}/NeverNotes/note1/img-M33_IR.jpg`});
      H.find([
        {path: `/${LdpConf.shared}/NeverNotes/note1/img-M33_IR.jpg`, accept: 'image/jpeg', entries: []},
      ]);
    });
    describe(`create /${LdpConf.shared}/NeverNotes/note1/inc-M33_IR.ttl`, () => {
      H.post({path: `/${LdpConf.shared}/NeverNotes/note1/`, slug: 'inc-M33_IR.ttl',
              type: 'Resource', bodyURL: 'test/apps/nevernote/inc-M33_IR.ttl', root: {'@id': '#m33'},
              status: 201, location: `/${LdpConf.shared}/NeverNotes/note1/inc-M33_IR.ttl`});
      H.find([
        {path: `/${LdpConf.shared}/NeverNotes/note1/inc-M33_IR.ttl`, accept: 'text/turtle', entries: []},
      ]);
    });
  });
});
