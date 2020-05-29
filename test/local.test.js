const Fse = require('fs-extra');
const Path = require('path');
const Fetch = require('../filesystems/fetch-self-signed')(require('node-fetch'));
// const expect = require('chai').expect;
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect
chai.use(chaiAsPromised)
const RdfSerialization = require('../shapetree.js/lib/rdf-serialization')
const Errors = require('../shapetree.js/lib/rdf-errors');

const Prefixes = require('../shapetree.js/lib/prefixes');
const H = require('./test-harness');
let ShapeTree = null;
const TestRoot = H.LdpConf.documentRoot;

// initialize servers
H.init(TestRoot).then(() => ShapeTree = H.ShapeTree);
it('LDP server should serve /', () => { Fetch(H.ldpBase); }); // keep these test before the outer describe
it('AppStore server should serve /', () => { Fetch(H.appStoreBase); });

describe(`test/local.test.js`, function () { // disable with xdescribe for debugging
describe('LDP server', function () {
  it('should return on empty path', async () => {
    const resp = await Fetch(H.ldpBase);
    const text = await resp.text();
    expect(text).to.match(/<> a ldp:BasicContainer/);
  });
});
describe('AppStore server', function () {
  it('should return on empty path', async () => {
    const resp = await Fetch(H.appStoreBase);
    const text = await resp.text();
    expect(JSON.parse(text)).to.be.an('array');
  });
  it('should resolve full path', async () => {
    const resp = await Fetch(new URL('cal/Calendar.shex', H.appStoreBase));
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

describe('ShapeTree.ManagedContainer', () => {
  it('should throw if not passed a Container URL', () => {
    expect((async () => {
      return new ShapeTree.ManagedContainer(
        'http://localhost/', '/', "construct dir with URL string"
      ).ready;
    })()).to.be.eventually.rejectedWith('must be an instance of URL').and.be.an.instanceOf(Error);
  });
  it('should throw if the Container URL doesn\'t end with \'/\'', () => {
    expect((async () => {
      await new ShapeTree.ManagedContainer(
        new URL('http://localhost/delme'), '/', "construct dir without trailing '/'"
      ).ready;
    })()).to.be.eventually.rejectedWith('must end with \'/\'').and.be.an.instanceOf(Error);
  });
  it('should throw if the Container URL ends with \'//\'', () => {
    expect((async () => {
      await new ShapeTree.ManagedContainer(
        new URL('http://localhost/delme//'), '/', "construct dir trailing '//'"
      ).ready;
    })()).to.be.eventually.rejectedWith('ends with \'//\'').and.be.an.instanceOf(Error);
  });
  it('should throw if the shapeTree parameter isn\'t a URL', () => {
    expect((async () => {
      await new ShapeTree.ManagedContainer(
        new URL('http://localhost/delme/'), '/', "construct dir with URL string shapeTree", 'http://localhost/shapeTree', '.'
      ).ready;
    })()).to.be.eventually.rejectedWith('shapeTree must be an instance of URL').and.be.an.instanceOf(Error);
  });
  it('should remove a Container directory', async () => {
    const delme = 'delme/';
    const c = await new ShapeTree.ManagedContainer(
      new URL(delme, new URL(H.ldpBase)), "this should be removed from filesystem", new URL(new URL('cal/GoogleShapeTree#top', H.appStoreBase)), '.'
    ).ready;
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
        const c = await new ShapeTree.ManagedContainer(
          new URL('/', new URL(H.ldpBase)), "this should not appear in filesystem", new URL(new URL('cal/GoogleShapeTree#top', H.appStoreBase)), '.'
        ).ready;
        c.graph.getQuads(c.url.href, Prefixes.ns_tree + 'shapeTreeRoot', null).forEach(q => c.graph.removeQuad(q)) // @@ should use RDFJS terms
        await c.getRootedShapeTree(H.LdpConf.cache);
      },
      err => expect(err).to.be.an('Error').that.matches(/no matches/)
     );
});

describe('ShapeTree.remote', function () {
  it('should throw if not passed a URL', () => {
    expect(
      () => // throws immedidately.
        new ShapeTree.RemoteShapeTree(new URL('cal/GoogleShapeTree#top', H.appStoreBase).href).fetch()
    ).throw(Error);
  });
  rej('should throw on a GET failure', // rejects.
      () => new ShapeTree.RemoteShapeTree(new URL(new URL('doesnotexist/', H.appStoreBase))).fetch(),
      err => expect(err).to.be.an('Error')
     );
  it('should parse turtle', async () => {
    const r = await new ShapeTree.RemoteShapeTree(new URL('gh/ghShapeTree.ttl#root', H.appStoreBase)).fetch();
    expect(r.graph.size).to.be.above(10);
  })
  rej('should throw on bad media type',
      () => new ShapeTree.RemoteShapeTree(new URL('gh/ghShapeTree.txt#root', H.appStoreBase)).fetch(),
      err => expect(err).to.be.an('Error')
     );
});

describe('ShapeTree.validate', function () {
  rej('should throw if shapeTree step is missing a shape',
      () => {
        const f = new ShapeTree.RemoteShapeTree(new URL(new URL('cal/GoogleShapeTree#top', H.appStoreBase)));
        return f.fetch().then(
          () => f.validate(new URL('doesnotexist', H.appStoreBase), "text/turtle", "", new URL("http://a.example/"), "http://a.example/")
      )},
      err => expect(err).to.be.an('Error')
     );
  rej('should throw on malformed POST Turtle body',
      () => {
        const f = new ShapeTree.RemoteShapeTree(new URL(new URL('cal/GoogleShapeTree#top', H.appStoreBase)));
        return f.fetch().then(
          () => f.validate(new URL('cal/GoogleShapeTree#Event', H.appStoreBase), 'text/turtle', 'asdf', new URL('http://a.example/'))
      )},
      err => expect(err).to.be.an('Error')
     );
  rej('should throw on malformed POST JSON-LD body',
      () => {
        const f = new ShapeTree.RemoteShapeTree(new URL(new URL('cal/GoogleShapeTree#top', H.appStoreBase)));
        return f.fetch().then(
          () => f.validate(new URL('cal/GoogleShapeTree#Event', H.appStoreBase), 'application/json', 'asdf', new URL('http://a.example/'))
      )},
      err => expect(err).to.be.an('Error')
     );
});

describe('ShapeTree misc', function () {
  it('should construct all errors', () => {
    expect(new Errors.UriTemplateMatchError('asdf')).to.be.an('Error');
    expect(new Errors.ShapeTreeStructureError('asdf')).to.be.an('Error');
  });
  it('should render RDFJS nodes', () => {
    const iri = 'http://a.example/';
    expect(RdfSerialization.renderRdfTerm({termType: 'NamedNode', value: iri})).to.equal(`<${iri}>`);
    const bnode = 'b1';
    expect(RdfSerialization.renderRdfTerm({termType: 'BlankNode', value: bnode})).to.equal(`_:${bnode}`);
    const literal = '"This statement is a lie" is a lie.';
    expect(RdfSerialization.renderRdfTerm({termType: 'Literal', value: literal})).to.equal(`"${literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
    expect(() => RdfSerialization.renderRdfTerm(12345)).throw(Error);
    expect(() => RdfSerialization.renderRdfTerm({a:1})).throw(Error);
  })
});

describe('PLANT', function () {

  // { @@ duplicated in bad.test.js but testing specific error messages is inappropriate there.
  it('should fail with bad Turtle', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<${new URL('cal/GoogleShapeTree#top', H.appStoreBase)}>; rel="shapeTree"`];
    const registration = '@prefix x: <>\n@@bad Turtle@@';
    const resp = await H.tryPost(H.ldpBase.href, 'text/turtle', registration, link, 'ShouldNotExist');
    expect(resp.status).to.deep.equal(422)
    expect(H.contentType(resp)).to.equal('application/json');
    const err = JSON.parse(await resp.text());
    expect(err.message).match(/Unexpected "@@bad" on line 2/)
  });

  it('should fail with bad JSON', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<${new URL('cal/GoogleShapeTree#top', H.appStoreBase)}>; rel="shapeTree"`];
    const registration = '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}';
    const resp = await H.tryPost(H.ldpBase.href, 'application/ld+json', registration, link, 'ShouldNotExist');
    const body = await resp.text();
    // H.dumpStatus(resp, body);
    expect(resp.status).to.deep.equal(422)
    expect(H.contentType(resp)).to.equal('application/json');
    const err = JSON.parse(body);
    expect(err.message).match(/Unexpected token @/)
  });

  it('should fail with bad JSONLD', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<${new URL('cal/GoogleShapeTree#top', H.appStoreBase)}>; rel="shapeTree"`];
    const registration = '{\n  "foo": 1,\n  "@id": 2\n}';
    const resp = await H.tryPost(H.ldpBase.href, 'application/ld+json', registration, link, 'ShouldNotExist');
    expect(resp.status).to.deep.equal(422);
    expect(H.contentType(resp)).to.equal('application/json');
    const body = await resp.text();
    const err = JSON.parse(body);
    expect(body).match(/jsonld.SyntaxError/);
  });
  // }

  const installDir = 'collisionDir';
  const location = `${Path.join('/', installDir, '/')}collision-2/`;
  before(() => H.ensureTestDirectory(installDir));
  it('should create a novel directory', async () => {


    const mkdirs = [`${installDir}/collision`, `${installDir}/collision-1`];
    mkdirs.forEach(d => Fse.mkdirSync(Path.join(TestRoot, d)));
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<${new URL('cal/GoogleShapeTree#top', H.appStoreBase)}>; rel="shapeTree"`];
    const registration = `PREFIX ldp: <http://www.w3.org/ns/ldp#>
[] ldp:app <http://store.example/gh> .
<http://store.example/gh> ldp:name "CollisionTest" .
`;
    const resp = await H.tryPost(H.ldpBase.href + Path.join(installDir, '/'), 'text/turtle', registration, link, 'collision');
    const body = await resp.text();
    mkdirs.forEach(d => Fse.rmdirSync(Path.join(TestRoot, d)));
    if (!resp.ok) await H.dumpStatus(resp, body);
    expect(resp.ok).to.deep.equal(true);
    expect(new URL(resp.headers.get('location')).pathname).to.deep.equal(location);
    expect(resp.status).to.deep.equal(201);
    expect(body).match(new RegExp(`tree:shapeTreeInstancePath <collision-2/>`))
  });

  it('should delete the parent directory', async () => {
    const resp = await H.tryDelete(installDir + '/');
    expect(resp.ok).to.be.true;
  });
});

  describe('handle PLANTs and POSTs with no Slug header', () => {
    let installDir = 'no-slug'
    before(() => H.ensureTestDirectory(installDir));
    describe(`create ${Path.join('/', installDir, '/')}Container/`, () => {
      H.plant({path: Path.join('/', installDir, '/'),
               name: 'GhApp2', url: 'http://store.example/gh2', shapeTreePath: 'gh/ghShapeTree#root',
               status: 201, location: `${Path.join('/', installDir, '/')}Container/`})
      H.find([
        {path: `${Path.join('/', installDir, '/')}Container/`, accept: 'text/turtle', entries: ['shapeTreeInstancePath "."']},
      ])
    });
    describe(`re-create ${Path.join('/', installDir, '/')}Container/`, () => {
      H.plant({path: Path.join('/', installDir, '/'), slug: '999',
               name: 'GhApp2', url: 'http://store.example/gh2', shapeTreePath: 'gh/ghShapeTree#root',
               status: 201, location: `${Path.join('/', installDir, '/')}Container/`})
      H.dontFind([
        {path: `${Path.join('/', installDir, '/')}999/`, accept: 'text/turtle', entries: [`/${installDir}/999/`]},
      ])
    });
    describe(`create ${Path.join('/', installDir, '/')}Container/users/Container/`, () => {
      H.post({path: `${Path.join('/', installDir, '/')}Container/users/`,
              type: 'Container', bodyURL: 'test/apps/gh/ericprud-user.json', mediaType: "application/ld+json", root: {'@id': '#ericprud'},
              status: 201, parms: {userName: 'ericprud'}, location: `${Path.join('/', installDir, '/')}Container/users/Container/`});
      H.find([
        {path: `${Path.join('/', installDir, '/')}Container/users/Container/`, accept: 'text/turtle', entries: ['users/Container']},
      ])
    });
  });
/* disabled 'cause of race condition -- which test requires first?
describe('LDP server', function () {
  it('should leave existing root in-place', () => {
    Fse.removeSync(TestRoot);
    new ShapeTree.dir(new URL('http://localhost/'), '/', TestRoot, "test root")
    Fse.writeFileSync(Path.join(TestRoot, 'foo'), 'test file', {encoding: 'utf8'})
    expect(Fse.readFileSync(Path.join(TestRoot, 'foo'), 'utf8')).to.deep.equal('test file')
    const ldpServer = require('../servers/LDP')
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
