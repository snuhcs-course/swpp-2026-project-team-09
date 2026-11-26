# 14: The main server's events: the closing stage of four actions

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: done
Blocked by: 10

Native files: none. Releases: the main server. Nothing is sent until ticket 15 sets `POSTHOG_PROJECT_TOKEN`, and
nothing for a User until ticket 11's screen has recorded the usage choice.

## What happens now

- The four actions are done here, each in its own transaction:
  - the Assistant's reply: `AssistantService.reply` (`main-server/src/assistant/assistant.service.ts:131`), for
    `POST /assistant/messages`; `POST /assistant/answers` and `POST /assistant/taps` ask no model and are not counted;
  - a 파티 made: `QuestsService.make` (`src/quests/quests.service.ts:122`), `QuestsService.attend` (`:99`, which says
    whether it `created` a Quest), and `PlansService.make` (`src/plans/plans.service.ts:116`) apart from `makeAlone`
    (`:190`), a Quest taken alone;
  - a User becomes a Holder: `RecruitingService.join` (`src/quests/recruiting.service.ts:154`),
    `InvitationsService.accept` (`src/quests/invitations.service.ts:141`) and the Leader's `JoinRequestsService.accept`
    (`src/quests/join-requests.service.ts:145`), for the requesting User;
  - two Users become Friends: `FriendsService.accept` (`src/friends/friends.service.ts:191`), a crossed request in
    `sendRequest` (`:143`, the answer `friends`), and `befriend` (`:151`) as an Invite Link's accept calls it
    (`src/invite-links/invite-links.service.ts:108`). The admin site's `befriend` (`src/friends/admin-friends.service.ts:98`)
    is an Administrator's and is not counted.
- Optional settings are in `src/common/settings.ts`, empty by default (`SENTRY_WEBHOOK_SECRET` at `:195`). An
  optional secret reaches Production from Parameter Store through `optional_line_parameter` in
  `.github/release/release.sh` (`:452`) and the Secret `secrets` in
  `infra/production/k8s/parts/main-server/main-server.yaml` (`:84`); `infra/production/k8s/test/targets.sh` checks
  the keys reach the Deployment.
- P08 ticket 09's `src/sentry-alerts/` is the model for a call out that is optional, off when unset, logged without its
  secret, and never fails a request.
- `app.enableShutdownHooks()` is on (`src/main.ts:28`).

## What to build

- **`posthog-node`**, in one usage module (`src/usage/`), whose service is the only importer. Its host is
  `https://us.i.posthog.com`, `disableGeoip` is on, and no person property is set. Each option's name and default is
  checked against the installed version's reference.
- **The setting `POSTHOG_PROJECT_TOKEN`**, optional, `''` by default; a refusal of its shape never repeats it. Unset,
  the service makes no client and sends nothing. In Production it is the Parameter Store parameter
  `posthog-project-token`, read with `optional_line_parameter` (absent is written empty, so a Release passes without
  it) and passed from the Secret `secrets`; `targets.sh` and `release.bats` gain its cases.
- **One call, `sent(userId, event, properties)`**, with the event and its properties typed from the server's own
  registry: `assistant_reply_completed`, `party_creation_completed` (`visibility`), `party_join_completed` (`how`) and
  `friendship_creation_completed` (`how`), each with `source: 'server'` and the User id as `distinctId`. It:
  - is called after the transaction has committed, never inside it, and is not awaited by the request;
  - reads the account's consent with ticket 10's rule and sends nothing unless it holds `CONSENT_VERSION` with usage
    chosen; it reads it again for each event, with no copy kept, so the switch in 내 정보 holds from the next event; a
    failed read drops the event;
  - drops the event and logs one warning on a failure or a timeout of PostHog, naming the error's type and never the
    token or the error's message; the User's answer is as it would have been without it.
- **The four closing stages**, at the places above: the reply when the Assistant answers 200; a 파티 made with the
  stored Quest's `visibility`, and `attend` only when it `created` one; `party_join_completed` for the joining User with
  `how` `joined_directly`, `invitation_accepted` or `request_accepted`; `friendship_creation_completed` once for each
  of the two Users with `how` `request_accepted`, `invite_link_accepted` or `requests_crossed`.
- **Flushed at shutdown:** the module calls the client's `shutdown` when the application closes, with a limit of a few
  seconds.
- **Documents:** the main server's README (Usage data: the events, the setting, the consent rule, what is never sent),
  `.env.example`, the root README's settings table, and the infra README's parameters.

## Must not break

- Every route's answer, status and timing: a slow PostHog adds nothing to a request.
- A start of the main server without the setting, and the tests that do not set it.
- The logging rules of the main server's README: no secret in a log line.
- The demo seed and the admin site's befriending, which send nothing.

## Acceptance criteria

- [x] Without the token, no client is made and nothing is sent. (Unit test.)
- [x] With a token and a User who chose usage data: a 파티 made by the form, one for a Global Event that is new, a
      Plan made, a join, an invitation accepted, a join request accepted, a Friend Request accepted, an Invite Link
      accepted, crossed Friend Requests and an Assistant reply each send their event once (twice for Friends, one for
      each User), with the right `distinctId` and properties, after the commit. (Integration tests through the started
      server with its database and a stand-in for PostHog's client.)
- [x] `attend` that finds the User's existing Quest, a Plan taken alone, and the admin site's befriending send nothing.
      (Integration tests.)
- [x] A User who chose no, whose account holds no version, or who turned the switch off (`PUT /users/me/usage-consent`
      with false) sends nothing from the next event on; turned on again, events are sent again. (Integration test.)
- [x] A PostHog that throws, or does not answer, leaves the request's answer as it was, and the warning holds no token.
      (Integration test with the stand-in; a test on the captured log.)
- [x] The application's close flushes the client. (Unit test.)
- [x] An import of `posthog-node` outside `src/usage/` fails a test that reads the source tree.
- [ ] `release.bats` and `targets.sh` cover the parameter absent and present; CI's `release-script` job passes.
      (Both cover it; the job has not run yet, see below.)
- [x] The READMEs and `.env.example` say the above.
- [x] Lint, format and types of the main server pass.

## Comments

### Built (2026-11-26)

What was built (main server and the Release only; nothing is sent until ticket 15 stores the token):

- `src/usage/`: `usage-events.ts` (the registry: the four events, each with its properties' type, and
  `visibilityOf(joinPolicy)`), `usage.service.ts` (`UsageService.sent(userId, event, properties)`, the client
  interface `UsageClient` behind the injection token `USAGE_CLIENT_FACTORY`, the real factory `posthogClient`, and two
  helpers that call `sent`: `partyMade` and `friendsMade`), `usage.module.ts`. `usage.service.ts` is the only importer
  of `posthog-node`.
- `posthog-node` 6.0.6, pinned exactly. 6.1.0 was the newest (2026-11-25) but younger than pnpm's minimum release age,
  and adding it made pnpm write an exclusion into `pnpm-workspace.yaml`; 6.0.6 (2026-11-23) needs none. Its engine,
  `^20.20.0 || >=22.22.0`, takes the server's Node 24. Options checked in the installed `dist/types.d.ts` and `src/`:
  `host: 'https://us.i.posthog.com'` (also the default), `disableGeoip: true` (posthog-node's default is already true,
  set anyway), `requestTimeout: 5000` (default 10000), `captureMaxRetries: 0` (default 3). Each event goes by
  `captureImmediate`, one request, so a failure drops that event: the queued `capture` keeps an event whose request
  got no answer and tries it again later (`keepUnsent` in its capture lane), which the ticket's "drops the event" rules
  out. Failures reach the `'error'` listener as `CaptureError` with the transport error as `cause` (`AbortError` on a
  timeout); with a listener the SDK prints nothing of its own. `shutdown(3000)` is called from `onApplicationShutdown`.
- The hooks, each after the work is committed (after the `$transaction` returns), not awaited:
  - `assistant_reply_completed`: `AssistantService.answered` (`src/assistant/assistant.service.ts:177`), called by
    `reply` only after `runFeature` answered; a 503 or a 429 sends nothing.
  - `party_creation_completed`: `QuestsService.attend` (`src/quests/quests.service.ts:122`, only when `created`) and
    `make` (`:131`); `PlansService.make` (`src/plans/plans.service.ts:147`) and `makeNewQuest` (`:188`), not
    `makeAlone`. `visibility` comes from the stored Quest as the answer reads it (`joinPolicy`).
  - `party_join_completed`: `RecruitingService.join` (`src/quests/recruiting.service.ts:172`, `joined_directly`),
    `InvitationsService.accept` (`src/quests/invitations.service.ts:163`, `invitation_accepted`),
    `JoinRequestsService.accept` (`src/quests/join-requests.service.ts:163`, `request_accepted`, for `request.userId`).
  - `friendship_creation_completed`, once for each User: `FriendsService.sendRequest` (`src/friends/friends.service.ts:150`,
    `requests_crossed`, only when it answers `friends`), `FriendsService.accept` (`:207`, `request_accepted`),
    `InviteLinksService.accept` (`src/invite-links/invite-links.service.ts:121`, `invite_link_accepted`).
    `FriendsService.befriend` sends nothing, so the admin site's befriending sends nothing.
- `POSTHOG_PROJECT_TOKEN` in `src/common/settings.ts` (`''` by default; else `phc_` and letters and digits, refused as
  "Expected a PostHog project token or nothing", which never repeats it), `.env.example`, the root README's table.
  Production: `optional_line_parameter posthog-project-token` in `release.sh`'s `write_secrets`, the env entry from the
  Secret `secrets` in `main-server.yaml`, and `targets.sh` checks the key empty (absent) for `main-server` and `all`
  and stored (a second render with a stand-in token).
- Documents: main-server README section "Usage data" and the folder layout; `infra/production/README.md` section
  "Usage data in PostHog" (the parameter, setting and deleting it) and the two lists of parameters.
- Tests: `usage-service.unit.test.ts` (no token, no client; consent read for each event; failed read; a rejecting and
  a reported failure, one warning without the token; shutdown with its limit), `posthog-client.unit.test.ts` (the
  real client with its `fetch` replaced: the US host, `$geoip_disable`, no `$set`, the close waits for a pending send,
  one try and the failure through `onError`; and the import boundary over `src/`), `settings-posthog.unit.test.ts`,
  `usage-events.integration.test.ts` (every flow of the second criterion, the three that send nothing, the consent
  cases), `usage-failures.integration.test.ts` (throws, a reported timeout, and a hang), `usage-plans.integration.test.ts`
  (a meal's Plan with a Friend, and one taken alone). `test/usage.ts` holds the stand-in `PostHogStub`; `startApp`
  takes `{ posthog }` and by default refuses to make a client; `global-setup.ts` sets the token empty;
  `MealPlanStage.start` takes settings and the stand-in.

Decisions and things inferred:

- `attend` sends when its `created` is true, which also covers a Quest the User took alone for the Global Event that
  the party form turns into a gathering one (`gatheringFrom`): the ticket says "only when it `created` one", and the
  code calls that a 파티 from now on. An `attend` that finds the User's 파티 sends nothing (tested).
- A booking party's invitation accepted through the room request's consent (`RoomConsentsService.consent` calls
  `InvitationsService.accept`) is not counted: the spec lists only `POST /quest-invitations/:id/accept` as an accepted
  invitation and leaves Booking Parties out. `accept` takes `{ forBooking: true }` from there.
- A Global Event's new Quest is Closed by default, so `POST /quests` sends `visibility: private`.
- `partyMade` and `friendsMade` are small helpers next to the service, so that the four services near the 300-line
  limit stay under it; both only call `sent`.
- The integration tests replace PostHog's client, as the ticket says, not the network (ADR 0007 says outside services
  are replaced at the network); the adapter's own unit test covers the real client over a replaced `fetch`.
- A hanging PostHog cannot slow a request by construction (nothing awaits the send); its test shows the answer and a
  second request come while the first event still waits. The SDK's own 5-second timeout is not waited out in a test.

Checks run (2026-11-26, on this machine):

- `tsc --noEmit`, `oxlint --type-aware`, the test-level check and `prettier --check .`: pass.
- Unit: the three new files and `settings.unit.test.ts`: pass. Integration: the three new files; and the existing
  `quests`, `own-quests`, `quest-joining`, `quest-invitations`, `quest-join-requests`, `plans`, `plans-alone-meal`,
  `plans-new-quest`, `friend-requests`, `friends`, `invite-links`, `admin-friendships`, `assistant`,
  `assistant-reply-text`, `room-requests`, `demo-seed`, `consent`, `usage-consent`, `sentry-alerts`: pass.
- `settings.integration.test.ts`'s first case starts the application in about 5 seconds on this loaded machine with or
  without this change (5016 ms and 4626 ms measured on the base), and timed out at its 5-second limit in 2 of 4 runs
  here, 0 of 3 on the base; `startup.integration.test.ts`'s two unreachable-server cases time out on the base too.
  Importing `posthog-node` takes about 130 ms.
- `infra/production/k8s/test/targets.sh`: every check ok, the three new among them.
- `release.sh write-secrets` by hand with fake parameters: absent writes `POSTHOG_PROJECT_TOKEN=`, present writes its
  line, two lines fail naming the parameter; no value printed. bats and shellcheck are not installed here, so CI's
  `release-script` job is the first run of the new `release.bats` case.

### Agent usage (2026-11-26)

- Agent time: about 50 minutes (estimate), one session.
- Tokens: 354,902 in all for the implementation session, as its usage reports; the split into input, cache reads, cache writes and output was not available.
