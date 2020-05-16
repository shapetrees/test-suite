'use strict';

const Fse = require('fs-extra');
const Path = require('path');
const LdpConf = JSON.parse(Fse.readFileSync('./servers/config.json', 'utf-8')).LDP;
const TestRoot = LdpConf.documentRoot;
const H = require('../test-harness');
H.init(TestRoot);

describe(`test/apps/cal.test.js installed in ${LdpConf.shared}`, function () {
  before(() => H.ensureTestDirectory(LdpConf.shared, TestRoot));

  describe('initial state', () => {
    H.find([
      {path: Path.join('/', LdpConf.shared, '/'), accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
    ]);
    H.dontFind([
      {path: `${Path.join('/', LdpConf.shared, '/')}Calendar/`, type: 'text/html', entries: ['Calendar']},
    ])
  });

  describe(`create ${Path.join('/', LdpConf.shared, '/')}Calendar/ hierarchy`, () => {
    describe(`create ${Path.join('/', LdpConf.shared, '/')}Calendar/`, () => {
      H.plant({path: Path.join('/', LdpConf.shared, '/'), slug: 'Calendar', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/CalendarShapeTree#calendar',
               status: 201, location: `${Path.join('/', LdpConf.shared, '/')}Calendar/`});
      H.plant({path: Path.join('/', LdpConf.shared, '/'), slug: 'Google', name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
               status: 201, location: `${Path.join('/', LdpConf.shared, '/')}Google/`});
      H.find([{path: `${Path.join('/', LdpConf.shared, '/')}Calendar/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']}]);
    });
    describe(`create ${Path.join('/', LdpConf.shared, '/')}Calendar/event1`, () => {
      H.post({path: `${Path.join('/', LdpConf.shared, '/')}Calendar/`, slug: 'event1.ttl',
              body: 'test/apps/cal/commonAppointment1.ttl', root: {'@id': 'Alice-Bob-2020-01-02'},
              type: 'Resource', location: `${Path.join('/', LdpConf.shared, '/')}Calendar/event1.ttl`});
      H.find([
        {path: `${Path.join('/', LdpConf.shared, '/')}Calendar/event1.ttl`, accept: 'text/turtle', entries: ['location', 'reason']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', LdpConf.shared, '/')}Calendar/event2.ttl`, accept: 'text/turtle', entries: ['Calendar/event2.ttl']},
      ]);
    });
    describe(`create ${Path.join('/', LdpConf.shared, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
      H.post({path: `${Path.join('/', LdpConf.shared, '/')}Google/Events/`, slug: '09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
              body: 'test/apps/cal/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '09abcdefghijklmnopqrstuvwx_20200107T140000Z'},
              type: 'Resource', location: `${Path.join('/', LdpConf.shared, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
      H.find([
        {path: `${Path.join('/', LdpConf.shared, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
      ]);
      H.dontFind([
        {path: `${Path.join('/', LdpConf.shared, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl']},
      ]);
    });
    describe(`create ${Path.join('/', LdpConf.shared, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
      H.post({path: `${Path.join('/', LdpConf.shared, '/')}Google/Events/`, slug: '19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
              body: 'test/apps/cal/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '19abcdefghijklmnopqrstuvwx_20200107T140000Z'},
              type: 'Resource', location: `${Path.join('/', LdpConf.shared, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
      H.find([
        {path: `${Path.join('/', LdpConf.shared, '/')}Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
        {path: `${Path.join('/', LdpConf.shared, '/')}Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
      ]);
    });
  });
});

