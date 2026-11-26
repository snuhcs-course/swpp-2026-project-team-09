# 14: The main server's events: the closing stage of four actions

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-agent
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

- [ ] Without the token, no client is made and nothing is sent. (Unit test.)
- [ ] With a token and a User who chose usage data: a 파티 made by the form, one for a Global Event that is new, a
      Plan made, a join, an invitation accepted, a join request accepted, a Friend Request accepted, an Invite Link
      accepted, crossed Friend Requests and an Assistant reply each send their event once (twice for Friends, one for
      each User), with the right `distinctId` and properties, after the commit. (Integration tests through the started
      server with its database and a stand-in for PostHog's client.)
- [ ] `attend` that finds the User's existing Quest, a Plan taken alone, and the admin site's befriending send nothing.
      (Integration tests.)
- [ ] A User who chose no, whose account holds no version, or who turned the switch off (`PUT /users/me/usage-consent`
      with false) sends nothing from the next event on; turned on again, events are sent again. (Integration test.)
- [ ] A PostHog that throws, or does not answer, leaves the request's answer as it was, and the warning holds no token.
      (Integration test with the stand-in; a test on the captured log.)
- [ ] The application's close flushes the client. (Unit test.)
- [ ] An import of `posthog-node` outside `src/usage/` fails a test that reads the source tree.
- [ ] `release.bats` and `targets.sh` cover the parameter absent and present; CI's `release-script` job passes.
- [ ] The READMEs and `.env.example` say the above.
- [ ] Lint, format and types of the main server pass.

## Comments
