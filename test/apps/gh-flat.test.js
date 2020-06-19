'use strict';

const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);

describe(`test/apps/gh-flat.test.js installed in ${Shared}`, function () {
  before(() => H.ensureTestDirectory(Shared));

  describe('initial state', () => {
    H.find([
      // {path: '/', accept: 'text/turtle', entries: ['root']},
      {path: `/${Shared}/`, accept: 'text/turtle', entries: [Shared]},
    ]);
    H.dontFind([
      {path: `/${Shared}/GitFlat/`, type: 'text/html', entries: ['Git']},
    ])
  });

  describe(`create /${Shared}/Git-Orgs/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Orgs',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#orgs',
             status: 201, location: `/${Shared}/Git-Orgs/`});
    H.find([
      {path: `/${Shared}/Git-Orgs/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git-Repos/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Repos',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#repos',
             status: 201, location: `/${Shared}/Git-Repos/`});
    H.find([
      {path: `/${Shared}/Git-Repos/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git-Issues/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Issues',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#issues',
             status: 201, location: `/${Shared}/Git-Issues/`});
    H.find([
      {path: `/${Shared}/Git-Issues/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git-Comments/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Comments',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#cmnt_C',
             status: 201, location: `/${Shared}/Git-Comments/`});
    H.find([
      {path: `/${Shared}/Git-Comments/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git-Events/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Events',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#evt_C',
             status: 201, location: `/${Shared}/Git-Events/`});
    H.find([
      {path: `/${Shared}/Git-Events/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git-Labels/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Labels',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#lbl_C',
             status: 201, location: `/${Shared}/Git-Labels/`});
    H.find([
      {path: `/${Shared}/Git-Labels/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  describe(`create /${Shared}/Git-Milestones/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Milestones',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#mlt_C',
             status: 201, location: `/${Shared}/Git-Milestones/`});
    H.find([
      {path: `/${Shared}/Git-Milestones/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
    ])
  });

  if (false) describe(`create /${Shared}/GitFlat/users/ericprud/`, () => {
    H.post({path: `/${Shared}/GitFlat/users/`, slug: 'ericprud', type: 'Container',
            bodyURL: 'test/apps/gh-deep/ericprud-user.ttl', root: {'@id': '#ericprud'},
            status: 201, parms: {userName: 'ericprud'}, location: `/${Shared}/GitFlat/users/ericprud/`});
    H.find([
      {path: `/${Shared}/GitFlat/users/ericprud/`, accept: 'text/turtle', entries: ['users/ericprud']},
      {path: `/${Shared}/GitFlat/users/ericprud/subscriptions/`, accept: 'text/turtle', entries: ['users/ericprud/subscriptions']},
    ]);
    H.dontFind([
      {path: `/${Shared}/GitFlat/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscr1.ttl']},
      {path: `/${Shared}/GitFlat/users/ericprud-1/`, type: 'text/html', entries: ['ericprud-1']},
    ]);
    describe(`create /${Shared}/GitFlat/users/ericprud/subscriptions/`, () => {
      H.post({path: `/${Shared}/GitFlat/users/ericprud/subscriptions/`, slug: 'subscr1.ttl',
              bodyURL: 'test/apps/gh-deep/ericprud-subscr1.ttl', root: {'@id': '#subscr-1'},
              status: 201, type: 'Resource', location: `/${Shared}/GitFlat/users/ericprud/subscriptions/subscr1.ttl`});
      H.find([
        {path: `/${Shared}/GitFlat/users/ericprud/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscription_url', 'updated_at']},
      ])
    })
  });

  describe(`create /${Shared}/Git-Reos/ members`, () => {
    describe(`create /${Shared}/Git-Repos/shapetree.js`, () => {
      H.post({path: `/${Shared}/Git-Repos/`, slug: 'shapetree.js.ttl', type: 'Resource',
              bodyURL: 'test/apps/gh-deep/shapetree.js-repo.ttl', root: {'@id': '#shapetree.js'},
              status: 201, location: `/${Shared}/Git-Repos/shapetree.js.ttl`});
      H.find([
        {path: `/${Shared}/Git-Repos/shapetree.js.ttl`, accept: 'text/turtle', entries: ['gh:node_id "MDEwOlJlcG9zaXRvcnkyNTI0MDUwOTE="']},
      ]);
      H.dontFind([
        {path: `/${Shared}/Git-Repos/shapetree.js-1.ttl`, type: 'text/html', entries: ['shapetree.js-1']},
      ]);
    })
    describe(`create /${Shared}/Git-Repos/jsg/`, () => {
      H.post({path: `/${Shared}/Git-Repos/`, slug: 'jsg.ttl', type: 'Resource',
              bodyURL: 'test/apps/gh-deep/jsg.ttl', root: {'@id': '#jsg'},
              status: 201, location: `/${Shared}/Git-Repos/jsg.ttl`});
      H.find([
        {path: `/${Shared}/Git-Repos/jsg.ttl`, accept: 'text/turtle', entries: ['gh:node_id "MDEwOlJlcG9zaXRvcnk0NjA2MTUxMg=="']},
        {path: `/${Shared}/Git-Issues/`, accept: 'text/turtle', entries: ['root of Container']},
        {path: `/${Shared}/Git-Labels/`, accept: 'text/turtle', entries: ['root of Container']},
        {path: `/${Shared}/Git-Milestones/`, accept: 'text/turtle', entries: ['root of Container']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git-Issues/1.ttl`, accept: 'text/turtle', entries: ['Git-Issues/1.ttl']},
      ]);
    })
    describe(`create /${Shared}/Git-Issues/1`, () => {
      H.post({path: `/${Shared}/Git-Issues/`, slug: '1.ttl',
              bodyURL: 'test/apps/gh-deep/jsg-issue1.ttl', root: {'@id': '#issue1'},
              status: 201, type: 'Resource', location: `/${Shared}/Git-Issues/1.ttl`});
      H.find([
        {path: `/${Shared}/Git-Issues/1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git-Issues/2.ttl`, accept: 'text/turtle', entries: ['Git-Issues/2.ttl']},
      ]);
    })
  });

  describe('shapetree navigation', function () {
    H.walkReferencedTrees({
      path: 'gh-flat/gh-flat-ShapeTree#org', expect: [
        { treeStep: '#repo'      , shapePath: `@gh-flat-Schema#OrgShape/gh:repo`       },
        { treeStep: '#issue'     , shapePath: `@gh-flat-Schema#RepoShape/gh:issue`     },
        { treeStep: '#labels'    , shapePath: `@gh-flat-Schema#RepoShape/gh:label`     },
        { treeStep: '#milestones', shapePath: `@gh-flat-Schema#RepoShape/gh:milestone` },
        { treeStep: '#comment'   , shapePath: `@gh-flat-Schema#IssueShape/gh:comment`  },
        { treeStep: '#event'     , shapePath: `@gh-flat-Schema#IssueShape/gh:event`    }
      ]
    });
    H.walkReferencedResources({
      path: 'gh-flat/gh-flat-ShapeTree#org', expect: [
        { treeStep: '#repo'      , shapePath: `@gh-flat-Schema#OrgShape/gh:repo`       },
        { treeStep: '#issue'     , shapePath: `@gh-flat-Schema#RepoShape/gh:issue`     },
        { treeStep: '#labels'    , shapePath: `@gh-flat-Schema#RepoShape/gh:label`     },
        { treeStep: '#milestones', shapePath: `@gh-flat-Schema#RepoShape/gh:milestone` },
        { treeStep: '#comment'   , shapePath: `@gh-flat-Schema#IssueShape/gh:comment`  },
        { treeStep: '#event'     , shapePath: `@gh-flat-Schema#IssueShape/gh:event`    }
      ]
    });
  });

});

