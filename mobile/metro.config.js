/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Expo's Metro configuration with Sentry's: each bundle and its source map get the same Debug ID, so that a crash
// report's stack is read against the source map of the bundle it came from (README.md, "Crash reports").
//
// The app's type check covers its TypeScript files alone, so the linter knows neither `require` nor `__dirname` here.
// oxlint-disable-next-line typescript/no-unsafe-call -- untyped in this file, as above
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-argument -- untyped in this file, as above
module.exports = getSentryExpoConfig(__dirname);
