# 10: Docs: ADR 0012, GLOSSARY and the README section

Parent: [P06 spec](../spec.md) ("Documentation")
Status: ready-for-human
Blocked by: 04, 09

## What to build

The team can read why and how P6 keeps a third party's session on the phone, what the new words mean, and how the library client and the fake library are used, without opening the spec.

## Acceptance criteria

- [x] `docs/adr/0012-…md`: a third party's session stays on the phone. It covers the web-view login, the session kept only in the web view's own cookie jar and never read by app code, logout, the app's sign-out and the forced session end (`endSession()`) ending it through one shared step (the site's logout URL when the flag is set, then a local Expo module that only clears cookies, `mobile/modules/snu-now-web-cookies`: `CookieManager.removeAllCookies` and `flush()` on Android, `WKWebsiteDataStore` and `HTTPCookieStorage` on iOS, with no function that reads a cookie; `@react-native-cookies/cookies` was rejected because 6.2.1 does not build under Gradle 9.3.1), every library call made through a hidden same-origin web view (the fixed script, the message protocol and the allow-list), the app calling the library itself, the server holding none of it, and why a server-side proxy was rejected (the User's school credentials and session would sit on our server). It matches what ticket 04 built.
- [x] `GLOSSARY.md` gains Tutorial (새내기 튜토리얼), Tutorial Quest (each with _Avoid: Quest_ for the other), Student Number (학번), Affiliation (소속), Library Space, Library Card and Booking Party, worded as the spec's "Words".
- [x] The app README's P6 section lists the library client's endpoints (reads, the room form, writes, and that `setSeatReturn` is not used), the session-ended rule, logout (also on sign-out and on the forced session end, `endSession()`) the local module that only clears cookies and the lint rule that keeps its wrapper to the logout file, the fake library with its fixtures and how a test tells it to fail, and the privacy rule that library data never leaves the phone.
- [x] Privacy: no example in the docs holds a real 학번, name, session or library reply.
- [x] Docs only: no code or native file changes.

## Comments

### Notes (2026-11-02)

- ADR 0012 is `docs/adr/0012-a-third-partys-session-stays-on-the-phone.md`. The GLOSSARY also gains **Library Session** (to keep it apart from **Session**) and **Room Request**, both in the spec's "Words". The app README's section is "관정도서관 (P06)", at its end.
- Where the docs follow the code rather than the spec: the room request endpoints are in main-server `src/library/` (not `src/assistant/library/`) and include `GET /library/room-requests`, `POST …/:id/consent`, `POST …/:id/decline` and `POST /library/room-notices/:id/seen`, which the spec does not list; the client has a fourth failure kind, `noSession` (no flag, no call made); the room form page without the applicant's fields counts as `sessionEnded`; the lint rule also lets `__tests__/` import the cookie wrapper; the logout URL is `SSOService.do?pname=spLogout`, which also ends the school's single sign-on in the web views; seats and rooms are both booked with `setRoomBooking`.
