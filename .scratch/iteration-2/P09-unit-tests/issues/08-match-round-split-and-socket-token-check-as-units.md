# 08: match-server's round split and assign, and socket-server's token check, as units

Parent: [P09 spec](../spec.md)
Status: resolved
Blocked by: P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart), P10-02 (Refusal tokens that differ in one property, and a request withdrawn during a round)
Touches: match-server's `src/matching/` (the round service and placement) and socket-server's `src/users/` (the module factory, the gateway and one new module), plus new unit test files in both `test/` folders. Not the integration tests P10-02 changed.

## What to build

A round of the match server reads the waiting requests, asks the main server which still stand, and locks only those still `waiting`. The split of the waiting requests into those still locked and those still standing (`src/matching/round.service.ts`, lines 85–91 at fe5be351) becomes a pure exported function, without changing what it does; the `FOR UPDATE` query stays in the service (the P09 spec's "(b) match-server"). Placement's `assign` is already pure and is exported unchanged. Both get unit tests, so that a withdrawn request is never placed and the earliest Quest takes the earliest requests.

socket-server's verify options (ES256 only, the app's audience) and payload check (`sub`, `sid`, `exp`) move out of `UsersModule`'s factory and the gateway's private method into one exported module that both use, with behaviour unchanged (the spec's "(c) socket-server"). It is tested with a real `JwtService` and keys made in the test, and every refused token is the test's valid token with exactly one property changed, so that each check is shown to refuse on its own. The connection tests stay integration tests.

Both moves are made under P10-02's tests, which fail if behaviour changes: no other test guards the round's split today, and P10-02's refusal tokens are the first that fail when a single token check is removed.

## Acceptance criteria

- [x] The round's split is a pure exported function that the round service calls, the `FOR UPDATE` query stays in the service, and no Prisma double is used.
- [x] The split's unit tests cover: a request withdrawn while the main server answered is left as it is, neither expired nor placed; a waiting request that no longer stands is expired; a standing request goes to placement; one User's requests for two Global Events are told apart; an empty round.
- [x] `assign` is exported unchanged and unit-tested: the oldest Quest first, a tie on age broken by id; a Holder's own request skipped; free places as the cap; pools by Global Event and size.
- [x] The verify options and the payload check live in one exported module used by both `UsersModule`'s factory and the gateway, and neither keeps its own copy.
- [x] The token check's unit tests use a real `JwtService` with keys made in the test: a good token gives the User, the Session and the expiry, and each refused token differs from the valid one in exactly one property: an expiry in the past (signed so, not waited for), another key, HS256, the admin site's audience `snu-now-admin`, no `sid`, no `sub`; a value that is not a string is refused too.
- [x] P10-02's tests pass unchanged before and after the moves, as do match-server's rounds, placements and matching-withdrawal integration tests and socket-server's connection tests.
- [x] Every new test file is named `.unit.test.ts`, has a one- or two-line testing strategy comment below its box comment, names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms, and uses no real-time wait.
- [ ] `pnpm test:unit` passes in both servers with Docker stopped, and in each `test:unit` and `test:integration` together run exactly the tests `test` runs.
- [x] `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass in both servers.
- [x] Every new source file starts with the AI-generated box, and each changed one gets a new row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-23)

- **The split.** `splitRound(waiting, stillWaitingIds, standing)` is exported from `match-server/src/matching/round.service.ts`, beside the service (the Touches name only the round service and placement there). It takes the requests the round read, the ids the `FOR UPDATE` query returned and the main server's `standing` answer as it came, and answers `{ toExpire, toPlace }`, each in the order the round read the requests; a request no longer waiting is in neither. Taking the answer rather than a set of keys keeps the tests off the internal key `${userId} ${globalEventId}`, so `askWhichStand` now answers that list. It is generic over `{ id, userId, globalEventId }`, so the tests build only those fields. The `FOR UPDATE` query, the `updateMany` to `expired` and the call to placement stay in the service.
- **`assign`**: only `export` was added. Its tests build whole `MatchingRequest`s (a type-only import from the generated client, erased at run time) and eligible Quests shaped as the main server answers them. The free-places table runs 0 to 4 against three requests; 0 never comes from the main server, which answers only Quests with a free place, and is there as the table's MIN−1.
- **The token module.** `socket-server/src/users/access-token.ts`: `accessTokenOptions(publicKey)` gives the `JwtModuleOptions` (the public key, `algorithms: ['ES256']`, audience `snu-now-app`) that `UsersModule`'s factory returns; `verifyAccessToken(jwt, token)` holds the string check and the payload check (`sub`, `sid`, `exp`) and answers `{ sub, sid, exp }` as the gateway's private `verify` did. The gateway calls it with its injected `JwtService`; its own `verify` and `AccessTokenPayload` are gone. The unit test builds `new JwtService(accessTokenOptions(publicKey))`, the options Nest's `JwtModule` hands the same class.
- **The clock.** The token test fakes only `Date` (`vi.useFakeTimers({ now, toFake: ['Date'] })`), so the valid token's `exp` is a known value and the expired token is signed an hour in the past. Nothing waits.
- **The refusals.** Each is the valid token with one change: `expiresIn: -HOUR`, another ES256 key, HS256 (an HMAC token needs a secret: the public key, which an attacker may hold), the audience `snu-now-admin`, claims without `sid`, without `sub`. A token without `exp` was added, since the payload check refuses it too. The four refusals jsonwebtoken makes assert its documented message (`jwt expired`, `invalid signature`, `invalid algorithm`, `jwt audience invalid`); the payload and non-string refusals assert only that the token is refused, as the gateway answers every refusal with `Unauthorized`. Values that are not a string: `undefined`, `null`, `42`, `{}`.
- **Test files.** `match-server/test/rounds.unit.test.ts` and `placements.unit.test.ts` (beside the integration files of the same names), `socket-server/test/access-token.unit.test.ts`. placements' tests sit in two `describe`s, the Quests' order and the requests a Quest takes, to stay under oxlint's `max-lines-per-function`.
- **Box rows** are dated 2026-10-23, the day of the change (`CLAUDE.md`: today's date).
- **Left as is.** socket-server's `vitest.config.ts` keeps `passWithNoTests: true`: it is outside this ticket's Touches and P09-07 changes the same folders; now that `unit` has a file it can be dropped.

### Break checks (2026-10-23)

Each was made on the `src/` of 96eda14c (the split), 531793d9 (`assign`) or ccc44de8 (the token module) by editing one line, running the unit test file and restoring the line; the restored file passed again and no break was committed.

| Check removed | Failing unit test | Message |
|---|---|---|
| the lock filter: `const open = waiting` in `splitRound` | both rows of "a request withdrawn while the main server answered, … → neither expired nor placed" (2 failed, 4 passed) | `expected { toExpire: [], toPlace: [ …(2) ] } to deeply equal { toExpire: [], toPlace: [ { …(3) } ] }` |
| the Global Event in the key: requests keyed by User only | "one User's requests for two Global Events, one standing → told apart" (1 failed) | `expected { toExpire: [], toPlace: [ …(2) ] } to deeply equal { …(2) }` |
| the expiry: `toExpire: []` | "a waiting request that no longer stands → expired" and the two-Global-Events test (2 failed) | `expected { toExpire: [], toPlace: [ { …(3) } ] } to deeply equal { …(2) }` |
| `assign`'s tie on age broken by id | "two Quests made at the same moment → the one whose id sorts first fills first" (1 failed) | `expected [ [ 'r1', 'q-b' ], [ 'r2', 'q-a' ] ] to deeply equal [ [ 'r1', 'q-a' ], [ 'r2', 'q-b' ] ]` |
| `assign`'s Holder filter | "a request whose User holds the Quest → skipped for it, and placed into the next Quest" (1 failed) | `expected [ Array(2) ] to deeply equal [ [ 'r2', 'q-own' ], …(1) ]` |
| the size in `poolOf` | "a request for another size than the Quest → not placed into it" (1 failed) | `expected [ [ 'r1', 'q' ] ] to deeply equal [ [ 'r2', 'q' ] ]` |
| `audience` in `accessTokenOptions` | "the valid token but with the admin site's audience snu-now-admin → refused" (1 failed) | `promise resolved "{ sub: 'user-1', …(2) }" instead of rejecting` |
| `sid` in the payload check | "the valid token but with no Session (`sid`) → refused" (1 failed) | `promise resolved "{ sub: 'user-1', sid: undefined, …(1) }" instead of rejecting` |
| `sub` in the payload check | "the valid token but with no User (`sub`) → refused" (1 failed) | `promise resolved "{ sub: undefined, …(2) }" instead of rejecting` |
| `exp` in the payload check | "the valid token but with no expiry → refused" (1 failed) | `promise resolved "{ sub: 'user-1', …(2) }" instead of rejecting` |
| `algorithms: ['ES256']` | none: 12 passed | jsonwebtoken 9.0.3, given no `algorithms`, allows only ES256, ES384 and ES512 for an EC public key and checks the key's curve, so HS256 is still refused with `invalid algorithm`. The option stays as a guard of its own. |
| the string check (`typeof token !== 'string'`) | none: 12 passed | jsonwebtoken refuses the value itself (`jwt must be provided`, `jwt must be a string`). |

### Evidence (2026-10-23)

**The guarding tests**, each file run alone (`pnpm exec vitest run --reporter=verbose <files>`), before the moves at 74381a9b and after each move:

| Run | `rounds` | `placements` | `matching-withdrawal` | socket-server `users` |
|---|---|---|---|---|
| before, 74381a9b | 7 passed | 13 passed | 10 passed | 11 passed |
| after the split (the tree of 96eda14c) | 7 passed | 13 passed | 10 passed | — |
| after `assign`'s export (the tree of 531793d9) | 7 passed | 13 passed | 10 passed | — |
| after the token module (the tree of ccc44de8) | — | — | — | 11 passed |

P10-02's two files (`match-server/test/rounds.integration.test.ts`, `socket-server/test/users.integration.test.ts`) are unchanged: `git diff --stat 74381a9b HEAD -- match-server socket-server` lists only the eight files of this ticket.

**New unit tests**: `rounds.unit.test.ts` 6, `placements.unit.test.ts` 10, `access-token.unit.test.ts` 12, all passing.

**`pnpm test:unit`**, after merging the integration tip: match-server 3 files, 22 passed (`grouping` 6, `placements` 10, `rounds` 6); socket-server 1 file, 12 passed. `docker ps -a` listed the same 4 containers before and after both runs; neither `unit` project has a global setup, and no new unit test imports `testcontainers` or calls `inject`. Run with Docker stopped: pending, made by the orchestrator once all tickets have merged; that criterion stays unticked until then.

**Full `pnpm test`** (in a slot, `--maxWorkers=4`, with a JSON report), after merging the integration tip:

- match-server: 13 files, 90 passed. By suffix: 3 `.unit.test.ts` files with 22 tests and 10 `.integration.test.ts` files with 68 tests; 22 + 68 = 90, so `test:unit` and `test:integration` together run what `test` runs.
- socket-server: 7 files, 43 passed. By suffix: 1 `.unit.test.ts` file with 12 tests and 6 `.integration.test.ts` files with 31 tests; 12 + 31 = 43.

The JSON reports and logs are in the orchestrator's helpers folder, `p09-08/`.

**Checks**: `pnpm lint` (`13 test file(s), each named by its test level.` in match-server, `7 test file(s), …` in socket-server), `pnpm format:check` and `pnpm typecheck` pass in both servers.

**Box rows**: `round.service.ts`, `placement.service.ts`, `users.module.ts` and `users.gateway.ts` gain `2026-10-23  Opus 5.5   prompted by TaeHyun79`; the new `access-token.ts` and the three new test files start with the box and that row.
