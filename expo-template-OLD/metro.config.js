const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Explicitly disable Expo Router
  isCSSEnabled: false,
});

// Force traditional entry point (index.js), NOT Expo Router
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: false,
};

// Prevent Metro from detecting app/ as a router directory
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android'],
};

// Override server root detection
config.watchFolders = [__dirname];
config.projectRoot = __dirname;

module.exports = config;

