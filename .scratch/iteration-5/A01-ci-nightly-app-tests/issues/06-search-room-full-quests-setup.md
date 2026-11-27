# 06: assistant-search-room.integration.test.ts times out on its Full Quests' setup

Parent: [A01 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None

## What happens

Two full CI runs in a row on `5.0/Main` failed in `main-server`, on two different commits:

- run 45959275610 on 254a37680 (PR 670, `mobile/` files only);
- run 45960442926 on 36f7be741 (PR 671, main-server study plan files).

Both failed the same two cases of `main-server/test/assistant-search-room.integration.test.ts`, under
"searchRecruitingQuests, before the list is cut":

- "finds the later Quest past those Full": `Test timed out in 5000ms`;
- "finds the later Quest past those with too few places left": `expected [] to deeply equal [ Array(1) ]` (on the
  first run, `[ Array(1) ]` against `[ Array(1) ]`).

The other 510 files passed. The run before them, 45957921693 on b760d92f0, was green.

## The cause

The test is flaky by its setup. It depends on neither the clock nor a recent PR.

- `soonerFull` signed in 31 Users and joined each one to a Quest of two, all at once. Each User took a sign-in,
  `getMe`, `getProfile`, `ownQuest` and `joinQuest`, so about 155 requests ran under Vitest's default 5 s timeout.
- "past those Full" took this long on the day's green runs:

  | Run         | Duration |
  | ----------- | -------- |
  | 45946007258 | 4046 ms  |
  | 45953183293 | 3312 ms  |
  | 45953679461 | 3832 ms  |
  | 45955083149 | 2518 ms  |
  | 45957272928 | 3650 ms  |
  | 45957921693 | 2231 ms  |

  On the two failing runs it went past 5000 ms.
- The case after it fails as a result of the first. The timed-out case keeps running and then drives the scripted
  model that the file shares between its tests. The next case reads the wrong tool result.
- No clock is involved. Every date in the file is in 2094. The `now` conditions in `src/quests/recruiting-search.ts`
  cannot change for those dates. A Quest is Full by `capacity - count(holders)`, which does not depend on time.

## Built (2026-11-27)

- `soonerFull` makes the 31 Quests of two with `sooner({ capacity: 2 }, day)`. Each second Holder is a stored row
  (`prisma.questHolder.create` with a nested `user.create`), so no User signs in.
- The timeout is unchanged.
- "never gives a Full Quest" still fills its one Quest through the join endpoint.

## Other places checked

Every `Array.from({ length: N }` in `main-server/test` (integration tests). Only `soonerFull` signed Users in to seed.
The others take one request each and stay as they are:

- `assistant-search-room`'s `sooner`: 31 `questAt`, 553 to 855 ms in CI;
- `assistant-search-room`'s "asked to join": 31 Quests and 31 `askToJoin`, 1.2 to 1.5 s in CI, the heaviest one left;
- `assistant-search-ranking`, lines 152, 184, 244 and 260;
- `assistant-search-window`, lines 129, 204 and 300;
- `party-list`, line 130 (4 sign-ins);
- `party-entry`, line 192 (5 sign-ins);
- `refresh`, line 189 (10 sign-ins).

## Proof (2026-11-27)

The file alone, once, on the Mac: `pnpm vitest run --project integration --maxWorkers=2
test/assistant-search-room.integration.test.ts`. Result: 16 of 16 passed, and "past those Full" took 410 ms.

The timeout was not reproduced on the old version locally. `pnpm lint` and `tsc --noEmit` passed. Prettier's check
passed on the changed file.

## Acceptance criteria

- [x] "finds the later Quest past those Full" no longer signs 31 Users in, and takes well under the 5 s timeout.
- [x] The case after it no longer reads a timed-out case's leftovers.
- [x] The timeout is not raised.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 10 minutes, one subagent plus the orchestrator's review. This is an estimate.
- Tokens: about 108k in total for the subagent. The split into input, output, cache reads and cache writes was not
  available to the subagent.
