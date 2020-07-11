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
                 body: `INSERT DATA { <#ericprud> <${NS_gh}repository> <../Git-Repos/jsg.ttl> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:repository <../Git-Repos/jsg.ttl>']},
        ])
      });
      describe(`add jsg subscription to /${Shared}/Git-Users/ericprud`, () => {
        H.patch({path: `/${Shared}/Git-Users/ericprud.ttl`, mediaType: 'application/sparql-query',
                 body: `INSERT DATA { <#ericprud> <${NS_gh}subscription> <../Git-Repos/jsg.ttl> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:subscription <../Git-Repos/jsg.ttl>']},
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
                 body: `INSERT DATA { <#ericprud> <${NS_gh}repository> <../Git-Orgs/libxml-annot.ttl> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:repository .* <../Git-Orgs/libxml-annot.ttl>']},
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
                 body: `INSERT DATA { <#ericprud> <${NS_gh}issue> <../Git-Orgs/issue1.ttl> }`,
                 status: 204});
        H.find([
          {path: `/${Shared}/Git-Users/ericprud.ttl`, accept: 'text/turtle', entries: ['gh:issue <../Git-Orgs/issue1.ttl>']},
        ])
      });
    })
  });

  describe('shapetree navigation', function () {
    H.walkReferencedTrees({
      path: 'gh-flat/gh-flat-ShapeTree#org', expect: [
        { "reference": { "treeStep": "#repo", "shapePath": "@gh-flat-Schema#OrgShape/gh:repo" },
          "via": [] },
        { "reference": { "treeStep": "#issue", "shapePath": "@gh-flat-Schema#RepoShape/gh:issue" },
          "via": [ { "treeStep": "#repo", "shapePath": "@gh-flat-Schema#OrgShape/gh:repo" } ] },
        { "reference": { "treeStep": "#comment", "shapePath": "@gh-flat-Schema#IssueShape/gh:comment" },
          "via": [ { "treeStep": "#repo", "shapePath": "@gh-flat-Schema#OrgShape/gh:repo" },
                   { "treeStep": "#issue", "shapePath": "@gh-flat-Schema#RepoShape/gh:issue" } ] },
        { "reference": { "treeStep": "#event", "shapePath": "@gh-flat-Schema#IssueShape/gh:event" },
          "via": [ { "treeStep": "#repo", "shapePath": "@gh-flat-Schema#OrgShape/gh:repo" },
                   { "treeStep": "#issue", "shapePath": "@gh-flat-Schema#RepoShape/gh:issue" } ] },
        { "reference": { "treeStep": "#labels", "shapePath": "@gh-flat-Schema#RepoShape/gh:label" },
          "via": [ { "treeStep": "#repo", "shapePath": "@gh-flat-Schema#OrgShape/gh:repo" } ] },
        { "reference": { "treeStep": "#milestones", "shapePath": "@gh-flat-Schema#RepoShape/gh:milestone" },
          "via": [ { "treeStep": "#repo", "shapePath": "@gh-flat-Schema#OrgShape/gh:repo" } ] }
      ]
    });
    if (false)
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

