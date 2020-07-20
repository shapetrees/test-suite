'use strict';

const LdpConf = JSON.parse(require('fs-extra').readFileSync('./servers/config.json', 'utf-8')).LDP;
const Shared = LdpConf.shared;
const H = require('../test-harness');
H.init(LdpConf.documentRoot);

describe(`test/apps/cal.test.js installed in ${Shared}`, function () {
  before(() => H.ensureTestDirectory(Shared));

  describe('initial state', () => {
    H.find([
      {path: `/${Shared}/`, accept: 'text/turtle', entries: ['<> a ldp:BasicContainer']},
    ]);
    H.dontFind([
      {path: `/${Shared}/Calendar/`, type: 'text/html', entries: ['Calendar']},
    ])
  });

  describe(`create /${Shared}/Calendar/ hierarchy`, () => {
    describe(`create /${Shared}/Calendar/`, () => {
      H.plant({path: `/${Shared}/`, slug: 'Calendar',
               name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/CalendarShapeTree#calendar',
               status: 201, location: `/${Shared}/Calendar/`});
      H.plant({path: `/${Shared}/`, slug: 'Google',
               name: 'MultiCalApp', url: 'http://store.example/MultiCalApp', shapeTreePath: 'cal/GoogleShapeTree#top',
               status: 201, location: `/${Shared}/Google/`});
      H.find([{path: `/${Shared}/Calendar/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']}]);
    });
    describe(`create /${Shared}/Calendar/event1`, () => {
      H.post({path: `/${Shared}/Calendar/`, slug: 'event1.ttl',
              bodyURL: 'test/apps/cal/commonAppointment1.ttl', root: {'@id': '#Alice-Bob-2020-01-02'},
              status: 201, type: 'Resource', location: `/${Shared}/Calendar/event1.ttl`});
      H.find([
        {path: `/${Shared}/Calendar/event1.ttl`, accept: 'text/turtle', entries: ['location', 'reason']},
      ]);
      H.dontFind([
        {path: `/${Shared}/Calendar/event2.ttl`, accept: 'text/turtle', entries: ['Calendar/event2.ttl']},
      ]);
    });
    describe(`create /${Shared}/Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
      H.post({path: `/${Shared}/Google/Events/`, slug: '09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
              bodyURL: 'test/apps/cal/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '09abcdefghijklmnopqrstuvwx_20200107T140000Z'},
              status: 201, type: 'Resource', location: `/${Shared}/Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
      H.find([
        {path: `/${Shared}/Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
      ]);
      H.dontFind([
        {path: `/${Shared}/Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl']},
      ]);
    });
    describe(`create /${Shared}/Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
      H.post({path: `/${Shared}/Google/Events/`, slug: '19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
              bodyURL: 'test/apps/cal/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '19abcdefghijklmnopqrstuvwx_20200107T140000Z'},
              status: 201, type: 'Resource', location: `/${Shared}/Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
      H.find([
        {path: `/${Shared}/Google/Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
        {path: `/${Shared}/Google/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
      ]);
    });
  });
});

