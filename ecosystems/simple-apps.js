const Fs = require('fs');
const Path = require('path');
const C = require('../util/constants');
const RExtra = require('../util/rdf-extra')

class simpleApps {
  constructor (appsPath, blueprints) {
    this.appsPath = appsPath;
    this.blueprints = blueprints;
  }
  async registerInstance(appData, blueprint, directory) {
    const rootUrl = new URL('/', blueprint.url);
    const ctor = new this.blueprints.managedContainer(rootUrl, this.appsPath, `Applications Directory`, null, null)
    const apps = await ctor.finish();
    const app = await new this.blueprints.managedContainer(rootUrl, Path.join(apps.path, appData.name), appData.name + ` Directory`, null, null).finish();
    apps.addMember(appData.name, blueprint.url);
    await apps.write();
    const prefixes = {
      foot: C.ns_foot,
      xsd: C.ns_xsd,
    }
    const appFileText = Object.entries(prefixes).map(p => `PREFIX ${p[0]}: <${p[1]}>`).join('\n') + `
<> foot:installedIn
  [ foot:app <${appData.stomped}> ;
    foot:blueprintRoot <${blueprint.url.href}> ;
    foot:blueprintInstancePath "${directory}" ;
  ] .
<${appData.stomped}> foot:name "${appData.name}" .
`    // could add foot:instantiationDateTime "${new Date().toISOString()}"^^xsd:dateTime ;
    const toAdd = await RExtra.parseTurtle(appFileText, app.url, prefixes);
    app.merge(toAdd);
    await app.write();
    return [toAdd, prefixes];
  }
}

module.exports = simpleApps;
