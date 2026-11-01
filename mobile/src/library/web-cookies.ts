/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { requireOptionalNativeModule } from 'expo';

// The name the native module registers under: `modules/snu-now-web-cookies`. It can only clear the web views' cookie
// jar, where the library's session lives. It has no function that reads, lists or sets a cookie, so app code can never
// read the session: the session stays in the jar, for the web views alone.
export const WEB_COOKIES_MODULE = 'SnuNowWebCookies';

interface WebCookiesModule {
  clearWebViewCookies(): Promise<void>;
}

// Clears every cookie of every web view: on Android `CookieManager.removeAllCookies` and `flush`, on iOS the default
// `WKWebsiteDataStore`'s cookies and `HTTPCookieStorage`. A build without the module (Expo Go, the web, the tests) has
// no web view jar of its own to clear, so nothing happens there.
export async function clearWebViewCookies(): Promise<void> {
  const native = requireOptionalNativeModule<WebCookiesModule>(WEB_COOKIES_MODULE);
  if (native === null) {
    return;
  }
  await native.clearWebViewCookies();
}
