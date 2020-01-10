'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const Footprint = require('../util/footprint');
const C = require('../util/constants');
const Confs = JSON.parse(Fse.readFileSync('./servers.json', 'utf-8'));
const LdpConf = Confs.find(c => c.name === "LDP");
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness')();

// initialize servers
H.init(TestRoot);

installIn('shared/gh');
installIn('shared/gh/foo/public');

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
      {path: `${Path.join('/', installDir, '/')}ghInstance/`, type: 'text/html', entries: ['ghInstance']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}ghInstance/`, () => {
    H.stomp({path: Path.join('/', installDir, '/'), slug: 'ghInstance', name: 'GhApp', url: 'http://store.example/gh', getFootprint: () => `http://localhost:${H.getStaticPort()}/gh/ghFootprint#root`,
           status: 201, location: `${Path.join('/', installDir, '/')}ghInstance/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}ghInstance/`, accept: 'text/turtle', entries: ['footprintPath "."']},
    ])
  });

  describe(`re-create ${Path.join('/', installDir, '/')}ghInstance/`, () => {
    H.stomp({path: Path.join('/', installDir, '/'),                 name: 'GhApp2', url: 'http://store.example/gh2', getFootprint: () => `http://localhost:${H.getStaticPort()}/gh/ghFootprint#root`,
           status: 201, location: `${Path.join('/', installDir, '/')}ghInstance/`})
  });

  describe(`create ${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/`, () => {
    H.post({path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/`, slug: 'alice', type: 'Container',
            body: 'test/gh/alice.ttl', root: {'@id': '#alice'},
            parms: {userName: 'alice'}, location: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/`, accept: 'text/turtle', entries: ['admin/users/alice']},
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/subscriptions/`, accept: 'text/turtle', entries: ['admin/users/alice/subscriptions']},
    ]);
    H.dontFind([
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice-1/`, type: 'text/html', entries: ['alice-1']},
    ]);
    describe(`create ${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/subscriptions/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/subscriptions/`, slug: 'subscr1.ttl',
              body: 'test/gh/alice-subscr1.ttl', root: {'@id': '#subscr-1'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/subscriptions/subscr1.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscription_url', 'updated_at']},
      ])
    })
  });

  describe(`create ${Path.join('/', installDir, '/')}ghInstance/admin/users/alice-1/`, () => {
    H.post({path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/`, slug: 'alice', type: 'Container',
            body: 'test/gh/alice.ttl', root: {'@id': '#alice'},
            parms: {userName: 'alice'}, location: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice-1/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice/`, accept: 'text/turtle', entries: ['admin/users/alice']},
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice-1/`, accept: 'text/turtle', entries: ['admin/users/alice-1']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}ghInstance/admin/users/Container/`, () => {
    H.post({path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/`,                type: 'Container',
            body: 'test/gh/alice.ttl', root: {'@id': '#alice'},
            parms: {userName: 'alice'}, location: `${Path.join('/', installDir, '/')}ghInstance/admin/users/Container/`});
    H.find([
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/alice-1/`, accept: 'text/turtle', entries: ['admin/users/alice-1']},
      {path: `${Path.join('/', installDir, '/')}ghInstance/admin/users/Container/`, accept: 'text/turtle', entries: ['admin/users/Container']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/ hiearchy`, () => {
    describe(`create ${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}ghInstance/repos/`, slug: 'ericprud', type: 'Container',
              body: 'test/gh/ericprud.ttl', root: {'@id': '#ericprud'},
              parms: {userName: 'ericprud'}, location: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/`, accept: 'text/turtle', entries: ['repos/ericprud']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg']},
      ]);
    })
    describe(`create ${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/`, slug: 'jsg',
              body: 'test/gh/jsg.ttl', root: {'@id': '#jsg'},
              type: 'Container', location: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/labels/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/labels']},
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/milestones/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/milestones']},
      ]),
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
      ]);
    })
    describe(`create ${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/`, slug: '1.ttl',
              body: 'test/gh/jsg-issue1.ttl', root: {'@id': '#issue1'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/1.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
      ]),
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}ghInstance/repos/ericprud/jsg/issues/2.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues/2.ttl']},
      ]);
    })
  });
})
}

