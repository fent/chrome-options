const path = require('path');

module.exports = {
  entry: {
    main: './src/chrome-options.js',
    styles: './src/chrome-options.css'
  },
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, './dist')
  },
  devtool: 'cheap-module-source-map',
  devServer: {
    contentBase: './dist',
    hot: true
  },
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
};
