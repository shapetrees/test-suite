'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const LdpConf = JSON.parse(Fse.readFileSync('./servers/config.json', 'utf-8')).LDP;
const TestRoot = LdpConf.documentRoot;
const H = require('../test-harness');
H.init(TestRoot);

installIn(LdpConf.shared);

function installIn (installDir) {
  describe(`test/apps/nevernote.test.js installid in ${installDir}`, function () {
    before(() => H.ensureTestDirectory(installDir, TestRoot));

    describe('initial state', () => {
      H.find([
        // {path: '/', accept: 'text/turtle', entries: ['root']},
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}NeverNotes/`, type: 'text/html', entries: ['NeverNotes']},
      ]);
    });

    describe(`create ${Path.join('/', installDir, '/')}NeverNotes/ hierarchy`, () => {
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/`, () => {
        H.plant({path: Path.join('/', installDir, '/'), slug: 'NeverNotes', name: 'NeverNoteApp', url: 'http://store.example/NeverNoteApp', shapeTreePath: 'nevernote/NeverNoteShapeTree#root',
                 status: 201, location: `${Path.join('/', installDir, '/')}NeverNotes/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/note1/`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}NeverNotes/`, slug: 'note1', type: 'Container',
                body: 'test/apps/nevernote/note1.ttl', root: {'@id': '#note1'},
                location: `${Path.join('/', installDir, '/')}NeverNotes/note1/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/`, accept: 'text/turtle', entries: []},
        ]);
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note2/`, accept: 'text/turtle', entries: ['NeverNotes/note2/']},
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/img-M33_IR.jpg`, accept: 'text/turtle', entries: ['NeverNotes/note1/img-M33_IR.jpg']},
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/inc-M33_IR.ttl`, accept: 'text/turtle', entries: ['NeverNotes/note1/inc-M33_IR.ttl']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/note1/img-M33_IR.jpg`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}NeverNotes/note1/`, slug: 'img-M33_IR.jpg',
                body: 'test/apps/nevernote/img-M33_IR.jpg', mediaType: 'image/jpeg',
                type: 'NonRDFSource', location: `${Path.join('/', installDir, '/')}NeverNotes/note1/img-M33_IR.jpg`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/img-M33_IR.jpg`, accept: 'image/jpeg', entries: []},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/note1/inc-M33_IR.ttl`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}NeverNotes/note1/`, slug: 'inc-M33_IR.ttl',
                body: 'test/apps/nevernote/inc-M33_IR.ttl', root: {'@id': '#m33'},
                type: 'Resource', location: `${Path.join('/', installDir, '/')}NeverNotes/note1/inc-M33_IR.ttl`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/inc-M33_IR.ttl`, accept: 'text/turtle', entries: []},
        ]);
      });
    });
  })
}

