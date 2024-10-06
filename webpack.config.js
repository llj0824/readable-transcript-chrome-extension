const path = require('path');

module.exports = {
  entry: './src/index.js', // Ensure this path is correct
  output: {
    filename: 'bundle.js', // Ensure this is set to 'bundle.js'
    path: path.resolve(__dirname, 'dist'), // Ensure this path is correct
  },
  mode: 'production', // or 'production'
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};

