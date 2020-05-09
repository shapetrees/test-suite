'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const LdpConf = JSON.parse(Fse.readFileSync('./servers/config.json', 'utf-8')).LDP;
const TestRoot = LdpConf.documentRoot;
const H = require('./test-harness');
H.init(TestRoot);

installIn(LdpConf.shared);

function installIn (installDir) {
  describe(`test/cal.test.js installed in ${installDir}`, function () {
    before(() => H.ensureTestDirectory(installDir, TestRoot));

    describe('initial state', () => {
      // Test that we can GET /cal/
      H.find([
        {path: Path.join('/', installDir, '/'), accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
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
        //   ShapeTree: http://localhost:.../cal/CalendarShapeTree#calendar (see https://github.com/janeirodigital/shape-trees/blob/master/solidApps/staticRoot/cal/CalendarShapeTree.jsonld)
        //   Link: <http://www.w3.org/ns/ldp#${t.type}>; rel="type"
        // expect back
        // 201
        //   location http://...Calendar/
        H.plant({path: Path.join('/', installDir, '/'), slug: 'Calendar', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getShapeTree: () => new URL('cal/CalendarShapeTree#calendar', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}Calendar/`});
        // POST /cal/
        //   Slug: Google
        //   ShapeTree: http://localhost:.../cal/GoogleShapeTree#top (see https://github.com/janeirodigital/shape-trees/blob/master/solidApps/staticRoot/cal/GoogleShapeTree.jsonld)
        //   Link: <http://www.w3.org/ns/ldp#${t.type}>; rel="type"
        // expect back
        // 201
        //   location http://...Google/
        H.plant({path: Path.join('/', installDir, '/'), slug: 'Google', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', getShapeTree: () => new URL('cal/GoogleShapeTree#top', H.getAppStoreBase()),
                 status: 201, location: `${Path.join('/', installDir, '/')}Google/`});
        // Test that we can GET /cal/Calendar/
        H.find([{path: `${Path.join('/', installDir, '/')}Calendar/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']}]);
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

