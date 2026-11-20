// Metro must watch ../shared so the app can import the shared brand tokens
// (and, from phase 1, the shared booking domain) that live outside mobile/.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, "../shared")];

module.exports = config;
