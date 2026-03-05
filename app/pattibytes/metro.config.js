// metro.config.js
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Exclude native-only packages from the web bundle
const nativeOnlyModules = new Set([
  '@maplibre/maplibre-react-native',
  'react-native-maps',
])

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web' && nativeOnlyModules.has(moduleName)) {
      // Return an empty shim so the web bundler doesn't choke
      return { type: 'empty' }
    }
    return context.resolveRequest(context, moduleName, platform)
  },
}

module.exports = config;
