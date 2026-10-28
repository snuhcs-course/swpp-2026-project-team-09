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
- `score` is stored as of the last count or use and computed again on every read. Under the spec's formula the half-life multiplies the difference of supporters and rejecters, so decay alone never brings an alias to 0: only rejections or a lost share retire it. Ticket 05 or the team may want a floor; none was added.
- `last_used_at` is set whenever an alias answers a lookup, personal or global, and on every choice of a personal one; a global alias that answers resets its decay.
- A Place alias whose Place left the catalog is listed with the label 장소, as the spec's 친구 for a former Friend; it never answers.
- An `edited` row with empty words, and a chosen Global Event, teach nothing. A failure to learn or to mark an alias used is logged by its cause and never fails the reply. `POST /assistant/aliases/reject` takes `place` or `friend` only and any uuid; a rejection of an id that is no Place counts for nothing.
- The models sit after `ResolutionEvent` and the enum after `ResolutionAliasSource`, not at the end of the schema, to stay clear of ticket 04's additions.

Left out: the app half (its own branch); curated rows in `place_aliases` (they stay in code, as the spec says); a developer-only command to retire an alias (research note 05 mentions one; `retired_at` can be set by hand).

Tests: `test/personal-aliases.integration.test.ts` (one chip choice answers `one` for that User only, with `resolvedBy` and an `answered` row of tier alias and source personal; two taught Places answer `several`; a Place not in the catalog never answers; an edited Proposal teaches the new Place, which `proposeQuest` then takes; a Friend alias answers until the friendship ends), `test/global-aliases.integration.test.ts` (one account ten times makes none; three accounts old enough make one, a 3-day-old account not counting; a Place losing its share is retired; Friend aliases are never promoted; distinct rejections retire it; `ASSISTANT_GLOBAL_ALIASES=false` and a held-back User get none, the held-back User their own), `test/alias-endpoints.integration.test.ts` (the list newest use first with labels and 친구, delete with 404 for another User's or a deleted one and 400 for a bad id, reject with its row, and the strict body), `test/alias-rules.unit.test.ts` (score, top, promotion, holdback hash), `test/place-matcher.unit.test.ts` (fake async sources in order, a dropped hit, exact names first) and `test/settings.unit.test.ts` (the two settings). Existing reply checks gained `resolvedBy: []`, and `test/resolution-events.integration.test.ts` clears the User's aliases between tests. The migration was checked against the schema with `prisma migrate diff` on a scratch database. The paid eval harness was not run.
