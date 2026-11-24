# 03: Sentry's user follows sign-in and sign-out, and 내 정보 has the switch

Parent: [P08 spec](../spec.md)
Status: done
Blocked by: 02

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
  (ticket 05 writes the part; until then the link opens the privacy policy).
- Off holds at once, not only from the next launch, since Sentry's own handlers and its session tracking are already
  running: `reportError` does nothing, `beforeSend` drops every event, and the layer closes Sentry's client (how
  8.36.0 closes and starts a client again is checked against its reference and written under Comments). At the next
  launch `startTelemetry()` starts nothing. A native crash kept from before is discarded, not sent. On again starts
  Sentry in that run.
- The mobile README's "Crash reports" says the above.

## Must not break

- Sign-in, sign-out and the session's end from the server's side.
- The other rows of 내 정보 and their order, apart from the new row's place, which follows the wireframe's grouping of
  settings.

## Acceptance criteria

- [x] Signing in sets the user to the User id and nothing else; a start with a kept session does the same; signing
      out, and a session ended by the server, clear it. (Integration tests.)
- [x] With the switch off, the test error and a thrown screen report nothing; the choice holds after a restart and
      after signing out and in. (Integration tests.)
- [x] Turned off while the app runs, an unhandled error (not one passed to `reportError`) is not sent in that same
      run: `beforeSend` answers nothing for it, and the client was closed. (Unit test on the layer with the SDK's
      fake.)
- [x] With the switch off at start, Sentry is not started. (Unit test.)
- [ ] The row, on and off, on a phone with the mock build; the screens go to the orchestrator before the pull request.
      (Emulator.)
- [x] Lint, format and types of the app pass. No native file changes: the fingerprint is as ticket 02 left it.

## Comments

### Built (2026-11-24)

- **What `@sentry/react-native` 8.36.0 does to close and start again** (read in `node_modules`, not run on a phone):
  - `Sentry.close()` takes the current client and calls its `close()`. The React Native client first runs the core
    client's `close()` (`@sentry/core` 10.78.0), which flushes what the transport already holds and sets the
    client's `enabled` to false, so its handlers' later events are dropped; it then calls the native module's
    `closeNativeSdk`, which is `Sentry.close()` on Android (with the frames tracking off) and `SentrySDK.close` on
    iOS: the native session and crash handling stop with it (inferred from the native SDKs, not checked on a
    device).
  - `Sentry.init` again works: it makes a new client, binds it to the scope, and its `_initNativeSdk` calls
    `initNativeSdk`, which sets the wrapper's `enableNative` back to true after the close had set it false. The
    global error handler and the promise-rejection handler are installed once (`setupOnce`) and look up the current
    client each time, so they report through the new client.
  - The layer waits for a close to end before it starts Sentry again, so that a native close that ended after a new
    start does not leave the native SDK closed.
- **A native crash kept from before cannot be discarded from JavaScript.** The native SDKs write a crash to their own
  cache (Android: `<cacheDir>/sentry`, iOS: SentryCrash's reports) and send it when they next start, without
  `beforeSend`. 8.36.0's native module has no call that empties that cache, `beforeSend` cannot be given to the
  native SDK from JavaScript (functions are stripped from the options it gets), and `maxCacheItems` would change the
  caching of every report. So the ticket's "a native crash kept from before is discarded" is not built. What holds
  instead: with the switch off the SDK is never started, so nothing is sent while it is off; a crash kept from a run
  when the switch was on, and not yet sent (the next start normally sends it at once), goes out when the switch is
  turned on again. **A difference from the spec, for the orchestrator to decide** (the README says it plainly).
- **The start waits for the choice, not the first screen.** `startTelemetry()` is still called at module scope in
  the root layout; it returns a promise and starts Sentry once the choice is read from AsyncStorage and is on. The
  first screen does not wait. In that moment (one storage read, while the splash and the fonts load) Sentry is not
  running: up to ten errors passed to `reportError` wait and are sent once the choice is read on, or dropped when it
  is off; the latest change of screen becomes the first breadcrumb; the User's id waits and is set when Sentry
  starts. An unhandled error or a native crash in that moment is not reported. Starting Sentry first and closing it
  if the choice was off was not chosen: the native SDK would send its kept crashes and a session before the close.
  A phone whose storage cannot be read sends nothing in that run.
- **Where the choice is kept:** `snunow.error-reports` in AsyncStorage (`src/storage/error-reports.ts`), a key of
  its own as the timetable-reading agreement has. Sign-out and the end of a Session do not clear the `Kept` record
  (they set `signedIn` false), and `clearKept`, which the development setting for the first state runs, removes only
  `snunow.kept`, so the choice holds through all three.
- **Where the User is known:** `identifyUser(myUserId())` in `src/auth/sign-in.ts` after both kinds of sign-in
  (the main server's, with the access token's subject, and the mock's) and in `readStart`
  (`src/session/start.ts`) once a kept Session is found, before the consent and the Lobby; `forgetUser()` in
  `signOut` and in `endSession` (`src/session/session-events.ts`), which a 401 from any request and the socket's
  `session-ended` both reach. A User id held while Sentry is not running is given to it when it starts.
- **`useSending()`** gives a boolean, on until the choice is read; the first listener has the phone read, so 내 정보
  shows the kept choice also where `startTelemetry` did not run (the tests' layout). `setSending` keeps the choice
  also in a build without a DSN, so the row works in the mock build.
- **The row** is a card of its own after 관정도서관 로그인 and before 로그아웃, with the other rows that set something
  on this phone (탭 안내 다시 보기, the library's login); the wireframe's `Profile` frame has no such row. Caption:
  "앱에 오류가 나면 그때까지 본 화면과 앱·휴대폰의 버전을 보내요. 이름과 위치는 보내지 않아요."; the link
  "개인정보 처리방침 보기" opens `/legal/privacy` until ticket 05 adds the part.
- **Tests:** `__tests__/telemetry/sending.unit.test.ts` (the switch at a start, turned while running, the user),
  `sentry-user.integration.test.tsx` (sign-in, kept Session, sign-out, Session ended by the server, against the fake
  main server) and `error-reports-switch.integration.test.tsx` (the row, the test error, a thrown screen, a restart,
  signing out and in). Ticket 02's tests changed only where `startTelemetry()` became a promise: they await it. The
  Sentry stand-in gained `setUser`.
- **The new integration tests are slow on this machine** (22 to 52 seconds each; the default timeout is 60). The test
  that signs out and in again has 120 seconds of its own.
- **Open:** the row on a phone with the mock build, and its screenshots.

### Agent usage (2026-11-24)

- Agent time: about 1 hour 45 minutes in one implementation session, an estimate; about 40 minutes of it waited on
  test runs, one of which ran the whole unit suite by mistake (`--selectProjects unit <file>` took the file as a
  project name).
- Tokens: to be filled in by the orchestrator, who has the session's usage.
