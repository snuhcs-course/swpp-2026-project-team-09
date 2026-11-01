# 04: Library session (native): login, SecureStore, library client and the fake library

Parent: [P06 spec](../spec.md) ("The library session (device only)")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User logs in to 관정도서관 once, in a full-screen web view showing the school's own login page, and SNU Now keeps the library session on the phone only. One library client in `mobile/src/library/` makes every library call from the phone, notices when the school's session has ended, asks the User to log in again and retries the pressed action once. 내 정보 has a "관정도서관 로그인" row with 로그아웃. CI tests every library call against a fake library that serves the recorded responses and records each request, so no test ever reaches the real site.

**This is the only native change in P6.** It adds `react-native-webview` and `@react-native-cookies/cookies`, raises `version` in `app.json`, and makes a native Release by P03's flow (`infra/production/README.md` § The Production APK, `app-version.json`). This Release can be the same one as P03 ticket 05's 1.0.1 verification release: one native build checks both.

Tickets 05, 08 and 09 build on the client's interface and the fake library, so the client's functions and the fake library's API land in this ticket even before the native Release.

## Acceptance criteria

- [ ] `react-native-webview` and `@react-native-cookies/cookies` are added, and `version` is raised in `app.json` in the same change (CLAUDE.md § The app's native files). The app-fingerprint CI job reports the raised version. No other native file changes.
- [ ] If the cookie module cannot be built, work stops and the owner is asked before the hidden-web-view fallback is used (spec "Native modules").
- [ ] Login: the web view loads `https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main`. When the URL is back on `k-rsv.snu.ac.kr` at `/pc/(main|booking|mybooking)`, the app reads `JSESSIONID` through the cookie module, stores it with the web view's user agent in SecureStore (`kwanjeong.session`), clears the web view's cookies and closes. No script is injected into any login page. After 5 minutes the view closes with "로그인하지 못했어요". Cancelling returns "no session" to the caller.
- [ ] The client sends every request as the spec's "Calls" section fixes: `POST …/json/<name>` form-encoded with `Cookie`, `X-Requested-With`, `OS_KIND: WEB`, `Origin`, `Referer` and the saved user agent. It offers the reads (`getSectorList`, `getRoomList`, `getSeatBookingList`, `getSeatInfoFromList`, `getUserCheck`, `getMyBookingList`), the room form read (`tmpUserNames`, `tmpSchoolNos`, `.phoneNum`, `.eMail`) and the writes (`setRoomBooking`, `setCancelBooking`). `setSeatReturn` is not offered.
- [ ] HTTP 999, a redirect or a non-JSON reply clears SecureStore and raises a "session ended" error the cards show as "관정도서관 로그인이 끝났어요. 다시 로그인해 주세요." with 로그인; after the login the action is retried once.
- [ ] A helper builds the seat-map image URL `https://k-rsv.snu.ac.kr:444/MAP/WEB/area_<sectorNo>.png?version=20261022`, loaded with no cookie.
- [ ] The 내 정보 row "관정도서관 로그인" shows 로그아웃 while a session exists; logout deletes the SecureStore entry and the cookies.
- [ ] The fake library: the redacted responses of `references/kwanjeong-fixtures` are copied to `mobile/__tests__/support/kwanjeong/`, and a `fetch` stand-in serves them by endpoint and parameters and records every request (method, endpoint, form fields, headers). It can be told to answer 999, a redirect, a network error, `bookingFailInfo` or a taken seat.
- [ ] Privacy: the session, the user agent, any library reply, phone, email and BSEQNO are never sent to our servers; the app's error reporting and logs drop library request and response bodies (checked in a test that fails a library call and inspects what reaches the reporter).
- [ ] Tests, named by ADR 0007:
  - unit: the session-ended detection; the headers and form encoding; the room form parse;
  - integration: the client against the fake library for each read and write; session ended and the retry after login; logout clearing the store; the login screen's URL rule with the web view stubbed.
- [ ] **Person**, on a real device against the real site after the native Release: one login, one seat booking made with the client and its return, recorded with screenshots in the PR. This is the spec's only hand check of the web-view login.
- [ ] The native Release is made by P03's flow: `version` raised, the APK built (in CI after P03 ticket 05), `app-version.json` replaced, and a 1.0.0 phone shown 업데이트가 필요합니다.
