/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Jest's resolver for the app's tests: Reanimated and Worklets run their JS builds, not the `.native` ones, which need
// the native module. Worklets' own resolver (`react-native-worklets/jest/resolver`) matches any path that names the
// package, and under pnpm that includes every package with Worklets as a peer (expo-modules-core among them), whose
// `.native` files the tests need. This one matches the two packages' own folders and requests alone.
const OWN = ['/node_modules/react-native-worklets/', '/node_modules/react-native-reanimated/'];

/**
 * @typedef {{ basedir: string, extensions?: string[], defaultResolver: (request: string, options: object) => string }} Options
 * @param {string} request
 * @param {Options} options
 * @returns {string}
 */
module.exports = (request, options) => {
  const own =
    request.startsWith('react-native-worklets') ||
    request.startsWith('react-native-reanimated') ||
    OWN.some((folder) => options.basedir.includes(folder));
  const resolved = own
    ? { ...options, extensions: options.extensions?.filter((extension) => !extension.includes('native')) }
    : options;
  return options.defaultResolver(request, resolved);
};
