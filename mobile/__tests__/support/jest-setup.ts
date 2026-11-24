/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Dimensions } from 'react-native';
import type * as PushDevice from '@/push/device';
import type * as Worklets from 'react-native-worklets';
import type * as SentryStandIn from './sentry';
import type * as WebViewStub from './web-view';

// Every test runs with the Sentry stand-in (`sentry.ts`), which records the telemetry layer's calls and sends nothing.
jest.mock('@sentry/react-native', () => jest.requireActual<typeof SentryStandIn>('./sentry').sentryModule());

// Every test runs with the web view stand-in (`web-view.tsx`): the app's root mounts the library session's views, and
// the real `react-native-webview` needs its native module, which no test has.
jest.mock('react-native-webview', () => jest.requireActual<typeof WebViewStub>('./web-view').webViewModule);

// A gesture's worklet hands its result to React by Worklets' `scheduleOnRN`, a microtask in the JS build the tests run
// (`worklets-resolver.js`), which the fake timers hold back. In the tests it calls through at once, as the gesture's
// callbacks run on the JS thread anyway.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual<typeof Worklets>('react-native-worklets'),
  scheduleOnRN: (run: (...args: unknown[]) => unknown, ...args: unknown[]): void => {
    run(...args);
  },
}));

function mockStopNothing(): void {
  // Nothing was subscribed.
}

// Every test runs with push unavailable: the jest-expo preset answers `requireOptionalNativeModule` with stand-ins for
// the notifications modules, so the real wrapper would look present. A push test opts in with
// `jest.mock('@/push/device', () => jest.requireActual('@/push/device'))` and mocks `expo-notifications` itself.
jest.mock('@/push/device', (): typeof PushDevice => ({
  CHANNEL_ID: 'default',
  pushAvailable: () => false,
  pushPermission: () => Promise.resolve('unavailable'),
  askPushPermission: () => Promise.resolve('unavailable'),
  expoPushToken: () => Promise.resolve(null),
  onPushTokenChange: () => mockStopNothing,
  unregisterPush: () => Promise.resolve(true),
  lastPushTap: () => null,
  clearLastPushTap: mockStopNothing,
  onPushTap: () => mockStopNothing,
  onPushArrival: () => mockStopNothing,
  quietPushesInFront: mockStopNothing,
}));

// Every test runs at the usual font size, as a phone does by default: the React Native preset's window says 2, and the
// answer's labels are placed at the window's font scale (P04 ticket 51).
Dimensions.set({
  window: { ...Dimensions.get('window'), fontScale: 1 },
  screen: { ...Dimensions.get('screen'), fontScale: 1 },
});
