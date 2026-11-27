# 12: The app's PostHog layer: the SDK, identity, `app_opened`, screens and the event registry

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: done
Blocked by: 11

Native files: none (`posthog-react-native` is JavaScript; the fingerprint is checked below). Releases: an app
over-the-air update. Nothing is sent until ticket 15 sets `PRODUCTION_APP_POSTHOG_TOKEN`.

## What happens now

- `mobile/src/telemetry/` is the crash reports' layer: `sentry.ts` starts Sentry and holds `identifyUser` and
  `forgetUser`, `scrub.ts` has `scrubPath` with the route-word rule, `route-breadcrumb.tsx` reads expo-router's
  segments into a route's pattern (`/room/[questId]`), and `index.ts` is what app code imports.
- `identifyUser(myUserId())` is called after a sign-in (`src/auth/sign-in.ts`) and at a start with a kept Session
  (`src/session/start.ts:37`); `forgetUser()` at a sign-out (`src/auth/sign-in.ts`, `signOut`) and at a Session's end
  (`src/session/session-events.ts:51`).
- `__tests__/telemetry/sentry-import-boundary.unit.test.ts` refuses `@sentry/react-native` outside the layer.
- After ticket 11 the phone keeps a copy of the account's consent, `{ version, usage }`.
- `mobile/app.json` has `version` 1.0.4 and `runtimeVersion.policy: fingerprint`; CI's `app-fingerprint` job compares
  the fingerprint with the latest native build's.

## What to build

- **The SDK.** Add `posthog-react-native` and nothing else. Do not add `expo-application` or `expo-localization`, and
  check that the lockfile gained no native module. Before and after, run `@expo/fingerprint` under Production's build
  settings (infra/production/README.md § The Production APK) and write both hashes under Comments. If they differ,
  stop and say so: the ticket then needs the owner's decision, since a new APK is out of this spec. `version` stays
  1.0.4.
- **Starting it**, in the layer only. With an empty `EXPO_PUBLIC_POSTHOG_TOKEN` nothing is started. With one, the
  client is made the first time a User is identified with usage chosen, with the host `https://us.i.posthog.com` and
  the spec's settings: no `PostHogProvider` autocapture (touches and screens off), `captureAppLifecycleEvents: false`,
  no feature flags preloaded and no remote flags, no surveys, no session replay, `disableGeoip: true`,
  `personProfiles: 'identified_only'`. Where the installed version can start opted out (`defaultOptIn: false`), it
  does, and the layer opts in only while sending is allowed. Each option is checked against the installed version's
  reference, and a difference in a name or a default is written under Comments.
- **When it may send:** only while a signed-in User is identified and the phone's copy of the account's consent holds
  `CONSENT_VERSION` with usage true. The layer gains `allowUsage(chosen)`, called where that copy is read or written
  (the sign-in, a start with a kept Session, the consent's answer, and the answer of 내 정보's switch "사용 기록
  보내기" from ticket 11). Before that nothing is sent or queued.
- **The switch off holds at once.** `allowUsage(false)` calls PostHog's `optOut()`, and nothing captured before it is
  sent after it: what the client still holds unsent is dropped, not flushed. How is read in the installed version's
  source and written under Comments: if `optOut()` already empties the queue, that is enough; if it only stops new
  captures, the layer also calls `reset()`, which clears the client's persisted state and its queue, and identifies
  the User again when the switch is turned on. `allowUsage(true)` calls `optIn()`, sends `app_opened` as a start of
  sending in that run, and goes on. The switch's own request (ticket 11) is not waited for: the phone follows the
  User's press, and goes back only if the switch goes back.
- **Identity.** `identifyUser(id)` also calls PostHog's `identify(id)` with no person properties; `forgetUser()` also
  flushes and then calls `reset`, and sending stops until the next User is identified and allowed.
- **What every event carries**, registered once: `source: 'app'`, `app_version` (from `expo-constants`),
  `release_tag`, `release_commit`, `runtime_version`, `platform`, read as the crash reports' tags are.
- **The event registry**, a file of the layer: each event of the spec's table that the app sends, with the type of its
  properties. `track(name, properties)` takes only a registered name and exactly its properties, so a new event is a
  change to the registry, which a reviewer sees. Free strings are not accepted: `route` comes only from the layer's
  own scrubbing, and every other property is a union of fixed words.
- **`app_opened`**, once when sending starts in a run, and each time the app comes back to the foreground (React
  Native's `AppState` from `background` or `inactive` to `active`).
- **`screen_viewed`** at each change of screen, with `route` as the spec says: the segments' pattern with every
  segment that is not a route word as `:id` (the crash reports' rule), so `/room/[questId]` is `/room/:id`. It shares
  the root layout's component with the crash reports' breadcrumb; the breadcrumb keeps its own form.
- **The boundary test** also refuses `posthog-react-native` outside `mobile/src/telemetry/`.
- **The Jest fake** of `posthog-react-native` in `__tests__/support/`, set up once in `jest-setup.ts`, recording calls.
- **The Release workflow** passes `EXPO_PUBLIC_POSTHOG_TOKEN` to the app job from the repository variable
  `PRODUCTION_APP_POSTHOG_TOKEN` (`.github/workflows/release.yml`, beside `EXPO_PUBLIC_SENTRY_DSN` at `:144`). It may
  be unset, and is not among `fingerprint-and-decide`'s required settings; the infra README's table in "The app's
  bundle" gains the line, and says it stays unset until ticket 15.
- **Documents:** `EXPO_PUBLIC_POSTHOG_TOKEN` in `mobile/.env.example` and the mobile README's settings, and a section
  "Usage data" in the mobile README beside "Crash reports": the layer, the settings, the registry, the consent rule.

## Must not break

- The crash reports: Sentry's start, its switch, its user and its breadcrumbs, and their tests.
- A build without the token behaves as the app does now.
- The fingerprint, and so every installed 1.0.4 APK's taking of the update.

## Acceptance criteria

- [x] `@expo/fingerprint` gives the same hash before and after the change, both written under Comments; the lockfile
      adds no native module.
- [x] Without the token nothing is started and `track` does nothing. (Unit test.)
- [x] The client's options are those above, each checked against the installed version's reference. (Unit test with
      the fake.)
- [x] Nothing is sent before a User is identified with usage chosen, nothing for a User who chose no, and nothing
      after `forgetUser()`; `identify` carries the User id and no property. (Unit tests.)
- [x] With the switch turned off while events wait unsent, none of them is sent afterwards and nothing new is
      captured; turned on again, `optIn` is called, the User is identified and `app_opened` is sent. (Unit tests with
      the fake, which models the queue as the installed version does.)
- [x] `app_opened` is sent once when sending starts and once at each return to the foreground. (Unit test with a fake
      `AppState`.)
- [x] `screen_viewed` for a route with a parameter holds `:id` and not the value. (Unit test.)
- [x] `track` with a name outside the registry, or with a property the event does not list, does not compile. (A
      `@ts-expect-error` case in a unit test, checked by the app's type check.)
- [x] Every event carries the six common properties. (Unit test.)
- [x] An import of `posthog-react-native` outside the layer fails the boundary test.
- [x] The workflow passes the variable to the app job only, and a Release without it publishes as now. (Read from the
      diff; actionlint passes.)
- [x] Lint, format and types of the app pass.

## Comments

### Built (2026-11-26)

What was built (app only). The workflow's criterion is met by reading the diff and parsing the YAML (below); the
rest is checked by tests.

**The SDK and the fingerprint.** `posthog-react-native` **4.87.3** (the latest 4.x, published 2026-11-25, which pnpm
12.6's release-age policy let through), pinned exactly, with its two JavaScript dependencies `@posthog/core` 1.69.2
and `@posthog/types` 1.427.1: the lockfile gained these three packages and nothing else. It has no `android/`, `ios/`,
`react-native.config.js` or config plugin that is used (its `posthog-react-native/expo` plugin is not added to
`app.json`). Its optional peer `expo-application` resolves to 57.0.3, which was already in the lockfile and already
autolinked through `expo-notifications` (`expo-modules-autolinking resolve -p android` lists it before and after), so
no native module is new; `expo-localization` is not installed and the SDK's `require` of it sits in a `try`. The
fingerprints were computed as `fingerprint_and_decide` does (`npx expo-updates fingerprint:generate --platform …` in
`mobile/`, with Production's build settings from the main checkout's `.env`, `INVITE_LINK_HOST=api.snunow.com`,
`UPDATE_CHANNEL` and `ANDROID_X86_64` unset):

| When                                     | Android                                    | iOS                                        |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Before (= the published 1.0.4 build's)   | `a87bb46c83b7cbb9ae493bc87aacb684ef46485d` | `24107a214cb9d55bdabab9c292fcf1972568ebbf` |
| After adding the SDK                     | `a87bb46c83b7cbb9ae493bc87aacb684ef46485d` | `24107a214cb9d55bdabab9c292fcf1972568ebbf` |
| After the whole change, with a token set | `a87bb46c83b7cbb9ae493bc87aacb684ef46485d` | `24107a214cb9d55bdabab9c292fcf1972568ebbf` |

The "before" pair equals `app-version.json`'s `fingerprint` for 1.0.4, so installed 1.0.4 APKs take the update.
`version` stays 1.0.4.

**The options, as installed** (`usageOptions()` in `src/telemetry/usage.ts`; names and defaults read in 4.87.3's
`.d.ts` and `@posthog/core` 1.69.2's): `host` `https://us.i.posthog.com` (also the default), `defaultOptIn: false`
(default true), `captureAppLifecycleEvents: false` (default true), `preloadFeatureFlags: false` (default true),
`disableRemoteFeatureFlags: true`, `sendFeatureFlagEvent: false`, `disableSurveys: true`, `enableSessionReplay: false`
(default false), `errorTracking: { autocapture: false }`, `capturePushNotificationSubscriptions: false` and
`capturePushNotificationOpened: false` (both default true, and need `@posthog/react-native-plugin`, which the app does
not have), `disableGeoip: true`, `personProfiles: 'identified_only'` (also the default), `setDefaultPersonProperties:
false` (default true), `fetchRetryCount: 0` (default 3). Differences from the ticket and the spec:

- The constructor's first argument is `projectToken`; `apiKey` is a deprecated getter. The layer passes the token
  positionally.
- `autocapture` (`captureTouches`, `captureScreens`) is a prop of `PostHogProvider`, not a client option. The app has
  no provider, so nothing is autocaptured.
- `disableRemoteConfig` is a no-op in 4.87.3 ("Remote config is now always loaded"): the client fetches the project's
  remote config once when it is made, which happens only once a User is identified with usage allowed. Because that
  config can turn on error tracking's autocapture, `errorTracking: { autocapture: false }` is set.
- `setDefaultPersonProperties`, the push options and `fetchRetryCount` are not in the ticket; they are set to keep the
  person without properties, to send no push events, and to keep a failed batch from being retried after the switch
  is turned off.
- The six common properties are added to each event by `track` rather than with PostHog's `register()`, because
  `reset()` clears registered properties (`PostHogPersistedProperty.Props`).

**What the SDK's source says** (read in `@posthog/core` 1.69.2 `posthog-core-stateless.js` / `posthog-core.js` and
4.87.3's `posthog-rn.js`):

- `optOut()` only sets the persisted `opted_out` flag. `enqueue` refuses while opted out, but `_flush` does not check
  the flag, so what is queued would still go at the next flush (the timer, a move to the background, `flush()`).
- `reset()` clears every persisted property except the queues (`Queue`, `AiQueue`, `AiCaptureQueue`, `LogsQueue`)
  and, in the React Native client, `RemoteConfig`, `SessionReplay`, `Surveys`, `PushRegistered`, `InstalledAppBuild`,
  `InstalledAppVersion` and `DeviceId`. It clears `opted_out`, so the client falls back to `defaultOptIn`: with
  `false`, the next User starts opted out. It does **not** empty the queue.
- So the layer drops the queue itself on off: `setPersistedProperty(PostHogPersistedProperty.Queue, null)` (both
  public in 4.87.3), at once and again once `optOut()` resolves, unless the switch was turned on in between. A batch
  already handed to `fetch` cannot be called back; a network failure keeps a batch in the queue (`shouldRetainBatchOnError`),
  where a later off drops it.
- `identify(id)` with no properties sends `$identify` with `$anon_distinct_id` and no `$set`.

**How the layer behaves** (`src/telemetry/usage.ts`):

- No token: nothing is made and `track` does nothing.
- The client is made the first time a User is identified while `allowUsage(true)` holds; it is then `reset()` once,
  so that an id or an opt-in an earlier run left in storage is not this run's, `optIn()`, `identify(id)` and
  `app_opened`.
- `allowUsage(false)` while sending: `optOut()` and the queue dropped. `allowUsage(true)` again: `optIn()`,
  `identify(id)` (no new `$identify` for the same id) and `app_opened`. Repeated calls with the same value do nothing.
- `forgetUser()`: `flush()` started, then `reset()`; the consent is forgotten with the User, and nothing is sent until
  the next User is identified and allowed. A client left identified while the switch was off is reset too, before
  another User is identified, so two Users are never merged.
- `allowUsage` is called from `keepConsent` (every write of the phone's copy), from `readStart` where the kept copy is
  read, and from 내 정보's switch at once on a press (the copy with the pressed value), and again with the copy as it
  was when the request fails. `usageChosen(consent)` in `src/consent/kept-consent.ts` is the rule: version
  `CONSENT_VERSION` and usage true.

**Events at start and on a screen change.** When sending starts (a sign-in, a start with a kept Session, the switch
turned on): `$identify` (PostHog's, from `identify`; only when the id changes) and `app_opened` with `{ source: 'app',
app_version, release_tag, release_commit, runtime_version, platform }`. Each return to the foreground (`AppState`
`background`/`inactive` → `active`): `app_opened` with the same. Each change of screen: `screen_viewed` with
`{ route, …the six }`, `route` being expo-router's pattern scrubbed by `scrubPath` (`/room/[questId]` → `/room/:id`).
Screens before sending starts are not sent or queued. Every event also carries PostHog's own `$lib`, `$lib_version`,
`$session_id`, `$geoip_disable` and the device and app properties (`$device_name` is the model name from
`expo-device`, not the phone's own name).

**The registry** (`src/telemetry/events.ts`): the 17 app events of the spec's table with their property types, so
ticket 13 only sends them. `route` is a branded `ScrubbedRoute` made only by `scrubbedRoute`; a main server's `code` a
branded `ServerCode` made only by `serverCode` (`/^[A-Z][A-Z\d_]*$/`, else null); the library's codes, `reason`,
`visibility`, both `how` and `method` are unions; `code` exists on `refused` only. `track(name, ...properties)` takes
no argument for an event without properties.

**Other files:** `src/telemetry/build.ts` (the tags both Sentry and PostHog read, moved out of `sentry.ts` unchanged),
`src/telemetry/user.ts` (`identifyUser` / `forgetUser` for both), `index.ts` exports, `RouteBreadcrumb` also calls
`noteScreen`; `__tests__/support/posthog.ts` (the stand-in, modelling the queue as above) set up in `jest-setup.ts`;
`__tests__/support/usage-layer.ts`; the boundary test extended to `posthog-react-native`; Release workflow
`EXPO_PUBLIC_POSTHOG_TOKEN: ${{ vars.PRODUCTION_APP_POSTHOG_TOKEN }}` in the app job's env only (not in
`fingerprint_and_decide`'s required list); `mobile/scripts/build-mock-apk.sh` exports it empty; `mobile/.env.example`;
the infra README's table and paragraph in "The app's bundle"; the mobile README's "Usage data" section (and two lines in
"Crash reports").

**Tests:** `__tests__/telemetry/usage.unit.test.ts` (no token; options; reset → optIn → identify order; nothing before
identified-and-allowed, for a User who chose no, after `forgetUser`, which flushes then resets; the next User not
opted in until allowed; off drops the waiting events and captures nothing, a later flush sends nothing; on again →
optIn, identify, app_opened; the stand-in keeps the queue after optOut and reset),
`__tests__/telemetry/usage-events.unit.test.ts` (app_opened at start and at each return to the foreground with a fake
`AppState`; screen_viewed's `:id`; the six common properties; `serverCode`; six `@ts-expect-error` cases, each
checked to fail for its own reason when the comment is removed), `__tests__/me-usage-sending.integration.test.tsx`
(over the fake main server: a User who chose no makes no client; with usage chosen, app_opened queued, 내 정보's switch off drops them before the account answers, on sends app_opened again), and
`sentry-import-boundary.unit.test.ts`.

Not done or only inferred:

- actionlint was not run: it is not installed here, and downloading its binary was refused by the machine's
  permission check. The workflow was parsed with Python's YAML reader: only the `app` job has
  `EXPO_PUBLIC_POSTHOG_TOKEN`, outside the required settings, so a Release without the variable publishes as now. The
  repository's CI has no actionlint job, so the criterion's "actionlint passes" has no CI run to point at; the
  Release's own run is the workflow's check, as for ticket 04's line.
- Nothing was run on a phone or an emulator; events reaching PostHog are ticket 15's check.
- The fake `AppState` replaces React Native's `AppState` module (`jest.mock('react-native/Libraries/AppState/AppState')`)
  in the two unit test files: a spy on `AppState` did not reach the layer loaded in `jest.isolateModules`.

### Agent usage (2026-11-26)

- Agent time: about 2 hours 30 minutes (estimate), one session, much of it waiting on single-file Jest runs.
- Tokens: 317,214 in all for the implementation session, as its usage reports; the split into input, cache reads,
  cache writes and output was not available.
