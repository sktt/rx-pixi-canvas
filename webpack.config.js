const path = require('path')
const webpack = require('webpack')

const DIST_PATH = path.join(__dirname, 'dist')
const SRC_PATH = path.join(__dirname, 'src')

const PROD = process.env.NODE_ENV === 'production'

const opts = {
  hmr: !PROD,
  minify: PROD,
  env: JSON.stringify(process.env.NODE_ENV),
  dev: JSON.stringify(!PROD)
}

module.exports = {
  devtool: 'source-map',
  cache: 'true',
  entry: {
    main: path.join(SRC_PATH, 'index.js'),
  },
  output: {
    path: DIST_PATH,
    filename: '[name].js'
  },
  target: 'web',
  resolve: {
    extensions: ['', '.js', '.jsx']
  },
  plugins: [
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      __DEV__: opts.dev,
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: opts.env
      }
    })
  ],
  node: {
    fs: 'empty'
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        include: path.join(__dirname, 'node_modules', 'pixi.js'),
        loader: 'json'
      },
      { test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel'
      }
    ]
  }
}
