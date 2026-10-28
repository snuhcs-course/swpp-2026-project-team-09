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

### Built (2026-10-28)

The server half. The app half (the grey row in `ChatEmpty`, the tap into a Proposal bubble or a route, the outcome calls, the placeholder, the client and the mock) is still open.

- `main-server/src/assistant/suggestions/`: `constants.ts` (every number with its reason), `templates.ts` (the four templates on plain data), `timetable-status.ts` (free, 공강 started, next class), `scoring.ts` (bucket, acceptance, score, thresholds, the draw, fatigue), `holdback.ts`, `random.ts` (`SUGGESTION_RANDOM`), `korea-day.ts`, `suggestion-candidates.service.ts` (the reads and the Proposals), `suggestions.service.ts` (score, draw, impression, outcome), `suggestions.controller.ts` and `dto/`. Registered in `AssistantModule`, which now imports `TimetableModule`.
- `suggestion_impressions` and the enum `suggestion_outcome`, migration `20261028150000_add_suggestion_impressions`, with checks: `outcome_at` is set exactly when the outcome is not `shown`, `quest_id` exactly when it is `confirmed`, and `0 < propensity <= 1`. Indexes on `(user_id, shown_at)` and `(bucket, shown_at)`.
- `ASSISTANT_SUGGESTION_HOLDBACK_PERCENT` (0 to 100, default 10) in `settings.ts` and `.env.example`. The test settings hold back no account, and the holdback test starts an app with 100.
- README § Assistant: one paragraph.
- Tests: `suggestion-scoring`, `suggestion-templates` and `suggestion-repeat` unit tests; `suggestion-templates`, `suggestion-proposals`, `suggestion-scoring`, `suggestion-outcomes` and `suggestion-holdback` integration tests. The timing test answered in about 77 ms locally with all four templates eligible (bound 300 ms).

Decisions where the spec left room:

- **Shared checks.** The suggestion runs `proposeQuest(services).run` itself, with a `ToolContext` whose `FoundIds` hold the template's ids, `shown: null` and a fresh `Presented`, and takes `presented.proposal`; a refusal leaves the template out. Nothing was pulled out of `propose-quest.ts`, so the chat and the suggestions run one code path.
- **A Friend with sharing on** is a Friend whose friendship has its switch on at both ends, as Location Sharing reads a shared relationship. The Master Switch is not required: a timetable is not a position. The Friend named is the first free one in the order of the User's list.
- **Texts and reasons** the spec gives no example for: lunch `{name}랑 점심 어때요?` with the particle chosen by es-hangul (지훈이랑), reason `공강 시작 · {name}도 공강`, or `점심시간 · …` when no 공강 just started; route `{place}까지 길 안내할까요?`, `{course} {HH:MM} 시작`; event `{title} 같이 갈 파티 만들까요?`, `열어 본 행사 · {M}월 {D}일 {HH:MM}`; repeat `지난번처럼 {place}에서 {slot} 어때요?`, `최근 2주 {n}번 · 오늘|내일 {HH:MM}`.
- **Event.** An event without an end has ended once it starts. One that started and has not ended passes the rule but `proposeQuest` refuses its start in the past, so it never shows. A long title is cut with `…` so that the 파티 title fits 50 characters; the description is `{title} 같이 갈 사람 모집해요`.
- **repeat_last.** A Quest's time and Place are those of its first Sub Quest with a Place whose start lies in the last 14 days, up to now. The slot's next occurrence is the last Quest's time of day, today when at least 15 minutes ahead, else tomorrow. Beyond the Join Policy, Board and capacity the spec lists, the Proposal keeps the last one's description (a 공개 파티 needs one) and a Closed one invites its Holders who are still Friends (a 비공개 파티 needs one). Of several habits, the one with the most Quests wins, then the most recent. Quests named by a `confirmed` impression are no habit.
- **`eligible`** holds every template whose rule held and whose Proposal passed, best score first, those under their threshold too; the draw is among those over it.
- **Fatigue.** A dismissal's cooldown follows its rank in its own day in Korea, so that one late in the evening reaches past midnight.
- **Outcomes.** `accepted` and `dismissed` replace only `shown`, `confirmed` also `accepted`. The same outcome again answers 204 and changes nothing; any other answers 409 `SUGGESTION_OUTCOME_SETTLED`. `questId` is not checked against the Quests.

When this branch is rebased onto 02 and 03: `proposalOf` in `suggestion-candidates.service.ts` builds the `ToolContext` and `ProposeQuestServices` by hand, so a field 02 adds to either has to be added there too.
