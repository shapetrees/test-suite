const Fs = require('fs');
const Path = require('path');
const C = require('../util/constants');
const RExtra = require('../util/rdf-extra')

class simpleApps {
  constructor (appsPath, shapeTrees) {
    this.appsPath = appsPath;
    this.shapeTrees = shapeTrees;
  }

  initialize (baseUrl, LdpConf) {
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
          container.addMember(new URL(child.path, new URL('http://localhost/')).href, null);
        }));
        await container.write();
      }
    }
  }

  async registerInstance(appData, shapeTree, directory) {
    const rootUrl = new URL('/', shapeTree.url);
    const ctor = new this.shapeTrees.managedContainer(new URL(this.appsPath, rootUrl), `Applications Directory`, null, null)
    const apps = await ctor.finish();
    const app = await new this.shapeTrees.managedContainer(new URL(Path.join(this.appsPath, appData.name) + '/', rootUrl), appData.name + ` Directory`, null, null).finish();
    apps.addMember(appData.name, shapeTree.url);
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
    tree:shapeTreeRoot <${shapeTree.url.href}> ;
    tree:shapeTreeInstancePath "${directory}" ;
  ] .
<${appData.stomped}> tree:name "${appData.name}" .
`    // could add tree:instantiationDateTime "${new Date().toISOString()}"^^xsd:dateTime ;
    const toAdd = await RExtra.parseTurtle(appFileText, app.url, prefixes);
    app.merge(toAdd);
    Object.assign(app.prefixes, prefixes);
    await app.write();
    return [toAdd, prefixes];
  }
}

module.exports = simpleApps;
