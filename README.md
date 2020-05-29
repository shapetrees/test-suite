# Shape Trees - Test Suite

This contains:
* two [express](https://expressjs.com/) servers:
  * a simple static server to provide test documents:
    * [AppStore Server](servers/appStore.js) - serves static content and directories.
    * [solidApps/staticRoot](solidApps/staticRoot) - AppStore server's static content.
  * a minimal [LDP](https://www.w3.org/TR/ldp/) with support for shape trees
    * [LDP server](servers/LDP.js) - conforms to a subset of the [Linked Data Platform](https://www.w3.org/TR/ldp/).
  * [config.json](servers/config.json) - configuration for the servers
* mocha tests
  * [test](test) - tests for several sample applications:
    * [bad.test.js](test/bad.test.js) - error conditions for LDP operations involving shape trees.
    * [local.test.js](test/local.test.js) - tests specific to this implementation of LDP (depends on Slug: behavior, collision algorithms, etc)
    * [test](test/apps) - tests for several example applications:
      * [cal.test.js](test/apps/cal.test.js) - calendar app that works with two calendar formats
      * [photo.test.js](test/apps/photo.test.js) - very simple photo storage
      * [photoAlbum-shallow.test.js](test/apps/photoAlbum-shallow.test.js) - a photo album that can use images from photo.test.js.
      * [gh-deep.test.js](test/apps/gh-deep.test.js) - an LDP emulation of the [GitHub API](https://developer.github.com/v3/).
      * [test-harness.js](test/apps/test-harness.js) - support functions to minimize the ceremony in the above tests.
      * [*/…](test/apps) - subdirectories with content POSTed in the above tests.

## installation
``` shell
git clone --recursive https://github.com/shapetrees/test-suite
cd test-suite/shapetree.js/
npm install
cd ..
npm install
npm run genkeys
```

The last step requires [openssl](https://www.openssl.org/) to be installed. It generates two files:
* servers/ssl.key - private key file
* servers/ssl.cert - fullchain certificate
You can install your own key pair, such as what you might get from [letsencrypt](https://letsencrypt.org/). You can override the location by editing the `"LDP"` entry in `servers/config.json`:
``` json
"LDP": {
  ...
  "keyFilePath": "servers/ssl.key",
  "certFilePath": "servers/ssl.cert",
  ...
}
```

### run tests
```
npm test
```

### browse playground
```
* npm run serve
* browse to http://localhost:12340/playground/index.html?manifest=../console/manifest.json
```


## TODO

* remove or disable slug to reinforce lack of semantics in Container labels.

## test-suite hierarchy

test-suite<br/>
├── shapetree.js (<a href="https://github.com/shapetrees/shapetree.js">subrepo</a>) - general ShapeTree Javascript library<br/>
│      ├── dist<br/>
│      │      └── shape-tree.js<br/>
│      ├── ecosystems<br/>
│      │      └── simple-apps.js<br/>
│      ├── lib<br/>
│      │      ├── prefixes.js<br/>
│      │      ├── rdf-errors.js<br/>
│      │      ├── rdf-serialization.js<br/>
│      │      └── shape-tree.js<br/>
│      ├── README.md<br/>
│      ├── webapp<br/>
│      │      └── index.js<br/>
│      └── webpack.config.js<br/>
├── test ... see <a href="#test">test</a> below - ShapeTree tests<br/>
├── www ... (<a href="https://github.com/ericprud/shapetree-tests-output">subrepo</a>) see <a href="https://github.com/ericprud/shapetree-tests-output#file-tree">shapetree-tests-output</a> - result of running tests; a sample ShapeTree ecosystem.<br/>
├── playground ... (<a href="https://github.com/shapetrees/playground">subrepo</a>) see <a href="#playground">playground</a> below - intaractive WebApp for exploring/exercising ShapeTrees<br/>
├── console - configuration for the playground to use test-suite test data<br/>
│      └── manifest.json<br/>
├── servers<br/>
│      ├── ldpServer.js ⎱__ two servers used in testing<br/>
│      ├── AppStore.js  ⎰<br/>
│      ├── run - run the two servers used in testing<br/>
│      ├── config.json - server configuration<br/>
│      ├── server.cert  ⎱__ generated SSL key pair<br/>
│      ├── server.key  ⎰<br/>
│      └── favicon.ico<br/>
├── solidApps ... see <a href="#solidAps">solidAps</a> below - static content for the app store server<br/>
├── filesystems - drivers for the shapetree.js library to talk to the server's resource hierarchy<br/>
│      ├── fetch-self-signed.js<br/>
│      └── fs-promises-utf8.js<br/>
├── README.md<br/>
├── TODO.txt<br/>
└── update-www-repo.sh

## test

data used in tests:

└── test<br/>
        ├── bad.test.js - general ShapeTree tests<br/>
        ├── bad - files for general ShapeTree tests<br/>
        │      ├── malformed-ref-1.ttl<br/>
        │      ├── ref-1.ttl<br/>
        │      ├── ref-invalid-2.ttl<br/>
        │      └── ref-valid-3.ttl<br/>
        ├── local.test.js - tests specific to the servers/LDP.js implementation<br/>
        └── apps - tests for example applications
            ├── album<br/>
            │      └── ref-1.ttl<br/>
            ├── cal<br/>
            │      ├── 09abcdefghijklmnopqrstuvwx_20200107T140000Z.jsonld<br/>
            │      ├── 09abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl<br/>
            │      ├── 19abcdefghijklmnopqrstuvwx_20200107T140000Z.jsonld<br/>
            │      ├── 19abcdefghijklmnopqrstuvwx_20200107T140000Z.ttl<br/>
            │      ├── commonAppointment1.ttl<br/>
            │      └── manifest.json<br/>
            ├── cal.test.js<br/>
            ├── gh<br/>
            │      ├── alice.json<br/>
            │      ├── alice-subscr1.ttl<br/>
            │      ├── alice.ttl<br/>
            │      ├── ericprud.ttl<br/>
            │      ├── jsg-issue1.ttl<br/>
            │      └── jsg.ttl<br/>
            ├── gh-deep.test.js<br/>
            ├── nevernote<br/>
            │      ├── img-M33_IR.jpg<br/>
            │      ├── inc-M33_IR.ttl<br/>
            │      └── note1.ttl<br/>
            ├── nevernote.test.js<br/>
            ├── photo<br/>
            │      └── 320px-Infrared_Triangulum_Galaxy_(M33).jpg<br/>
            ├── photoAlbum-shallow.test.js<br/>
            ├── photo.test.js<br/>
            └── test-harness.js

## solidApps

files served by the app store server:

└── solidApps<br/>
        └── staticRoot<br/>
               ├── album<br/>
               │      ├── PhotoAlbumShapeTree.jsonld<br/>
               │      ├── PhotoAlbumShapeTree.ttl<br/>
               │      ├── PhotoAlbumShapeTree.txt<br/>
               │      └── PhotoAlbum.shex<br/>
               ├── bad<br/>
               │      ├── PhotoAlbumShapeTree.jsonld<br/>
               │      ├── PhotoAlbumShapeTree.ttl<br/>
               │      ├── PhotoAlbum.shex<br/>
               │      ├── ShapeTreeMissingSchema.jsonld<br/>
               │      ├── ShapeTreeMissingSchema.ttl<br/>
               │      ├── ShapeTreeMissingShape.jsonld<br/>
               │      ├── ShapeTreeMissingShape.ttl<br/>
               │      ├── ShapeTreeNestedTwoStaticNames.jsonld<br/>
               │      ├── ShapeTreeNoShapeProperty.jsonld<br/>
               │      ├── ShapeTreeNoShapeProperty.ttl<br/>
               │      └── ShapeTreeTwoStaticNames.jsonld<br/>
               ├── cal<br/>
               │      ├── CalendarShapeTree.jsonld<br/>
               │      ├── CalendarShapeTree.ttl<br/>
               │      ├── Calendar.shex<br/>
               │      ├── GoogleCalendar.shex<br/>
               │      ├── GoogleShapeTree.jsonld<br/>
               │      ├── GoogleShapeTree.ttl<br/>
               │      ├── ical-owl-annot.shex<br/>
               │      ├── ical-owl.shex<br/>
               │      ├── MultiCalApp.ttl<br/>
               │      └── MultiCal.shex<br/>
               ├── contacts<br/>
               │      ├── ContactShapeTree.jsonld<br/>
               │      ├── ContactShapeTree.ttl<br/>
               │      └── Contact.shex<br/>
               ├── gh<br/>
               │      ├── ghSchema.shex<br/>
               │      ├── ghShapeTree.jsonld<br/>
               │      ├── ghShapeTree.ttl<br/>
               │      ├── ghShapeTree.txt<br/>
               │      └── ghSkos.en.ttl<br/>
               ├── nevernote<br/>
               │      ├── NeverNoteBookShapeTree.jsonld<br/>
               │      ├── NeverNoteBookShapeTree.ttl<br/>
               │      ├── NeverNoteShapeTree.jsonld<br/>
               │      ├── NeverNoteShapeTree.ttl<br/>
               │      ├── NeverNote.shex<br/>
               │      ├── NN.js<br/>
               │      └── NN.shex<br/>
               ├── ns<br/>
               │      └── shapeTreeContext.jsonld<br/>
               └── photo<br/>
                        ├── PhotoShapeTree.jsonld<br/>
                        └── Photo.shex

## playground

an interactive tool for playing with ShapeTrees

└── playground<br/>
        ├── index.html<br/>
        ├── LICENSE<br/>
        ├── popup.html<br/>
        ├── README.md<br/>
        ├── scripts<br/>
        │      ├── jquery.js<br/>
        │      ├── main.js<br/>
        │      ├── rdflib.min.js<br/>
        │      ├── rdflib.min.js.map<br/>
        │      ├── shapetree.js<br/>
        │      └── solid-auth-client.bundle.js<br/>
        └── styles<br/>
                └── main.css

___
## architecture

___
### server/LDP

#### module list
* [Prefixes](#prefixes)		shapetree.js/lib/prefixes
* [Errors](#errors)			shapetree.js/lib/rdf-errors
* [RdfSerialization](#rdfserialization)	shapetree.js/lib/rdf-serialization
* Mutex			shapetree.js/lib/mutex
* [FileSystem](#filesystem)
  * fs-promises		filesystems/fs-promises-utf8
  * ld-proxy		filesystems/ldp-proxy
* FetchSelfSigned		filesystems/fetch-self-signed
* [ShapeTree](#shapetree)		shapetree.js/lib/shape
* [ShapeTreeFetch](#shapetreefetch)		shapetree.js/lib/shape
* [Ecosystem](#ecosystem)
  * Simple Apps		shapetree.js/ecosystems/simple-apps
* LdpConf			servers/config.json

##### use
*LDP server*
```
FileSystem(LdpConf.documentRoot, LdpConf.indexFile, RdfSerialization)
CallEcosystemFetch = (url, options = {}) => Ecosystem.fetch(url, options);
ShapeTree(FileSystem, RdfSerialization, FetchSelfSigned(CallEcosystemFetch))
Ecosystem(FileSystem, ShapeTree, RdfSerialization);
NoShapeTrees = process.env.SHAPETREE === 'fetch';
```
*ShapeTreeFetch*
```
const fsModule = require('../filesystems/ldp-proxy');
const fs = new fsModule(LdpBase, RdfSerialization, FetchSelfSigned);
Fetch = await require('../shapetree.js/lib/shape-tree-fetch')(fs, RdfSerialization, FetchSelfSigned, LdpBase, Confs.LDP);
```

___
#### Prefixes
RDF serialization prefixes used in LDP and ShapeTrees.

* ldp: 'http://www.w3.org/ns/ldp#',
* rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
* rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
* tree: 'http://www.w3.org/ns/shapetree#',
* xsd: 'http://www.w3.org/2001/XMLSchema#',
* dc: 'http://purl.org/dc/terms/',


___
#### RdfSerialization
Internal functions to parse and serialize RDF, plus rudimentary query.

##### modules
* n3
* relateurl
* jsonld
* rdf-errors

##### API
parseRdf (body, base, contentType, prefixes = {})
parseTurtleSync (text, base, prefixes)
async parseTurtle (text, base, prefixes)
serializeTurtleSync (graph, base, prefixes)
async serializeTurtle (graph, base, prefixes)
async parseJsonLd (text, base)
expectOne (g, s, p, o, nullable)
function zeroOrOne (g, s, p, o)
function one (g, s, p, o)
renderRdfTerm (t)


___
#### Errors
Internal standard errors which result from e.g. improper input.

##### class API
* class ManagedError extends Error
* class ParserError extends ManagedError
* class NotFoundError extends ManagedError
* class MiscHttpError extends ManagedError
* class MissingShapeError extends ManagedError
* class ShapeTreeStructureError extends ManagedError
* class ValidationError extends ManagedError
* class UriTemplateMatchError extends ManagedError

##### function API
* async makeHttpError (operation, resource, role, resp)
* async getOrThrow (fetch, url)


___
#### FileSystem
Perform basic CRUD operations.

| operation | LDP-C | LDP-R |
| :-- | :-- | :-- |
| read existing | read(url) | readContainer(url, prefixes) |
| write existing or new | write(url, body) | writeContainer(url, prefixex) |
| create and name new | invent(parentUrl, requestedName, body, mediaType) | inventContainer(url, requestedName, title, prefixes) |
| delete existing | remove(url) | removeContainer(url) |
| ensure existence of | -- | ensureContainer(url, prefixes, title) |
| get resource info of | rstat(url) | rstat(url) |

##### API
* async rstat (url)
* async read (url)
* async write (url, body)
* async invent (parentUrl, requestedName, body, mediaType)
* async remove (url)
* async readContainer (url, prefixes)
* async writeContainer (url, graph, prefixes)
* async inventContainer (url, requestedName, title, prefixes)
* async removeContainer (url)
* async ensureContainer (url, prefixes, title)
* getIndexFilePath (url)

##### implementations
| module | use | modules | constructor arguments |
| :-- | :-- | :-- | :-- |
| **fs-promises** | convert URLs to local paths and R/W with `require('fs').promises` | fs, path | docRoot, indexFile, rdfInterface, encoding='utf8' |
| **ldp-proxy** | execute API as `fetch` calls to a generic LDP server | n3 | ldpServer, rdfInterface, fetch |


___
#### ShapeTree

constructor (fileSystem, rdfInterface, fetch)

##### modules
* debug
* path
* n3
* rdf-errors
* prefixes
* uri-template-lite
* @shexjs/core
* @shexjs/parser

##### Container
Generic LDP Container.
###### methods
* constructor (url, title) {
* url
* prefixes
* graph
* subdirs
* ready
* async write ()
* async remove ()
* async merge (payload, base)
* addMember (location, shapeTreeUrl)
* removeMember (location, shapeTreeUrl)
* addSubdirs (addUs)
* async asManagedContainer (shapeTreeUrl, shapeTreeInstancePath)

##### ManagedContainer
extends Container

Container in a ShapeTree instance.
###### methods
* constructor (url, title, shapeTreeUrl, shapeTreeInstancePath)
* shapeTreeUrl
* shapeTreeInstancePath
* shapeTreeInstanceRoot
* async getRootedShapeTree ()
* async validatePayload (payload, location, mediaType, ldpType, entityUrl)

#####  Container factories 
* async function loadContainer (url)

##### RemoteShapeTree
* constructor (url, path = '.')
* getRdfRoot ()
* matchingStep (shapeTreeNode, slug)
* async instantiateStatic (stepNode, rootUrl, pathWithinShapeTree, parent, container = null)
* async validate (shape, payloadGraph, node)


___
#### Ecosystem
##### modules
* fs
* node-fetch
* lib/rdf-errors
* lib/prefixes

##### simpleApps
* constructor (fileSystem, shapeTrees, rdfInterface) {
* fileSystem:FileSystem
* shapeTrees:ShapeTree
* initialize (baseUrl, LdpConf) {
* baseUrl:URL
* appsUrl:URL
* cacheUrl:URL
* indexInstalledShapeTree (parent, instanceUrl, shapeTreeUrl)
* unindexInstalledShapeTree (parent, instanceUrl, shapeTreeUrl)
* reuseShapeTree (parent, shapeTreeUrl)
* async plantShapeTreeInstance (shapeTreeUrl, postedContainer, requestedLocation, payloadGraph)
* async registerInstance(appData, shapeTreeUrl, instanceUrl)
* parseInstatiationPayload (graph)
* async fetch (url, opts = {})
