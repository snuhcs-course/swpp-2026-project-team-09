# 04: Grey suggestions and personal shortcuts

Parent: [P07 spec](../spec.md), "Ticket 04: grey suggestions and shortcuts"
Status: ready-for-agent
Blocked by: 01 (shares no table with 02 and 03; rebase onto 03 before it merges)

## What to build

When the chat opens, the server decides in under 100 ms, with no model call, whether one request fits the moment, from four templates scored by hand with two learned factors, and the app shows it in grey. A tap runs the stored action: a Proposal card through the usual 만들기, or a walking route. Every impression is logged with its propensity, outcome and the Quest it led to.

Server: `src/assistant/suggestions/` with the templates (each its eligibility, action and reason), the score, the exposure draw with an injectable random source, fatigue, holdback, the `GET /assistant/suggestion` and `POST /assistant/suggestions/:id/outcome` endpoints, the `suggestion_impressions` model and one migration; Proposals pass the checks `proposeQuest` applies, pulled into a shared function in `src/assistant/tools/propose-quest.ts`; the timetable is read through `TimetableService`, Friends through `FriendsService`, the User's led Quests through Prisma; settings `ASSISTANT_SUGGESTION_HOLDBACK_PERCENT`.

App: the grey row in `ChatEmpty` (text, reason, ×), the tap into a Proposal bubble or a route, the outcome calls, the AI input's placeholder, client functions and guards, a mock suggestion.

## Acceptance criteria

- [ ] The four templates of the spec, each eligible exactly when its rule holds, with the action and reason the spec gives; "free" and "a 공강 started" read from `class_times` as the spec defines them.
- [ ] A suggestion's Proposal passes the same checks as `proposeQuest` (shared function); one that would be refused is never shown.
- [ ] The score, the thresholds (0.25, and 0.35 for a template naming a Friend), the acceptance factor from the last 30 days by time-of-day bucket with Laplace smoothing, the repeats factor, and the fatigue cooldowns (2 h, 6 h, none that day) as the spec; constants in one file with their reasons.
- [ ] Exposure: 0.9 the top, 0.1 uniform among the eligible above threshold, from an injectable random source; `propensity` written as the spec computes it.
- [ ] `ASSISTANT_SUGGESTION_HOLDBACK_PERCENT` (default 10) by the stable hash of the user id; held-back impressions use base weights only and record `holdback`.
- [ ] `suggestion_impressions` as the spec's table, cascade from users; the outcome endpoint takes `accepted`, `dismissed` and `confirmed` with `questId`; another User's impression is 404.
- [ ] The endpoint answers within 100 ms on the seeded test world (measured in a test with a generous bound, say 300 ms, so that CI does not flake).
- [ ] App: the grey row above the examples when the chat opens, with the screen and the open card sent; a tap on a `proposal` adds an Assistant bubble with the card and sends `accepted`; a tap on a `route` closes the chat and starts the route; × sends `dismissed`; 만들기 on that card sends `confirmed` with the Quest id; the placeholder shows the text while a suggestion is held; the mock client answers a fixed suggestion.
- [ ] Tests as the spec's Testing Decisions for 04; README paragraph; `pnpm lint`, `pnpm typecheck` and the touched tests pass in both packages.

## Comments
