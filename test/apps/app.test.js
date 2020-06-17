'use strict';

const LdpConf = JSON.parse(require('fs').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);
const Suite = JSON.parse(require('fs').readFileSync('test/apps/gh-flat.test.json', 'utf8'));

const Bindings = {
  Shared
};

describe(`${Suite.label} installed in ${Bindings.Shared}`, function () {
  before(() => H.ensureTestDirectory(Shared));

  describe('initial state', () => {
    H.find([
      {path: `/${Bindings.Shared}/`, accept: 'text/turtle', entries: [Shared]},
    ]);
    H.dontFind([
      {path: `/${Bindings.Shared}/${Suite.label}/`, type: 'text/html', entries: [Suite.label]},
    ])
  });

  Suite.tests.forEach(t => {
    patch(t, ['label', 'path']);
    switch (t.type) {
    case 'plant':
      describe(t.label, async () => {
        const location = H.plant(t).then(urlStr => bindLocation(urlStr, t.as));
        // instantiate all tests before awaiting location
        finder(t.find, 'GET', location, H.findHandler);
        finder(t.dontFind, 'not GET', location, H.dontFindHandler);
      });
      break;
    case 'post':
      describe(t.label, async () => {
        it('should ' + failMark(t) + 'POST ' + t.path + (t.slug || '-TBD-'), async () => {
          await location;
          patch(f, ['path']);
          await H.pt(t, 'POST', tryPost, testResponse);
        });
        let location = H.post(t).then(urlStr => bindLocation(urlStr, t.as));
        // instantiate all tests before awaiting location
        finder(t.find, 'GET', location, H.findHandler);
        finder(t.dontFind, 'not GET', location, H.dontFindHandler);
      });
      break;
    default: throw Error(`unknown test type: "${t.type}"`);
    }
    // console.log(t.type, t.path);
  });

});

function patch (obj, attrs) {
  attrs.forEach(a => {obj[a] = obj[a].replace(/{([a-zA-Z-_]+)}/g, m => {
    const v = m.substr(1, m.length - 2);
    if (!(v in Bindings)) console.warn(`no match for "${v}"`)
    return Bindings[v] || '{' + v + '}';
  })});
}

function bindLocation (urlStr, as) {
  const parent = new URL('..', urlStr);
  const bindMe = urlStr.pathname
        .substr(parent.pathname.length)
        .replace(/\/$/, '');
  Bindings[as] = bindMe;
  return urlStr;
}

function finder (list, verb, location, test) {
  if (list)
    list.forEach(f => {
      it(`should ${verb} ${f.path}`, async () => {
        await location;
        patch(f, ['path']);
        if (f.entries)
          patch(f.entries, f.entries.map((ent, idx) => idx));
        await test(f)
      });
    });
}

