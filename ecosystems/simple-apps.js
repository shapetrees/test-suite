/** SimpleApps - a simple Solid ecosystem
 *
 * stores ShapeTree indexes in parent containers e.g. /Public or /SharedData
 *
 * This class provides:
 *   initialize - create a hierarchy with /apps, /cache and /shared
 *   indexInstalledShapeTree - assert that a local URL is an instance of a ShapeTree
 *   unindexInstalledShapeTree - remove assertion that a local URL is an instance of a ShapeTree
 *   reuseShapeTree - look in an LDPC for instances of a footprint
 *   registerInstance - register a new ShapeTree instance
 *   parseInstatiationPayload - parse payload when planting a ShapeTree
 */

const Fs = require('fs');
const Path = require('path');
const C = require('../util/constants');
const { DataFactory } = require("n3");
const { namedNode, literal, defaultGraph, quad } = DataFactory;

class simpleApps {
  constructor (appsPath, shapeTrees, rdfInterface) {
    this.appsPath = appsPath;
    this.shapeTrees = shapeTrees;
    this._rdfInterface = rdfInterface;
  }

  initialize (baseUrl, LdpConf) {
    this.baseUrl = baseUrl;
    const _simpleApps = this;
    let containerHierarchy =
        {path: '/', title: "DocRoot Container", children: [
          {path: LdpConf.apps + '/', title: "Applications Container"},
          {path: LdpConf.cache + '/', title: "Cache Container"},
          {path: LdpConf.shared + '/', title: "Shared Data Container"},
        ]};
    return createContainers(containerHierarchy, baseUrl);

    /** recursively create a container and any children containers.
     * @param spec - {path, title, children: [...]}
     * @param path - relative path from parent, e.g. ./ or ./Apps
     * @param title - text for the dc:title property
     * @param children - option list of specs of child containers
     * @param parentUrl - URL of parent container, e.g. URL('http://localhost/')
     */
    async function createContainers (spec, parentUrl)  {
      const container = await new _simpleApps.shapeTrees.managedContainer(new URL(spec.path, parentUrl), spec.title, null, null).finish();
      spec.container = container; // in case someone needs them later.
      if (spec.children) {
        await Promise.all(spec.children.map(async child => {
          await createContainers(child, container.url);
          container.addMember(new URL(child.path, parentUrl).href, null);
        }));
        await container.write();
      }
    }
  }

  /** indexInstalledShapeTree - assert that instanceUrl is an instance of shapeTreeUrl
   * @param parent: ShapeTree.ManagedContainer
   * @param instanceUrl: URL
   * @param shapeTreeUrl: URL
   */
  indexInstalledShapeTree (parent, instanceUrl, shapeTreeUrl) {
    parent.graph.addQuad(namedNode(instanceUrl.href), namedNode(C.ns_tree + 'shapeTreeRoot'), namedNode(shapeTreeUrl.href));
    parent.prefixes['tree'] = C.ns_tree;
  }

  /** unindexInstalledShapeTree - remove assertion that instanceUrl is an instance of shapeTreeUrl
   * @param parent: ShapeTree.ManagedContainer
   * @param instanceUrl: URL
   * @param shapeTreeUrl: URL
   */
  unindexInstalledShapeTree (parent, instanceUrl, shapeTreeUrl) {
    parent.graph.removeQuad(namedNode(instanceUrl.href), namedNode(C.ns_tree + 'shapeTreeRoot'), namedNode(shapeTreeUrl.href));
  }

  /** reuseShapeTree - look in an LDPC for instances of a footprint
   * @param parent: ShapeTree.ManagedContainer
   * @param shapeTree: ShapeTree.RemoteShapeTree
   */
  reuseShapeTree (parent, shapeTreeUrl) {
    const q = this._rdfInterface.zeroOrOne(parent.graph, null, namedNode(C.ns_tree + 'shapeTreeRoot'), namedNode(shapeTreeUrl.href));
    return q ? new URL(q.subject.value) : null;
  }

  /** registerInstance - register a new ShapeTree instance
   * @param appData: RDFJS DataSet
   * @param shapeTree: ShapeTree.RemoteShapeTree
   * @param instanceUrl: location of the ShapeTree instance
   */
  async registerInstance(appData, shapeTreeUrl, instanceUrl) {
    const rootUrl = new URL('/', this.baseUrl);
    const ctor = new this.shapeTrees.managedContainer(new URL(this.appsPath, rootUrl), `Applications Directory`, null, null)
    const apps = await ctor.finish();
    const app = await new this.shapeTrees.managedContainer(new URL(Path.join(this.appsPath, appData.name) + '/', rootUrl), appData.name + ` Directory`, null, null).finish();
    apps.addMember(app.url, shapeTreeUrl);
    await apps.write();
    const prefixes = {
      ldp: C.ns_ldp,
      tree: C.ns_tree,
      xsd: C.ns_xsd,
      dcterms: C.ns_dc,
    }
    const appFileText = Object.entries(prefixes).map(p => `PREFIX ${p[0]}: <${p[1]}>`).join('\n') + `
<> tree:installedIn
  [ tree:app <${appData.stomped}> ;
    tree:shapeTreeRoot <${shapeTreeUrl.href}> ;
    tree:shapeTreeInstancePath <${instanceUrl.href}> ;
  ] .
<${appData.stomped}> tree:name "${appData.name}" .
`    // could add tree:instantiationDateTime "${new Date().toISOString()}"^^xsd:dateTime ;
    const toAdd = await this._rdfInterface.parseTurtle(appFileText, app.url, prefixes);
    app.merge(toAdd);
    Object.assign(app.prefixes, prefixes);
    await app.write();
    return [toAdd, prefixes];
  }

  /** parse payload when planting a ShapeTree
   * @param graph: RDFJS Store
   */
  parseInstatiationPayload (graph) {
    const stomped = this._rdfInterface.one(graph, null, namedNode(C.ns_ldp + 'app'), null).object;
    const name = this._rdfInterface.one(graph, stomped, namedNode(C.ns_ldp + 'name'), null).object;
    return {
      stomped: stomped.value,
      name: name.value
    };
  }
}

module.exports = simpleApps;
