# P08: Crash reports and usage data: the app reports its crashes to Sentry, and its use to PostHog

Status: ready-for-agent

This spec has two parts. The first, from Problem Statement to Out of Scope, is crash reporting with Sentry (tickets 01
to 09). The second, [Usage data with PostHog](#usage-data-with-posthog), counts how the app is used (tickets 10 to
16). The folder keeps its first name.

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

This part is crash reporting only. Counting the app's use (PostHog) is the spec's second part,
[Usage data with PostHog](#usage-data-with-posthog), which reuses this layer.

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

There is no `track` and no event registry in this part: they are the usage data's (ticket 12).

With no `EXPO_PUBLIC_SENTRY_DSN` in the build, every function does nothing and Sentry is not started.

### Sentry's settings

One project in sentry.io (US) for Android and iOS, with `@sentry/react-native` 8.36.0, which supports Expo 57 and
React Native 0.86 (ticket 01).

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

Off holds at once and at every later launch:

- at once, `reportError` does nothing, `beforeSend` drops every event (an unhandled error among them), and the layer
  closes Sentry's client so that the session's updates and the native crash handling stop too;
- at the next launch, Sentry is not started.

Turning it on again starts Sentry in that run.

A native crash is kept by the native SDK in its own cache and sent when the SDK next starts, without `beforeSend`, and
the SDK gives JavaScript no way to empty that cache. So a crash kept from a run when the switch was on, and not yet
sent, is not discarded: it stays on the phone while the switch is off, since the SDK is not started, and is sent if
the switch is turned on again.

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
- iOS is built by hand as now; its dSYM upload is ticket 08.

### Reading

- Sentry's Issues page for crashes, and its Releases page for crash-free sessions and Users.
- An alert on a new issue and on a regression. The free plan has one member and, as far as ticket 01 found, no Slack
  integration, so Sentry calls the main server, which posts a short line to the team's own Slack channel through an
  Incoming Webhook made for that channel alone (ticket 09). Until that is in place the alert goes by email.
- The mobile README gains a "Crash reports" section: the layer, the settings and the scrubbing above, how to open an
  issue and read its Release and update, and how to check a build.

### Dates

The beta test starts on 2026-11-25. Before testers are given the app, the 1.0.4 APK is Released, and a test error
sent from that build has arrived in Sentry with a readable stack (ticket 07).

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

- Counting the app's use: PostHog, an event registry, `track`, `app_opened`, a dashboard. They are this spec's second
  part, [Usage data with PostHog](#usage-data-with-posthog), not this one.
- Sentry on the servers: their errors go to Slack (A02). Ticket 09 is the other way round: the main server only
  passes Sentry's alert about the app on to Slack.
- Tracing, profiling, session replay, screenshots.
- A page on the admin site.
- Rewriting existing error messages. The layer cuts and scrubs what leaves.

## Usage data with PostHog

### Problem

Sentry tells the team when the app breaks, not how it is used. Nobody knows how many Users open the app each day,
whether they come back, which screens they use, or how often the five things the app is for go through: asking the
Assistant, making a 파티, joining one, becoming Friends, and booking a seat at 관정도서관. When one of them fails, the
main server's log shows the requests that reached it, but not those that never did, nor whether its answer reached the
phone. The beta test is where these questions get their first answers.

### Solution

The app and the main server send a short, fixed list of events to PostHog Cloud US, only for a User who chose to send
usage data when agreeing to the legal documents. A dashboard in PostHog shows the daily Users, their return, the five
actions per day, the screens used, the response rates and the failures.

```
app code ──> mobile/src/telemetry/ ──> PostHog (US)   app_opened, screens, the five actions' stages, failed requests
                  ├ track(): only the names in the event registry
                  ├ the account's consent decides whether anything is sent
                  └ the same scrubbing of routes as the crash reports
main server ──> one usage service ──> PostHog (US)     the closing stage of four actions
```

Consent moves from the phone to the account. The account keeps the version of the documents the User agreed to and
the choice on usage data. Nothing of PostHog is sent before that choice is made, and nothing at all for a User who
did not choose it. Sentry and its switch "오류 보고 보내기" stay as the first part has them.

### User stories

12. As a team member, I want to see how many Users open the app each day and how many come back after one and seven
    days, so that I know whether the beta test keeps its testers.
13. As a team member, I want to see each day how often the Assistant answered, a 파티 was made, a User joined one, two
    Users became Friends and a seat was booked, so that I know which features are used.
14. As a team member, I want to compare what the app asked for with what the main server did, and what the main server
    did with what the app heard back, so that I can tell a lost request from a lost answer.
15. As a team member, I want every failed request to the main server counted by route and reason, so that a failure
    nobody reports is seen.
16. As a team member, I want to see which screens are opened most, so that I know where Users spend their time.
17. As a developer, I want app code to send only events named in a registry, so that nobody can send free text by
    mistake.
18. As a developer, I want a test to refuse an import of the PostHog SDK outside the telemetry folder, so that the
    consent check and the scrubbing cannot be bypassed.
19. As an SNU student, I want to choose once, when I agree to the legal documents, whether my use of the app is
    recorded, so that nothing is recorded that I did not agree to.
20. As an SNU student, I want to use every feature whatever I choose, so that the choice is a real one.
21. As an SNU student, I want the privacy policy to say what is recorded, what never is, who receives it and for how
    long, so that I know before I choose.
22. As an SNU student, I want to be asked once on my account and not again on each new phone.

### Decisions

#### PostHog

- PostHog Cloud US (`https://us.i.posthog.com`), one project, on the free plan: 1,000,000 events a month, no charge
  per seat, events kept 1 year, events over the limit dropped, no card on file. The company is PostHog, Inc.; the data
  is kept in AWS us-east-1 (Virginia).
- The project token (`phc_…`) is a write-only client token, which PostHog calls safe to ship in an app. It stays out
  of the repository all the same, and is named only (see Settings).
- A personal API key, with Product analytics write and Events read and scoped to the organisation, exists outside the
  repository for building the dashboard. It is never written in the repository, a ticket, a chat or a screenshot.

#### Events

Only these events exist. Every name is `object_verb` in snake case: the object is what the event is about, the verb
what happened to it. Each of the five actions has three stages, `<action>_requested`, `<action>_completed` and
`<action>_failed`.

| Event                           | Sent by                             | When                                                                                                     | Properties                     |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `app_opened`                    | app                                 | PostHog starts in a run of the app, and each time the app comes back to the foreground                   | —                              |
| `screen_viewed`                 | app                                 | each change of screen                                                                                    | `route`                        |
| `assistant_reply_requested`     | app                                 | the User sends a message to the Assistant                                                                | —                              |
| `assistant_reply_completed`     | app; main server (`source: server`) | app: the Assistant's reply reached the phone; server: the reply is answered                              | —                              |
| `assistant_reply_failed`        | app                                 | the request for the reply failed                                                                         | `reason`, `code`               |
| `party_creation_requested`      | app                                 | the User sends the 파티 form, or sends a Plan that becomes a Quest                                       | `visibility`                   |
| `party_creation_completed`      | app; main server (`source: server`) | app: the answer reached the phone; server: the Quest is stored                                           | `visibility`                   |
| `party_creation_failed`         | app                                 | the request failed                                                                                       | `visibility`, `reason`, `code` |
| `party_join_requested`          | app                                 | the User joins an Open Quest, accepts an invitation, or, as its Leader, accepts a join request           | `how`                          |
| `party_join_completed`          | app; main server (`source: server`) | app: the answer reached the phone; server: the User is stored as a Holder, sent for the joining User     | `how`                          |
| `party_join_failed`             | app                                 | the request failed                                                                                       | `how`, `reason`, `code`        |
| `friendship_creation_requested` | app                                 | the User accepts a Friend Request or an Invite Link                                                      | `how`                          |
| `friendship_creation_completed` | app; main server (`source: server`) | app: the answer reached the phone; server: the friendship is stored, sent once for each of the two Users | `how`                          |
| `friendship_creation_failed`    | app                                 | the request failed                                                                                       | `how`, `reason`, `code`        |
| `seat_booking_requested`        | app                                 | the User books a 관정도서관 seat, as the booking is sent to the library                                  | —                              |
| `seat_booking_completed`        | app                                 | the library answered with the booking                                                                    | —                              |
| `seat_booking_failed`           | app                                 | the library answered without a booking, or could not be reached                                          | `reason`, `code`               |
| `api_request_failed`            | app                                 | any request to the main server failed, the five actions' among them                                      | `route`, `method`, `reason`    |

The properties:

- `route`: the route's pattern with every segment that is not a route word (`/^[a-z][a-z-]*$/`) as `:id`, the rule of
  the crash reports' scrubbing (`scrubPath` in `src/telemetry/scrub.ts`). For `screen_viewed` it is the screen's
  route from expo-router's segments, so `/room/[questId]` is sent as `/room/:id`; for `api_request_failed` it is the
  request's path, so `/quests/42/join` is `/quests/:id/join`. Never a query string.
- `method`: `GET`, `POST`, `PUT`, `PATCH` or `DELETE`.
- `reason`: `network` (nothing answered), `timeout` (the app gave the request up after its own limit), `server_error`
  (a 5xx, a 4xx without the main server's code, or an answer of a shape the app does not know) or `refused` (a 4xx
  with the main server's `code`, or the library answering without a booking).
- `code`: on `refused` only. For the main server, its own word for the refusal, such as `QUEST_FULL`. For the library,
  one of a closed list in the registry: `seat_taken`, `not_allowed`, `session_ended`, `no_session`.
- `visibility`: `public` (an Open or Approval Quest, a 공개 파티) or `private` (a Closed Quest, a 비공개 파티). A Plan
  sent for a new recruiting Quest is posted Open, so it is `public`; a meal or a meeting with Friends is `private`.
- `how` of `party_join_*`: `invitation_accepted`, `joined_directly` or `request_accepted`.
- `how` of `friendship_creation_*`: `request_accepted` or `invite_link_accepted`; the main server also sends
  `requests_crossed`, when a User's Friend Request meets one the other User had already sent (`sendRequest` in
  `main-server/src/friends/friends.service.ts`), which the app does not count as an action of its own.

What every event carries:

- From the app: `source: app`, `app_version` (from `expo-constants`), `release_tag` and `release_commit` (the build's
  `EXPO_PUBLIC_RELEASE_TAG` and `EXPO_PUBLIC_RELEASE_COMMIT`), `runtime_version` (from `expo-updates`) and `platform`,
  the values the crash reports' tags already read. PostHog's own device model and OS version are kept.
- From the main server: `source: server`.

What no event carries: the text of a message or of an answer, the kind of answer the Assistant gave (a question for
the reviewer, below), names, titles, Places, coordinates, Friend lists, Student Numbers, an IP address, or any other
property. A successful request to the main server sends nothing: the main server's request log
(`main-server/src/common/request-logging.interceptor.ts`) is the denominator of `api_request_failed`.

Which flows count:

- A 파티 made is a Quest the User makes to gather others: the 파티 form (`POST /quests/own`, and `POST /quests` when it
  makes a new Quest for a Global Event) and a Plan sent (`POST /plans`), apart from a Plan taken alone. A Quest taken
  alone, a Class Quest, a Tutorial Quest and a Booking Party are not counted.
- A User becoming a Holder is `POST /quests/:id/join` (`joined_directly`), `POST /quest-invitations/:id/accept`
  (`invitation_accepted`) and the Leader's `POST /quests/:id/join-requests/:id/accept` (`request_accepted`). For the
  last, the app's stages are sent from the Leader's phone, and the main server's `party_join_completed` is sent for
  the joining User.
- Two Users becoming Friends is an accepted Friend Request, an accepted Invite Link, and two crossed Friend Requests.
  An Administrator making two Users Friends on the admin site is not counted: no User asked for it.
- The Party (the 활성 파티) is not counted: opening one, joining one and its requests send nothing.
- A seat booked is a seat of a reading room, not a group study room. The Library Session never reaches the main
  server or the model, so the booking has no server stage.

#### Both sides send

The app sends every stage it sees; the main server sends the closing stage of the four actions it does. The
dashboard's main figure for an action is taken from the side that closes it: the main server for the Assistant, a
파티 made, a Holder joined and Friends made, the app for a seat booked. Comparing the two sides gives two response
rates for each server action: how many requests reached the main server and were done (server `_completed` over app
`_requested`), and how many of those answers reached the phone (app `_completed` over server `_completed`). The main
server sends `friendship_creation_completed` twice for one friendship, so its count is halved for the comparison.
Each event is sent only for a User who chose usage data. Where an action touches two Users (a Leader accepting a join
request, two Users becoming Friends), the app's stages follow the choice of the User who pressed and the main server's
follow each User's own, so a rate can stray a little from 100% when the two chose differently.

#### Identity

- The app calls PostHog's `identify` with the User id, the same random UUID Sentry's user holds, at a sign-in and at a
  start with a kept Session; it calls `reset` at a sign-out and at a Session's end. These are the places where the
  crash reports' `identifyUser` and `forgetUser` are called (`src/auth/sign-in.ts`, `src/session/start.ts`,
  `src/session/session-events.ts`), and the layer's two functions do both.
- No person properties are set.
- The main server sends with the User id as `distinctId`.

#### Consent

- There is no switch for usage data. The consent screen after sign-in gains an optional item for it, a checkbox that
  is not ticked at first. The User chooses once, and cannot change the choice later in the app.
- Consent moves from the phone to the account. The account keeps the consent version the User agreed to, the usage
  choice and when it was given. The app and the main server each hold the current version, `CONSENT_VERSION`, which
  is 1 with this spec and is raised in both in the same pull request.
- The consent screen shows when the account's version is lower than the app's current one. An account that has
  agreed to no version is lower, so every User who agreed on the phone before is asked again, once. A new phone, or a
  sign-in again, does not ask again: the sign-in's answer carries the account's consent.
- The phone keeps a copy of the account's consent, from the sign-in's answer, the Lobby and the consent's own answer,
  so that a start with a kept Session decides without the network. A User has one Session at a time, so no other
  phone can change the account's consent meanwhile. The phone's old `consented` flag (`src/storage/kept.ts`) is no
  longer read.
- Nothing of PostHog is sent before the choice is made, and only while a signed-in User whose account holds the current
  version chose usage data. The main server sends nothing for a User whose account chose no, or has not agreed to the
  current version.
- A required consent was considered and not chosen: 개인정보 보호법 제16조 3항 and 제22조 5항 bar refusing a service
  because a User does not agree to the processing of information the service does not need, and usage data is not
  needed for any feature.
- A later raise of the version, and whether it asks the usage item again, is decided when it happens.

#### PostHog's settings in the app

- `posthog-react-native` only, started by the layer, with every collection of its own off: touch autocapture, screen
  autocapture (expo-router has no `NavigationContainer`, and screens are sent by the layer's own hook), app lifecycle
  events (`captureAppLifecycleEvents: false`; `app_opened` is ours), the preloading of feature flags and remote flags,
  surveys and session replay.
- `disableGeoip: true`, and a person turns on the project's "Discard client IP data".
- `personProfiles: 'identified_only'`.
- With an empty `EXPO_PUBLIC_POSTHOG_TOKEN` the client is disabled, PostHog's own behaviour, and the layer starts
  nothing: tests, a local build, the mock APK, and the Dev Server's and a UAT's APK send nothing, as with Sentry
  without a DSN.
- Each option's name and default is checked against the installed version's reference while building.

#### Over the air, no new APK

- `posthog-react-native` is JavaScript. Its optional peers already in the app are `expo-file-system`, `expo-device`,
  `expo-updates` and `@react-native-async-storage/async-storage`. `expo-application` and `expo-localization` are not
  added: they are native modules, which would change the fingerprint and need a new APK. The app version comes from
  `expo-constants` instead.
- `@expo/fingerprint` gives the same hash before and after the SDK is added. If it does not, the work stops and says
  so. `version` stays 1.0.4.

#### The layer

- `mobile/src/telemetry/` stays the only place that imports `posthog-react-native`; the import-boundary test refuses
  it elsewhere, as it does `@sentry/react-native`.
- It exports `track(name, properties)`, which takes only names from an event registry file in the layer, each with the
  type of its properties, so app code can neither invent an event nor pass free text. The five actions go through one
  function of the layer that sends the three stages around a request and works out `reason` and `code` from what the
  request threw.

#### The main server

- `posthog-node` behind one service, the only place that imports it.
- An event is sent after the work it reports is committed, never inside a transaction.
- The service reads the account's consent before it sends.
- A failure or a timeout of PostHog never fails the User's request: it is logged as a warning without the token, and
  the event is dropped.
- With `POSTHOG_PROJECT_TOKEN` unset, nothing is sent; there is no route to answer 404.
- Its queue is flushed when the server shuts down.

#### iOS

The code covers both platforms. The iOS build and its check are the owner's own, as for the crash reports (ticket
08). There is no deadline.

### Settings

- The app's build variable `EXPO_PUBLIC_POSTHOG_TOKEN`, from the repository variable `PRODUCTION_APP_POSTHOG_TOKEN`
  in the Release workflow's app job, beside `PRODUCTION_APP_SENTRY_DSN`. It may be unset: the app then sends nothing.
  It is what turns the app's sending on, and stays unset until tickets 11 to 13 are on the main line (ticket 15).
- The main server's setting `POSTHOG_PROJECT_TOKEN`, optional and empty by default. Plain settings are committed in
  `infra/production/k8s/parts/shared/kustomization.yaml`, and the token stays out of the repository, so it reaches
  Production as the main server's optional secrets do: the Parameter Store parameter `posthog-project-token`, read
  with `optional_line_parameter` in `.github/release/release.sh` (as `sentry-webhook-secret` is) and passed from the
  Secret `secrets` in `main-server.yaml`.
- PostHog's host, `https://us.i.posthog.com`, is a constant in the code of both, not a setting.
- No value of the token is written anywhere in the repository, a ticket, a pull request, a chat or a screenshot.

### Privacy

- The privacy policy gains a part "사용 기록": what is sent (the events in plain Korean, the User id, the app's
  version, the phone's model and OS version), what never is (name, email, 학번, location, Friends, 파티 titles,
  anything typed), who receives it (PostHog, Inc., in the United States, Virginia, as a transfer abroad), how long it
  is kept (1 year on the current plan), and that the item is optional and fixed once chosen.
- The retention is read on the account's plan page before the Release, as ticket 07 did for Sentry, and the policy's
  figure follows what it shows.
- The consent screen shows the optional item with its checkbox and one sentence, and names the part.
- All Korean wording is drafted in ticket 11 and reviewed by a person before the Release.

### Testing

- **Unit (app):** the layer without a token starts nothing; PostHog's options are those above; nothing is sent before
  a User is identified with usage chosen, and nothing after `reset`; `track` refuses, at type level, a name outside
  the registry and a property it does not list; the route of a screen and of a request is scrubbed; `reason` and
  `code` from each kind of failure.
- **Integration (app):** the consent screen over the fake main server: shown for an account with no version, not for
  one with the current version, the checkbox not ticked at first, the choice sent; a 파티 made, a join, a Friend
  Request accepted, an Assistant reply and a seat booked each send their stages; a refused request sends `_failed`
  with `refused` and the code, and `api_request_failed`; a User who chose no sends nothing.
- **Integration (main server):** the consent route and the consent in the sign-in's answer and the Lobby, through the
  started server with its database; each closing stage sent for the right User with its properties, after the commit;
  nothing for a User who chose no; a PostHog that throws or hangs leaves the request's answer as it was.
- **Unit (main server):** the service without a token sends nothing; a failure is logged without the token; shutdown
  flushes.
- **Boundary tests:** `posthog-react-native` outside `mobile/src/telemetry/`, and `posthog-node` outside the main
  server's usage service.
- The SDKs are replaced in Jest by fakes that record calls, as Sentry's is.
- **By hand, on the Release's build:** events arrive in PostHog from a phone with usage chosen, with no IP address and
  no property beyond those above; nothing arrives from a User who chose no.

### Out of scope

- A switch for usage data in 내 정보, or any later change of the choice in the app.
- Any event not in the table above, autocapture of any kind, session replay, feature flags, surveys, heatmaps.
- Person properties, groups, and PostHog's data warehouse.
- The kind of the Assistant's answer, and other server-side analyses (questions for the reviewer, below).
- The Party (활성 파티) and the 관정도서관 group study rooms.
- A page of the admin site for usage data.
- A paid PostHog plan, and PostHog Cloud EU.

### Questions for the reviewer

Each has the answer the work follows until a reviewer says otherwise.

1. **Is the main server's part the right scope?** Should it send more, such as data for analyses of the Assistant's
   accuracy? Current answer: the main server sends the closing stage of four actions and nothing else.
2. **Should `assistant_reply_completed` carry the kind of answer** (a meal plan, a 파티 Proposal, a lookup, a refusal,
   an error), for a later analysis of quality? Current answer: no.
3. **Optional consent instead of required.** Current answer: optional, since 개인정보 보호법 제16조 3항 and 제22조 5항
   bar refusing the service over information it does not need.

## Tickets

| #   | Ticket                                                                               | Kind                          | Blocked by                                        |
| --- | ------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------- |
| 01  | Sentry's support for Expo 57 and React Native 0.86, and two points of the free plan  | A person, with what was found | None                                              |
| 02  | The layer, Sentry, the scrubbing, the error boundary, the test error                 | Code                          | 01                                                |
| 03  | The user at sign-in and sign-out, and the switch in 내 정보                          | Code                          | 02                                                |
| 04  | The Release workflow uploads source maps                                             | Code                          | 02                                                |
| 05  | The privacy policy's part for error reports, and the consent screen                  | Code and a person's review    | 03                                                |
| 06  | The account, the keys and the alert                                                  | A person                      | 01                                                |
| 07  | The Release, the APK to the testers, and the check on the Release's build            | A person                      | 02 to 06                                          |
| 08  | iOS: the build, its dSYM upload and its check                                        | A person                      | 07, and the decision whether the beta has iPhones |
| 09  | A new crash in Sentry is posted to the team's Slack channel by the main server       | Code, and a person's steps    | None                                              |
| 10  | The account keeps the consent's version and the usage choice                         | Code                          | None                                              |
| 11  | The consent screen asks on the account, with the optional item and the policy's part | Code and a person's review    | 10                                                |
| 12  | The app's PostHog layer: the SDK, identity, `app_opened`, screens, the registry      | Code                          | 11                                                |
| 13  | The app's events for the five actions, and `api_request_failed`                      | Code                          | 12                                                |
| 14  | The main server's events: the closing stage of four actions                          | Code                          | 10                                                |
| 15  | The settings, the Release, and the check that events arrive                          | A person                      | 11 to 14                                          |
| 16  | The dashboard "Beta" in PostHog                                                      | An agent, with a person's key | 15                                                |

02, 03 and 05 can be built before the account exists, since a build without the DSN is silent. Ticket 02 changes
native files and raises `version`; 03 to 05 do not.

Tickets 10 to 16 change no native file and need no new APK: each app ticket is an over-the-air update, and ticket 12
checks the fingerprint. Their order keeps the main line releasable. Ticket 10 is the main server alone, and changes
nothing a User sees. Ticket 11 needs it on Production first, and brings the consent item and the policy's part
together, so no User is asked about usage data the policy does not describe. Tickets 12 to 14 send nothing until a
User chose usage data in ticket 11's screen and ticket 15 sets the tokens. iOS is ticket 08's owner's, as for the crash
reports.

## Comments
