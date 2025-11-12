const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// FORCE disable Expo Router - we use custom entry point (index.js -> App.js)
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: false,
};

// Explicitly set resolver to ignore app/ directory for routing
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android'],
  // Blacklist the app directory to prevent Expo Router detection
  blockList: [/.*\/app\/.*/],
};

// Override any Expo Router auto-detection - keep server config minimal
// config.server is no longer needed in newer Metro versions

module.exports = config;

