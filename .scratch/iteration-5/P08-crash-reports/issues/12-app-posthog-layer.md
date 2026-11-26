# 12: The app's PostHog layer: the SDK, identity, `app_opened`, screens and the event registry

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-agent
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

- [ ] `@expo/fingerprint` gives the same hash before and after the change, both written under Comments; the lockfile
      adds no native module.
- [ ] Without the token nothing is started and `track` does nothing. (Unit test.)
- [ ] The client's options are those above, each checked against the installed version's reference. (Unit test with
      the fake.)
- [ ] Nothing is sent before a User is identified with usage chosen, nothing for a User who chose no, and nothing
      after `forgetUser()`; `identify` carries the User id and no property. (Unit tests.)
- [ ] With the switch turned off while events wait unsent, none of them is sent afterwards and nothing new is
      captured; turned on again, `optIn` is called, the User is identified and `app_opened` is sent. (Unit tests with
      the fake, which models the queue as the installed version does.)
- [ ] `app_opened` is sent once when sending starts and once at each return to the foreground. (Unit test with a fake
      `AppState`.)
- [ ] `screen_viewed` for a route with a parameter holds `:id` and not the value. (Unit test.)
- [ ] `track` with a name outside the registry, or with a property the event does not list, does not compile. (A
      `@ts-expect-error` case in a unit test, checked by the app's type check.)
- [ ] Every event carries the six common properties. (Unit test.)
- [ ] An import of `posthog-react-native` outside the layer fails the boundary test.
- [ ] The workflow passes the variable to the app job only, and a Release without it publishes as now. (Read from the
      diff; actionlint passes.)
- [ ] Lint, format and types of the app pass.

## Comments
