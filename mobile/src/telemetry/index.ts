/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The app's crash reports (README.md, "Crash reports") and usage data ("Usage data"). This folder is the only one
// that imports `@sentry/react-native` and `posthog-react-native`; app code calls what is exported here.
export type * from './events';
export { scrubbedRoute, serverCode } from './events';
export { RouteBreadcrumb } from './route-breadcrumb';
export { reportError, setSending, startTelemetry, type Where } from './sentry';
export { allowUsage, track } from './usage';
export { forgetUser, identifyUser } from './user';
export { useSending } from './sending';
export { TelemetryBoundary } from './telemetry-boundary';
