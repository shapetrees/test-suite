'use strict';

/*
cr-App#agent:
  groupedAccessNeeds
    grp1: top1-r, top2-r2
      top1-r: R cr-ShapeTree#c1
      top1-rw: RW cr-ShapeTree#c3
      over1-c2-rw: RW cr-ShapeTree#c2
      over-c4-rw: R cr-ShapeTree#c4
    #grp2

cr-ShapeTree: SKOS: cr-ShapeTree-SKOS

╘ root: contains: c1, c2, c3, c4
  .
  ╞ c1: "C1", shape: cr-schema#c1, contains: c1r
  ├── C1
  │   ╞ c1r: "{}", shape: cr-schema#c1r, ref: c2ra
  │   ├── C1R1.ttl
  │   └── C1R2.ttl
  ╞ c2: "C2", shape: cr-schema#c2, contains: c2ra, c2rb
  ├── C2
  │   ╞ c2ra: "C2RA{}", shape: cr-schema#c2ra, ref: c1r, c2rb
  │   ├── C2RA1.ttl
  │   └── C2RA2.ttl
  │   ╞ c2rb: "C2RB{}", shape: cr-schema#c2rb, ref: #c4r
  │   ├── C2RB1.ttl
  │   └── C2RB2.ttl
  ╞ c3: "C3", shape: cr-schema#c3, contains: c3c1, c3c2
  ├── C3
  │   ╞ c3c1: "C3C1", shape: cr-schema#c3c1, contains: c3c1r
  │   ├── C3C1
  │   │   ╞ c3c1r: "{}", shape: cr-schema#c3c1r
  │   │   └── C3C1R1.ttl
  │   ╞ c3c2: "C3C2", shape: cr-schema#c3c2, contains: c3c2r
  │   └── C3C2
  │       ╞ c3c2r: "{}", shape: cr-schema#c3c2r, ref: c4r
  │       └── C3C2R1.ttl
  ╞ c4: "C4", shape: cr-schema#c4, contains: c4r
  └── C4
      ╞ c4r: "{}", shape: cr-schema#c4r
      ├── C4R1.ttl
      ├── C4R2.ttl
      └── C4R3.ttl

cr-ShapeTree-SKOS:
  .
  ├── c1
  ├── c2
  │   ├── c2rb
  │   └── c3c2
  │       └── c5
  ├── c2r
  ├── c2ra
  ├── c3
  ├── c34
  ├── c3c1
  ├── c3c1r
  ├── c3c2r
  ├── c4
  ├── c4r
  ├── c5
  └── c5r
*/

const expect = require('chai').expect;
const Rdf = require('../shapetree.js/lib/rdf-serialization')
const Prefixes = require('../shapetree.js/lib/prefixes')
const Fs = require('fs')
const Path = require('path')
const Relateurl = require('relateurl');
const N3 = require('n3');
const { namedNode, literal, defaultGraph, quad } = N3.DataFactory;
const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('./test-harness');
const NS_cr = 'http://cr.example/ns#';
const Todo = require('./todo')()
const dump = Todo.dump
H.init(LdpConf.documentRoot);
const testF = p => Path.join(__dirname, p)

describe(`CR apps, shapetrees and decorators`, function () {
  before(() => H.ensureTestDirectory(Shared));

  describe(`end-to-end`, () => {
    it (`build UI`, async () => {
      const appUrl = new URL('cr/cr-App#agent', H.appStoreBase)
      const langPrefs = ['cn', 'ru']

      const appResource = new H.ShapeTree.RemoteResource(appUrl)
      await appResource.fetch()
      const crApp = Todo.parseApplication(appResource.graph)

      const drawQueue = await Todo.visitAppRules(crApp, langPrefs)
      console.warn('DONE', JSON.stringify(Todo.flattenUrls(drawQueue), null, 2))
    })
  });
});

