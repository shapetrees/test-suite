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
  describe(`test/nevernote.test.js installid in ${installDir}`, async function () {
    await H.mkdirs(installDir, TestRoot, Footprint);

    describe('initial state', () => {
      H.find([
        // {path: '/', accept: 'text/turtle', entries: ['root']},
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: [`pre-installed ${installDir}`]},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}NeverNotes/`, type: 'text/html', entries: ['NeverNotes']},
      ]);
    });

    describe(`create ${Path.join('/', installDir, '/')}NeverNotes/ hierarchy`, () => {
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/`, () => {
        H.stomp({path: Path.join('/', installDir, '/'), slug: 'NeverNotes', name: 'NeverNoteApp', url: 'http://store.example/NeverNoteApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/nevernote/NeverNoteFootprint#root`,
                 status: 201, location: `${Path.join('/', installDir, '/')}NeverNotes/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/note1/`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}NeverNotes/`, slug: 'note1', type: 'Container',
                body: 'test/nevernote/note1.ttl', root: {'@id': '#note1'},
                location: `${Path.join('/', installDir, '/')}NeverNotes/note1/`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/`, accept: 'text/turtle', entries: []},
        ]);
        H.dontFind([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note2/`, accept: 'text/turtle', entries: ['NeverNotes/note2/']},
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/M33_IR.jpg`, accept: 'text/turtle', entries: ['NeverNotes/note1/M33_IR.jpg']},
        ]);
      });
      describe(`create ${Path.join('/', installDir, '/')}NeverNotes/note1/M33_IR.jpg`, () => {
        H.post({path: `${Path.join('/', installDir, '/')}NeverNotes/note1/`, slug: 'M33_IR.jpg',
                body: 'test/nevernote/M33_IR.jpg', mediaType: 'image/jpeg',
                type: 'NonRDFSource', location: `${Path.join('/', installDir, '/')}NeverNotes/note1/M33_IR.jpg`});
        H.find([
          {path: `${Path.join('/', installDir, '/')}NeverNotes/note1/M33_IR.jpg`, accept: 'image/jpeg', entries: []},
        ]);
      });
    });
  })
}

