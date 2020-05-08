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
    * [cal.test.js](test/cal.test.js) - calendar app that works with two calendar formats
    * [photo.test.js](test/photo.test.js) - very simple photo storage
    * [photoAlbum-shallow.test.js](test/photoAlbum-shallow.test.js) - a photo album that can use images from photo.test.js.
    * [gh-deep.test.js](test/gh-deep.test.js) - an LDP emulation of the [GitHub API](https://developer.github.com/v3/).
    * [*/…](test) - subdirectories with content POSTed in the above tests.
    * [local.test.js](test/local.test.js) - tests specific to this implementation of LDP (depends on Slug: behavior, collision algorithms, etc)
    * [test-harness.js](test/test-harness.js) - support functions to minimize the ceremony in the above tests.

## install/run tests

``` shell
git clone --recursive https://github.com/shapetrees/test-suite.git
cd test-suite/shapetree.js/
npm install
cd ..
npm install
npm run genkeys
npm test
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
        ├── album<br/>
        │      └── ref-1.ttl<br/>
        ├── bad<br/>
        │      ├── malformed-ref-1.ttl<br/>
        │      ├── ref-1.ttl<br/>
        │      ├── ref-invalid-2.ttl<br/>
        │      └── ref-valid-3.ttl<br/>
        ├── bad.test.js<br/>
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
        ├── local.test.js<br/>
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
