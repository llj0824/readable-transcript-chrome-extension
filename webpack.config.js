const path = require('path');

module.exports = {
  entry: {
    background: './src/background.js', // Entry point for the service worker
    popup: './src/popup/popup.js',      // Entry point for the popup script
    content: './src/content/content.js', // Entry point for content scripts (if any)
  },
  output: {
    filename: '[name].bundle.js', // Outputs: background.bundle.js, popup.bundle.js, content.bundle.js
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production', // or 'development' based on your needs
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
      // Add loaders for other file types (e.g., CSS) if needed
    ],
  },
  // Optional: Configure source maps for easier debugging
  devtool: 'source-map',
};

