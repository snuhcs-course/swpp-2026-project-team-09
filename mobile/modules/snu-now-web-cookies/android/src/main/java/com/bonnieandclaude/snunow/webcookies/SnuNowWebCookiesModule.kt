/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

package com.bonnieandclaude.snunow.webcookies

import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The web views' cookie jar, under the name `src/library/web-cookies.ts` asks for. Its one function clears every
// cookie of every web view, at the library's logout. It can only clear: no function here reads, lists or sets a
// cookie, so that no app code can ever read the library's session (`JSESSIONID`), which lives only in this jar.
class SnuNowWebCookiesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SnuNowWebCookies")

    // Removes every cookie, session cookies too, and writes the jar to disk, so that a restart brings none back.
    // CookieManager wants a thread with a Looper; the main one has it.
    AsyncFunction("clearWebViewCookies") { promise: Promise ->
      Handler(Looper.getMainLooper()).post {
        try {
          val cookies = CookieManager.getInstance()
          cookies.removeAllCookies { _ ->
            cookies.flush()
            promise.resolve(null)
          }
        } catch (error: Throwable) {
          promise.reject("ERR_WEB_COOKIES", "The web views' cookies could not be cleared: ${error.message}", error)
        }
      }
    }
  }
}
