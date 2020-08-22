#!/usr/bin/env node

const Mocha = require('mocha')
const expect = require('chai').expect
var testRunner = new Mocha()
var testSuite = Mocha.Suite.create(testRunner.suite, 'Network tests')

var tests = [ // Define some long async tasks.
  { name: 'POST /todos', pass: true, wait: 3500, exception: null },
  { name: 'GET /nonos', pass: false, wait: 2500, exception: null },
  { name: 'HEAD /hahas', pass: true, wait: 1500, exception: 'no route to host' }
]

let testNo = 0

doit(tests[testNo++])

function doit (test) {
  // Create a test which value errors and caught exceptions.
  console.warn('HERE')
    testSuite.addTest(new Mocha.Test(test.name, function () {
      this.timeout(test.wait + 100) // so we can set waits above 2000ms
      return asynchStuff(test).then(asyncResult => {
        if (testNo < tests.length)
          doit(tests[testNo++])
        expect(asyncResult.pass).to.be.true
      }) // No .catch() needed because Mocha.Test() handles them.
    }))
}
var suiteRun = testRunner.run() //             Run the tests
process.on('exit', (code) => { //              and set exit code.
  process.exit(suiteRun.stats.failures > 0) // Non-zero exit indicates errors.
}) // Falling off end waits for Mocha events to finish.

function asynchStuff (test) {
  return new Promise(function(resolve, reject) {
    setTimeout(() => {
//    console.log(test.name + ' on ' + test.endpoint + ': ' + test.wait + 'ms')
      if (test.exception)
        reject(Error(test.exception))
      resolve({name: test.name, pass: test.pass}) // only need name and pass
    }, test.wait)
  })
}
