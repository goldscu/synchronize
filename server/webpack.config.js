const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  entry: './src/app.ts',
  target: 'node',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      // 使用tsconfig-paths-webpack-plugin来解析TypeScript配置中的路径别名
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, 'tsconfig.json')
      })
    ]
  },
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: './public', to: './public' },
        { from: './package.json', to: './package.json' }
      ]
    })
  ],
  externals: {
    express: 'commonjs express',
    sqlite3: 'commonjs sqlite3',
    ws: 'commonjs ws',
    multer: 'commonjs multer',
    fs: 'commonjs fs',
    path: 'commonjs path',
    http: 'commonjs http',
    crypto: 'commonjs crypto',
    events: 'commonjs events',
    stream: 'commonjs stream',
    util: 'commonjs util',
    zlib: 'commonjs zlib'
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};