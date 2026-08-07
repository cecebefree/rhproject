const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Watch the pnpm store so Metro can compute SHA-1 for symlinked files
const pnpmStorePath = path.resolve(__dirname, '../../node_modules/.pnpm');
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../../node_modules'),
  pnpmStorePath,
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  } catch (e) {
    try {
      const resolved = require.resolve(moduleName, { paths: [__dirname] });
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return { filePath: resolved, type: 'sourceFile' };
      }
    } catch (e2) {
      // ignore
    }
    throw e;
  }
};

module.exports = config;
