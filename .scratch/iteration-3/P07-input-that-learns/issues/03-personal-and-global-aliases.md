# 03: Personal and global aliases

Parent: [P07 spec](../spec.md), "Ticket 03: personal and global aliases"
Status: ready-for-agent
Blocked by: 02

## What to build

What a User chose becomes their own alias at once; what several distinct accounts chose becomes everyone's, with decay, downvotes, retirement, a kill switch and a holdback. Aliases are tier 2 of the Place matcher (`PlaceAliases` in `src/places/place-aliases.ts`, consulted by `PlaceIndex` in order: personal, global, curated) and a first step of `resolveFriend`. Every alias points at a catalog Place or a current Friend, so `FoundIds` keeps covering what `proposeQuest` takes.

Server: `user_aliases` and `place_aliases` as the spec's tables, one migration; `src/assistant/aliases/` with the service (learning from `chosen`, `edited` and `rejected` events, the promotion rule with its constants in one file), the two sources, the controller for `GET /assistant/aliases`, `DELETE /assistant/aliases/:id` and `POST /assistant/aliases/reject`; `PlaceAliases.lookup` and `PlaceIndex.match` become async; `resolvedBy` on the reply; settings `ASSISTANT_GLOBAL_ALIASES` and `ASSISTANT_ALIAS_HOLDBACK_PERCENT`.

App: the "학관 → 학생회관으로 찾았어요 · 아니에요" line under a bubble whose reply has `resolvedBy`; the 내가 가르친 말 screen under 내 정보 with delete and its empty state; client functions and guards; mock answers.

## Acceptance criteria

- [ ] A `chosen` or `edited` event upserts the User's alias (`uses` + 1); a `rejected` event deletes it. A personal alias answers `one` for one taught target and `several` for more, before every tier but the exact one, and only for that User.
- [ ] Global promotion for Places as the spec: distinct accounts older than 7 days, one vote per account, words and target a day, k = 3 and s = 0.8; `score` with the 30-day half-life; retirement at a score of 0 or a share under s. Constants in one file with their reasons.
- [ ] `ASSISTANT_GLOBAL_ALIASES=false` turns the global source off at once; `ASSISTANT_ALIAS_HOLDBACK_PERCENT` keeps that share of accounts, by a stable hash of the user id, from global aliases while they still teach.
- [ ] `resolveFriend` answers the User's friend aliases first, only those still Friends; friend aliases are never promoted.
- [ ] `resolvedBy` lists each alias answer with result `one` (kind, words, id, label, source).
- [ ] The three endpoints as the spec; another User's alias is 404 on delete; reject writes the event, deletes the personal alias and recomputes the global one.
- [ ] Safety tests: one account teaching ten times makes no global alias; three distinct accounts do; a 3-day-old account does not count; rejections by distinct accounts retire it; a held-back account gets no global alias but its own; an alias whose Place left the catalog, or whose Friend is no Friend, never answers; `proposeQuest` takes an alias-resolved id.
- [ ] App: the 찾았어요 line with 아니에요 calling reject; 내가 가르친 말 lists, deletes and shows "아직 가르친 말이 없어요"; a friend target no longer a Friend shows as "친구".
- [ ] Tests as the spec's Testing Decisions for 03; README paragraph; `pnpm lint`, `pnpm typecheck` and the touched tests pass in both packages.

## Comments

### Built (2026-10-28), server

On branch `3.0/P07-03-personal-and-global-aliases`, from `3.0/P07-02-chips-and-resolution-events` at `9d510c8d`.

- Tables `user_aliases` and `place_aliases` as the spec (models `UserAlias` and `PlaceAlias`, `kind` reusing `ResolverKind`, a new enum `PlaceAliasSource` mapped to `place_alias_source`), migration `20261028130000_add_aliases` with CHECKs for words of 1 to 50 characters. `place_aliases` rows go with their Place (cascade), `user_aliases` rows with the account.
- `src/assistant/aliases/`: `AliasesService` (`learn`, `reject`, `taughtFriends`, `listMine`, `deleteMine`, and the count), `AliasesController` (`GET /assistant/aliases`, `DELETE /assistant/aliases/:id`, `POST /assistant/aliases/reject`), `alias-rules.ts` (k = 3, s = 0.8, 7 days, the 30-day half-life, each with its reason, and the pure `scoreOf`, `topOf` and `qualifies`), and the two sources `PersonalAliases` and `GlobalAliases`. `PlaceMatcher` builds them from `PrismaService` and the settings and asks them in order before `CuratedGroups`. `PlaceAliases.lookup` and `PlaceIndex.match` are async.
- `learn` is called after the `chosen` row in `AssistantService` and after the `edited` row through a `learn` callback that `ResolutionEventsService.forRun` now takes, so that the events service does not depend on the aliases service, which writes `rejected` rows through it (`ResolutionEventsService.rejected`).
- `resolveFriend` reads the User's friend aliases first, keeps only current Friends, and falls back to the name match when none is left; its answer is recorded with alias source `personal`.
- `resolvedBy` on `Presented`, the `runFeature` return and `AssistantReplyDto`; `settle` pushes one entry per alias answer of result `one`, once per kind, id and words.
- Settings `ASSISTANT_GLOBAL_ALIASES` (`z.stringbool()`, default true) and `ASSISTANT_ALIAS_HOLDBACK_PERCENT` (0 to 100, default 10), in `.env.example` and `test/global-setup.ts`. `src/common/holdback.ts` has `heldBack(userId, percent)` for ticket 04. `src/common/database-cause.ts` is the events service's former `causeOf`, shared with the aliases.

Decisions where the spec left room:

- An account's age is counted from `onboarded_at`, as users have no creation time and onboarding is the first moment an account can use the Assistant. A choice counts when it was made 7 days or more after onboarding, so an account cannot vote early and count once it has aged.
- Supporters are distinct accounts over all time, so an account counts once for the words and a Place however many days it chooses; this holds the plan's one vote per account, words and target a day without code of its own. Rejecters are distinct accounts of any age, as a rejection only stops an alias answering.
- The share's denominator is the distinct accounts that chose anything for the words (a `GROUPING SETS` row of the same query), not the sum over Places. The top Place is the one with most supporters, then fewer rejecters, then the id. Only Places still in the catalog are counted.
- A retired alias answers again once it qualifies again. When the top Place changes, the old row is retired and a new one made.
- `score` is stored as of the last count or use and computed again on every read. As the half-life only multiplies the difference of supporters and rejecters, decay alone would never bring it to 0, so an alias is also retired when its score falls under a floor, `MIN_SCORE` = 0.5 (half a supporter): one of 3 supporters unused for about 77 days. The read that finds it under the floor retires it, and a new choice of its Place for the words brings it back when it qualifies.
- `last_used_at` is set whenever an alias answers a lookup, personal or global, on every choice of a personal one, and, for a global one, on every choice of its Place for its words; each resets its decay.
- A Place alias whose Place left the catalog is listed with the label 장소, as the spec's 친구 for a former Friend; it never answers.
- An `edited` row with empty words, and a chosen Global Event, teach nothing. A failure to learn or to mark an alias used is logged by its cause and never fails the reply. `POST /assistant/aliases/reject` takes `place` or `friend` only and any uuid; a rejection of an id that is no Place counts for nothing.
- The models sit after `ResolutionEvent` and the enum after `ResolutionAliasSource`, not at the end of the schema, to stay clear of ticket 04's additions.

Left out: the app half (its own branch); curated rows in `place_aliases` (they stay in code, as the spec says); a developer-only command to retire an alias (research note 05 mentions one; `retired_at` can be set by hand).

Tests: `test/personal-aliases.integration.test.ts` (one chip choice answers `one` for that User only, with `resolvedBy` and an `answered` row of tier alias and source personal; two taught Places answer `several`; a Place not in the catalog never answers; an edited Proposal teaches the new Place, which `proposeQuest` then takes; a Friend alias answers until the friendship ends), `test/global-aliases.integration.test.ts` (one account ten times makes none; three accounts old enough make one, a 3-day-old account not counting; a Place losing its share is retired; Friend aliases are never promoted; distinct rejections retire it; one of 3 supporters unused for 80 days is retired and one used 20 days ago still answers; `ASSISTANT_GLOBAL_ALIASES=false` and a held-back User get none, the held-back User their own), `test/alias-endpoints.integration.test.ts` (the list newest use first with labels and 친구, delete with 404 for another User's or a deleted one and 400 for a bad id, reject with its row, and the strict body), `test/alias-rules.unit.test.ts` (score, top, promotion with the floor, holdback hash), `test/place-matcher.unit.test.ts` (fake async sources in order, a dropped hit, exact names first) and `test/settings.unit.test.ts` (the two settings). Existing reply checks gained `resolvedBy: []`, and `test/resolution-events.integration.test.ts` clears the User's aliases between tests. The migration was checked against the schema with `prisma migrate diff` on a scratch database. The paid eval harness was not run.

### Built (2026-10-28), app

On branch `3.0/P07-03-app`, from `b4a4265a`.

- `ResolvedBy` and `AssistantReply.resolvedBy` in `assistant-types.ts`. `isAssistantAnswer` takes a reply with or without `resolvedBy` and `askAssistant` gives an absent one as `[]`; a malformed entry fails the reply. The guard `isResolvedBy` lives in the new `api/server/alias-client.ts` with `isTaughtAliases` and the three operations `listAliases`, `deleteAlias` and `rejectAlias` (`api/alias-types.ts`: `TaughtAlias`, `AliasRejection`), on `ApiClient`, the server client and the mock.
- `ChatBubble.resolvedBy` from the reply. `useChat().rejectAlias(bubbleId, reading)` sends `POST /assistant/aliases/reject` `{ kind, words, targetId }` and, once it is taken, removes that reading from the bubble, so the line stays away when the sheet is closed and opened again. `chat-resolved-by.tsx` draws a line per reading inside the bubble after the chips, "학관 → 학생회관으로 찾았어요" (으로/로 by the label's last syllable) with 아니에요; it thanks the User with a toast, or says it was not sent and leaves the line. `rejectAlias` reaches the bubble through `CardActions`, since `chat-bubbles.tsx` and `chat-sheet.tsx` are at the 300-line limit.
- 내가 가르친 말 at `/me/aliases` (`taught-words-screen.tsx`, `features/assistant/use-taught-aliases.ts`), its row right under 친구 관리: "중도 → 중앙도서관" over "3번 · 10월 26일", a trash button with the dialog "가르친 말을 지울까요?", `DELETE /assistant/aliases/:id`, which takes the row out of the cache and fetches the list again; a 404 counts as deleted. Empty: "아직 가르친 말이 없어요". There is no swipe-to-delete pattern in the app, so it is a button.
- The mock holds two aliases in memory (`api/mock/aliases.ts`, reset by `startFresh`): 중도 → 중앙도서관 (`place-62`, not among the mocks' Places) and 민준 → 김민준. A message with 중도 gets tomorrow's lunch Proposal at 중앙도서관 with the 찾았어요 line while that alias is held; delete and reject remove it. `mockAssistantReply` now fills its defaults with one helper.
- Tests: `chat-resolved-by.integration.test.tsx`, `me-aliases.integration.test.tsx` (fake main server), `aliases-mock.integration.test.tsx`, `api/answers-aliases.unit.test.ts`. The mobile README describes the line, the screen and the operations.
- For the merge with ticket 04's app half: `ChatBubble` gains a required `resolvedBy`, so a bubble literal there (`propose`) needs `resolvedBy: []`; `useChat` is at the 50-line function limit, with `rejectAlias` built in its return.

### Agent usage (2026-10-28)

- Agent time: about 65 minutes (estimate), two Opus 5.5 sessions in their worktrees, the server half and the app half, plus about 21 minutes of the orchestrating Fable 5.1 session, which wrote the spec and tickets, reviewed, merged and tested the stack, split evenly over tickets 02 to 05.
- Tokens (estimate): the building sessions about 52.3M input, of which about 51.4M cache reads, 865k cache writes and 452 uncached, and about 256k output; the orchestrating share about 10.1M input (9.9M cache reads, 132k cache writes) and 33k output. With cache reads excluded, about 1.3M in all.

### For the team to decide

- **A rejection does not silence everyone's alias for the one who rejected it** (live run of 2026-10-29, ticket 05, Comments). E's 아니에요 on 호암 → 호암교수회관 wrote the `rejected` row and took the score from 3 to 2, and E's next 호암 was answered `one` from the same alias again, with 아니에요 again. The rule works as written: one rejection among three supporters should not retire an alias for everyone. For the rejecter it reads as not listening. Options: a personal exclusion for the rejecter (a `user_aliases` row that says not this Place, read before everyone's), or the chips for the rejecter until they choose.
- **A word the rules miss cannot be taught.** 경영대 and 대운동장 answer `none`, so there is no chip to tap, and the edit path needs a Proposal that already carries a Place; a correction typed afterwards ("수의과대학 말한 거야") resolves the new words and teaches them, not the words that failed. So the words most worth learning, those the rules do not know, never reach `resolution_events` as a choice. Options: on `none`, offer `GET /places/search` on the words as chips, or let the User pick a Place on the map for the words and record it as `chosen`.
