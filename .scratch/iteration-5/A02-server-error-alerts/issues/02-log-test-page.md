# 02: An Administrator writes a test log line from the admin site's Log test page

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

PR: A. Native files: none. Releases: the main server and the admin site.

## What happens now

The only way to see whether a warning reaches anyone is to make the server fail. Nothing writes a harmless line at a chosen level.

## What to build

**The main server's test API.**

- `POST /admin/log-test`, for Administrators only through the global Administrator guard, like the other `admin/` controllers.
- The body is `{ "level": "info" | "warn" | "error" }`, checked with a zod body schema as the other admin bodies are. Anything else answers 400.
- It writes exactly one line at that level through its class's logger (info through `log`) and answers 204. The lines are:
  - `A test info line from the admin site, by Administrator <id>`
  - `A test warning from the admin site, by Administrator <id>`
  - `A test error from the admin site, by Administrator <id>`
- The Administrator is named by ID, never by email. It changes nothing else and needs no Idempotency-Key: a repeat only writes one more test line.
- The main server's README documents it in the Administrators section, and says that the load balancer refuses `/admin/*`, so that in Production only the admin site reaches it.

**The admin site's Log test page.**

- A "Log test" section, the last entry of the site menu, with one page.
- Three buttons: info, warn and error. Each calls a server action that sends its level to the main server as the signed-in Administrator, as the Settings page's actions do.
- After a press the page says "Sent. warn and error go to the Slack channel, info stays in the server logs." A refusal shows the main server's message, as the other pages do.

The line is written in whichever format ticket 01 sets; this ticket does not depend on it.

## Acceptance criteria

- [ ] As an Administrator, each level answers 204, and exactly one captured line has that level and the Administrator's ID. (Main server integration test, with the log capture helper.)
- [ ] Without a token, with a User's token or with a removed Administrator's token, the request is refused and nothing is logged; the route joins the list in the admin changing-refusals test. (Integration tests.)
- [ ] A level outside the three, or no body, answers 400 and nothing is logged. (Integration test.)
- [ ] The page shows the three buttons; a press on warn sends `{"level":"warn"}` to `/admin/log-test` with the Administrator's bearer token and shows the "Sent." line; a refusal shows the main server's message. (Admin site integration test, against the fake main server.)
- [ ] Locally, each button prints its level's line in the main server's terminal. (Hand check; the PR shows a screenshot of the page and of the three lines.)
- [ ] The main server's README documents the API in the Administrators section.
- [ ] Lint, format and types of the main server and the admin site pass.

## Comments
