'use strict';

const expect = require('chai').expect;
const Rdf = require('../shapetree.js/lib/rdf-serialization')
const Prefixes = require('../shapetree.js/lib/prefixes')
const Fs = require('fs')
const Path = require('path')
const N3 = require('n3');
const { namedNode, literal, defaultGraph, quad } = N3.DataFactory;
const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('./test-harness');
const NS_gh = 'http://github.example/ns#';
H.init(LdpConf.documentRoot);
const testF = p => Path.join(__dirname, p)

describe(`apps, shapetrees and SKOS`, function () {
  before(() => H.ensureTestDirectory(Shared));

  let MrApp, MrShapeTree, DashShapeTree, Skosz = {}
  describe(`end-to-end`, () => {
    it (`parse App ID`, async () => {
      const appPrefixes = {}
      const appUrl = new URL('https://healthpad.example/id')
      MrApp = parseApplication(await Rdf.parseTurtle(Fs.readFileSync(testF('../solidApps/staticRoot/mr/mr-App.ttl'), 'utf8'), appUrl, appPrefixes))
      expect(flattenUrls(MrApp)).to.deep.equal(App1)
    })
    it (`parse med rec ShapeTree`, async () => {
      const stUrl = new URL('mr/mr-ShapeTree.ttl#medicalRecords', H.appStoreBase)
      MrShapeTree = await H.ShapeTree.RemoteShapeTree.get(stUrl)
      expect(MrShapeTree.hasShapeTreeDecoratorIndex.map(u => u.href)).to.deep.equal([ new URL('mr/mr-ShapeTree-SKOS.ttl', H.appStoreBase).href ])
      expect(flattenUrls(MrShapeTree.ids)).to.deep.equal(flattenUrls(MrShapeTreeIds1))

      const it = MrShapeTree.walkReferencedTrees(stUrl)
      const got = []
      for await (const answer of it)
        got.push(answer)
      // console.warn(JSON.stringify(got))
     })
    it (`parse dashboard ShapeTree`, async () => {
      const stUrl = new URL('mr/dashboard-ShapeTree.ttl#dashboards', H.appStoreBase)
      DashShapeTree = await H.ShapeTree.RemoteShapeTree.get(stUrl)
      expect(flattenUrls(DashShapeTree.ids)).to.deep.equal(flattenUrls(DashShapeTreeIds1))

      const it = DashShapeTree.walkReferencedTrees(stUrl)
      const got = []
      for await (const answer of it)
        got.push(answer)
      // console.warn(JSON.stringify(got))
    })
    it (`parse SKOSes`, async () => {
      const stSkosPrefixes = {}
      const tests = [['mr/mr-ShapeTree-SKOS.ttl', MrShapeTreeSkos1]]
      tests.forEach(Foo)
      async function Foo (t) {
        const stSkosUrl = new URL(t[0], H.appStoreBase)
        Skosz[stSkosUrl.href] = parseSkos(await Rdf.parseTurtle(Fs.readFileSync(testF('../solidApps/staticRoot/mr/mr-ShapeTree-SKOS.ttl'), 'utf8'), stSkosUrl, stSkosPrefixes))
        expect(flattenUrls(Skosz[stSkosUrl.href])).to.deep.equal(t[1])
      }
    })
    it (`build UI`, async () => {
      const stskosz = MrShapeTree.hasShapeTreeDecoratorIndex.map(u => Skosz[u.href])
      const accessNeedGroups = MrApp.groupedAccessNeeds
      const drawQueue = []
      accessNeedGroups
        .forEach(grp => {
          const done = []
          grp.requestsAccess
            .filter(req => req.id.href !== 'https://healthpad.example/id#dashboard-r')
            .forEach(
              req => setAclsFromRule(req, done, stskosz, drawQueue)
            )
        })
    })
  });

  function setAclsFromRule (req, done, stskosz, drawQueue) {
    console.warn(`setAclsFromRule (${JSON.stringify(req)}, ${done})`)
    const st = req.hasShapeTree
    let stskos = stskosz.find(stskos => st.href in stskos.byShapeTree)
    if (!stskos)
      throw Error(`${st.href} not found in ${stskosz.map(stskos => `${Object.keys(stskos.byShapeTree)}`)}`)
    stskos = stskos.byShapeTree[st.href]
    if (done.indexOf(st.href) !== -1)
      return
    console.warn(flattenUrls(stskos))
  }

  function addRow (stskos, access, appSkosz) {
  }

  function flattenUrls (obj) {
    if (!obj) {
      return obj
    } else if (obj instanceof URL) {
      return '<' + obj.href + '>'
    } else if (obj instanceof Array) {
      return Object.keys(obj).reduce(
        (acc, key) => acc.concat(flattenUrls(obj[key])) , []
      )
    } else if (typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        acc[key] = flattenUrls(obj[key])
        return acc
      }, {})
    } else {
      return obj
    }
  }

  const nn = (prefix, lname) => namedNode(Prefixes['ns_' + prefix] + lname)

  function visitNode (graph, rules, subjects, includeId) {
    return subjects.map(s => {
      const byPredicate = graph.getQuads(s, null, null).reduce((acc, q) => {
        const p = q.predicate.value
        if (!(p in acc))
          acc[p] = []
        acc[p].push(q.object)
        return acc
      }, {})
      const ret = includeId
            ? {'id': new URL(s.value)}
            : {}
      return rules.reduce((acc, rule) => {
        const p = rule.predicate
        if (p in byPredicate)
          acc[rule.attr] = rule.f(byPredicate[p], graph)
        return acc
      }, ret)
    })
  }

  const str = sz => one(sz).value
  const sht = sz => new URL(one(sz).value)
  const lst = sz => sz.map(s => new URL(s.value))
  const bol = sz => one(sz).value === 'true'
  const one = sz => sz.length === 1
        ? sz[0]
        : (() => {throw new Errors.ShapeTreeStructureError(this.url, `Expected one object, got [${sz.map(s => s.value).join(', ')}]`)})()

  function parseApplication (g) {
    const root = g.getQuads(null, nn('rdf', 'type'), nn('eco', 'Application'))[0].subject
    const cnt = (sz, g) => {
      return 1
    }
    const grp = (sz, g) => visitNode(g, needGroupRules, sz, true)
    // const ned = (sz, g) => visitNode(g, accessNeedRules, sz, true)
    const ned = (sz, g) => visitNode(g, accessNeedRules, sz, true)
    const accessNeedRules = [
      { predicate: Prefixes.ns_eco + 'inNeedSet'    , attr: 'inNeedSet'    , f: lst },
      { predicate: Prefixes.ns_eco + 'requestedAccessLevel', attr: 'requestedAccessLevel', f: sht },
      { predicate: Prefixes.ns_tree + 'hasShapeTree' , attr: 'hasShapeTree' , f: sht },
      { predicate: Prefixes.ns_eco + 'recursivelyAuthorize', attr: 'recursivelyAuthorize', f: bol },
      { predicate: Prefixes.ns_eco + 'requestedAccess', attr: 'requestedAccess', f: cnt },
    ]
    const needGroupRules = [
      { predicate: Prefixes.ns_eco + 'requestsAccess', attr: 'requestsAccess', f: ned },
      { predicate: Prefixes.ns_eco + 'authenticatesAsAgent', attr: 'authenticatesAsAgent', f: sht },
    ]
    const applicationRules = [
      { predicate: Prefixes.ns_eco + 'applicationDescription', attr: 'applicationDescription', f: str },
      { predicate: Prefixes.ns_eco + 'applicationDevelopedBy', attr: 'applicationDevelopedBy', f: str },
      { predicate: Prefixes.ns_eco + 'authorizationCallback' , attr: 'authorizationCallback' , f: sht },
      { predicate: Prefixes.ns_eco + 'applicationAccessSkosIndex' , attr: 'applicationAccessSkosIndex' , f: sht },
      { predicate: Prefixes.ns_eco + 'groupedAccessNeeds'  , attr: 'groupedAccessNeeds'  , f: grp },
    ]

    const ret = visitNode(g, applicationRules, [root], true)[0]
    ret.groupedAccessNeeds.forEach(grpd => {
    grpd.byShapeTree = {}
    const needsId = grpd.id.href
    grpd.requestsAccess.forEach(req => { grpd.byShapeTree[req.id.href] = req })
    const requestsAccess = grpd.requestsAccess.map(req => req.id.href)
    g.getQuads(null, nn('eco', 'inNeedSet'), namedNode(needsId))
      .map(q => q.subject.value)
      .filter(n => requestsAccess.indexOf(n) === -1)
      .forEach(n => {
        grpd.byShapeTree[n] = ned([namedNode(n)], g)[0]
      })
    })
    return ret
  }

  function parseSkos (g) {
    const labelNodes = g.getQuads(null, nn('rdf', 'type'), nn('tree', 'ShapeTreeLabel')).map(q => q.subject)

    const labelRules = [
      { predicate: Prefixes.ns_skos + 'inScheme', attr: 'inScheme', f: sht },
      { predicate: Prefixes.ns_tree + 'treeStep' , attr: 'treeStep' , f: sht },
      { predicate: Prefixes.ns_skos + 'prefLabel', attr: 'prefLabel', f: str },
      { predicate: Prefixes.ns_skos + 'definition', attr: 'definition', f: str },
    ]

    const labels = labelNodes.map(label => visitNode(g, labelRules, [label], true)[0])
    const byScheme = labels.reduce((acc, label) => {
      const scheme = label.inScheme.href
      if (!(scheme in acc))
        acc[scheme] = []
      acc[scheme].push(label)
      return acc
    }, {})
    const byShapeTree = labels.reduce((acc, label) => {
      const shapeTree = label.treeStep.href
      acc[shapeTree] = label
      return acc
    }, {})
    return { byScheme, byShapeTree }
  }

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
  "id": "<https://healthpad.example/id#agent>",
  "applicationDescription": "Health!",
  "applicationDevelopedBy": "HealthDev.co",
  "authorizationCallback": "<https://healthpad.example/callback>",
  "applicationAccessSkosIndex": "<https://healthpad.example/healthpad-skos-index.ttl>",
  "groupedAccessNeeds": [
    {
      "id": "<https://healthpad.example/id#general>",
      "requestsAccess": [
        {
          "id": "<https://healthpad.example/id#medical-record-r>",
          "inNeedSet": [
            "<https://healthpad.example/id#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://medrecord.example/shapetrees#medicalRecords>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        },
        {
          "id": "<https://healthpad.example/id#dashboard-r>",
          "inNeedSet": [
            "<https://healthpad.example/id#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://dashboard.example/shapetrees#dashboards>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        }
      ],
      "authenticatesAsAgent": "<acl:Pilot>",
      "byShapeTree": {
        "https://healthpad.example/id#medical-record-r": {
          "id": "<https://healthpad.example/id#medical-record-r>",
          "inNeedSet": [
            "<https://healthpad.example/id#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://medrecord.example/shapetrees#medicalRecords>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        },
        "https://healthpad.example/id#dashboard-r": {
          "id": "<https://healthpad.example/id#dashboard-r>",
          "inNeedSet": [
            "<https://healthpad.example/id#general>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://dashboard.example/shapetrees#dashboards>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        },
        "https://healthpad.example/id#patient-rw": {
          "id": "<https://healthpad.example/id#patient-rw>",
          "inNeedSet": [
            "<https://healthpad.example/id#general>",
            "<https://healthpad.example/id#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://medrecord.example/shapetrees#patients>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        }
      }
    },
    {
      "id": "<https://healthpad.example/id#med-management>",
      "requestsAccess": [
        {
          "id": "<https://healthpad.example/id#prescriptions-rw>",
          "inNeedSet": [
            "<https://healthpad.example/id#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://medrecord.example/shapetrees#prescriptions>",
          "recursivelyAuthorize": false,
          "requestedAccess": 1
        }
      ],
      "authenticatesAsAgent": "<acl:Pilot>",
      "byShapeTree": {
        "https://healthpad.example/id#prescriptions-rw": {
          "id": "<https://healthpad.example/id#prescriptions-rw>",
          "inNeedSet": [
            "<https://healthpad.example/id#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://medrecord.example/shapetrees#prescriptions>",
          "recursivelyAuthorize": false,
          "requestedAccess": 1
        },
        "https://healthpad.example/id#patient-rw": {
          "id": "<https://healthpad.example/id#patient-rw>",
          "inNeedSet": [
            "<https://healthpad.example/id#general>",
            "<https://healthpad.example/id#med-management>"
          ],
          "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
          "hasShapeTree": "<http://medrecord.example/shapetrees#patients>",
          "recursivelyAuthorize": true,
          "requestedAccess": 1
        }
      }
    }
  ]
}

const MrShapeTreeIds1 = {
  "http://localhost:12345/mr/mr-ShapeTree.ttl#medicalRecords": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#medicalRecords>",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#medicalRecord>",
        "uriTemplate": "{id}",
        "references": [
          {
            "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#patient>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:patient"
          },
          {
            "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#appointment>",
            "shapePath": "<@medrecord-schema#medicalRecord>/medrecord:appointment"
          },
          {
            "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#condition>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:condition"
          },
          {
            "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#prescription>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:prescription"
          },
          {
            "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#allergy>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:allergy"
          },
          {
            "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTest>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:diagnosticTest"
          }
        ]
      }
    ],
    "references": [
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#patients>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#appointments>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#conditions>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#prescriptions>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTests>"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#medicalRecord": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#medicalRecord>",
    "uriTemplate": "{id}",
    "references": [
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#patient>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:patient"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#appointment>",
        "shapePath": "<@medrecord-schema#medicalRecord>/medrecord:appointment"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#condition>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:condition"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#prescription>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:prescription"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#allergy>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:allergy"
      },
      {
        "treeStep": "<http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTest>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:diagnosticTest"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#patients": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#patients>",
    "name": "patients",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#patient>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#appointments": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#appointments>",
    "name": "appointments",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#appointment>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#conditions": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#conditions>",
    "name": "conditions",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#condition>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#prescriptions": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#prescriptions>",
    "name": "prescriptions",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#prescription>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTests": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTests>",
    "name": "diagnosticTests",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#condition>",
        "uriTemplate": "{id}"
      },
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTest>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#patient": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#patient>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#appointment": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#appointment>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#condition": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#condition>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#prescription": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#prescription>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTest": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#diagnosticTest>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#allergies": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#allergies>",
    "name": "allergies",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#allergy>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/mr-ShapeTree.ttl#allergy": {
    "@id": "<http://localhost:12345/mr/mr-ShapeTree.ttl#allergy>",
    "uriTemplate": "{id}"
  }
}


const DashShapeTreeIds1 = {
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#dashboards": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#dashboards>",
    "expectedType": "<http://www.w3.org/ns/ldp#Container>",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#dashboard>",
        "uriTemplate": "{id}",
        "references": [
          {
            "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointment>",
            "shapePath": "<@medrecord-schema#medicalRecord>/medrecord:appointment"
          },
          {
            "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-condition>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:condition"
          },
          {
            "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequest>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:prescription"
          },
          {
            "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReport>",
            "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:diagnosticTest"
          }
        ]
      }
    ],
    "references": [
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointments>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-conditions>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequests>"
      },
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReports>"
      }
    ]
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#dashboard": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#dashboard>",
    "uriTemplate": "{id}",
    "references": [
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointment>",
        "shapePath": "<@medrecord-schema#medicalRecord>/medrecord:appointment"
      },
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-condition>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:condition"
      },
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequest>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:prescription"
      },
      {
        "treeStep": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReport>",
        "shapePath": "@<medrecord-schema#medicalRecord>/medrecord:diagnosticTest"
      }
    ]
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointments": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointments>",
    "expectedType": "<http://www.w3.org/ns/ldp#Container>",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointment>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-conditions": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-conditions>",
    "expectedType": "<http://www.w3.org/ns/ldp#Container>",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-condition>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequests": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequests>",
    "expectedType": "<http://www.w3.org/ns/ldp#Container>",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequest>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReports": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReports>",
    "expectedType": "<http://www.w3.org/ns/ldp#Container>",
    "contents": [
      {
        "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReport>",
        "uriTemplate": "{id}"
      }
    ]
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointment": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-appointment>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-condition": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-condition>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequest": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#current-medicationRequest>",
    "uriTemplate": "{id}"
  },
  "http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReport": {
    "@id": "<http://localhost:12345/mr/dashboard-ShapeTree.ttl#temporal-diagnosticReport>",
    "uriTemplate": "{id}"
  }
}


const MrShapeTreeSkos1 = {
  "byShapeTree": {
    "http://medrecord.example/shapetrees#medicalRecords": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#medicalRecords>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#medicalRecords>",
      "prefLabel": "Medical Records",
      "definition": "A collection of Medical Records"
    },
    "http://medrecord.example/shapetrees#medicalRecord": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#medicalRecord>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#medicalRecord>",
      "prefLabel": "Medical Record",
      "definition": "An extensive view of your medical history"
    },
    "http://medrecord.example/shapetrees#patients": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#patients>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#patients>",
      "prefLabel": "Patients.",
      "definition": "Describes a receiver of medical care"
    },
    "http://medrecord.example/shapetrees#patient": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#patient>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#patient>",
      "prefLabel": "Patient",
      "definition": "Describes a receiver of medical care"
    },
    "http://medrecord.example/shapetrees#appointments": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#appointments>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#appointments>",
      "prefLabel": "Appointments.",
      "definition": "A time and place with someone"
    },
    "http://medrecord.example/shapetrees#appointment": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#appointment>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#appointment>",
      "prefLabel": "Appointment.",
      "definition": "A time and place with someone"
    },
    "http://medrecord.example/shapetrees#conditions": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#conditions>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#conditions>",
      "prefLabel": "Conditions.",
      "definition": "A diagnosed issue"
    },
    "http://medrecord.example/shapetrees#condition": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#condition>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#condition>",
      "prefLabel": "Condition.",
      "definition": "A diagnosed issue"
    },
    "http://medrecord.example/shapetrees#prescriptions": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#prescriptions>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#prescriptions>",
      "prefLabel": "prescriptions.",
      "definition": "prescriptions"
    },
    "http://medrecord.example/shapetrees#prescription": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#prescription>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#prescription>",
      "prefLabel": "prescription.",
      "definition": "prescription"
    },
    "http://medrecord.example/shapetrees#allergies": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#allergies>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#allergies>",
      "prefLabel": "allergies.",
      "definition": "allergies"
    },
    "http://medrecord.example/shapetrees#allergy": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#allergy>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#allergy>",
      "prefLabel": "allergy.",
      "definition": "allergy"
    },
    "http://medrecord.example/shapetrees#diagnosticTests": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#diagnosticTests>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#diagnosticTests>",
      "prefLabel": "diagnosticTests.",
      "definition": "diagnosticTests"
    },
    "http://medrecord.example/shapetrees#diagnosticTest": {
      "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#diagnosticTest>",
      "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
      "treeStep": "<http://medrecord.example/shapetrees#diagnosticTest>",
      "prefLabel": "diagnosticTest.",
      "definition": "diagnosticTest"
    }
  },
  "byScheme": {
    "http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement": [
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#medicalRecords>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#medicalRecords>",
        "prefLabel": "Medical Records",
        "definition": "A collection of Medical Records"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#patients>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#patients>",
        "prefLabel": "Patients.",
        "definition": "Describes a receiver of medical care"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#appointments>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#appointments>",
        "prefLabel": "Appointments.",
        "definition": "A time and place with someone"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#conditions>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#conditions>",
        "prefLabel": "Conditions.",
        "definition": "A diagnosed issue"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#prescriptions>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#prescriptions>",
        "prefLabel": "prescriptions.",
        "definition": "prescriptions"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#allergies>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#allergies>",
        "prefLabel": "allergies.",
        "definition": "allergies"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#diagnosticTests>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#containerManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#diagnosticTests>",
        "prefLabel": "diagnosticTests.",
        "definition": "diagnosticTests"
      }
    ],
    "http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement": [
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#medicalRecord>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#medicalRecord>",
        "prefLabel": "Medical Record",
        "definition": "An extensive view of your medical history"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#patient>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#patient>",
        "prefLabel": "Patient",
        "definition": "Describes a receiver of medical care"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#appointment>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#appointment>",
        "prefLabel": "Appointment.",
        "definition": "A time and place with someone"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#condition>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#condition>",
        "prefLabel": "Condition.",
        "definition": "A diagnosed issue"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#prescription>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#prescription>",
        "prefLabel": "prescription.",
        "definition": "prescription"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#allergy>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#allergy>",
        "prefLabel": "allergy.",
        "definition": "allergy"
      },
      {
        "id": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#diagnosticTest>",
        "inScheme": "<http://localhost:12345/mr/mr-ShapeTree-SKOS.ttl#instanceManagement>",
        "treeStep": "<http://medrecord.example/shapetrees#diagnosticTest>",
        "prefLabel": "diagnosticTest.",
        "definition": "diagnosticTest"
      }
    ]
  }
}

