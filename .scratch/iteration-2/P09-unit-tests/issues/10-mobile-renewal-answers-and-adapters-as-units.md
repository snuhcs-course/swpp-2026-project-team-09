# 10: mobile's renewal edge cases, answer checks and pure adapters as units

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-05 (mobile: tests named by level, run and measured apart)
Touches: new unit test files in mobile's `__tests__/`. No `src/` change is planned.

## What to build

The app's Session renewal, its checks of the main server's answers and its least-covered pure adapters get unit tests in mobile's `unit` project (the P09 spec's "(f) mobile"), so that a dropped network does not sign a User out, a refused renewal does not leave them signed in, and a malformed answer is refused.

`src/api/server/http.ts` is tested with `fetch` stubbed and the token store and Session events as stand-ins, on the three renewal cases no test covers. The shared renewal, a second 401, `SESSION_REPLACED` and `ONBOARDING_REQUIRED` are already covered by mobile's server-session test and are not repeated. `src/api/server/answers.ts` is tested guard by guard against the answer shapes the main server's README documents.

An adapter is pure when its functions take data and return data, with no I/O, hooks or timers; a module it imports that reaches a native module is allowed, since jest-expo stands in for native modules. The events, dining and room adapters come first, then the rest in order of their unit-only coverage in the foundation's first report (P09-05's), least covered first.

## Acceptance criteria

- [x] `http.ts`'s tests cover: with no refresh token, the Session ends; with a malformed renewal answer, the Session ends; on a network error during renewal, the error is thrown and the Session is kept.
- [x] Each guard in `answers.ts` accepts the answer shape the main server's README documents, refuses each field missing or of the wrong type, and accepts null only where null is allowed.
- [x] The events, dining and room adapters have unit tests, then the other pure adapters in order of unit-only coverage in P09-05's first report, and `## Comments` records that order.
- [x] The tests stub `fetch`, never reach the network, and use fake timers instead of real-time waits.
- [x] Every new test file is named `.unit.test.ts(x)`, has a one- or two-line testing strategy comment below its box comment naming its partitions and where its expected values come from, and names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms.
- [x] `pnpm test:unit` in mobile runs these tests, `test:unit` and `test:integration` together run exactly the tests `test` runs, and `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass.
- [x] Every new source file starts with the AI-generated box (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-23)

- **Files.** 14 new unit test files and 2 support files, all under `mobile/__tests__/`; no `src/` change.
  - `api/http-renewal.unit.test.ts`: `http.ts` through `call()`. Stand-ins: `@/auth/tokens`, `@/session/session-events`
    and `@/api/servers` by `jest.mock`; `fetch` behind the support fake server's `startFakeServer()`, which records each
    request. The token store keeps both tokens or neither, so "no refresh token" is "no tokens held". A fourth case
    beside the three: after no answer to the renewal, the next refused request renews again, as `http.ts` says ("the
    next request tries again"), so the shared renewal is not left pending.
  - `api/answers-users`, `api/answers-quests` and `api/answers-parties-and-places` `.unit.test.ts`: every exported
    guard of `answers.ts`, and the unexported ones through their lists (`isFriend`, `isPosition`, `isParty` with
    `isPartyHead` and `isPartyQuest`, `isMember`, `isClassTime`, `isOverlap`), in three files for oxlint's 300-line
    limit. Each starts from the shape main-server's README documents and tries each checked field left out, null and
    of another type (`__tests__/support/answer-variants.ts` makes these variants); null is accepted only where the
    README allows it. A field no guard checks is not tested, since `answers.ts` lets a field the app does not read be
    there or not. A small `checks()` helper that calls `it.each` is repeated in each file: in a support file the level
    check would count it as declaring a test.
  - **One gap, kept as it is.** `isParties` accepts a Party without `leader`: the app's `Party` type keeps it optional,
    as "provisional, from an open pull request of the main server (P08-16)", while main-server's README now always
    sends it. The test records the guard as it is ("a Party without its provisional leader → accepted"); making the
    field required is a `src/` change outside this ticket.
  - The adapters: `features/<name>-adapter.unit.test.ts` for events, dining, room, notifications, parties, friends,
    shuttle and footprints, and the map adapter in `map-adapter-places` and `map-adapter-people`, two files over
    `__tests__/support/map-sources.ts` for the same limit.
- **The adapters' order.** First the events, dining and room adapters (`src/features/events/adapter.ts`,
  `src/features/dining/adapter.ts`, `src/features/quests/room-adapter.ts`), then the rest of P09-05's table, least
  covered first: `notifications` (0.0 %), `parties` (0.0 %), `map` (3.6 %), `friends` (9.1 %), `shuttle` (17.0 %) and
  `footprints` (28.6 %). The `timetable` (95.1 %) and `quests` (96.8 %) adapters already had unit tests over 95 % of
  their statements and got none. The report's "other pure modules" are not adapters and are left for later;
  `map/event-points.ts` and `map/short-name.ts` run under the map adapter's tests.
- **Expected values** come from the tickets that built each screen (iteration 1: P06-09, P06-10 and P06's `todo.md`,
  P13-01, P13-03, P14-01, P15-01, P15-02, P19-02; iteration 2: P06-06), worked by hand in Korea's time, and for the
  shuttle from a rectangle loop whose lengths are worked by hand. Each file's strategy comment names its sources.
- **Time.** No test waits: the adapters take the time as `now`, and `http.ts` keeps none, so no fake timer was needed.
  No new test reads the real clock or reaches the network.
- **Box rows** are dated 2026-10-23, the day of the change, as P09-08's are.

### Evidence (2026-10-23)

`pnpm test:unit` (in a slot, `--maxWorkers=4`, `--json`): 62 files, 837 tests: 836 passed, 1 todo; P09-05 left 48
files and 282 tests. The 14 new files hold 555 tests:

| File | Tests |
|---|---|
| `api/http-renewal.unit.test.ts` | 8 |
| `api/answers-users.unit.test.ts` | 127 |
| `api/answers-quests.unit.test.ts` | 118 |
| `api/answers-parties-and-places.unit.test.ts` | 157 |
| `features/events-adapter.unit.test.ts` | 26 |
| `features/dining-adapter.unit.test.ts` | 19 |
| `features/room-adapter.unit.test.ts` | 25 |
| `features/notifications-adapter.unit.test.ts` | 12 |
| `features/parties-adapter.unit.test.ts` | 4 |
| `features/map-adapter-places.unit.test.ts` | 10 |
| `features/map-adapter-people.unit.test.ts` | 7 |
| `features/friends-adapter.unit.test.ts` | 16 |
| `features/shuttle-adapter.unit.test.ts` | 22 |
| `features/footprints-adapter.unit.test.ts` | 4 |

`--listTests`: `test` selects 161 files, `--selectProjects unit` 62, all `.unit.test`, and `--selectProjects
integration` 99, all `.integration.test`; none is in both, and together they are `test`'s 161, so `test:unit` and
`test:integration` together run what `test` runs.

Faults planted in `src/` one at a time, each restored after its run:

| Fault | Failed |
|---|---|
| `renew()` without its check for a refresh token | 1 of 8 (no refresh token) |
| `renew()` keeping a renewal answer it did not check | 4 of 8 (each malformed answer but "no body", which fails on reading and ends the Session too) |
| no answer to the renewal taken as a refusal | 2 of 8 |
| the shared renewal never cleared | 2 of 8 |
| `isTextOrNull` taking a missing field | 10 of 402 |
| `isPlace` taking one coordinate without the other | 2 of 402 |
| `isQuest` not checking `waitingJoinRequests` | 4 of 402 |
| `isSignInAnswer` not checking `onboarding.completed` | 6 of 402 |
| `isWalkingRoute` taking any status without a route | 1 of 402 |

Unit-only coverage, `pnpm test:cov:unit` (in a slot, `--maxWorkers=4`; 832 passed, 4 skipped, the OCR timing check
under coverage, 1 todo):

| Run | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| P09-05 | 29.58 % | 23.27 % | 17.57 % | 29.80 % |
| now | 34.95 % (3003/8592) | 31.32 % (1919/6127) | 23.79 % (807/3392) | 35.05 % (2819/8041) |

| Module | Statements | Branches |
|---|---|---|
| `src/api/server/http.ts` | 78.8 % (52/66) | 68.4 % (39/57) |
| `src/api/server/answers.ts` | 100.0 % (64/64) | 100.0 % (108/108) |
| `src/features/events/adapter.ts` | 97.9 % (47/48) | 90.7 % (49/54) |
| `src/features/dining/adapter.ts` | 98.1 % (52/53) | 92.8 % (39/42) |
| `src/features/quests/room-adapter.ts` | 100.0 % (61/61) | 100.0 % (76/76) |
| `src/features/notifications/adapter.ts` | 100.0 % (12/12) | 100.0 % (15/15) |
| `src/features/parties/adapter.ts` | 100.0 % (5/5) | 100.0 % (8/8) |
| `src/features/map/adapter.ts` | 100.0 % (56/56) | 91.8 % (67/73) |
| `src/features/friends/adapter.ts` | 100.0 % (22/22) | 100.0 % (28/28) |
| `src/features/shuttle/adapter.ts` | 100.0 % (47/47) | 82.1 % (23/28) |
| `src/features/footprints/adapter.ts` | 100.0 % (7/7) | 100.0 % (6/6) |

The rest of `http.ts` is what `api/server-session.integration.test.ts` covers and this ticket does not repeat:
`SESSION_REPLACED`, `ONBOARDING_REQUIRED` with `suggestionOf`, the requests without the access token, and a body that
is not JSON.

Checks in `mobile/`: `pnpm lint` passes (`161 test file(s), each named by its test level.`), and so do
`pnpm format:check` and `pnpm typecheck`. The coverage run leaves the working tree clean.

Full `pnpm test`: CI run 39809527412 at P09-10's merge, 7803d4e8, passed; every package's `pnpm test` is a job of the
CI workflow.

After merging the integration tip (`fd492a03`, which changes in `mobile/` only the Maestro flows, two scripts and
their `package.json` entries): `pnpm test:unit` 62 files, 837 tests, 836 passed and 1 todo; `--listTests` as above;
`pnpm lint` (`161 test file(s), …`), `pnpm format:check` and `pnpm typecheck` pass.

The logs, the JSON report and the scripts of the planted faults are in the orchestrator's helpers folder, `p09-10/`.

### Agent usage (2026-10-23)

- Agent time: about 28 minutes, an estimate: the implementer subagent, measured just before its last commit, and a
  one-minute transcript that carries this ticket's marker.
- Tokens: input 29,209 thousand in all (cache reads 28,815 thousand, cache writes 394 thousand, uncached under 1
  thousand); output 44 thousand, a lower bound, since the transcript keeps only partial output counts.
