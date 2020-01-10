module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  "verbose": true,
  "testEnvironment": "node",
  "coveragePathIgnorePatterns": [
    "/node_modules/",
    "/test/test-harness.js",
    "/appStoreServer.js"
  ]
};
