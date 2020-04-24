const path = require('path');

module.exports = {
  entry: './webapp/index.js',
  output: {
    filename: 'shape-tree.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'shape-tree',
    // libraryTarget: 'esm', no support for esm yet. try again in 2030.
  },
  node: {
    fs: "empty"
  },
  mode: 'development',
};
