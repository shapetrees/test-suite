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

describe('Footprint.local', function () {
  it('should throw if not passed a URL', () => {
    expect(() => {
      new Footprint.local('http://localhost/', '/');
    }).toThrow();
  });
});

describe('Footprint.localContainer', function () {
  it('should throw if not passed a Container URL', () => {
    expect(() => {
      new Footprint.localContainer('http://localhost/', '/', TestRoot, C.indexFile, "construct dir with URL string");
    }).toThrow();
  });
  it('should throw if the Container URL doesn\'t end with \'/\'', () => {
    expect(() => {
      new Footprint.localContainer(new URL('http://localhost/foo'), '/', TestRoot, C.indexFile, "construct dir without trailing '/'");
    }).toThrow();
  });
  it('should throw if the footprint URL doesn\'t end with \'/\'', () => {
    expect(() => {
      new Footprint.localContainer(new URL('http://localhost/foo/'), '/', TestRoot, C.indexFile, "construct dir with URL string footprint", 'http://localhost/footprint', '.');
    }).toThrow();
  });
});

describe('Footprint.remote', function () {
  it('should throw if not passed a URL', () => {
    expect(() => {
      new Footprint.remote(`http://localhost:${H.getStaticPort()}/doesnotexist/`, LdpConf.cache).fetch();
    }).toThrow(Error);
  });
  it('should should notice a GET failure', async () => {
    await expect(
      new Footprint.remote(new URL(`http://localhost:${H.getStaticPort()}/doesnotexist/`), LdpConf.cache).fetch()
    ).rejects.toThrow(Error);
  });
});

describe('STOMP', function () {
  it('should fail with bad Turtle', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = '@prefix x: <>\n@@bad Turtle@@';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration);
    expect(resp.statusCode).toEqual(500)
    expect(resp.text).toMatch(/Unexpected &quot;@@bad&quot; on line 2/)
  });

  it('should fail with bad JSON', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = '{\n  "foo": 1,\n  "bar": 2\n@@bad JSON}';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration, 'application/ld+json');
    // resp.statusCode = H.dumpStatus(resp);
    expect(resp.statusCode).toEqual(500)
    expect(resp.text).toMatch(/parseJsonLd/)
  });

  it('should fail with bad JSONLD', async () => {
    const link = ['<http://www.w3.org/ns/ldp#Container>; rel="type"',
                  `<http://localhost:${H.getStaticPort()}/cal/GoogleFootprint#top>; rel="footprint"`];
    const registration = '{\n  "foo": 1,\n  "@id": 2\n}';
    const resp = await H.trySend(H.getBase(), link, 'ShouldNotExist', registration, 'application/ld+json');
    expect(resp.statusCode).toEqual(500);
    expect(resp.text).toMatch(/jsonld.SyntaxError/);
  });

  it('should create a novel directory', async () => {
    const installDir = 'collisionDir';

    installDir.split(/\//).filter(d => !!d).reduce(
      (parent, dir) => {
        const ret = Path.join(parent, dir);
        // if (!Fse.existsSync(Path.join(TestRoot, ret)))
          new Footprint.localContainer(new URL('http://localhost/'), ret + Path.sep, TestRoot, C.indexFile, "pre-installed " + ret);
        return ret
      }, "");

    const location = `${Path.join('/', installDir, '/')}collision-2`;
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
    // if (!resp.ok) resp.ok = H.dumpStatus(resp);
    expect(resp.ok).toEqual(true);
    expect(new URL(resp.headers.location).pathname).toEqual(location + '/');
    expect(resp.statusCode).toEqual(201);
    expect(resp.text).toMatch(new RegExp(`foot:footprintInstancePath "${Path.join(TestRoot, location)}"`))
  });
});

/* disabled 'cause of race condition -- which test requires first?
describe('LDP server', function () {
  it('should leave existing root in-place', () => {
    Fse.removeSync(TestRoot);
    new Footprint.dir(new URL('http://localhost/'), '/', TestRoot, C.indexFile, "test root")
    Fse.writeFileSync(Path.join(TestRoot, 'foo'), 'test file', {encoding: 'utf8'})
    expect(Fse.readFileSync(Path.join(TestRoot, 'foo'), 'utf8')).toEqual('test file')
    const ldpServer = require('../ldpServer')
    expect(Fse.readFileSync(Path.join(TestRoot, 'foo'), 'utf8')).toEqual('test file')

    // restore 'cause modules are required only once.
    Fse.removeSync(TestRoot);
    ldpServer.initializeFilesystem()
  })
})
*/
