# 09: A new crash in Sentry is posted to the team's Slack channel by the main server

Parent: [P08 spec](../spec.md)
Status: ready-for-human
Blocked by: None (the main server only; it needs nothing of tickets 02 to 05)

Native files: none. Releases: the main server. A person adds two settings before the Release, and the alert in Sentry
after it.

## What happens now

- Sentry's free plan has one member and no Slack integration (ticket 01), so only the account's owner is told of a new
  crash, by email.
- The main server's own warnings reach Slack since A02, each server through an Incoming Webhook of one Slack app, and
  an Incoming Webhook can post to the one channel it was made for and to no other.
- The main server already reaches the internet on 443 (the AI, Kakao), so it can reach `hooks.slack.com`.

## What to build

Sentry calls the main server when an alert fires, and the main server posts one short line to Slack through an Incoming
Webhook made for the app's crash channel (`#team9-app-crash`, a private channel). The channel is fixed by the
webhook: the main server holds no channel name and cannot post anywhere else.

- **Two settings of the main server**, both optional and both secrets:
  - `SENTRY_WEBHOOK_SECRET`: the client secret of the Sentry internal integration, with which Sentry signs each
    request;
  - `APP_CRASH_SLACK_WEBHOOK`: the Incoming Webhook's URL.
    With either unset the route answers 404 and does nothing, which is how the Dev Server, a local start and the tests
    that do not set them behave. They reach Production as the main server's other secrets do (Parameter Store), are
    never logged, and appear in no answer.
- **`POST /sentry/alerts`**, public, since Sentry has no token of ours. It takes the request only when its
  `Sentry-Hook-Signature` header is the HMAC-SHA256 of the raw body with `SENTRY_WEBHOOK_SECRET`, compared in constant
  time; anything else is answered 401 and nothing is posted. The raw body is what is signed, so the route reads it as
  it came. The names of Sentry's headers and the shape of its body for an issue alert are checked against Sentry's
  documents for webhooks of internal integrations, and written under Comments.
- **What is posted.** One message for an alert: the issue's title, where it happened (`culprit`), its level, the
  `release_tag` and `platform` tags when the event carries them, and the link to the issue in Sentry. No stack, no
  user, no breadcrumbs, no request. Each part is cut (the title to 200 characters) and Slack's markup in it is made
  harmless (`&`, `<` and `>` escaped), so that a crash's words cannot mention a channel or a person.
- **A cap.** At most 10 posts a minute for each pod, counted in memory; what is over the cap is dropped and counted in
  one warning line a minute. A Slack answer other than 200, or none within 5 seconds, is logged as a warning without
  the webhook's URL and is not retried. Sentry is always answered 200 once the signature held, so that it does not
  send the alert again.
- **Documents.** The main server's README (the route, the two settings, what a post holds and what it never holds),
  `.env.example`, the root README's settings table, and the infra README: where the two secrets go, and the steps in
  Slack and in Sentry below.

## People's steps

1. In Slack, make the private channel `#team9-app-crash`, and in the app that holds the servers' webhooks add an
   Incoming Webhook for it. The URL is a secret: `read -rs`, never in chat or a document.
2. In Sentry: Settings › Custom Integrations › a new internal integration with the webhook URL
   `https://api.snunow.com/sentry/alerts`, the permission Issue & Event: Read, and the webhook Issues with Created and
   Unresolved ticked. Its client secret is a secret too.
3. Put the two values where the main server's secrets are kept, then Release the main server.
4. Send the test error from the app (ticket 02) and see the post in the channel.

## Must not break

- Every other route, and a start of the main server without the two settings.
- The logging rules of the main server's README: no secret and no URL with a secret in a log line.

## Acceptance criteria

- [x] With both settings, a signed issue alert posts one message to the webhook, holding the title, the culprit, the
      level, the release tag and the link, with Slack's markup escaped and the title cut. (Integration test with a
      stand-in for Slack.)
- [x] A request with a wrong or missing signature is answered 401 and posts nothing; a body changed after signing is
      refused. (Integration test.)
- [x] With either setting unset, the route answers 404 and posts nothing. (Integration test.)
- [x] The eleventh alert in a minute posts nothing and is counted in a warning. (Unit or integration test with the
      clock.)
- [x] A failing or slow Slack is logged without the webhook's URL, and Sentry is still answered 200. (Integration
      test.)
- [x] Neither secret appears in a log line or an answer. (Test on the captured log.)
- [x] The READMEs, `.env.example` and the infra README say the above.
- [x] Lint, format and types of the main server pass.
- [ ] After the Release and the people's steps: the app's test error is posted in `#team9-app-crash`. (A person
      checks it and writes the result here.)

## Comments

### Built (2026-11-24)

Sentry's facts, read on 2026-11-24 in its documents:

- <https://docs.sentry.io/organization/integrations/integration-platform/webhooks/>: every webhook request carries
  `Content-Type`, `Request-ID`, `Sentry-Hook-Resource`, `Sentry-Hook-Timestamp` and `Sentry-Hook-Signature`. The
  signature is the HMAC-SHA256 hex digest of the exact request body bytes, keyed with the integration's Client Secret;
  the page says not to parse the JSON and serialize it again, and its Node example reads the body with `express.raw`.
  "Webhooks should respond within 1 second"; the page says nothing of retries.
- <https://docs.sentry.io/organization/integrations/integration-platform/webhooks/issue-alerts/>: the resource is
  `event_alert` (`Sentry-Hook-Resource: event_alert`), `action` is `triggered`, and `data` holds `event`,
  `triggered_rule` and `issue_alert`. `data.event` has `title`, `culprit`, `level`, `tags` as `[name, value]` pairs,
  `web_url` (the issue's event page on sentry.io), `issue_url` and `url` (both API URLs).
- Not verified: whether an alert rule's "Send test notification" sends the same shape, and the exact labels of Sentry's
  and Slack's settings pages in the people's steps (written from the ticket and the documents' names).

What was built:

- `src/sentry-alerts/`: `POST /sentry/alerts` (`@Public()`), `CrashAlertsService` (cap, post, warnings) and
  `crash-post.ts` (signature check, tolerant reading, the Slack text). The body is taken raw for that path only, in
  `src/common/json-body-limit.ts`, as the timetable reading's own parser is, so `rawBody` is not turned on for the app.
- Settings `SENTRY_WEBHOOK_SECRET` and `APP_CRASH_SLACK_WEBHOOK`, both `''` by default; the webhook, when set, must be
  an `https://` URL, and the refusal does not repeat it.
- Production: `.github/release/release.sh` reads the parameters `sentry-webhook-secret` and `app-crash-slack-webhook`
  with a new `optional_line_parameter` (absent → written empty, so a Release passes without them; over one line → the
  Release fails naming the parameter), and `main-server.yaml` passes both from Secret `secrets`.
  `k8s/test/targets.sh` checks the keys reach the Deployment, an absent one as an empty key (a missing key would keep
  the pod from starting); `release.bats` gains two cases and the empty lines in its expected file.
- Documents: the main server's README (Crash alerts from Sentry, and the folder layout), `.env.example`, the root
  README's table, and `infra/production/README.md` (Crash alerts in Slack: the parameters, the people's steps,
  replacing a value, turning it off; First setup step 5 and Moving to account B mention them).

Decisions and differences from the ticket:

- The post to Slack is not awaited: Sentry wants an answer within 1 second and Slack is given 5, so the answer 200 goes
  at once after the signature check. The tests wait for the stand-in to be called.
- Only `Sentry-Hook-Resource: event_alert` is posted. Another resource, and a signed body that is not JSON, are
  answered 200 and not posted; the second writes a warning.
- The link is `web_url` only: `issue_url` is an API URL, not a page. A `web_url` not on `sentry.io` or a subdomain over
  https, or holding `|`, `<`, `>` or whitespace, leaves the post without a link. `&` in the link is written `&amp;`.
- Every part is put on one line (runs of whitespace become one space) besides being cut and escaped. The culprit is cut
  to 200 characters, the level and tags to 50; a cut part ends in `…`.
- The minute's drops are written when the minute is over: at the next alert, or by a job at 30 seconds past each
  minute, so that a burst with no later alert is still counted.
- A failed post's warning names the error's type only (`TypeError`), never its message, which could hold the URL.
- The post's first line reads `App crash: <title>`, the second `at <culprit> · level <level> · release <release_tag> ·
platform <platform>`, the third `<web_url|Open the issue in Sentry>`.

Checks run: `pnpm lint`, `prettier --check .` and `tsc --noEmit` in `main-server`; `test/crash-post.unit.test.ts` and
`test/settings.unit.test.ts`; `test/sentry-alerts.integration.test.ts`, `test/sentry-alerts-failures.integration.test.ts`,
`test/sentry-alerts-off.integration.test.ts`, and `health`, `admin-log-test`, `timetable-reading` and `menus` for the
changed `startApp` and body parsers; `infra/production/k8s/test/targets.sh`. `bats` and `shellcheck` are not installed
on the machine it was built on, so `release.bats` was not run there; `write-secrets` was run by hand with the parameters
absent, present, and over two lines, and gave what the new cases expect. CI's `release-script` job runs them.

### The plan's check (2026-11-25)

Seen on the account, on the page that makes an internal integration:

- **Alert Action is locked** on the free plan, so an alert rule cannot call the main server. The route as first built,
  which read only an issue alert (`event_alert`), would never have been called.
- **The integration itself can be made,** and with Issue & Event: Read its webhook **Issues** can be ticked, with
  Created and Unresolved, without a lock.

So the route now also reads Sentry's issue webhook (`Sentry-Hook-Resource: issue`; Integration Platform › Webhooks ›
Issues, read on 2026-11-25): `action` is one of `created`, `resolved`, `assigned`, `archived`, `unresolved`, and
`data.issue` holds `title`, `culprit`, `level`, `platform` and `web_url`. Only `created` and `unresolved` are posted,
the second as "App crash again". The issue webhook has no tags, so such a post has no release; the link leads to it.
The alert form is kept for a plan that offers it. The people's steps lose the alert rule. Not seen yet: a real
request from Sentry, which the last criterion's check will show.

### Agent usage (2026-11-24)

- Agent time: about 1 hour (an estimate), in one session.
- Tokens: 237,758 in all for the implementation session, as its usage reports; the split into input, cache reads, cache writes and output was not available when this was written.
