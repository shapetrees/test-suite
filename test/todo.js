const Prefixes = require('../shapetree.js/lib/prefixes')
const Errors = require('../shapetree.js/lib/rdf-errors');
const N3 = require('n3');
const { namedNode, literal, defaultGraph, quad } = N3.DataFactory;
const Relateurl = require('relateurl');
const H = require('./test-harness'); // @@ should not be needed in this module


function Todo () {
  //
  // Constants
  //

  /**
   * Bit labels for access levels.
   */
  const Access = {
    Read: 0x1,
    Write: 0x2,
    Control: 0x4,
    Append: 0x8
  }

  //
  // Methods
  //

  /**
   * Create a mirror rule from the rule request object.
   * @param {} req
   * @returns {} indexed rule object, e.g.
    {
      "rule": {
        "id": "<mr/mr-App#dashboard-r>",
        "supports": "<mr/mr-App#medical-record-r>",
        "inNeedSet": [ "<mr/mr-App#general>" ],
        "requestedAccessLevel": "<http://www.w3.org/ns/solid/ecosystem#Required>",
        "hasShapeTree": "<mr/dashboard-ShapeTree#dashboards>",
        "recursivelyAuthorize": true,
        "requestedAccess": 1
      },
      "bySupports": {
        "mr/mr-ShapeTree#appointment": [
          {
            "@id": "<mr/dashboard-ShapeTree#temporal-appointment>",
            "expectsType": "<http://www.w3.org/ns/ldp#Resource>",
            "matchesUriTemplate": "{id}",
            "validatedBy": "<mr/dashboard-schema#TemporalAppointmentShape>",
            "supports": [ "<mr/mr-ShapeTree#appointment>" ]
          }
        ],
        // ...
      }
    }
   */
  async function addMirrorRule (req) {
    const t = await H.ShapeTree.RemoteShapeTree.get(req.hasShapeTree)
    // console.warn(JSON.stringify(flattenUrls(t.ids), null, 2))
    return {
      rule: req,
      bySupports: Object.keys(t.ids).reduce((acc, key) => {
        (t.ids[key].supports || []).forEach(
          sup => {
            if (!(sup.href in acc))
              acc[sup.href] = []
            acc[sup.href].push(t.ids[key])
          })
        return acc
      }, {})
    }
  }

  async function setAclsFromRule (req, done, decorators, drawQueue, mirrorRules) {
    // console.warn(`setAclsFromRule (${JSON.stringify(req)}, ${done})`)
    const st = req.hasShapeTree
    let decorator = decorators.find(decorator => st.href in decorator.byShapeTree)
    if (!decorator)
      throw Error(`${st.href} not found in ${decorators.map(decorator => `${Object.keys(decorator.byShapeTree)}`)}`)
    decorator = decorator.byShapeTree[st.href]
    if (done.indexOf(st.href) !== -1)
      return
    console.warn(flattenUrls(decorator))
    console.warn(flattenUrls(st), flattenUrls(decorators.find(decorator => st in decorator.byShapeTree).byShapeTree[st.href]))
  }

  function addRow (decorator, access, decorators) {
  }

  /**
   * Recursively turn URL objects into <urlString>s
   * @param {} obj
   * @returns {}
   */
  function flattenUrls (obj) {
    if (!obj) {
      return obj
    } else if (obj instanceof URL) {
      const href = obj.host === H.appStoreBase.host ? Relateurl.relate(H.appStoreBase.href, obj.href) : obj.href
      return '<' + href + '>'
    } else if (obj instanceof Array) {
      return Object.keys(obj).reduce(
        (acc, key) => acc.concat(flattenUrls(obj[key])) , []
      )
    } else if (typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        acc[shorten(key)] = flattenUrls(obj[key])
        return acc
      }, {})
    } else {
      return obj
    }
  }

  function shorten (str) {
    return str.startsWith(H.appStoreBase.href)
      ? str.substr(H.appStoreBase.href.length)
      : str
  }

  //
  // parser support
  // parse application structures from RDF graphs
  //

  const nn = (prefix, lname) => namedNode(Prefixes['ns_' + prefix] + lname)

  /**
   * Simple but effective rule-based conversion of RDF graph to language-native object.
   *
   * @param {} graph - RDFJS graph
   * @param {} rules - array of objects: { predicate: URL string, attr: object attribute, f: callback },
   * @param {} subjects - starting list of subjects, e.g. [<http://...>]
   * @param {} includeId - attribute to add for each subject to get e.g. { "id": <mr/mr-App#agent> }
   * @returns {}
   */
  function visitNode (graph, rules, subjects, includeId) {
    return subjects.map(s => {
      // Index by predicate.
      const byPredicate = graph.getQuads(s, null, null).reduce((acc, q) => {
        const p = q.predicate.value
        if (!(p in acc))
          acc[p] = []
        acc[p].push(q.object)
        return acc
      }, {})

      // Construct return object.
      const ret = {}
      if (includeId)
        ret[includeId] = new URL(s.value)

      // Recursively apply rules to populate ret.
      return rules.reduce((acc, rule) => {
        const p = rule.predicate
        if (p in byPredicate)
          acc[rule.attr] = rule.f(byPredicate[p], graph)
        return acc
      }, ret)
    })
  }

  // Commonly-used visitNode callbacks
  const str = sz => one(sz).value
  const flt = sz => parseFloat(one(sz).value)
  const url = sz => new URL(one(sz).value)
  const lst = sz => sz.map(s => new URL(s.value))
  const bol = sz => one(sz).value === 'true'
  const one = sz => sz.length === 1
        ? sz[0]
        : (() => {throw new Errors.ShapeTreeStructureError(null, `Expected one object, got [${sz.map(s => s.value).join(', ')}]`)})()

  /**
   * Parse an eco:Application.
   * @param {RDF graph} g
   * @returns {Application}
   */
  function parseApplication (g) {

    // parser rules and supporting functions:
    const acc = (sz, g) => { // parse access level
      return sz.reduce(
        (acc, s) => acc | Access[s.value.substr(Prefixes.ns_acl.length)]
        , 0x0
      )
    }
    const accessNeedRules = [
      { predicate: Prefixes.ns_eco + 'supports'               , attr: 'supports'               , f: url },
      { predicate: Prefixes.ns_eco + 'inNeedSet'              , attr: 'inNeedSet'              , f: lst },
      { predicate: Prefixes.ns_eco + 'requestedAccessLevel'   , attr: 'requestedAccessLevel'   , f: url },
      { predicate: Prefixes.ns_tree + 'hasShapeTree'          , attr: 'hasShapeTree'           , f: url },
      { predicate: Prefixes.ns_eco + 'recursivelyAuthorize'   , attr: 'recursivelyAuthorize'   , f: bol },
      { predicate: Prefixes.ns_eco + 'requestedAccess'        , attr: 'requestedAccess'        , f: acc },
    ]
    const ned = (sz, g) => visitNode(g, accessNeedRules, sz, 'id')

    const needGroupRules = [
      { predicate: Prefixes.ns_eco + 'requestsAccess'         , attr: 'requestsAccess'         , f: ned },
      { predicate: Prefixes.ns_eco + 'authenticatesAsAgent'   , attr: 'authenticatesAsAgent'   , f: url },
    ]
    const grp = (sz, g) => visitNode(g, needGroupRules, sz, 'id')

    const applicationRules = [
      { predicate: Prefixes.ns_eco + 'applicationDescription' , attr: 'applicationDescription' , f: str },
      { predicate: Prefixes.ns_eco + 'applicationDevelopedBy' , attr: 'applicationDevelopedBy' , f: str },
      { predicate: Prefixes.ns_eco + 'authorizationCallback'  , attr: 'authorizationCallback'  , f: url },
      { predicate: Prefixes.ns_eco + 'applicationDecoratorIndex' , attr: 'applicationDecoratorIndex' , f: url },
      { predicate: Prefixes.ns_eco + 'groupedAccessNeeds'     , attr: 'groupedAccessNeeds'     , f: grp },
    ]

    // Parse the only eco:Application into language-native object.
    const root = g.getQuads(null, nn('rdf', 'type'), nn('eco', 'Application'))[0].subject
    const ret = visitNode(g, applicationRules, [root], 'id')[0]

    // For each AccessNeedGroup,
    ret.groupedAccessNeeds.forEach(grpd => {

      // ... index the rules in that group by their ShapeTree.
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

  /**
   * Parse an eco:ShapeTreeDecoratorIndex.
   * @param {RDF graph} g
   * @returns {Index}
   */
  function parseDecoratorIndexGraph (g) {

    // parser rules and supporting functions:
    const lineageRules = [
      { predicate: Prefixes.ns_eco + 'hasVersion', attr: 'hasVersion', f: flt },
      { predicate: Prefixes.ns_eco + 'hasSHA3256' , attr: 'hasSHA3256' , f: str },
      { predicate: Prefixes.ns_eco + 'hasDecoratorResource', attr: 'hasDecoratorResource', f: url },
    ]
    const lineage = (sz, g) => visitNode(g, lineageRules, sz, 'id')

    const seriesRules = [
      { predicate: Prefixes.ns_eco + 'languageCode', attr: 'languageCode', f: str },
      { predicate: Prefixes.ns_eco + 'hasLineage', attr: 'hasLineage', f: lineage },
    ]
    const series = (sz, g) => visitNode(g, seriesRules, sz, 'id')

    const indexRules = [
      { predicate: Prefixes.ns_eco + 'fallbackLanguage', attr: 'fallbackLanguage', f: str },
      { predicate: Prefixes.ns_eco + 'hasSeries', attr: 'hasSeries', f: series },
    ]

    // Parse the only eco:ShapeTreeDecoratorIndex into language-native object.
    const indexNode = one(g.getQuads(null, nn('rdf', 'type'), nn('eco', 'ShapeTreeDecoratorIndex'))).subject
    const index = visitNode(g, indexRules, [indexNode], 'id')[0]

    // Order each series's lineage from latest to earliest.
    index.hasSeries.forEach(series => {
      series.hasHiearchy = series.hasLineage.sort(
        (l, r) => r.hasVersion - l.hasVersion
      )
    })

    return index
  }

  /**
   * Parse an eco ShapeTree decorator (SKOS) graph.
   * @param {RDF graph} g
   * @returns {} SKOS hiearchy indexed by scheme and by ShapeTree
   */
  function parseDecoratorGraph (g) {

    // parser rules:
    const labelRules = [
      { predicate: Prefixes.ns_skos + 'inScheme', attr: 'inScheme', f: url },
      { predicate: Prefixes.ns_skos + 'narrower', attr: 'narrower', f: lst },
      { predicate: Prefixes.ns_tree + 'treeStep' , attr: 'treeStep' , f: url },
      { predicate: Prefixes.ns_skos + 'prefLabel', attr: 'prefLabel', f: str },
      { predicate: Prefixes.ns_skos + 'definition', attr: 'definition', f: str },
    ]

    // Parse all tree:ShapeTreeLabels into language-native objects.
    const labelNodes = g.getQuads(null, nn('rdf', 'type'), nn('tree', 'ShapeTreeLabel')).map(q => q.subject)
    const labels = labelNodes.map(label => visitNode(g, labelRules, [label], 'id')[0])

    // Index by SKOS scheme and ShapeTree.
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

  return {
    addMirrorRule,
    setAclsFromRule,
    parseApplication,
    flattenUrls,
    parseDecoratorIndexGraph,
    parseDecoratorGraph,
  }
}

module.exports = Todo
