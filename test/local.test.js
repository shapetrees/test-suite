const Fse = require('fs-extra');
const Path = require('path');
const Fetch = require('node-fetch');
// const expect = require('chai').expect;
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
chai.use(chaiAsPromised)
const RExtra = require('../util/rdf-extra')

const C = require('../util/constants');
const H = require('./test-harness')();
const Footprint = H.Footprint;
const TestRoot = H.LdpConf.documentRoot;

// initialize servers
H.init(TestRoot);

describe(`test/local.test.js`, function () {
describe('appStoreServer', function () {
  it('should return on empty path', async () => {
    const resp = await Fetch(`http://localhost:${H.getStaticPort()}`);
    const text = await resp.text();
    expect(JSON.parse(text)).to.be.an('array');
  });
  it('should resolve full path', async () => {
    const resp = await Fetch(`http://localhost:${H.getStaticPort()}/cal/Calendar.shex`);
    const text = await resp.text();
    expect(text).match(/^PREFIX/);
  });
});

describe('Footprint.local', function () {
  it('should throw if not passed a URL', () => {
    expect(() => {
      new Footprint.local('http://localhost/', '/');
    }).throw();
  });
});

describe('Footprint.localContainer', () => {
  it('should throw if not passed a Container URL', () => {
    expect((async () => {
      return new Footprint
        .localContainer('http://localhost/', '/', "construct dir with URL string").finish();
    })()).to.be.eventually.rejectedWith('must be an instance of URL').and.be.an.instanceOf(Error);
  });
  it('should throw if the Container URL doesn\'t end with \'/\'', () => {
    expect((async () => {
      await new Footprint
        .localContainer(new URL('http://localhost/foo'), '/', "construct dir without trailing '/'").finish();
    })()).to.be.eventually.rejectedWith('must end with \'/\'').and.be.an.instanceOf(Error);
  });
  it('should throw if the footprint URL doesn\'t end with \'/\'', () => {
    expect((async () => {
      await new Footprint
        .localContainer(new URL('http://localhost/foo/'), '/', "construct dir with URL string footprint", 'http://localhost/footprint', '.').finish();
    })()).to.be.eventually.rejectedWith('must be an instance of URL').and.be.an.instanceOf(Error);
  });
  it('should remove a Container directory', async () => {
    const c = await (await new Footprint
                     .localContainer(new URL(`http://localhost:${H.getStaticPort()}/`), '/delme', "this should be removed from filesystem", new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`), '.').finish()).fetch();
    expect(Fse.statSync(Path.join(TestRoot, 'delme')).isDirectory()).to.be.true;
    Fse.readdirSync(Path.join(TestRoot, c.path)).forEach(
      f =>
        Fse.unlinkSync(Path.join(TestRoot, c.path, f))
    );
    Fse.rmdirSync(Path.join(TestRoot, c.path)); // c.remove();
    expect(()=> {Fse.statSync(Path.join(TestRoot, 'delme'));}).to.throw(Error);
  });
  rej('should fail on an invalid footprint graph', // rejects.
      async () => {
        const c = await (await new Footprint
                         .localContainer(new URL(`http://localhost:${H.getStaticPort()}/`), '/', "this should not appear in filesystem", new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`), '.').finish()).fetch();
        c.graph.getQuads(c.url, C.ns_foot + 'footprintRoot', null).forEach(q => c.graph.removeQuad(q))
        await c.getRootedFootprint(H.LdpConf.cache);
      },
      err => expect(err).to.be.an('Error').that.matches(/no matches/)
     );
});

describe('Footprint.remote', function () {
  it('should throw if not passed a URL', () => {
    expect(
      () => // throws immedidately.
        new Footprint.remote(`http://localhost:${H.getStaticPort()}/doesnotexist/`, H.LdpConf.cache).fetch()
    ).throw(Error);
  });

  rej('should throw on a GET failure', // rejects.
      () => new Footprint.remote(new URL(`http://localhost:${H.getStaticPort()}/doesnotexist/`), H.LdpConf.cache).fetch(),
      err => expect(err).to.be.an('Error')
     );
});

describe('Footprint.validate', function () {
  rej('should throw if footprint step is missing a shape',
      () => {
        const f = new Footprint.remoteFootprint(new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`, ), H.LdpConf.cache);
        return f.fetch().then(
          () => f.validate(`http://localhost:${H.getStaticPort()}/doesnotexist`, "text/turtle", "", new URL("http://a.example/"), "http://a.example/")
      )},
      err => expect(err).to.be.an('Error')
     );
  rej('should throw on malformed POST Turtle body',
      () => {
        const f = new Footprint.remoteFootprint(new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`), H.LdpConf.cache);
        return f.fetch().then(
          () => f.validate(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#Event`, 'text/turtle', 'asdf', new URL('http://a.example/'))
      )},
      err => expect(err).to.be.an('Error')
     );
  rej('should throw on malformed POST JSON-LD body',
      () => {
        const f = new Footprint.remoteFootprint(new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top`), H.LdpConf.cache);
        return f.fetch().then(
          () => f.validate(`http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#Event`, 'application/json', 'asdf', new URL('http://a.example/'))
      )},
      err => expect(err).to.be.an('Error')
     );
});

describe('Footprint misc', function () {
  it('should construct all errors', () => {
    expect(new RExtra.UriTemplateMatchError('asdf')).to.be.an('Error');
    expect(new RExtra.FootprintStructureError('asdf')).to.be.an('Error');
  });
  it('should render RDFJS nodes', () => {
    const iri = 'http://a.example/';
    expect(RExtra.renderRdfTerm({termType: 'NamedNode', value: iri})).to.equal(`<${iri}>`);
    const bnode = 'b1';
    expect(RExtra.renderRdfTerm({termType: 'BlankNode', value: bnode})).to.equal(`_:${bnode}`);
    const literal = '"This statement is a lie" is a lie.';
    expect(RExtra.renderRdfTerm({termType: 'Literal', value: literal})).to.equal(`"${literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    expect(() => RExtra.renderRdfTerm(12345)).throw(Error);
    expect(() => RExtra.renderRdfTerm({a:1})).throw(Error);
  })
});

describe('STOMP', function () {

  // { @@ duplicated in bad.test.js but testing specific error messages is inappropriate there.
  it('should fail with bad Turtle', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = '@prefix x: <>\n@@bad Turtle@@';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration);
    expect(resp.statusCode).to.deep.equal(422)
    expect(resp.type).to.deep.equal('application/json');
    const err = JSON.parse(resp.text);
    expect(err.message).match(/Unexpected "@@bad" on line 2/)
  });

  it('should fail with bad JSON', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration, 'application/ld+json');
    // resp.statusCode = H.dumpStatus(resp);
    expect(resp.statusCode).to.deep.equal(422)
    expect(resp.type).to.deep.equal('application/json');
    const err = JSON.parse(resp.text);
    expect(err.message).match(/Unexpected token @/)
  });

  it('should fail with bad JSONLD', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = '{\n  "foo": 1,\n  "@id": 2\n}';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration, 'application/ld+json');
    expect(resp.statusCode).to.deep.equal(422);
    expect(resp.type).to.deep.equal('application/json');
    const err = JSON.parse(resp.text);
    expect(resp.text).match(/jsonld.SyntaxError/);
  });
  // }

  it('should create a novel directory', async () => {
    const installDir = 'collisionDir';

    await H.ensureTestDirectory(installDir, TestRoot);

    const location = `${Path.join('/', installDir, '/')}collision-2/`;
    const mkdirs = [`${installDir}/collision`, `${installDir}/collision-1`];
    mkdirs.forEach(d => Fse.mkdirSync(Path.join(TestRoot, d)));
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = `PREFIX ldp: <http://www.w3.org/ns/ldp#>
[] ldp:app <http://store.example/gh> .
<http://store.example/gh> ldp:name "CollisionTest" .
`
    const resp = await H.trySend(H.getBase() + Path.join('/', installDir, '/'), link, 'collision', registration, 'text/turtle');
    mkdirs.forEach(d => Fse.rmdirSync(Path.join(TestRoot, d)));
    if (!resp.ok) resp.ok = H.dumpStatus(resp);
    expect(resp.ok).to.deep.equal(true);
    expect(new URL(resp.headers.location).pathname).to.deep.equal(location);
    expect(resp.statusCode).to.deep.equal(201);
    expect(resp.text).match(new RegExp(`foot:footprintInstancePath "${location.substr(1)}"`))
  });
});

/* disabled 'cause of race condition -- which test requires first?
describe('LDP server', function () {
  it('should leave existing root in-place', () => {
    Fse.removeSync(TestRoot);
    new Footprint.dir(new URL('http://localhost/'), '/', TestRoot, "test root")
    Fse.writeFileSync(Path.join(TestRoot, 'foo'), 'test file', {encoding: 'utf8'})
    expect(Fse.readFileSync(Path.join(TestRoot, 'foo'), 'utf8')).to.deep.equal('test file')
    const ldpServer = require('../ldpServer')
    expect(Fse.readFileSync(Path.join(TestRoot, 'foo'), 'utf8')).to.deep.equal('test file')

    // restore 'cause modules are required only once.
    Fse.removeSync(TestRoot);
    ldpServer.initializeFilesystem()
  })
})
*/

});

/**
 * test for rejction
 * try with:
  rej(
    'example invocation of rej',
    () => new Promise((resolve, reject) => reject(Error(1))), // or reject(1) (fails) or resolve(X) (fails)
    err => expect(err).to.be.an('error')
  )
*/
function rej (msg, run, test) {
  it(msg, () => run().then(
    ret => {
      throw Error('expected to reject but resolved with ' + ret);
    },
    err => {
      try {
        test(err)
      } catch (e) {
        throw e
      }
    }
  ));
}

function xrej (run, test) {
  xit(run, () => true)
}
