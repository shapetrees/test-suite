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
installIn('some/deep/path');

function installIn (installDir) {
describe(`test/gh-deep.test.js installed in ${installDir}`, function () {
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
      {path: `${Path.join('/', installDir, '/')}Git/`, type: 'text/html', entries: ['Git']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}Git/`, () => {
    H.stomp({path: Path.join('/', installDir, '/'), slug: 'Git', name: 'GhApp', url: 'http://store.example/gh', getFootprint: () => `http://localhost:${H.getStaticPort()}/gh/ghFootprint#root`,
           status: 201, location: `${Path.join('/', installDir, '/')}Git/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}Git/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']},
    ])
  });

  describe(`re-create ${Path.join('/', installDir, '/')}Container/`, () => {
    H.stomp({path: Path.join('/', installDir, '/'),                 name: 'GhApp2', url: 'http://store.example/gh2', getFootprint: () => `http://localhost:${H.getStaticPort()}/gh/ghFootprint#root`,
           status: 201, location: `${Path.join('/', installDir, '/')}Git/`})
  });

  describe(`create ${Path.join('/', installDir, '/')}Git/users/alice/`, () => {
    H.post({path: `${Path.join('/', installDir, '/')}Git/users/`, slug: 'alice', type: 'Container',
            body: 'test/gh/alice.ttl', root: {'@id': '#alice'},
            parms: {userName: 'alice'}, location: `${Path.join('/', installDir, '/')}Git/users/alice/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}Git/users/alice/`, accept: 'text/turtle', entries: ['users/alice']},
      {path: `${Path.join('/', installDir, '/')}Git/users/alice/subscriptions/`, accept: 'text/turtle', entries: ['users/alice/subscriptions']},
    ]);
    H.dontFind([
      {path: `${Path.join('/', installDir, '/')}Git/users/alice-1/`, type: 'text/html', entries: ['alice-1']},
    ]);
    describe(`create ${Path.join('/', installDir, '/')}Git/users/alice/subscriptions/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Git/users/alice/subscriptions/`, slug: 'subscr1.ttl',
              body: 'test/gh/alice-subscr1.ttl', root: {'@id': '#subscr-1'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Git/users/alice/subscriptions/subscr1.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Git/users/alice/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscription_url', 'updated_at']},
      ])
    })
  });

  describe(`create ${Path.join('/', installDir, '/')}Git/users/alice-1/`, () => {
    H.post({path: `${Path.join('/', installDir, '/')}Git/users/`, slug: 'alice', type: 'Container',
            body: 'test/gh/alice.ttl', root: {'@id': '#alice'},
            parms: {userName: 'alice'}, location: `${Path.join('/', installDir, '/')}Git/users/alice-1/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}Git/users/alice/`, accept: 'text/turtle', entries: ['users/alice']},
      {path: `${Path.join('/', installDir, '/')}Git/users/alice-1/`, accept: 'text/turtle', entries: ['users/alice-1']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}Git/users/Container/`, () => {
    H.post({path: `${Path.join('/', installDir, '/')}Git/users/`,                type: 'Container',
            body: 'test/gh/alice.ttl', root: {'@id': '#alice'},
            parms: {userName: 'alice'}, location: `${Path.join('/', installDir, '/')}Git/users/Container/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}Git/users/alice-1/`, accept: 'text/turtle', entries: ['users/alice-1']},
      {path: `${Path.join('/', installDir, '/')}Git/users/Container/`, accept: 'text/turtle', entries: ['users/Container']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}Git/repos/ericprud/ hiearchy`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Git/repos/ericprud/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Git/repos/`, slug: 'ericprud', type: 'Container',
              body: 'test/gh/ericprud.ttl', root: {'@id': '#ericprud'},
              parms: {userName: 'ericprud'}, location: `${Path.join('/', installDir, '/')}Git/repos/ericprud/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/`, accept: 'text/turtle', entries: ['repos/ericprud']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg']},
      ]);
    })
    describe(`create ${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/`, slug: 'jsg',
              body: 'test/gh/jsg.ttl', root: {'@id': '#jsg'},
              type: 'Container', location: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/labels/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/labels']},
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/milestones/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/milestones']},
      ]),
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
      ]);
    })
    describe(`create ${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/`, slug: '1.ttl',
              body: 'test/gh/jsg-issue1.ttl', root: {'@id': '#issue1'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/1.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
      ]),
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Git/repos/ericprud/jsg/issues/2.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues/2.ttl']},
      ]);
    })
  });
})
}

