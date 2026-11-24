# 02: Sentry's user follows sign-in and sign-out, and 내 정보 has the switch

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

Native files: none. Releases: an app over-the-air update.

## What happens now

- Sign-in and sign-out are in `mobile/src/auth/sign-in.ts` (`signOut` at :144). A session can also end from the
  server's side (another phone signs in).
- What the phone keeps is in `mobile/src/storage/kept.ts` (`Kept`, `keep`, `readKept`); it is cleared at sign-out.
- 내 정보's rows are in `mobile/src/screens/me/`.

## What to build

- `identifyUser(userId)` once the app knows the signed-in User (a fresh sign-in and a start with a kept session), and
  `forgetUser()` at sign-out and when the session ends from the server's side. The user holds the User id only.
- `setSending(on)` and `useSending()`. The choice is kept on the phone apart from what sign-out clears, so that it
  holds before sign-in and across accounts. It is on when nothing is kept.
- A row in 내 정보, "오류 보고 보내기", a switch with a caption saying what an error report holds (the screen it
  happened on, the app's and the phone's version, no name and no position) and a link to the privacy policy's part
  (ticket 04 writes the part; until then the link opens the privacy policy).
- Off: `reportError` does nothing at once, and `startTelemetry()` starts nothing at the next launch. A native crash
  kept from before is discarded when the app next starts with the switch off.
- The mobile README's "Crash reports" says the above.

## Must not break

- Sign-in, sign-out and the session's end from the server's side.
- The other rows of 내 정보 and their order, apart from the new row's place, which follows the wireframe's grouping of
  settings.

## Acceptance criteria

- [ ] Signing in sets the user to the User id and nothing else; a start with a kept session does the same; signing
      out, and a session ended by the server, clear it. (Integration tests.)
- [ ] With the switch off, the test error and a thrown screen report nothing; the choice holds after a restart and
      after signing out and in. (Integration tests.)
- [ ] With the switch off at start, Sentry is not started. (Unit test.)
- [ ] The row, on and off, on a phone with the mock build; the screens go to the orchestrator before the pull request.
      (Emulator.)
- [ ] Lint, format and types of the app pass. No native file changes: the fingerprint is as ticket 01 left it.

## Comments
