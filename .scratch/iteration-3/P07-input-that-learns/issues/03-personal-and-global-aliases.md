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
