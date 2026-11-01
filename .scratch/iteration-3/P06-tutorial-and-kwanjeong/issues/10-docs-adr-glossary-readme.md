# 10: Docs: ADR 0012, GLOSSARY and the README section

Parent: [P06 spec](../spec.md) ("Documentation")
Status: ready-for-agent
Blocked by: 04, 09

## What to build

The team can read why and how P6 keeps a third party's session on the phone, what the new words mean, and how the library client and the fake library are used, without opening the spec.

## Acceptance criteria

- [ ] `docs/adr/0012-…md`: a third party's session stays on the phone. It covers the web-view login, the session kept only in the web view's own cookie jar and never read by app code, logout, the app's sign-out and the forced session end (`endSession()`) ending it through one shared step (the site's logout URL when the flag is set, then `@react-native-cookies/cookies` `clearAll(true)`, since on iOS only `true` clears `WKWebsiteDataStore`, a module used only to clear), every library call made through a hidden same-origin web view (the fixed script, the message protocol and the allow-list), the app calling the library itself, the server holding none of it, and why a server-side proxy was rejected (the User's school credentials and session would sit on our server). It matches what ticket 04 built.
- [ ] `GLOSSARY.md` gains Tutorial (새내기 튜토리얼), Tutorial Quest (each with _Avoid: Quest_ for the other), Student Number (학번), Affiliation (소속), Library Space, Library Card and Booking Party, worded as the spec's "Words".
- [ ] The app README's P6 section lists the library client's endpoints (reads, the room form, writes, and that `setSeatReturn` is not used), the session-ended rule, logout (also on sign-out and on the forced session end, `endSession()`) and the lint rules that keep the cookie module to clearing, the fake library with its fixtures and how a test tells it to fail, and the privacy rule that library data never leaves the phone.
- [ ] Privacy: no example in the docs holds a real 학번, name, session or library reply.
- [ ] Docs only: no code or native file changes.
