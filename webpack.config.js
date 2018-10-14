const path = require('path');

module.exports = (env, argv) => ({
  entry: {
    main: './src/js/chrome-options.js',
    styles: './src/css/chrome-options.css'
  },
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, './dist')
  },
  devtool: `${argv.mode === 'production' ? '' : 'inline-'}source-map`,
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=10000'
      },
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/,
        loader: 'file-loader?limit=10000'
      }
    ]
  }
});
