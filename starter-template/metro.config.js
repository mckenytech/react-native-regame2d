const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves from the project directory
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

module.exports = config;


