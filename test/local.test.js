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
const ShapeTree = H.ShapeTree;
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

describe('ShapeTree.local', function () {
  it('should throw if not passed a URL', () => {
    expect(() => {
      new ShapeTree.local('http://localhost/', '/');
    }).throw();
  });
});

describe('ShapeTree.managedContainer', () => {
  it('should throw if not passed a Container URL', () => {
    expect((async () => {
      return new ShapeTree
        .managedContainer('http://localhost/', '/', "construct dir with URL string").finish();
    })()).to.be.eventually.rejectedWith('must be an instance of URL').and.be.an.instanceOf(Error);
  });
  it('should throw if the Container URL doesn\'t end with \'/\'', () => {
    expect((async () => {
      await new ShapeTree
        .managedContainer(new URL('http://localhost/foo'), '/', "construct dir without trailing '/'").finish();
    })()).to.be.eventually.rejectedWith('must end with \'/\'').and.be.an.instanceOf(Error);
  });
  it('should throw if the Container URL ends with \'//\'', () => {
    expect((async () => {
      await new ShapeTree
        .managedContainer(new URL('http://localhost/foo//'), '/', "construct dir trailing '//'").finish();
    })()).to.be.eventually.rejectedWith('ends with \'//\'').and.be.an.instanceOf(Error);
  });
  it('should throw if the shapeTree parameter isn\'t a URL', () => {
    expect((async () => {
      await new ShapeTree
        .managedContainer(new URL('http://localhost/foo/'), '/', "construct dir with URL string shapeTree", 'http://localhost/shapeTree', '.').finish();
    })()).to.be.eventually.rejectedWith('shapeTree must be an instance of URL').and.be.an.instanceOf(Error);
  });
  it('should remove a Container directory', async () => {
    const delme = 'delme/';
    const c = await new ShapeTree
          .managedContainer(new URL(delme, new URL(`http://localhost:${H.getStaticPort()}/`)), "this should be removed from filesystem", new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top`), '.').finish();
    expect(Fse.statSync(Path.join(TestRoot, 'delme')).isDirectory()).to.be.true;
    Fse.readdirSync(Path.join(TestRoot, delme)).forEach(
      f =>
        Fse.unlinkSync(Path.join(TestRoot, delme, f))
    );
    Fse.rmdirSync(Path.join(TestRoot, delme)); // c.remove();
    expect(()=> {Fse.statSync(Path.join(TestRoot, 'delme'));}).to.throw(Error);
  });
  rej('should fail on an invalid shapeTree graph', // rejects.
      async () => {
        const c = await new ShapeTree
              .managedContainer(new URL('/', new URL(`http://localhost:${H.getStaticPort()}/`)), "this should not appear in filesystem", new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top`), '.').finish();
        c.graph.getQuads(c.url.href, C.ns_foot + 'shapeTreeRoot', null).forEach(q => c.graph.removeQuad(q)) // @@should use RDFJS terms
        await c.getRootedShapeTree(H.LdpConf.cache);
      },
      err => expect(err).to.be.an('Error').that.matches(/no matches/)
     );
});

describe('ShapeTree.remote', function () {
  it('should throw if not passed a URL', () => {
    expect(
      () => // throws immedidately.
        new ShapeTree.remoteShapeTree(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top`, H.LdpConf.cache).fetch()
    ).throw(Error);
  });

  rej('should throw on a GET failure', // rejects.
      () => new ShapeTree.remoteShapeTree(new URL(`http://localhost:${H.getStaticPort()}/doesnotexist/`), H.LdpConf.cache).fetch(),
      err => expect(err).to.be.an('Error')
     );
});

describe('ShapeTree.validate', function () {
  rej('should throw if shapeTree step is missing a shape',
      () => {
        const f = new ShapeTree.remoteShapeTree(new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top`), H.LdpConf.cache);
        return f.fetch().then(
          () => f.validate(`http://localhost:${H.getStaticPort()}/doesnotexist`, "text/turtle", "", new URL("http://a.example/"), "http://a.example/")
      )},
      err => expect(err).to.be.an('Error')
     );
  rej('should throw on malformed POST Turtle body',
      () => {
        const f = new ShapeTree.remoteShapeTree(new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top`), H.LdpConf.cache);
        return f.fetch().then(
          () => f.validate(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#Event`, 'text/turtle', 'asdf', new URL('http://a.example/'))
      )},
      err => expect(err).to.be.an('Error')
     );
  rej('should throw on malformed POST JSON-LD body',
      () => {
        const f = new ShapeTree.remoteShapeTree(new URL(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top`), H.LdpConf.cache);
        return f.fetch().then(
          () => f.validate(`http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#Event`, 'application/json', 'asdf', new URL('http://a.example/'))
      )},
      err => expect(err).to.be.an('Error')
     );
});

describe('ShapeTree misc', function () {
  it('should construct all errors', () => {
    expect(new RExtra.UriTemplateMatchError('asdf')).to.be.an('Error');
    expect(new RExtra.ShapeTreeStructureError('asdf')).to.be.an('Error');
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
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top>; rel="shapeTree"`];
    const registration = '@prefix x: <>\n@@bad Turtle@@';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration);
    expect(resp.statusCode).to.deep.equal(422)
    expect(resp.type).to.deep.equal('application/json');
    const err = JSON.parse(resp.text);
    expect(err.message).match(/Unexpected "@@bad" on line 2/)
  });

  it('should fail with bad JSON', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top>; rel="shapeTree"`];
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
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top>; rel="shapeTree"`];
    const registration = '{\n  "foo": 1,\n  "@id": 2\n}';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration, 'application/ld+json');
    expect(resp.statusCode).to.deep.equal(422);
    expect(resp.type).to.deep.equal('application/json');
    const err = JSON.parse(resp.text);
    expect(resp.text).match(/jsonld.SyntaxError/);
  });
  // }

  const installDir = 'collisionDir';
  const location = `${Path.join('/', installDir, '/')}collision-2/`;
  it('should create a novel directory', async () => {

    await H.ensureTestDirectory(installDir, TestRoot);

    const mkdirs = [`${installDir}/collision`, `${installDir}/collision-1`];
    mkdirs.forEach(d => Fse.mkdirSync(Path.join(TestRoot, d)));
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleShapeTree#top>; rel="shapeTree"`];
    const registration = `PREFIX ldp: <http://www.w3.org/ns/ldp#>
[] ldp:app <http://store.example/gh> .
<http://store.example/gh> ldp:name "CollisionTest" .
`;
    const resp = await H.trySend(H.getBase() + Path.join('/', installDir, '/'), link, 'collision', registration, 'text/turtle');
    mkdirs.forEach(d => Fse.rmdirSync(Path.join(TestRoot, d)));
    if (!resp.ok) resp.ok = H.dumpStatus(resp);
    expect(resp.ok).to.deep.equal(true);
    expect(new URL(resp.headers.location).pathname).to.deep.equal(location);
    expect(resp.statusCode).to.deep.equal(201);
    expect(resp.text).match(new RegExp(`foot:shapeTreeInstancePath "${location.substr(1)}"`))
  });

  describe(`create ${location}Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z`, () => {
    H.post({path: `${location}Events/`, slug: '09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl',
            body: 'test/cal/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl', root: {'@id': '09abcdefghijklmnopqrstuvwx_20200107T140000Z'},
            type: 'Resource', location: `${location}Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`});
    H.find([
      {path: `${location}Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['start', 'end']},
    ]);
    H.dontFind([
      {path: `${location}Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`, accept: 'text/turtle', entries: ['collision-2/Events/19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl']},
    ]);

    it('should delete a file', async () => {
      const resp = await H.tryDelete(`${location}Events/09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl`);
      expect(resp.ok).to.be.true;
    });

    it('should delete the above novel directory', async () => {
      const resp = await H.tryDelete(location);
      expect(resp.ok).to.be.true;
    });
  });
});

/* disabled 'cause of race condition -- which test requires first?
describe('LDP server', function () {
  it('should leave existing root in-place', () => {
    Fse.removeSync(TestRoot);
    new ShapeTree.dir(new URL('http://localhost/'), '/', TestRoot, "test root")
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
