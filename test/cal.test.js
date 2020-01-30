'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const Footprint = require('../util/footprint');
const C = require('../util/constants');
const Confs = JSON.parse(Fse.readFileSync('./servers.json', 'utf-8'));
const LdpConf = Confs.find(c => c.name === "LDP");
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness')();

// initialize servers
H.init(TestRoot);

installIn('Shared');

function installIn (installDir) {
describe(`install in ${installDir || 'root'}`, function () {
  installDir.split(/\//).filter(d => !!d).reduce(
    (parent, dir) => {
      const ret = Path.join(parent, dir);
      if (!Fse.existsSync(Path.join(TestRoot, ret)))
        new Footprint.localContainer(new URL('http://localhost/'), ret + Path.sep, TestRoot, C.indexFile, "pre-installed " + ret);
      return ret
    }, "");

  describe('initial state', () => {
    // Test that we can GET /cal/
    H.find([
      {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: [`pre-installed ${installDir}`]},
    ]);
    // Test that there isn't already some other /cal/Calendar
    H.dontFind([
      {path: `${Path.join('/', installDir, '/')}Calendar/`, type: 'text/html', entries: ['Calendar']},
    ])
  });

  describe(`create ${Path.join('/', installDir, '/')}Calendar/ hierarchy`, () => {
    describe(`create ${Path.join('/', installDir, '/')}Calendar/`, () => {
      // POST /cal/
      //   Slug: Calendar
      //   Footprint: http://localhost:.../cal/CalendarFootprint#calendar (see https://github.com/janeirodigital/footprints-discovery/blob/master/solidApps/staticRoot/cal/CalendarFootprint.jsonld)
      //   Link: <http://www.w3.org/ns/ldp#${t.type}>; rel="type"
      // expect back
      // 201
      //   location http://...Calendar/
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Calendar', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/cal/CalendarFootprint#calendar`,
               status: 201, location: `${Path.join('/', installDir, '/')}Calendar/`});
      // POST /cal/
      //   Slug: Google
      //   Footprint: http://localhost:.../cal/GoogleFootprint#top (see https://github.com/janeirodigital/footprints-discovery/blob/master/solidApps/staticRoot/cal/GoogleFootprint.jsonld)
      //   Link: <http://www.w3.org/ns/ldp#${t.type}>; rel="type"
      // expect back
      // 201
      //   location http://...Google/
      H.stomp({path: Path.join('/', installDir, '/'), slug: 'Google', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getFootprint: () => `http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`,
               status: 201, location: `${Path.join('/', installDir, '/')}Google/`});
      // Test that we can GET /cal/Calendar/
      H.find([{path: `${Path.join('/', installDir, '/')}Calendar/`, accept: 'text/turtle', entries: ['footprintInstancePath "."']}]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Calendar/event1`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Calendar/`, slug: 'event1.ttl',
              body: 'test/cal/commonAppointment1.ttl', root: {'@id': 'Alice-Bob-2020-01-02'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Calendar/event1.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Calendar/event1.ttl`, accept: 'text/turtle', entries: ['location', 'reason']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Calendar/event2.ttl`, accept: 'text/turtle', entries: ['Calendar/event2.ttl']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Google/Events/`, slug: '09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
              body: 'test/cal/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '09abcdefghijklmnopqrstuvwx_20200107T140000Z'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl']},
      ]);
    });
    describe(`create ${Path.join('/', installDir, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Google/Events/`, slug: '19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
              body: 'test/cal/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '19abcdefghijklmnopqrstuvwx_20200107T140000Z'},
              type: 'Resource', location: `${Path.join('/', installDir, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
        {path: `${Path.join('/', installDir, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
      ]);
    });
  });
})
}

