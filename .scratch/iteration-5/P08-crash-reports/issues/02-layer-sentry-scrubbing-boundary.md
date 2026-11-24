# 02: The telemetry layer starts Sentry, scrubs what leaves, and shows a failed screen's message

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
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

- [ ] An import of `@sentry/react-native` outside `mobile/src/telemetry/` fails a test that reads the source tree.
- [ ] Without the DSN, `startTelemetry()` starts nothing and `reportError` does nothing. (Unit test.)
- [ ] The scrubbing drops a URL's query and fragment, turns UUID and number segments into `:id`, keeps of an HTTP
      breadcrumb only method, path and status, drops console breadcrumbs, and cuts a message to 200 characters; a
      case with coordinates in a query shows none of them after it. (Unit tests.)
- [ ] The route breadcrumb of a screen with a parameter holds the parameter's name and not its value. (Unit test.)
- [ ] A screen that throws shows "문제가 생겼어요", reports once, and draws again on "다시 시도". (Integration test.)
- [ ] An `ApiError` with a 4xx status reports nothing. (Unit test.)
- [ ] A long press on the build line asks first, reports once on "보내기" and nothing on a cancel. (Integration test.)
- [ ] Sentry's options are those of the spec, each checked against 8.36.0's reference; a difference in a name or a
      default is written under Comments.
- [ ] `version` is 1.0.4, and the pull request names the native files changed.
- [ ] On a phone with a development build that has a test DSN: the test error arrives in Sentry, and its event holds
      no query string, no id in a path and no user beyond an id. The screens go to the orchestrator before the pull
      request. (Hand check; needs ticket 06's DSN, or a person's own test project.)
- [ ] Lint, format and types of the app pass.

## Comments
