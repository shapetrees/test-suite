'use strict';

const expect = require('chai').expect;
const Rdf = require('../shapetree.js/lib/rdf-serialization')
const Fs = require('fs')
const Path = require('path')
const Prefixes = require('../shapetree.js/lib/prefixes')
const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('./test-harness');
const Todo = require('./todo')()
const dump = Todo.dump
H.init(LdpConf.documentRoot);
const testF = p => Path.join(__dirname, p)

describe(`MR apps, shapetrees and decorators`, function () {
  before(() => H.ensureTestDirectory(Shared));

  let MrApp, MrShapeTree, DashShapeTree, DecoratorIndex = {}
  describe(`end-to-end`, () => {
    it (`parse App ID`, async () => {
      const appPrefixes = {}
      const appUrl = new URL('mr/mr-App#agent', H.appStoreBase)
      const text = Fs.readFileSync(testF('../solidApps/staticRoot/mr/mr-App.ttl'), 'utf8')
      MrApp = Todo.parseApplication(await Rdf.parseTurtle(text, appUrl, appPrefixes), appUrl)
      expect(Todo.flattenUrls(MrApp)).to.deep.equal(App1)
    })
    it (`parse med rec ShapeTree`, async () => {
      const stUrl = new URL('mr/mr-ShapeTree#medicalRecords', H.appStoreBase)
      MrShapeTree = await H.ShapeTree.RemoteShapeTree.get(stUrl)
      expect(MrShapeTree.hasShapeTreeDecoratorIndex.map(u => u.href)).to.deep.equal([ new URL('mr/mr-ShapeTree-SKOS-index#idx', H.appStoreBase).href ])
      expect(Todo.flattenUrls(MrShapeTree.ids)).to.deep.equal(Todo.flattenUrls(MrShapeTreeIds1))

      const it = MrShapeTree.walkReferencedTrees()
      const got = []
      for await (const answer of it)
        got.push(answer)
      // console.warn(JSON.stringify(got))
     })
    it (`parse dashboard ShapeTree`, async () => {
      const stUrl = new URL('mr/dashboard-ShapeTree#dashboards', H.appStoreBase)
      DashShapeTree = await H.ShapeTree.RemoteShapeTree.get(stUrl)
      // console.warn('got:', JSON.stringify(Todo.flattenUrls(DashShapeTree.ids), null, 2))
      expect(Todo.flattenUrls(DashShapeTree.ids)).to.deep.equal(Todo.flattenUrls(DashShapeTreeIds1))

      const it = DashShapeTree.walkReferencedTrees()
      const got = []
      for await (const answer of it)
        got.push(answer)
      // console.warn(JSON.stringify(got))
    })
    it (`parse decorators`, async () => {
      const decoratorPrefixes = {}
      const tests = [['mr/mr-ShapeTree-SKOS', MrShapeTreeSkos1]]
      tests.forEach(async sourceAndResult => {
        const decoratorUrl = new URL(sourceAndResult[0], H.appStoreBase)
        const text = Fs.readFileSync(testF('../solidApps/staticRoot/mr/mr-ShapeTree-SKOS.ttl'), 'utf8')
        const g = await Rdf.parseTurtle(text, decoratorUrl, decoratorPrefixes)
        DecoratorIndex[decoratorUrl.href] = Todo.parseDecoratorGraph(g, Todo.parseDecoratorGraph.profile.shapeTree)
        expect(Todo.flattenUrls(DecoratorIndex[decoratorUrl.href])).to.deep.equal(sourceAndResult[1])
      })
    })
    it (`build UI`, async () => {
      const appUrl = new URL('cr/cr-App#agent', H.appStoreBase)
      const langPrefs = ['cn', 'en']

      const appResource = new H.ShapeTree.RemoteResource(appUrl)
      await appResource.fetch()
      const crApp = Todo.parseApplication(appResource.graph, appUrl)

      const drawQueues = await Todo.generateUI(MrApp, langPrefs)
      console.warn(Todo.textualizeDrawQueues(drawQueues))
      if (false)
        console.warn('DONE2', JSON.stringify(Todo.flattenUrls(Todo.summarizeDrawQueues(drawQueues)), null, 2))
    })
  });
           
  if (false) describe('shapetree navigation', function () {
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
            "resource": "/Data/Git-Issues/issue1.ttl" },
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
            "resource": "/Data/Git-Issues/issue1.ttl" },
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

const App1 = {
  "id": "<mr/mr-App#agent>",
  "applicationDescription": "Health!",
  "applicationDevelopedBy": "HealthDev.co",
  "authorizationCallback": "<https://healthpad.example/callback>",
  "hasAccessDecoratorIndex": "<mr/mr-App-SKOS-index#idx>",
  "hasAccessNeedGroup": [
    {
      "id": "<mr/mr-App#general>",
      "requestsAccess": [
        {
          "id": "<mr/mr-App#medical-record-r>",
          "inNeedSet": [
            "<mr/mr-App#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#medicalRecords>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        },
        {
          "id": "<mr/mr-App#dashboard-r>",
          "supports": "<mr/mr-App#medical-record-r>",
          "inNeedSet": [
            "<mr/mr-App#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/dashboard-ShapeTree#dashboards>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        }
      ],
      "authenticatesAsAgent": "<acl:Pilot>",
      "byShapeTree": {
        "mr/mr-ShapeTree#medicalRecords": {
          "id": "<mr/mr-App#medical-record-r>",
          "inNeedSet": [
            "<mr/mr-App#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#medicalRecords>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        },
        "mr/dashboard-ShapeTree#dashboards": {
          "id": "<mr/mr-App#dashboard-r>",
          "supports": "<mr/mr-App#medical-record-r>",
          "inNeedSet": [
            "<mr/mr-App#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/dashboard-ShapeTree#dashboards>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        },
        "mr/mr-ShapeTree#patients": {
          "id": "<mr/mr-App#patient-rw>",
          "inNeedSet": [
            "<mr/mr-App#general>",
            "<mr/mr-App#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#patients>",
          "recursivelyAuthorize": true,
          "requestedAccess": 11
        },
        "mr/mr-ShapeTree#conditions": {
          "id": "<mr/mr-App#condition-rw>",
          "inNeedSet": [
            "<mr/mr-App#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#conditions>",
          "recursivelyAuthorize": true,
          "requestedAccess": 3
        }
      }
    },
    {
      "id": "<mr/mr-App#med-management>",
      "requestsAccess": [
        {
          "id": "<mr/mr-App#prescriptions-rw>",
          "inNeedSet": [
            "<mr/mr-App#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#prescriptions>",
          "recursivelyAuthorize": false,
          "requestedAccess": 3
        }
      ],
      "authenticatesAsAgent": "<acl:Pilot>",
      "byShapeTree": {
        "mr/mr-ShapeTree#prescriptions": {
          "id": "<mr/mr-App#prescriptions-rw>",
          "inNeedSet": [
            "<mr/mr-App#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#prescriptions>",
          "recursivelyAuthorize": false,
          "requestedAccess": 3
        },
        "mr/mr-ShapeTree#patients": {
          "id": "<mr/mr-App#patient-rw>",
          "inNeedSet": [
            "<mr/mr-App#general>",
            "<mr/mr-App#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "registeredShapeTree": "<mr/mr-ShapeTree#patients>",
          "recursivelyAuthorize": true,
          "requestedAccess": 11
        }
      }
    }
  ]
}

const MrShapeTreeIds1 = {
  "mr/mr-ShapeTree#medicalRecords": {
    "@id": "<mr/mr-ShapeTree#medicalRecords>",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#medicalRecord>"
    ],
    "references": [
      {
        "treeStep": "<mr/mr-ShapeTree#appointments>"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#conditions>"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#diagnosticTests>"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#patients>"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#prescriptions>"
      }
    ]
  },
  "mr/mr-ShapeTree#patients": {
    "@id": "<mr/mr-ShapeTree#patients>",
    "name": "patients",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#patient>"
    ]
  },
  "mr/mr-ShapeTree#appointments": {
    "@id": "<mr/mr-ShapeTree#appointments>",
    "name": "appointments",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#appointment>"
    ]
  },
  "mr/mr-ShapeTree#conditions": {
    "@id": "<mr/mr-ShapeTree#conditions>",
    "name": "conditions",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#condition>"
    ]
  },
  "mr/mr-ShapeTree#prescriptions": {
    "@id": "<mr/mr-ShapeTree#prescriptions>",
    "name": "prescriptions",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#prescription>"
    ],
    "references": [ { "treeStep": "<mr/mr-ShapeTree#patients>" } ]
  },
  "mr/mr-ShapeTree#diagnosticTests": {
    "@id": "<mr/mr-ShapeTree#diagnosticTests>",
    "name": "diagnosticTests",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#condition>",
      "<mr/mr-ShapeTree#diagnosticTest>"
    ]
  },
  "mr/mr-ShapeTree#allergies": {
    "@id": "<mr/mr-ShapeTree#allergies>",
    "name": "allergies",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/mr-ShapeTree#allergy>"
    ]
  },
  "mr/mr-ShapeTree#medicalRecord": {
    "@id": "<mr/mr-ShapeTree#medicalRecord>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#medicalRecord>",
    "references": [
      {
        "treeStep": "<mr/mr-ShapeTree#allergy>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:allergy"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#appointment>",
        "shapePath": "<@medrecord-schema#medicalRecord>/medrecord:appointment"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#condition>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:condition"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#diagnosticTest>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:diagnosticTest"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#patient>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:patient"
      },
      {
        "treeStep": "<mr/mr-ShapeTree#prescription>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:prescription"
      }
    ],
    "containedIn": "<mr/mr-ShapeTree#medicalRecords>"
  },
  "mr/mr-ShapeTree#patient": {
    "@id": "<mr/mr-ShapeTree#patient>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#patientShape>",
    "containedIn": "<mr/mr-ShapeTree#patients>"
  },
  "mr/mr-ShapeTree#appointment": {
    "@id": "<mr/mr-ShapeTree#appointment>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#appointmentShape>",
    "containedIn": "<mr/mr-ShapeTree#appointments>"
  },
  "mr/mr-ShapeTree#condition": {
    "@id": "<mr/mr-ShapeTree#condition>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#conditionShape>",
    "containedIn": "<mr/mr-ShapeTree#diagnosticTests>"
  },
  "mr/mr-ShapeTree#prescription": {
    "@id": "<mr/mr-ShapeTree#prescription>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#prescriptionShape>",
    "containedIn": "<mr/mr-ShapeTree#prescriptions>",
    "references": [ { "treeStep": "<mr/mr-ShapeTree#patient>" } ]
  },
  "mr/mr-ShapeTree#allergy": {
    "@id": "<mr/mr-ShapeTree#allergy>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#allergyShape>",
    "containedIn": "<mr/mr-ShapeTree#allergies>"
  },
  "mr/mr-ShapeTree#diagnosticTest": {
    "@id": "<mr/mr-ShapeTree#diagnosticTest>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/medrecord-schema#diagnosticTestShape>",
    "containedIn": "<mr/mr-ShapeTree#diagnosticTests>"
  }
}



const DashShapeTreeIds1 = {
  "mr/dashboard-ShapeTree#dashboards": {
    "@id": "<mr/dashboard-ShapeTree#dashboards>",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "contains": [
      "<mr/dashboard-ShapeTree#dashboard>"
    ],
    "references": [
      {
        "treeStep": "<mr/dashboard-ShapeTree#current-conditions>"
      },
      {
        "treeStep": "<mr/dashboard-ShapeTree#current-medicationRequests>"
      },
      {
        "treeStep": "<mr/dashboard-ShapeTree#temporal-appointments>"
      },
      {
        "treeStep": "<mr/dashboard-ShapeTree#temporal-diagnosticReports>"
      }
    ]
  },
  "mr/dashboard-ShapeTree#temporal-appointments": {
    "@id": "<mr/dashboard-ShapeTree#temporal-appointments>",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "supports": [
      "<mr/mr-ShapeTree#appointments>"
    ],
    "contains": [
      "<mr/dashboard-ShapeTree#temporal-appointment>"
    ]
  },
  "mr/dashboard-ShapeTree#current-conditions": {
    "@id": "<mr/dashboard-ShapeTree#current-conditions>",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "supports": [
      "<mr/mr-ShapeTree#conditions>"
    ],
    "contains": [
      "<mr/dashboard-ShapeTree#current-condition>"
    ]
  },
  "mr/dashboard-ShapeTree#current-medicationRequests": {
    "@id": "<mr/dashboard-ShapeTree#current-medicationRequests>",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "supports": [
      "<mr/mr-ShapeTree#prescriptions>"
    ],
    "contains": [
      "<mr/dashboard-ShapeTree#current-medicationRequest>"
    ]
  },
  "mr/dashboard-ShapeTree#temporal-diagnosticReports": {
    "@id": "<mr/dashboard-ShapeTree#temporal-diagnosticReports>",
    "expectsType": "<http://www.w3.org/ns/ldp#Container>",
    "supports": [
      "<mr/mr-ShapeTree#diagnosticTests>"
    ],
    "contains": [
      "<mr/dashboard-ShapeTree#temporal-diagnosticReport>"
    ]
  },
  "mr/dashboard-ShapeTree#dashboard": {
    "@id": "<mr/dashboard-ShapeTree#dashboard>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/dashboard-schema#DashboardShape>",
    "references": [
      {
        "treeStep": "<mr/dashboard-ShapeTree#current-condition>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:condition"
      },
      {
        "treeStep": "<mr/dashboard-ShapeTree#current-medicationRequest>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:prescription"
      },
      {
        "treeStep": "<mr/dashboard-ShapeTree#temporal-appointment>",
        "shapePath": "<@medrecord-schema#medicalRecord>/medrecord:appointment"
      },
      {
        "treeStep": "<mr/dashboard-ShapeTree#temporal-diagnosticReport>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:diagnosticTest"
      }
    ],
    "containedIn": "<mr/dashboard-ShapeTree#dashboards>"
  },
  "mr/dashboard-ShapeTree#temporal-appointment": {
    "@id": "<mr/dashboard-ShapeTree#temporal-appointment>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/dashboard-schema#TemporalAppointmentShape>",
    "supports": [
      "<mr/mr-ShapeTree#appointment>"
    ],
    "containedIn": "<mr/dashboard-ShapeTree#temporal-appointments>"
  },
  "mr/dashboard-ShapeTree#current-condition": {
    "@id": "<mr/dashboard-ShapeTree#current-condition>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/dashboard-schema#CurrentConditionShape>",
    "supports": [
      "<mr/mr-ShapeTree#condition>"
    ],
    "containedIn": "<mr/dashboard-ShapeTree#current-conditions>"
  },
  "mr/dashboard-ShapeTree#current-medicationRequest": {
    "@id": "<mr/dashboard-ShapeTree#current-medicationRequest>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/dashboard-schema#CurrentMedicationRequestShape>",
    "supports": [
      "<mr/mr-ShapeTree#prescription>"
    ],
    "containedIn": "<mr/dashboard-ShapeTree#current-medicationRequests>"
  },
  "mr/dashboard-ShapeTree#temporal-diagnosticReport": {
    "@id": "<mr/dashboard-ShapeTree#temporal-diagnosticReport>",
    "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
    "matchesUriTemplate": "{id}",
    "validatedBy": "<mr/dashboard-schema#TemporalDiagnosticTestShape>",
    "supports": [
      "<mr/mr-ShapeTree#diagnosticTest>"
    ],
    "containedIn": "<mr/dashboard-ShapeTree#temporal-diagnosticReports>"
  }
}


const MrShapeTreeSkos1 = {
  "indexed": {
    "mr/mr-ShapeTree#medicalRecords": {
      "id": "<mr/mr-ShapeTree-SKOS#medicalRecords>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "treeStep": "<mr/mr-ShapeTree#medicalRecords>",
      "prefLabel": "Medical Records",
      "definition": "A collection of Medical Records"
    },
    "mr/mr-ShapeTree#medicalRecord": {
      "id": "<mr/mr-ShapeTree-SKOS#medicalRecord>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "treeStep": "<mr/mr-ShapeTree#medicalRecord>",
      "prefLabel": "Medical Record",
      "definition": "An extensive view of your medical history"
    },
    "mr/mr-ShapeTree#patients": {
      "id": "<mr/mr-ShapeTree-SKOS#patients>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "treeStep": "<mr/mr-ShapeTree#patients>",
      "prefLabel": "Patients.",
      "definition": "Describes a receiver of medical care"
    },
    "mr/mr-ShapeTree#patient": {
      "id": "<mr/mr-ShapeTree-SKOS#patient>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "treeStep": "<mr/mr-ShapeTree#patient>",
      "prefLabel": "Patient",
      "definition": "Describes a receiver of medical care"
    },
    "mr/mr-ShapeTree#appointments": {
      "id": "<mr/mr-ShapeTree-SKOS#appointments>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "treeStep": "<mr/mr-ShapeTree#appointments>",
      "prefLabel": "Appointments.",
      "definition": "A time and place with someone"
    },
    "mr/mr-ShapeTree#appointment": {
      "id": "<mr/mr-ShapeTree-SKOS#appointment>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "treeStep": "<mr/mr-ShapeTree#appointment>",
      "prefLabel": "Appointment.",
      "definition": "A time and place with someone"
    },
    "mr/mr-ShapeTree#conditions": {
      "id": "<mr/mr-ShapeTree-SKOS#conditions>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "narrower": [
        "<mr/mr-ShapeTree-SKOS#prescriptions>",
        "<mr/mr-ShapeTree-SKOS#allergies>"
      ],
      "treeStep": "<mr/mr-ShapeTree#conditions>",
      "prefLabel": "Conditions.",
      "definition": "A diagnosed issue"
    },
    "mr/mr-ShapeTree#condition": {
      "id": "<mr/mr-ShapeTree-SKOS#condition>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "narrower": [
        "<mr/mr-ShapeTree-SKOS#prescription>",
        "<mr/mr-ShapeTree-SKOS#allergy>"
      ],
      "treeStep": "<mr/mr-ShapeTree#condition>",
      "prefLabel": "Condition.",
      "definition": "A diagnosed issue"
    },
    "mr/mr-ShapeTree#prescriptions": {
      "id": "<mr/mr-ShapeTree-SKOS#prescriptions>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "treeStep": "<mr/mr-ShapeTree#prescriptions>",
      "prefLabel": "prescriptions.",
      "definition": "prescriptions"
    },
    "mr/mr-ShapeTree#prescription": {
      "id": "<mr/mr-ShapeTree-SKOS#prescription>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "treeStep": "<mr/mr-ShapeTree#prescription>",
      "prefLabel": "prescription.",
      "definition": "prescription"
    },
    "mr/mr-ShapeTree#allergies": {
      "id": "<mr/mr-ShapeTree-SKOS#allergies>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "treeStep": "<mr/mr-ShapeTree#allergies>",
      "prefLabel": "allergies.",
      "definition": "allergies"
    },
    "mr/mr-ShapeTree#allergy": {
      "id": "<mr/mr-ShapeTree-SKOS#allergy>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "treeStep": "<mr/mr-ShapeTree#allergy>",
      "prefLabel": "allergy.",
      "definition": "allergy"
    },
    "mr/mr-ShapeTree#diagnosticTests": {
      "id": "<mr/mr-ShapeTree-SKOS#diagnosticTests>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
      "treeStep": "<mr/mr-ShapeTree#diagnosticTests>",
      "prefLabel": "diagnosticTests.",
      "definition": "diagnosticTests"
    },
    "mr/mr-ShapeTree#diagnosticTest": {
      "id": "<mr/mr-ShapeTree-SKOS#diagnosticTest>",
      "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
      "treeStep": "<mr/mr-ShapeTree#diagnosticTest>",
      "prefLabel": "diagnosticTest.",
      "definition": "diagnosticTest"
    }
  },
  "byScheme": {
    "mr/mr-ShapeTree-SKOS#containerManagement": [
      {
        "id": "<mr/mr-ShapeTree-SKOS#medicalRecords>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "treeStep": "<mr/mr-ShapeTree#medicalRecords>",
        "prefLabel": "Medical Records",
        "definition": "A collection of Medical Records"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#patients>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "treeStep": "<mr/mr-ShapeTree#patients>",
        "prefLabel": "Patients.",
        "definition": "Describes a receiver of medical care"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#appointments>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "treeStep": "<mr/mr-ShapeTree#appointments>",
        "prefLabel": "Appointments.",
        "definition": "A time and place with someone"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#conditions>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "narrower": [
          "<mr/mr-ShapeTree-SKOS#prescriptions>",
          "<mr/mr-ShapeTree-SKOS#allergies>"
        ],
        "treeStep": "<mr/mr-ShapeTree#conditions>",
        "prefLabel": "Conditions.",
        "definition": "A diagnosed issue"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#prescriptions>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "treeStep": "<mr/mr-ShapeTree#prescriptions>",
        "prefLabel": "prescriptions.",
        "definition": "prescriptions"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#allergies>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "treeStep": "<mr/mr-ShapeTree#allergies>",
        "prefLabel": "allergies.",
        "definition": "allergies"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#diagnosticTests>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#containerManagement>",
        "treeStep": "<mr/mr-ShapeTree#diagnosticTests>",
        "prefLabel": "diagnosticTests.",
        "definition": "diagnosticTests"
      }
    ],
    "mr/mr-ShapeTree-SKOS#instanceManagement": [
      {
        "id": "<mr/mr-ShapeTree-SKOS#medicalRecord>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "treeStep": "<mr/mr-ShapeTree#medicalRecord>",
        "prefLabel": "Medical Record",
        "definition": "An extensive view of your medical history"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#patient>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "treeStep": "<mr/mr-ShapeTree#patient>",
        "prefLabel": "Patient",
        "definition": "Describes a receiver of medical care"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#appointment>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "treeStep": "<mr/mr-ShapeTree#appointment>",
        "prefLabel": "Appointment.",
        "definition": "A time and place with someone"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#condition>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "narrower": [
          "<mr/mr-ShapeTree-SKOS#prescription>",
          "<mr/mr-ShapeTree-SKOS#allergy>"
        ],
        "treeStep": "<mr/mr-ShapeTree#condition>",
        "prefLabel": "Condition.",
        "definition": "A diagnosed issue"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#prescription>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "treeStep": "<mr/mr-ShapeTree#prescription>",
        "prefLabel": "prescription.",
        "definition": "prescription"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#allergy>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "treeStep": "<mr/mr-ShapeTree#allergy>",
        "prefLabel": "allergy.",
        "definition": "allergy"
      },
      {
        "id": "<mr/mr-ShapeTree-SKOS#diagnosticTest>",
        "inScheme": "<mr/mr-ShapeTree-SKOS#instanceManagement>",
        "treeStep": "<mr/mr-ShapeTree#diagnosticTest>",
        "prefLabel": "diagnosticTest.",
        "definition": "diagnosticTest"
      }
    ]
  }
}

