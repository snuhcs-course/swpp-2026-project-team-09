# P08: The app reports its crashes to Sentry

Status: ready-for-agent

## Problem Statement

Nobody on the team learns that the app crashed on a tester's phone. The app has no crash reporting, no handler for
unhandled errors and no error boundary: a screen that fails to draw stays white, a native crash closes the app, and
neither leaves a trace. The main server's warnings and errors reach Slack since A02, but that is the server only. The
beta test (2026-11-25 to 2026-12-02) is where real phones meet the app, and the course asks for crash reporting
verified before it, with no personal data in it.

## Solution

The app reports to Sentry: unhandled JavaScript errors, native crashes on Android and iOS, Android's ANR and iOS app
hangs, each with a readable stack, the Release and over-the-air update it ran, and the screens visited before it.
Sentry's session counts give the denominator: crash-free sessions and Users, by release.

App code never names Sentry. It calls `mobile/src/telemetry/`, and only that folder imports `@sentry/react-native`; a
test refuses the import anywhere else. What leaves the phone is decided there, and scrubbed there before it is sent.

A User can turn the reports off in 내 정보. On or off, nothing personal is sent: no name, email, 학번, coordinates,
Friend, party title or anything a User typed.

```
app code ──> mobile/src/telemetry/ ──> Sentry (US)   crashes, unhandled errors, session counts
                  ├ what every report carries (release, OTA update, platform)
                  ├ the scrubbing before a report is sent
                  └ the switch in 내 정보
```

This spec is crash reporting only. Counting the app's use (PostHog) is a separate task with its own spec, and nothing
is prepared for it here: no code, no dependency, no native module.

## User Stories

1. As a team member, I want a crash on a tester's phone to reach me with the file and line it happened at, so that I
   can fix it without asking the tester what they did.
2. As a team member, I want each crash to say which Release and which over-the-air update it ran, so that I can tell
   whether a fix reached the phone.
3. As a team member, I want to see the share of sessions and Users without a crash for each release, so that a count
   of crashes has its denominator.
4. As a team member, I want to be told when a new kind of crash appears, so that I need not watch a page.
5. As a team member, I want a crash to show the screens visited before it, so that I can follow the way to it.
6. As a developer, I want a test to refuse an import of the Sentry SDK outside the telemetry folder, so that the
   scrubbing cannot be bypassed.
7. As a developer, I want crash reporting to do nothing in tests, in a local build, in the mock build and in the Dev
   Server's and a UAT's APK, so that only a Release's build reports.
8. As a team member, I want to send a test error from a released build, so that the whole path can be checked on a
   phone.
9. As an SNU student, I want to turn off the sending of error reports, so that I decide what my phone reports.
10. As an SNU student, I want the privacy policy to say what is sent and to whom, so that I know before I agree.
11. As an SNU student, I want a screen that failed to draw to show a message and a way to try again, so that I am not
    left with a white screen.

## Implementation Decisions

### The layer

`mobile/src/telemetry/` is the only place that imports `@sentry/react-native`. It exports:

- `startTelemetry()`: called once, before the first screen, from the root layout.
- `reportError(error, where)`: sends a handled error, with `where` from a closed list in the layer.
- `identifyUser(userId)` and `forgetUser()`: set and clear Sentry's user, at sign-in and sign-out.
- `setSending(on)` and `useSending()`: the switch.
- `TelemetryBoundary`: the error boundary around the app's screens.

There is no `track` and no event registry: those belong to the later task.

With no `EXPO_PUBLIC_SENTRY_DSN` in the build, every function does nothing and Sentry is not started.

### Sentry's settings

One project in sentry.io (US) for Android and iOS, with `@sentry/react-native` 8.36.0, which supports Expo 57 and
React Native 0.86 (ticket 00).

- On: native crash handling, Android ANR, iOS app hangs, and session tracking (release health), which counts
  crash-free sessions and Users.
- Off: tracing, profiling, session replay, screenshots, view hierarchy, Sentry Logs, `sendDefaultPii`.
- `environment` is `production` for a Release's build. `release` and `dist` are as Sentry's Expo guide sets them.
- Tags on every report: `release_tag` and `release_commit` (the build's `EXPO_PUBLIC_RELEASE_TAG` and
  `EXPO_PUBLIC_RELEASE_COMMIT`, which 내 정보 already shows), `ota_update_id` and `runtime_version` (from
  `expo-updates`), `app_version`, `platform`.

Each option's name and default is checked against the installed version's reference while building.

### Before a report leaves

In `beforeSend` and `beforeBreadcrumb`, the layer:

- drops the query string and fragment of every URL, and replaces path segments that are UUIDs or numbers with `:id`;
- drops console breadcrumbs, and keeps of an HTTP breadcrumb only the method, the scrubbed path and the status;
- cuts an error's message to 200 characters;
- sets the user to the User id (our database's UUID) and nothing else.

### Breadcrumbs

The layer leaves a breadcrumb at each change of screen: the route's name as expo-router has it, with its parameters'
names in place of their values (`/quests/[questId]`, never the id). Touches are not recorded.

### The error boundary and unhandled errors

- `TelemetryBoundary` wraps the screens in the root layout. A screen that throws while drawing shows "문제가 생겼어요"
  with "다시 시도", which draws it again, and the error is reported once.
- Sentry's handlers take unhandled errors and unhandled promise rejections.
- A refusal the main server answers on purpose (a 4xx with a code) is not an error and is not reported.

### The switch

내 정보 gains a row "오류 보고 보내기", on at first, with a caption that says what an error report holds and links to
the privacy policy. It is kept on the phone, not on the account, so it holds before sign-in.

Off: `reportError` does nothing, and Sentry is not started at the next launch, so neither a crash nor a session is
sent. A native crash kept from before the switch was turned off is discarded, not sent.

### The test error

A long press on the build line at the bottom of 내 정보 asks "시험 오류를 보낼까요?", and "보내기" reports a handled
error with a fixed message through `reportError`, so that a released build can be checked without crashing it. The
app does not know who is an Administrator (the admin site does), so the way in is unmarked rather than limited: the
line looks as it does now, and what is sent is one harmless report.

### The privacy policy and the consent screen

The privacy policy gains a part for error reports: what is collected (the User id, the device model, the OS version,
the app's version, and error reports), why, that it is sent to Functional Software, Inc. (Sentry) in the United
States, how long it is kept, and how to turn it off. The consent screen names the part. A person reviews the wording
before it is released.

### Keys

- `EXPO_PUBLIC_SENTRY_DSN` is in the app's bundle by design: it only allows sending. It is a GitHub Actions variable
  read by the Release workflow's app job.
- `SENTRY_AUTH_TOKEN` uploads source maps and symbols. It is a GitHub Actions secret used only by the Release
  workflow, and a person's own token on the laptop that builds iOS.
- Neither is committed, pasted into chat or shown in a screenshot.

### The Release workflow and the native build

- Sentry's Expo plugin and Metro plugin add native code, so the app's fingerprint changes. The pull request that adds
  them raises `version` to 1.0.4 (infra/production/README.md § The Production APK). Its Release builds a new APK, and
  phones on an older build take no later over-the-air update until they install it.
- A native build uploads its source map and native symbols with `SENTRY_AUTH_TOKEN`.
- After `eas update`, the app job uploads that update's source maps, so that a stack from any update is readable. A
  failed upload fails the job after the update is published and says so: the update is out, and its stacks are
  unreadable until the step is run again.
- iOS is built by hand as now; its dSYM upload is ticket 07.

### Reading

- Sentry's Issues page for crashes, and its Releases page for crash-free sessions and Users.
- An alert on a new issue and on a regression. The free plan has one member and, as far as ticket 00 found, no Slack
  integration, so the alert goes by email until ticket 05 settles how the team is told.
- The mobile README gains a "Crash reports" section: the layer, the settings and the scrubbing above, how to open an
  issue and read its Release and update, and how to check a build.

### Dates

The beta test starts on 2026-11-25. Before testers are given the app, the 1.0.4 APK is Released, and a test error
sent from that build has arrived in Sentry with a readable stack (ticket 06).

## Testing Decisions

- **Unit:** the scrubbing of URLs, breadcrumbs and messages, with cases that hold a query string, a UUID, a number,
  coordinates in a query, and a long message; the route breadcrumb keeps parameter names and no values; the layer
  without a DSN starts nothing.
- **Integration (app):** `identifyUser` at sign-in and `forgetUser` at sign-out; the switch off reports nothing and
  holds after a restart; a screen that throws shows the boundary's message, reports once, and draws again on
  "다시 시도"; a long press on the build line asks first and reports once on "보내기"; a 4xx refusal reports nothing.
- **A boundary test** reads the source tree and fails on an import of `@sentry/react-native` outside
  `mobile/src/telemetry/`.
- The SDK is replaced in Jest by a fake that records calls, set up once in the test support as the other native
  modules are.
- **By hand, on the Release's build:** the test error appears in Sentry with a stack that names our source file and
  line and with the Release's tag; a session appears under the release; with the switch off, neither appears.

## Out of Scope

- Counting the app's use: PostHog, an event registry, `track`, `app_opened`, a dashboard. A separate task.
- Sentry on the servers: their errors go to Slack (A02).
- Tracing, profiling, session replay, screenshots.
- A page on the admin site.
- Rewriting existing error messages. The layer cuts and scrubs what leaves.

## Tickets

| #   | Ticket                                                                              | Kind                          | Blocked by                                        |
| --- | ----------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| 00  | Sentry's support for Expo 57 and React Native 0.86, and two points of the free plan | A person, with what was found | None                                              |
| 01  | The layer, Sentry, the scrubbing, the error boundary, the test error                | Code                          | 00                                                |
| 02  | The user at sign-in and sign-out, and the switch in 내 정보                         | Code                          | 01                                                |
| 03  | The Release workflow uploads source maps                                            | Code                          | 01                                                |
| 04  | The privacy policy's part for error reports, and the consent screen                 | Code and a person's review    | 02                                                |
| 05  | The account, the keys and the alert                                                 | A person                      | 00                                                |
| 06  | The Release, the APK to the testers, and the check on the Release's build           | A person                      | 01 to 05                                          |
| 07  | iOS: the build, its dSYM upload and its check                                       | A person                      | 06, and the decision whether the beta has iPhones |

01, 02 and 04 can be built before the account exists, since a build without the DSN is silent. Ticket 01 changes
native files and raises `version`; 02 to 04 do not.

## Comments
