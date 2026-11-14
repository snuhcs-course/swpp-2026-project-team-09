/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as PushDevice from '@/push/device';
import type * as WebViewStub from './web-view';

// Every test runs with the web view stand-in (`web-view.tsx`): the app's root mounts the library session's views, and
// the real `react-native-webview` needs its native module, which no test has.
jest.mock('react-native-webview', () => jest.requireActual<typeof WebViewStub>('./web-view').webViewModule);

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
  unregisterPush: () => Promise.resolve(),
}));
