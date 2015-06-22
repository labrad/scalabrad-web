module.exports = {

  entry: __dirname + '/app/scripts/app.ts',

  output: {
    path: __dirname + '/.tmp/',
    filename: "scripts/app.js"
  },

  // Currently we need to add '.ts' to resolve.extensions array.
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.js'],
    modulesDirectories: ['bower_components', 'node_modules']
  },

  // Source maps support (or 'inline-source-map' also works)
  devtool: 'source-map',

  // Add loader for .ts files.
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: 'typescript-loader?verbose'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  }
};
