# 02: The telemetry layer starts Sentry, scrubs what leaves, and shows a failed screen's message

Parent: [P08 spec](../spec.md)
Status: done
Blocked by: 01

Native files: yes (`@sentry/react-native` and its Expo plugin change the fingerprint; `version` goes to 1.0.4).
Releases: an `all` or `app` Release, which builds a new APK.

## What happens now

- The app has no crash reporting. `mobile/package.json` has no Sentry, and nothing sets a global error handler.
- The root layout (`mobile/src/app/_layout.tsx`) draws `AppProviders`, the `Stack` and `UpdateCheck`, with no error
  boundary: a screen that throws while drawing leaves a white screen.
- The build's Release is already known to the app: `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT`
  (`mobile/src/screens/me/version-line.ts`), and `expo-updates` gives the update's id and the runtime version.
- A refusal of the main server is an `ApiError` (`mobile/src/api/errors.ts`).

## What to build

- Install `@sentry/react-native` 8.36.0 with its Expo config plugin and its Metro plugin, as Sentry's Expo guide has
  them. The app has no `metro.config.js` yet. Raise `version` in `mobile/app.json` to 1.0.4
  (infra/production/README.md § The Production APK). No other native dependency is added.
- `mobile/src/telemetry/`, the only folder that imports `@sentry/react-native`, with `startTelemetry()`,
  `reportError(error, where)` and `TelemetryBoundary`, as the spec's "The layer" has them. `where` is a closed list in
  the layer; it starts with what this ticket needs.
- `startTelemetry()` is called from the root layout before the first screen. Without `EXPO_PUBLIC_SENTRY_DSN` it
  starts nothing. With it, Sentry starts with the spec's "Sentry's settings": native crashes, ANR, app hangs and
  session tracking on; tracing, profiling, replay, screenshots, view hierarchy, Sentry Logs and `sendDefaultPii` off;
  `environment` `production`; the six tags.
- The scrubbing of the spec's "Before a report leaves", as pure functions with their own unit tests, used by
  `beforeSend` and `beforeBreadcrumb`.
- A breadcrumb at each change of screen: the route's name with its parameters' names in place of their values.
- `TelemetryBoundary` around the `Stack`: "문제가 생겼어요" and "다시 시도", which draws the screen again; the error is
  reported once. The words follow the design system's existing empty and failure states.
- A refusal the main server answers on purpose (an `ApiError` with a 4xx status) is never reported, whether it is
  thrown unhandled or passed to `reportError`.
- A long press on the build line (`mobile/src/screens/me/build-line.tsx`) asks "시험 오류를 보낼까요?" and reports a
  handled error with a fixed message on "보내기".
- `EXPO_PUBLIC_SENTRY_DSN` in `mobile/.env.example` and the mobile README's settings, and a "Crash reports" section in
  the mobile README: the layer, the settings, the scrubbing, the breadcrumb, the boundary, the test error.
- The Jest fake of the SDK in `__tests__/support/`, set up once in `jest-setup.ts` as the other native modules are.

## Must not break

- A build without the DSN behaves as the app does now, apart from the boundary and the build line's long press.
- `UpdateCheck`, the splash screen's hiding and the sign-in redirect in the root layout.
- The app's fingerprint job in CI: the pull request says that the fingerprint changes and why.

## Acceptance criteria

- [x] An import of `@sentry/react-native` outside `mobile/src/telemetry/` fails a test that reads the source tree.
- [x] Without the DSN, `startTelemetry()` starts nothing and `reportError` does nothing. (Unit test.)
- [x] The scrubbing drops a URL's query and fragment, turns UUID and number segments into `:id`, keeps of an HTTP
      breadcrumb only method, path and status, drops console breadcrumbs, and cuts a message to 200 characters; a
      case with coordinates in a query shows none of them after it. (Unit tests.)
- [x] The route breadcrumb of a screen with a parameter holds the parameter's name and not its value. (Unit test.)
- [x] A screen that throws shows "문제가 생겼어요", reports once, and draws again on "다시 시도". (Integration test.)
- [x] An `ApiError` with a 4xx status reports nothing. (Unit test.)
- [x] A long press on the build line asks first, reports once on "보내기" and nothing on a cancel. (Integration test.)
- [x] Sentry's options are those of the spec, each checked against 8.36.0's reference; a difference in a name or a
      default is written under Comments.
- [x] `version` is 1.0.4, and the pull request names the native files changed.
- [ ] On a phone with a development build that has a test DSN: the test error arrives in Sentry, and its event holds
      no query string, no id in a path and no user beyond an id. The screens go to the orchestrator before the pull
      request. (Hand check; needs ticket 06's DSN, or a person's own test project.)
- [x] Lint, format and types of the app pass.

## Comments

### Built (2026-11-24)

- **Where 8.36.0 differs from the spec's wording** (read in `node_modules/@sentry/react-native`):
  - Android's ANR has no option in the React Native SDK: the Android SDK detects it by default, and
    `enableNativeCrashHandling` keeps it.
  - iOS app hangs are `enableAppHangTracking`; session tracking is `enableAutoSessionTracking`. Both are set.
  - Tracing, profiling and replay have no switch: they are off while their sample rates are left unset. A number,
    even 0, adds their integrations, so none is set, and a test checks that.
  - Sentry Logs is `enableLogs`; screenshots and the view hierarchy are `attachScreenshot` and
    `attachViewHierarchy`; all three and `sendDefaultPii` are set false.
  - `release` and `dist` are left to the SDK, as the Expo guide has them. `environment` is `production` outside a
    development build.
- **What the JavaScript cannot scrub.** A native crash or ANR is sent by the native SDK and does not pass
  `beforeSend`: it carries the user, the tags and the breadcrumbs the JavaScript set, but the 200-character cut and
  the URL scrubbing do not reach a native exception's own message. The native SDKs' breadcrumbs skip
  `beforeBreadcrumb` too, so they are off (`enableNetworkBreadcrumbs`, `enableAutoBreadcrumbTracking`,
  `enableUserInteractionBreadcrumbs`), and `enableCaptureFailedRequests` is off. Ticket 06 turns on the project's own
  scrubbing on Sentry's side as the guard behind this.
- **More scrubbing than asked:** the device's name and `server_name` are dropped, and a number in a path counts with
  its sign and decimals, so a coordinate in a path becomes `:id`.
- **Unhandled errors** go through Sentry's own handlers, promise rejections among them. `beforeSend` drops an
  `ApiError` with a status of 400 to 499; a status of 0 and a 5xx are reported.
- **"다시 시도" starts the screens anew.** The boundary is around the `Stack`, as the ticket says, so a retry draws the
  Stack from its first screen, as a new start of the app does, and not the screen that failed. A boundary for each
  screen (the Stack's `screenLayout`) would keep the screen; it is left as a later choice.
- **The Expo plugin** is a plain `"@sentry/react-native"` in `app.json`, with no organisation or project: they come
  from `SENTRY_ORG` and `SENTRY_PROJECT` at build time, so they change no fingerprint.
- **A release build without `SENTRY_AUTH_TOKEN` fails at the upload** unless `SENTRY_DISABLE_AUTO_UPLOAD=true` (read
  in `sentry.gradle.kts` and `sentry-xcode.sh`, not run). The mock APK's script and `.env.example` set it, and so
  does the Release workflow's "Build the APK" step until ticket 04 gives it the token.
- **`mobile/pnpm-workspace.yaml` is new:** pnpm 12 refused the install until `@sentry/cli`'s install script was
  answered, and it is not needed, since the binary comes in a package for each platform.
- **Native files changed:** `package.json` (the SDK), `app.json` (the plugin and `version` 1.0.4) and the new
  `metro.config.js`. The fingerprint changes.
- **The test error's message** is "A test error, sent from the build line in 내 정보", with the tag `where: test-error`.
- **Open:** the check on a phone with a DSN, which needs a person and ticket 06's project.

### After the review (2026-11-24)

- **A path keeps only its route words.** The first rule turned UUID and number segments into `:id`, which let a
  typed Friend ID (`/friend-ids/K7M3XQ9A`) and an Invite Link's token (`/invite-links/<token>`, a credential for a
  day) through. Now a segment stays only when it is lower-case letters and hyphens, as every route word in
  `src/api/client.ts` is, and anything else becomes `:id`. The spec's "UUIDs or numbers" is the narrower wording.
- **A refusal is a 4xx with a code,** as the spec has it. A 4xx without the main server's code (a body the app sent
  wrong, a proxy's 413 or 429) is reported.
- **The two builds made by hand** (the Dev Server's APK, the iOS build) turn Sentry's upload off in their documented
  steps.

### Agent usage (2026-11-24)

- Agent time: about 2 hours 15 minutes in one implementation session, an estimate; about 20 minutes of it waited on
  four existing test files. The orchestrator's time is not counted here.
- Tokens: 272,829 in all for the implementation session, as its usage reports; the split into input, cache reads,
  cache writes and output was not available when this was written.
