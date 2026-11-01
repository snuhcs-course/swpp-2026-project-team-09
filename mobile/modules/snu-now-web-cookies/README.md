# snu-now-web-cookies

A local Expo module that only clears cookies. Its one function, `clearWebViewCookies()`, empties the web views'
cookie jar, where 관정도서관's session (`JSESSIONID`) lives, when the library session ends (P06 ticket 04).
`src/library/web-cookies.ts` is its JS wrapper, and `src/library/end-session.ts` is the one file that calls it.

| Platform | What it clears                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| Android  | `android.webkit.CookieManager.getInstance().removeAllCookies(…)`, then `flush()`, on the main thread           |
| iOS      | `WKWebsiteDataStore.default()`'s `WKWebsiteDataTypeCookies` and `HTTPCookieStorage.shared`, on the main thread |

It has no function that reads, lists or sets a cookie, on purpose: app code must never read the library's session,
and a module that cannot read one keeps that true without a lint rule on its calls.

`@react-native-cookies/cookies` was the first choice. Its last release, 6.2.1 (2022-05), does not build under Gradle
9.3.1 (`jcenter()` in its `build.gradle`), so the owner chose this module on 2026-11-01.

## Building

Android builds with the app (`pnpm android`). iOS has not been built yet: the first build is on a Mac. The JS wrapper
has a unit test with the native module stood in for; the native side is checked on phones (ticket 04's hand check).
