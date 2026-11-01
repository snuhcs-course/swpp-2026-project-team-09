/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import ExpoModulesCore
import Foundation
import WebKit

// The web views' cookie jar, under the name `src/library/web-cookies.ts` asks for. Its one function clears every
// cookie of every web view, at the library's logout. It can only clear: no function here reads, lists or sets a
// cookie, so that no app code can ever read the library's session (`JSESSIONID`). Not yet built: the first build is
// on a Mac.
public class SnuNowWebCookiesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SnuNowWebCookies")

    // The web views keep their cookies in the default WKWebsiteDataStore; HTTPCookieStorage is cleared as well, for
    // anything the app's own networking may have stored. WebKit wants the main thread.
    AsyncFunction("clearWebViewCookies") { (promise: Promise) in
      DispatchQueue.main.async {
        HTTPCookieStorage.shared.removeCookies(since: .distantPast)
        WKWebsiteDataStore.default().removeData(
          ofTypes: [WKWebsiteDataTypeCookies],
          modifiedSince: .distantPast
        ) {
          promise.resolve(nil)
        }
      }
    }
  }
}
