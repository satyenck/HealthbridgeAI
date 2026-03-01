const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.web.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    globalObject: 'this',
    clean: true,
  },
  target: 'web',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: [
          /node_modules\/(?!(@react-navigation|react-native-vector-icons|react-native-chart-kit|react-native-svg))/
        ],
        use: {
          loader: 'babel-loader',
          // Use babel.config.js settings (no options here)
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-vector-icons': 'react-native-vector-icons/dist',
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/mocks/asyncStorage.web.js'),
      'react-native-audio-recorder-player': path.resolve(__dirname, 'src/mocks/audioRecorder.web.js'),
      'react-native-document-picker': false,
      '@react-native-documents/picker': false,
      'react-native-image-picker': false,
      'react-native-blob-util': false,
      'react-native-fs': path.resolve(__dirname, 'src/mocks/fs.web.js'),
      'react-native-share': path.resolve(__dirname, 'src/mocks/share.web.js'),
      'react-native-tts': path.resolve(__dirname, 'src/mocks/tts.web.js'),
      'react-native-file-viewer': path.resolve(__dirname, 'src/mocks/fileViewer.web.js'),
      'react-native-agora': false,
      'react-native-safe-area-context': path.resolve(__dirname, 'src/mocks/safeAreaContext.web.js'),
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
    fullySpecified: false,
    mainFields: ['browser', 'module', 'main'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      inject: true,
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist'),
          globOptions: {
            ignore: ['**/index.html'], // Don't copy index.html since HtmlWebpackPlugin handles it
          },
        },
      ],
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],
};
