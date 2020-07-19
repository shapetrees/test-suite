'use strict';

const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
const NS_gh = 'http://github.example/ns#';
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

  describe(`create /${Shared}/Git-Users/`, () => {
    H.plant({path: `/${Shared}/`, slug: 'Git-Users',
             name: 'GhFlat', url: 'http://store.example/gh-flat', shapeTreePath: 'gh-flat/gh-flat-ShapeTree#users',
             status: 201, location: `/${Shared}/Git-Users/`});
    H.find([
      {path: `/${Shared}/Git-Users/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
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

  describe(`create /${Shared}/Git-Orgs/shapetrees.ttl`, () => {
    H.post({path: `/${Shared}/Git-Orgs/`, slug: 'shapetrees.ttl', type: 'Resource',
            bodyURL: 'test/apps/gh-deep/shapetrees-org.ttl', root: {'@id': '#shapetrees'},
            status: 201, location: `/${Shared}/Git-Orgs/shapetrees.ttl`});
    H.find([
      {path: `/${Shared}/Git-Orgs/shapetrees.ttl`, accept: 'text/turtle', entries: ['MDEyOk9yZ2FuaXphdGlvbjY0NDk0NjU5']},
    ]);
    H.dontFind([
      {path: `/${Shared}/Git-Orgs/shapetrees-1.ttl`, type: 'text/html', entries: ['shapetrees-1.ttl']},
    ]);
  });

  describe(`create /${Shared}/Git-Users/ericprud.ttl`, () => {
    H.post({path: `/${Shared}/Git-Users/`, slug: 'ericprud.ttl', type: 'Resource',
            bodyURL: 'test/apps/gh-deep/ericprud-user.ttl', root: {'@id': '#ericprud'},
            status: 201, location: `/${Shared}/Git-Users/ericprud.ttl`});
    H.find([
      {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['MDQ6VXNlcjU3MzQ3OA==']},
      // {path: `/${Shared}/Git-Users/ericprud.ttl/subscriptions/`, accept: 'text/turtle', entries: ['users/ericprud.ttl/subscriptions']},
    ]);
    H.dontFind([
      // {path: `/${Shared}/Git-Users/ericprud.ttl/subscriptions/subscr1.ttl`, accept: 'text/turtle', entries: ['subscr1.ttl']},
      {path: `/${Shared}/Git-Users/ericprud-1.ttl`, type: 'text/html', entries: ['ericprud-1.ttl']},
    ]);
  });

  describe(`create /${Shared}/Git-Repos/ members`, () => {
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
      describe(`add shapetree.js repository to /${Shared}/Git-Orgs/shapetrees`, () => {
        H.patch({path: `/${Shared}/Git-Orgs/shapetrees.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#shapetrees> <${NS_gh}repository> <../Git-Repos/shapetrees.js.ttl> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Orgs/shapetrees.ttl`, accept: 'text/turtle', entries: ['gh:repository <../Git-Repos/shapetrees.js.ttl>']},
        ])
      });
    })
    describe(`create /${Shared}/Git-Repos/jsg/`, () => {
      H.post({path: `/${Shared}/Git-Repos/`, slug: 'jsg.ttl', type: 'Resource',
              bodyURL: 'test/apps/gh-deep/jsg.ttl', root: {'@id': '#jsg'},
              status: 201, location: `/${Shared}/Git-Repos/jsg.ttl`});
      H.find([
        {path: `/${Shared}/Git-Repos/jsg.ttl`, accept: 'text/turtle', entries: ['gh:node_id "MDEwOlJlcG9zaXRvcnk0NjA2MTUxMg=="']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git-Issues/1.ttl`, accept: 'text/turtle', entries: ['Git-Issues/1.ttl']},
      ]);
      describe(`add jsg repository to /${Shared}/Git-Users/ericprud`, () => {
        H.patch({path: `/${Shared}/Git-Users/ericprud.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#ericprud> <${NS_gh}repository> <../Git-Repos/jsg.ttl#jsg> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:repository <../Git-Repos/jsg.ttl#jsg>']},
        ])
      });
      describe(`add jsg subscription to /${Shared}/Git-Users/ericprud`, () => {
        H.patch({path: `/${Shared}/Git-Users/ericprud.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#ericprud> <${NS_gh}subscription> <../Git-Repos/jsg.ttl#jsg> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:subscription <../Git-Repos/jsg.ttl#jsg>']},
        ])
      });
    })
    describe(`create /${Shared}/Git-Repos/libxml-annot/`, () => {
      H.post({path: `/${Shared}/Git-Repos/`, slug: 'libxml-annot.ttl', type: 'Resource',
              bodyURL: 'test/apps/gh-deep/libxml-annot-repo.ttl', root: {'@id': '#libxml-annot'},
              status: 201, location: `/${Shared}/Git-Repos/libxml-annot.ttl`});
      H.find([
        {path: `/${Shared}/Git-Repos/libxml-annot.ttl`, accept: 'text/turtle', entries: ['gh:node_id "MDc6TGljZW5zZTA="']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git-Issues/1.ttl`, accept: 'text/turtle', entries: ['Git-Issues/1.ttl']},
      ]);
      describe(`add libxml-annot repository to /${Shared}/Git-Users/ericprud`, () => {
        H.patch({path: `/${Shared}/Git-Users/ericprud.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#ericprud> <${NS_gh}repository> <../Git-Repos/libxml-annot.ttl#libxml-annot> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:repository .* <../Git-Repos/libxml-annot.ttl#libxml-annot>']},
        ])
      });
    })
    describe(`create /${Shared}/Git-Issues/issue1`, () => {
      H.post({path: `/${Shared}/Git-Issues/`, slug: 'issue1.ttl', type: 'Resource',
              bodyURL: 'test/apps/gh-deep/jsg-issue1.ttl', root: {'@id': '#issue1'},
              status: 201, location: `/${Shared}/Git-Issues/issue1.ttl`});
      H.find([
        {path: `/${Shared}/Git-Issues/issue1.ttl`, accept: 'text/turtle', entries: ['gh:author_association \"OWNER\"']},
      ]),
      H.dontFind([
        {path: `/${Shared}/Git-Issues/issue2.ttl`, accept: 'text/turtle', entries: ['Git-Issues/issue2.ttl']},
      ]);
      describe(`add issue issue1 to /${Shared}/Git-Users/ericprud`, () => {
        H.patch({path: `/${Shared}/Git-Users/ericprud.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#ericprud> <${NS_gh}issue> <../Git-Issues/issue1.ttl#issue1> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:issue <../Git-Issues/issue1.ttl#issue1>']},
        ])
      });
      describe(`add issue issue1 to /${Shared}/Git-Repos/jsg`, () => {
        H.patch({path: `/${Shared}/Git-Repos/jsg.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#jsg> <${NS_gh}issue> <../Git-Issues/issue1.ttl#issue1> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Repos/jsg.ttl`, accept: 'text/turtle', entries: ['gh:issue <../Git-Issues/issue1.ttl#issue1>']},
        ])
      });
    })
  });

  describe('shapetree navigation', function () {
    H.walkReferencedTrees({
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree#org', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [] },
        { "result": { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#comment", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#comment>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#event", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#event>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#labels", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#label>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#milestones", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#milestone>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
    });
    H.walkReferencedTrees({
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#comment", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#comment>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#event", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#event>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#labels", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#label>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#milestones", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#milestone>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
    });
    H.walkReferencedTrees({
      control: 0xF,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "contains", "target": "#org" },
          "via": [ ] },
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#comment", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#comment>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#event", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#event>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#labels", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#label>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#milestones", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#milestone>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
    });
    H.walkReferencedTrees({
      control: 0x5,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "contains", "target": "#org" },
          "via": [ ] }
      ]
    });
    H.walkReferencedTrees({
      control: 0xD,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "contains", "target": "#org" },
          "via": [ ] }
      ]
    });
    H.walkReferencedTrees({
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree-split-org#org', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [] },
        { "result": { "type": "reference", "target": { "treeStep": "gh-flat-ShapeTree-split-issues#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#comment", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#comment>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "gh-flat-ShapeTree-split-issues#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#event", "shapePath": "@<gh-flat-Schema#IssueShape>/<http://github.example/ns#event>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
                   { "type": "reference", "target": { "treeStep": "gh-flat-ShapeTree-split-issues#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#labels", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#label>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#milestones", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#milestone>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
    });
    H.walkReferencedTrees({
      depth: [2, 0x3],
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#labels", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#label>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#milestones", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#milestone>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
    });
    H.walkReferencedTrees({
      depth: [1, 0x3],
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" } ] }
      ]
    });
    H.walkReferencedTrees({
      depth: [0, 0x3],
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" } ] }
      ]
    });
    H.walkReferencedTrees({
      depth: [2, 0],
      control: undefined,
      path: 'gh-flat/gh-flat-ShapeTree#orgs', expect: [
        { "result": { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" } ] },
        { "result": { "type": "reference", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": "#org", "type": "contains" },
                   { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
    });
    H.walkReferencedResources({
      prefixes: {"st": "gh-flat/gh-flat-ShapeTree#repos"},
      control: undefined,
      focus: `/${Shared}/Git-Users/ericprud.ttl#ericprud`, expect: [
        { "result": {
            "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#repo",
              "shapePath": "@<gh-flat-Schema#UserShape>/<http://github.example/ns#repository>" },
            "resource": "/Data/Git-Repos/jsg.ttl#jsg" },
          "via": [] },
        { "result": {
            "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#issue",
              "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" },
            "resource": "/Data/Git-Issues/issue1.ttl#issue1" },
          "via": [
            { "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#repo",
                "shapePath": "@<gh-flat-Schema#UserShape>/<http://github.example/ns#repository>" },
              "resource": "/Data/Git-Repos/jsg.ttl#jsg" }
          ] },
        { "result": { "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#repo",
              "shapePath": "@<gh-flat-Schema#UserShape>/<http://github.example/ns#repository>" },
            "resource": "/Data/Git-Repos/libxml-annot.ttl#libxml-annot" },
          "via": [] },
        { "result": { "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#repo",
              "shapePath": "@<gh-flat-Schema#UserShape>/<http://github.example/ns#subscription>" },
            "resource": "/Data/Git-Repos/jsg.ttl#jsg" },
          "via": [] },
        { "result": { "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#issue",
              "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" },
            "resource": "/Data/Git-Issues/issue1.ttl#issue1" },
          "via": [
            { "type": "reference", "target": { "treeStep": "gh-flat/gh-flat-ShapeTree#repo",
                "shapePath": "@<gh-flat-Schema#UserShape>/<http://github.example/ns#subscription>" },
              "resource": "/Data/Git-Repos/jsg.ttl#jsg" }
          ] }
      ]
      /*
      [
        { "result": { "type": "reference", "target": "../Git-Orgs/shapetrees.ttl" },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] },
        { "result": { "type": "resource", "target": { "treeStep": "#issue", "shapePath": "@<gh-flat-Schema#RepoShape>/<http://github.example/ns#issue>" } },
          "via": [ { "type": "reference", "target": { "treeStep": "#repo", "shapePath": "@<gh-flat-Schema#OrgShape>/<http://github.example/ns#repo>" } } ] }
      ]
      */
    });
  });

});

