/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { ApiError } from '@/api/errors';
import { scrubBreadcrumb, scrubEvent } from './scrub';

// The one place that starts Sentry and hands it reports (README.md, "Crash reports"). Nothing here runs before
// `startTelemetry`, and nothing at all in a build without `EXPO_PUBLIC_SENTRY_DSN`.

// Where a handled error was reported from, a closed list: `screen` for a screen that failed to draw
// (`TelemetryBoundary`), `test-error` for the test error on 내 정보's build line.
export type Where = 'screen' | 'test-error';

type Options = Sentry.ReactNativeOptions;
type BeforeSend = NonNullable<Options['beforeSend']>;

let started = false;

// Whether a report may leave the phone now. Always for now; the switch in 내 정보 (P08 ticket 02) answers here.
function maySend(): boolean {
  return true;
}

// A refusal the main server answers on purpose, a 4xx with its own code such as 404 NOT_IN_PARTY, is not an error of
// the app. A 4xx without a code is: a body the app sent wrong, or a proxy's 413 or 429.
function isServerRefusal(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 && error.code !== null;
}

// What `beforeSend` does with a report of an error that nothing caught, or of one handed to `reportError`.
const beforeSend: BeforeSend = (event, hint) => {
  if (!maySend() || isServerRefusal(hint.originalException)) {
    return null;
  }
  return scrubEvent(event);
};

function tag(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? 'none' : trimmed;
}

// The tags every report carries: the Release the JavaScript came from, the over-the-air update and the runtime version
// it runs on, the native build's version and the platform. Each variable is read by its full name, because the
// bundler replaces only those.
function tags(): Record<string, string> {
  return {
    release_tag: tag(process.env.EXPO_PUBLIC_RELEASE_TAG),
    release_commit: tag(process.env.EXPO_PUBLIC_RELEASE_COMMIT),
    ota_update_id: tag(Updates.updateId),
    runtime_version: tag(Updates.runtimeVersion),
    app_version: tag(Constants.expoConfig?.version),
    platform: Platform.OS,
  };
}

// Sentry's options, each checked against @sentry/react-native 8.36.0's own reference. Tracing, profiling and session
// replay stay off by leaving their sample rates unset: a number, even 0, would add their integrations.
function options(dsn: string): Options {
  return {
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    // `release` and `dist` are left to the SDK, which takes them from the native build, as Sentry's Expo guide has it.
    enableNative: true,
    // Native crashes, and on Android the ANR, which the Android SDK detects by default and has no option here.
    enableNativeCrashHandling: true,
    // iOS app hangs.
    enableAppHangTracking: true,
    // Release health: crash-free sessions and Users.
    enableAutoSessionTracking: true,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableLogs: false,
    enableCaptureFailedRequests: false,
    // The native SDKs' own breadcrumbs never pass `beforeBreadcrumb`: iOS records each request with its whole URL, and
    // both record touches. The JavaScript records the app's requests, which are scrubbed.
    enableNetworkBreadcrumbs: false,
    enableAutoBreadcrumbTracking: false,
    enableUserInteractionBreadcrumbs: false,
    initialScope: { tags: tags() },
    beforeSend,
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
}

// Starts Sentry, once, before the first screen. Without `EXPO_PUBLIC_SENTRY_DSN` it starts nothing: tests, a local
// build, the mock APK, and the Dev Server's and a UAT's APK report nothing.
export function startTelemetry(): void {
  if (started) {
    return;
  }
  const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
  if (dsn === '') {
    return;
  }
  Sentry.init(options(dsn));
  started = true;
}

// Reports an error the app caught. A refusal of the main server is never reported.
export function reportError(error: unknown, where: Where): void {
  if (!started || !maySend() || isServerRefusal(error)) {
    return;
  }
  Sentry.captureException(error, { tags: { where } });
}

// Leaves a breadcrumb for a change of screen. `route` is the route's pattern, never the values in it.
export function noteRoute(route: string): void {
  if (!started) {
    return;
  }
  Sentry.addBreadcrumb({ type: 'navigation', category: 'navigation', message: route, level: 'info' });
}
