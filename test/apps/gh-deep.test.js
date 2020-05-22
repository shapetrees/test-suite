'use strict';

const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);

describe(`test/apps/gh-deep.test.js installed in ${Shared}`, function () {
  before(() => H.ensureTestDirectory(Shared));

  describe('initial state', () => {
    H.find([
      // {path: '/', accept: 'text/turtle', entries: ['root']},
      {path: `/${Shared}/`, accept: 'text/turtle', entries: [Shared]},
    ]);
    H.dontFind([
      {path: `/${Shared}/Git/`, type: 'text/html', entries: ['Git']},
    ])
  });

  describe(`create /${Shared}/Git/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git',
             name: 'GhApp', url: 'http://store.example/gh', shapeTreePath: 'gh/ghShapeTree#root',
             status: 201, location: `/${Shared}/Git/`});
    H.find([
      {path: `/${Shared}/Git/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git/users/ericprud/`, () => {
    H.post({path: `/${Shared}/Git/users/`, slug: 'ericprud', type: 'Container',
            bodyURL: 'test/apps/gh/ericprud-user.ttl', root: {'@id': '#ericprud'},
            status: 201, parms: {userName: 'ericprud'}, location: `/${Shared}/Git/users/ericprud/`});
    H.find([
      {path: `/${Shared}/Git/users/ericprud/`, accept: 'text/turtle', entries: ['users/ericprud']},
      {path: `/${Shared}/Git/users/ericprud/subscriptions/`, accept: 'text/turtle', entries: ['users/ericprud/subscriptions']},
    ]);
    H.dontFind([
      {path: `/${Shared}/Git/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscr1.ttl']},
      {path: `/${Shared}/Git/users/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
    ]);
    describe(`create /${Shared}/Git/users/ericprud/subscriptions/`, () => {
      H.post({path: `/${Shared}/Git/users/ericprud/subscriptions/`, slug: 'subscr1.ttl',
              bodyURL: 'test/apps/gh/ericprud-subscr1.ttl', root: {'@id': '#subscr-1'},
              status: 201, type: 'Resource', location: `/${Shared}/Git/users/ericprud/subscriptions/subscr1.ttl`});
      H.find([
        {path: `/${Shared}/Git/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscription_url', 'updated_at']},
      ])
    })
  });

  describe(`create /${Shared}/Git/repos/ericprud/ hiearchy`, () => {
    describe(`create /${Shared}/Git/repos/ericprud/`, () => {
      H.post({path: `/${Shared}/Git/repos/`, slug: 'ericprud', type: 'Container',
              bodyURL: 'test/apps/gh/ericprud-org.ttl', root: {'@id': '#ericprud'},
              status: 201, parms: {userName: 'ericprud'}, location: `/${Shared}/Git/repos/ericprud/`});
      H.find([
        {path: `/${Shared}/Git/repos/ericprud/`, accept: 'text/turtle', entries: ['repos/ericprud']},
      ]);
      H.dontFind([
        {path: `/${Shared}/Git/repos/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
        {path: `/${Shared}/Git/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg']},
      ]);
    })
    describe(`create /${Shared}/Git/repos/ericprud/jsg/`, () => {
      H.post({path: `/${Shared}/Git/repos/ericprud/`, slug: 'jsg',
              bodyURL: 'test/apps/gh/jsg.ttl', root: {'@id': '#jsg'},
              status: 201, type: 'Container', location: `/${Shared}/Git/repos/ericprud/jsg/`});
      H.find([
        {path: `/${Shared}/Git/repos/ericprud/jsg/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
        {path: `/${Shared}/Git/repos/ericprud/jsg/issues/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
        {path: `/${Shared}/Git/repos/ericprud/jsg/labels/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/labels']},
        {path: `/${Shared}/Git/repos/ericprud/jsg/milestones/`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/milestones']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues']},
      ]);
    })
    describe(`create /${Shared}/Git/repos/ericprud/jsg/issues/1`, () => {
      H.post({path: `/${Shared}/Git/repos/ericprud/jsg/issues/`, slug: '1.ttl',
              bodyURL: 'test/apps/gh/jsg-issue1.ttl', root: {'@id': '#issue1'},
              status: 201, type: 'Resource', location: `/${Shared}/Git/repos/ericprud/jsg/issues/1.ttl`});
      H.find([
        {path: `/${Shared}/Git/repos/ericprud/jsg/issues/1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git/repos/ericprud/jsg/issues/2.ttl`, accept: 'text/turtle', entries: ['repos/ericprud/jsg/issues/2.ttl']},
      ]);
    })
  });
});

