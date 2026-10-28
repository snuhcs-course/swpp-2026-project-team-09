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

### Built (2026-10-28), app

On `3.0/P07-04-app`, from `3.0/P07-01-abbreviation-matcher` at `2d8ec933`, against the spec's contract; the server half is a sibling branch.

- Types in a new `mobile/src/api/suggestion-types.ts` (`ChatSuggestion`, `SuggestionAction`, `SuggestionContext`, `SuggestionOutcome`), not in `assistant-types.ts`, and the guards and client in a new `api/server/suggestion-client.ts`, so that the merge with ticket 02's app half touches fewer lines; `isQuestProposal` in `assistant-client.ts` is only exported. `ApiClient` gains `getChatSuggestion(context)` (unwraps `{ suggestion }`, sends `screen` and `openCard=globalEvent:<id>`) and `sendSuggestionOutcome(id, outcome)`. An action of an unknown type refuses the whole answer, so an older app shows no row.
- The mock (`api/mock/suggestion.ts`) suggests "민준이랑 점심 어때요?" / "공강 시작 · 민준이도 공강", a closed lunch for two inviting 김민준 at the next quarter hour at least 15 minutes ahead (14:00 at the mocks' moment), and keeps the outcomes for the tests. The mocks have no 민수 and their first Friend, 강도윤, is in class, so it names the first free Friend instead of the spec's example.
- `features/assistant/use-suggestion.ts`: asks once per opening of the sheet, only when the chat is empty; drops an answer that comes after the sheet closed; a failure or 404 is no row and no message. The suggestion shows (row and placeholder) only while the chat is empty, so it comes back after 새 대화 within the same opening; closing the sheet drops it. `use-chat.ts` gains `propose(text, proposal)`, which adds the Assistant's bubble ("이렇게 만들어 볼까요?") with no request.
- `screens/main/chat-suggestion.tsx`: the grey row (text, reason, ×), the sheet's open and close with the suggestion (moved out of `chat-sheet.tsx`, which is at its 300-line limit), and the route action: closes the sheet, finds the Place in the places list and calls the map's `routeTo`, or says 길을 찾지 못했어요. `main-screen.tsx` passes the open Global Event card's id and `route.routeTo` down through `MapBottom`; `MainMapView` now takes `room` so that `MainScreen` stays under 50 lines.
- `confirmed` is sent when the card's 만들기 made the Quest (also when it lands in the room after a failed step). Left out: a Quest made through 수정 and the party form sends no `confirmed`, since the form does not hand the Quest's id back.
- After a tap on a Proposal suggestion the conversation starts with an Assistant message; the server's schema allows it.
- Tests: `__tests__/api/answers-suggestion.unit.test.ts` (guards), `__tests__/api/server-suggestion.integration.test.ts` (query, null, 404, outcome bodies against the fake server), `__tests__/chat-suggestion.integration.test.tsx` (mock client: row, placeholder, once per opening, the open event card, ×, tap into a Proposal bubble with no model call, `confirmed` with the Quest, route, none and failure).

### Changed (2026-10-28), after research note 10

Research note 10 (`.scratch/iteration-3/research/10-recent-papers-2024-2026.md`, scenario-4 plan §9) asks for two things of this ticket, both done here on the branch; the migration is rewritten in place, as the branch is unmerged, so a local database made from the earlier one is reset.

- **Missed needs beside acceptance** (ProactiveBench, ICLR 2025). `GET /assistant/suggestion` now writes one row of `suggestion_impressions` for every answer, the silent ones too: `template` and `propensity` are null and the outcome `silent` when nothing was shown, with `eligible` saying what could have shown, and the cooldown no longer skips the scoring, so a row written during one says what it held back. Each eligible template's Proposal ids are kept in `candidates` as `<template> <kind>:<id>` (a route has none). When a chat reply carries a Proposal, `SuggestionsService.typedInstead` (called by `AssistantService.reply`) marks the User's row of the last 10 minutes (`TYPED_WITHIN_MINUTES`) with the first eligible template, best score first, whose Proposal would have taken one of the Proposal's ids, as `typed_template` and `typed_at`. A mark on a silent row, or on a row that showed another template, is a missed need; a mark on the row of the template shown is the User typing what was suggested. A row that cannot be written is logged by its cause and never fails the reply. The acceptance read by the score counts shown rows only. Ticket 05 reads these marks.
- **The free text a Proposal holds** (Design Patterns for Securing LLM Agents, arXiv 2025-06). Audited: the model writes the title and the description freely, from the User's words; both are bounded by `makeQuestSchema` (50 and 200 characters) before the card exists and by `questProposalSchema` when sent back; `startsAt` must parse, `capacity` is 1 to 8, the Join Policy and Board are enums, every id must be in `FoundIds`, and names come from the catalog. The suggestions' Proposals, whose title and description are cut from an event's title or a Quest's own text, go through the same tool. Nothing was missing; a test of the description bound joins the title's (`assistant-proposals.integration.test.ts`), and the README and the spec say that the tap is the last line, not the defence.
- Tests: `suggestion-missed-needs.integration.test.ts` (the silent rows, during a cooldown too; the mark on a silent row and on the shown template's row; none after 10 minutes or for other ids). `suggestion-proposals` expects the silent row where it expected none.

### For the team to decide

- **A cost-sensitive threshold** (PRISM, ICLR 2026, slides only). The templates show from a fixed score (0.25, or 0.35 when a Friend is named). PRISM's form, p_accept ≥ C_FA / (C_FA + p_need · C_FN), would make the eligibility rule p_need, the learned acceptance p_accept, and the ratio of the cost of a false alarm to the cost of a missed need the one knob the team sets. Not implemented: with the missed needs now logged, the two costs can be set from observed rates first.
- **What counts as typed.** A Proposal matches a template on any one id of the template's Proposal; a route never matches, and the window is 10 minutes from the chat opening. A stricter match (all ids, the meal slot) or a longer window changes the missed-need rate; the data decides.

### Agent usage (2026-10-28)

- Agent time: about 79 minutes (estimate), two Opus 5.5 sessions in their worktrees, the server half and the app half, plus about 21 minutes of the orchestrating Fable 5.1 session, which wrote the spec and tickets, reviewed, merged and tested the stack, split evenly over tickets 02 to 05.
- Tokens (estimate): the building sessions about 46.6M input, of which about 46.0M cache reads, 655k cache writes and 408 uncached, and about 273k output; the orchestrating share about 10.1M input (9.9M cache reads, 132k cache writes) and 33k output. With cache reads excluded, about 1.1M in all.
