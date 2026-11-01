/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { clearLibraryLoggedIn, isLibraryLoggedIn } from './flag';
import { hiddenTransport } from './library';
import type { LibraryTransport } from './transport';
import { clearWebViewCookies } from './web-cookies';

// "End the library session", the one step that the 내 정보 row, `signOut()` and `endSession()` all call, so that the
// next person on the phone never sees the previous one's bookings. In order:
// 1. with the "logged in" flag set, the hidden view loads the site's logout URL (15 seconds at most; a failure does
//    not stop the rest). Without the flag there is no hidden view, no network call and no wait;
// 2. every web view cookie is cleared by the local module that can only clear (`modules/snu-now-web-cookies`), so the
//    session is gone from the jar even where the site's logout did not answer. App code never reads a cookie;
// 3. the flag is cleared, which unmounts the hidden view.
export async function endLibrarySession(transport: LibraryTransport = hiddenTransport): Promise<void> {
  if (await isLibraryLoggedIn()) {
    await transport.logout();
  }
  try {
    await clearWebViewCookies();
  } catch {
    // A jar that could not be cleared leaves the site's logout as the end of the session; the flag goes either way.
  }
  await clearLibraryLoggedIn();
}
