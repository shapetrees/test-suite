const path = require('path');

module.exports = {
  entry: './webapp/index.js',
  output: {
    filename: 'blueprints.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'blues',
    // libraryTarget: 'esm', no support for esm yet. try again in 2030.
  },
  node: {
    fs: "empty"
  },
  mode: 'development',
};
