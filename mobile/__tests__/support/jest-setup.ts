/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as WebViewStub from './web-view';

// Every test runs with the web view stand-in (`web-view.tsx`): the app's root mounts the library session's views, and
// the real `react-native-webview` needs its native module, which no test has.
jest.mock('react-native-webview', () => jest.requireActual<typeof WebViewStub>('./web-view').webViewModule);
