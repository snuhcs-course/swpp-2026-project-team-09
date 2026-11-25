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
import { keepErrorReports, readErrorReports } from '@/storage/error-reports';
import { scrubBreadcrumb, scrubEvent } from './scrub';

// The one place that starts Sentry and hands it reports (README.md, "Crash reports"). Nothing here runs before
// `startTelemetry`, and nothing at all in a build without `EXPO_PUBLIC_SENTRY_DSN`. Sentry starts only once the
// phone's choice in 내 정보 ("오류 보고 보내기") is read and is on, and it is closed again the moment it is turned off.

// Where a handled error was reported from, a closed list: `screen` for a screen that failed to draw
// (`TelemetryBoundary`), `test-error` for the test error on 내 정보's build line.
export type Where = 'screen' | 'test-error';

type Options = Sentry.ReactNativeOptions;
type BeforeSend = NonNullable<Options['beforeSend']>;

// Handled errors reported while the phone's choice is still being read, at most this many: they are sent once it is
// read and on, and dropped when it is off.
const WAITING_LIMIT = 10;

// The build's DSN once `startTelemetry` ran with one; null before, and always in a build without it.
let buildDsn: string | null = null;
let starting: Promise<void> | null = null;
// Sentry's client was started and not closed since.
let running = false;
// The phone's choice: null until it is read (or set).
let choice: boolean | null = null;
let reading: Promise<boolean> | null = null;
// The signed-in User's id, which Sentry's user is set to whenever it runs.
let userId: string | null = null;
// The latest change of screen before Sentry ran, left as its first breadcrumb.
let lastRoute: string | null = null;
const waiting: [error: unknown, where: Where][] = [];
const listeners = new Set<() => void>();
// Starting and closing Sentry wait for each other: a close of the native SDK that ended after a new start would leave
// it closed.
let lastChange: Promise<void> = Promise.resolve();

// Whether a report may leave the phone now: the switch is on. Off, `reportError` does nothing and `beforeSend` drops
// every event, an unhandled error among them, from the moment it is turned off.
function maySend(): boolean {
  return choice === true;
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

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

// The phone's choice, read once. A phone that could not be read sends nothing in this run and keeps what it had.
function readChoice(): Promise<boolean> {
  reading ??= readErrorReports()
    .catch(() => false)
    .then((on) => {
      // A choice made while the phone was being read is the newer one.
      choice ??= on;
      notify();
      return choice;
    });
  return reading;
}

function startSentry(started: string): void {
  Sentry.init(options(started));
  running = true;
  if (userId !== null) {
    Sentry.setUser({ id: userId });
  }
  if (lastRoute !== null) {
    noteRoute(lastRoute);
  }
  for (const [error, where] of waiting.splice(0)) {
    reportError(error, where);
  }
}

// Brings Sentry in line with the choice: started while it is on, closed while it is off. Closing flushes what Sentry
// already holds and stops its handlers' sending, the session's updates and the native SDK (`Sentry.close()` in
// 8.36.0: the client's `close`, then the native SDK's). A later `Sentry.init` starts a new client and the native SDK
// again.
function follow(): Promise<void> {
  lastChange = lastChange
    .then(async () => {
      const started = buildDsn;
      if (started === null || choice === null) {
        return;
      }
      if (choice && !running) {
        startSentry(started);
      } else if (!choice) {
        waiting.length = 0;
        if (running) {
          running = false;
          await Sentry.close();
        }
      }
    })
    .catch(() => {
      // Sentry's own failures stay inside it.
    });
  return lastChange;
}

// Starts Sentry, once, before the first screen, as soon as the phone's choice is read and only while it is on. The
// first screen does not wait for it. Without `EXPO_PUBLIC_SENTRY_DSN` it starts nothing: tests, a local build, the mock
// APK, and the Dev Server's and a UAT's APK report nothing.
export function startTelemetry(): Promise<void> {
  if (starting !== null) {
    return starting;
  }
  const given = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
  if (given === '') {
    starting = Promise.resolve();
    return starting;
  }
  buildDsn = given;
  starting = readChoice().then(follow);
  return starting;
}

// Reports an error the app caught. A refusal of the main server is never reported. One reported before the phone's
// choice is read waits for it.
export function reportError(error: unknown, where: Where): void {
  if (buildDsn === null || isServerRefusal(error)) {
    return;
  }
  if (choice === null) {
    if (waiting.length < WAITING_LIMIT) {
      waiting.push([error, where]);
    }
    return;
  }
  if (!running || !maySend()) {
    return;
  }
  Sentry.captureException(error, { tags: { where } });
}

// Leaves a breadcrumb for a change of screen. `route` is the route's pattern, never the values in it.
export function noteRoute(route: string): void {
  if (!running) {
    lastRoute = buildDsn === null ? null : route;
    return;
  }
  Sentry.addBreadcrumb({ type: 'navigation', category: 'navigation', message: route, level: 'info' });
}

// Sentry's user is the signed-in User's id and nothing else: at a sign-in, and at a start with a kept Session.
export function identifyUser(id: string): void {
  if (id === '') {
    forgetUser();
    return;
  }
  userId = id;
  if (running) {
    Sentry.setUser({ id });
  }
}

// At a sign-out, and when the Session ends from the main server's side.
export function forgetUser(): void {
  userId = null;
  if (running) {
    Sentry.setUser(null);
  }
}

// The switch "오류 보고 보내기". Off holds at once: nothing is reported or sent from this moment, and Sentry is closed.
// On starts Sentry in this run. The choice is kept on the phone for the next start, also in a build without a DSN.
export async function setSending(on: boolean): Promise<void> {
  choice = on;
  reading ??= Promise.resolve(on);
  notify();
  await Promise.all([follow(), keepErrorReports(on)]);
}

// For `useSending`: the choice as it is now (on while it is not read yet), and a way to hear of its changes. The
// first to listen has the phone read, so that 내 정보 shows the kept choice also before `startTelemetry`.
export function sendingNow(): boolean {
  return choice ?? true;
}

export function listenToSending(listener: () => void): () => void {
  listeners.add(listener);
  void readChoice();
  return () => {
    listeners.delete(listener);
  };
}
