# blueprint-tests

This contains:
* two Blueprints specifications:
  * [primer](https://janeirodigital.github.io/blueprints/primer) ([src](primer.html)) - description of blueprints and how they're used (in Solid).
  * [spec](https://janeirodigital.github.io/blueprints/spec) ([src](spec.html)) - formal definition for the semantics and behaviors of blueprints.
  * [local.css](local.css) - CSS for the above two documents.
* two [express](https://expressjs.com/) servers:
  * a simple static server to provide test documents:
    * [appStoreServer](appStoreServer.js) - serves static content and directories.
    * [solidApps/staticRoot](solidApps/staticRoot) - appStoreServer's static content.
  * a minimal [LDP](https://www.w3.org/TR/ldp/) with support for blueprints
    * [ldpServer](ldpServer.js) - conforms to a subset of the [Linked Data Platform](https://www.w3.org/TR/ldp/).
    * [util/blueprint](util/blueprint.js) - blueprint-specific code for ldpServer
  * [servers.json](servers.json) - configuration for the servers
* mocha tests
  * [test](test) - tests for several sample applications:
    * [bad.test.js](test/bad.test.js) - error conditions for LDP operations involving blueprints.
    * [cal.test.js](test/cal.test.js) - calendar app that works with two calendar formats
    * [photo.test.js](test/photo.test.js) - very simple photo storage
    * [photoAlbum-shallow.test.js](test/photoAlbum-shallow.test.js) - a photo album that can use images from photo.test.js.
    * [gh-deep.test.js](test/gh-deep.test.js) - an LDP emulation of the [GitHub API](https://developer.github.com/v3/).
    * [*/…](test) - subdirectories with content POSTed in the above tests.
    * [local.test.js](test/local.test.js) - tests specific to this implementation of LDP (depends on Slug: behavior, collision algorithms, etc)
    * [test-harness.js](test/test-harness.js) - support functions to minimize the ceremony in the above tests.

The output of these tests can be see by:
``` shell
git clone https://github.com/janeirodigital/blueprint-tests.git
cd blueprint-tests
npm install
npm test
```
or in the [blueprint-tests-output repo](../../../blueprint-tests-output).

## TODO

* remove or disable slug to reinforce lack of semantics in Container labels.
