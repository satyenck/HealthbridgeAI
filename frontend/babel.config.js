module.exports = function(api) {
  // Check if we're building for web (via webpack babel-loader)
  const isWeb = api.caller(caller => caller && caller.name === 'babel-loader');

  api.cache.using(() => isWeb);

  if (isWeb) {
    // Web-specific babel config - DON'T transform modules, let webpack handle them
    return {
      presets: [
        ['@babel/preset-env', {
          modules: false, // Let webpack handle module system
        }],
        ['@babel/preset-react', {runtime: 'automatic'}],
        '@babel/preset-typescript',
      ],
      plugins: [
        'react-native-web',
      ],
    };
  }

  // React Native mobile config
  return {
    presets: ['module:@react-native/babel-preset'],
  };
};
