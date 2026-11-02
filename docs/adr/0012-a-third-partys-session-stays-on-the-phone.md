---
status: accepted
---

# A third party's session stays on the phone

관정도서관 booking (P06) acts in the library's booking site, `k-rsv.snu.ac.kr`, as the User: it reads the User's seats, rooms and bookings and books, cancels and returns. The site knows the User only by its session cookie, `JSESSIONID`, which it sets after the school's own login. We keep that session on the phone, inside the web views, where no app code can read it, and the app calls the library itself. Our servers and the model hold none of it.

**The login** is the site's own page in a full-screen, visible web view that opens `…/NEW_SNU_BOOKING/pc/main`, which sends the User to the school's login. No script is injected into any of its pages, so the app never sees the password. The login is done when the view is back on the site at `/pc/main`, `/pc/booking` or `/pc/mybooking` and one read through the hidden view (the User's own bookings for today) answers with the site's JSON, since the site may show `/pc/main` before it sends the User to the school's login. It has five minutes, and ✕ is "no session".

**The session** stays in the web views' own cookie jar. Both web views use the default, persistent store (not `incognito`), so they share it. App code never reads, copies or stores the cookie: not in SecureStore, not in JS memory, not in a log. The app keeps only a "logged in" flag (`kwanjeong.loggedIn` in AsyncStorage), which holds nothing from the site.

**Every library call**, reads and writes, runs in one hidden web view on the site's own origin. The view has no size, is mounted at the app's root while the flag is set, and opens `…/pc/main`. For each call the app injects one fixed script, a constant in `mobile/src/library/call-script.ts`, whose only argument is the request written by `JSON.stringify`, so no script text is ever built from the User's words or a reply. The script makes the site's form POST with `fetch` on the same origin, so the browser adds the cookie itself, and posts back only the parsed JSON or an error kind, never the raw text, the headers or a cookie. The protocol is `{ id, endpoint, body }` in and `{ id, ok: true, result }` or `{ id, ok: false, error }` out, with `error` one of `sessionEnded`, `network` and `notAllowed`. The app takes a reply only for an `id` it is waiting for and from a page of the site. The script and the client hold the same allow-list (six reads, the room form page, and the writes `setRoomBooking` and `setCancelBooking`) and refuse anything else, and the client sends a write only with a card's confirm press. HTTP 999, a redirect, or a reply that is not JSON means the session ended: the client clears the flag and the card asks the User to log in again.

**The end of the library session** is one step, `endLibrarySession()` in `mobile/src/library/end-session.ts`, and three paths take it: the 내 정보 row's 로그아웃, the app's `signOut()`, and the forced end of the app's session, `endSession()` (a refused token, or the Session replaced on another phone), which does not go through `signOut()`. The two sign-outs take it whether or not the flag is set and do not wait for it. In order:

1. with the flag set, the hidden view loads the site's logout URL, for 15 seconds at most; a failure does not stop the rest. Without the flag there is no view, no network call and no wait;
2. every web-view cookie is cleared by `mobile/modules/snu-now-web-cookies`, a local Expo module that only clears cookies. Its one function, `clearWebViewCookies()`, calls `CookieManager.removeAllCookies` and then `flush()` on Android, and on iOS removes the default `WKWebsiteDataStore`'s cookies, where the web views keep theirs, and those of `HTTPCookieStorage`. It has no function that reads, lists or sets a cookie, so no app code can read the session through it. A lint rule keeps its JS wrapper to `end-session.ts`;
3. the flag is cleared, which unmounts the hidden view.

The cookies and the flag are cleared even when the logout or the phone's storage fails. After a sign-out and a sign-in with another account, the previous person's bookings cannot be read, and the next login asks for the password again.

## Considered Options

- **A server-side proxy**, where our server logs in to the site and calls it for the User. The User's school credentials, or at least the session they open, would sit on our server, together with every booking the site returns. Leaking them would let someone else act as the User in the school's systems, and the school's credentials are not ours to hold. Our server would also call the site for every User from one address. On the phone, the User types the password into the school's own page and the session never leaves the phone.
- **Reading the cookie out of the web view** and calling the site with the app's own `fetch`. App code would then hold the session, and one mistake would put it in SecureStore, a log or an error report. Calls made from the site's own origin need no copy of it.
- **`@react-native-cookies/cookies`** for clearing the jar. It was the first choice, but its last release, 6.2.1 (2022-05), does not build under Gradle 9.3.1 (it asks for `jcenter()`), and it can read every cookie, which the local module cannot. The owner chose the local module on 2026-11-01.
- **Only the site's logout URL**, with no clearing. A logout that does not load (no network, the site down) would leave the session in the jar for the next person on the phone.

## Consequences

- `react-native-webview` and the local module are a native change: they raised `version` to 1.0.1 and need a native Release by P03's flow. A 1.0.0 app does not send `clientCapabilities: ['library']`, and the server gives it no library cards.
- The server cannot check what the library did. A group-study-room booking is told to the server by the booker's phone, as "ok" or "failed" with no library data, and a booking cancelled outside the app (the library's own app, a kiosk) is never seen.
- The server sends a companion's 학번 and registered name only to the booker's phone, after that companion consents, so that the phone can name them in the booking. It is the one way library data of a person other than the User reaches a phone.
- The app depends on the site's pages and JSON as they were read on 2026-11-01. A changed page or field breaks the client, which reads the reply it cannot understand as `network`. The tests run against a fake library made from the recorded, redacted replies, so they do not show such a change; only a check on a phone against the real site does.
- The site's logout URL (`SSOService.do?pname=spLogout`) also ends the school's single sign-on in the web views.
- The iOS side of the module has not been built yet; the first build is on a Mac.
