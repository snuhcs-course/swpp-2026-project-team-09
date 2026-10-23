# 08: match-server's round split and assign, and socket-server's token check, as units

Parent: [P09 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart), P10-02 (Refusal tokens that differ in one property, and a request withdrawn during a round)
Touches: match-server's `src/matching/` (the round service and placement) and socket-server's `src/users/` (the module factory, the gateway and one new module), plus new unit test files in both `test/` folders. Not the integration tests P10-02 changed.

## What to build

A round of the match server reads the waiting requests, asks the main server which still stand, and locks only those still `waiting`. The split of the waiting requests into those still locked and those still standing (`src/matching/round.service.ts`, lines 85–91 at fe5be351) becomes a pure exported function, without changing what it does; the `FOR UPDATE` query stays in the service (the P09 spec's "(b) match-server"). Placement's `assign` is already pure and is exported unchanged. Both get unit tests, so that a withdrawn request is never placed and the earliest Quest takes the earliest requests.

socket-server's verify options (ES256 only, the app's audience) and payload check (`sub`, `sid`, `exp`) move out of `UsersModule`'s factory and the gateway's private method into one exported module that both use, with behaviour unchanged (the spec's "(c) socket-server"). It is tested with a real `JwtService` and keys made in the test, and every refused token is the test's valid token with exactly one property changed, so that each check is shown to refuse on its own. The connection tests stay integration tests.

Both moves are made under P10-02's tests, which fail if behaviour changes: no other test guards the round's split today, and P10-02's refusal tokens are the first that fail when a single token check is removed.

## Acceptance criteria

- [ ] The round's split is a pure exported function that the round service calls, the `FOR UPDATE` query stays in the service, and no Prisma double is used.
- [ ] The split's unit tests cover: a request withdrawn while the main server answered is left as it is, neither expired nor placed; a waiting request that no longer stands is expired; a standing request goes to placement; one User's requests for two Global Events are told apart; an empty round.
- [ ] `assign` is exported unchanged and unit-tested: the oldest Quest first, a tie on age broken by id; a Holder's own request skipped; free places as the cap; pools by Global Event and size.
- [ ] The verify options and the payload check live in one exported module used by both `UsersModule`'s factory and the gateway, and neither keeps its own copy.
- [ ] The token check's unit tests use a real `JwtService` with keys made in the test: a good token gives the User, the Session and the expiry, and each refused token differs from the valid one in exactly one property: an expiry in the past (signed so, not waited for), another key, HS256, the admin site's audience `snu-now-admin`, no `sid`, no `sub`; a value that is not a string is refused too.
- [ ] P10-02's tests pass unchanged before and after the moves, as do match-server's rounds, placements and matching-withdrawal integration tests and socket-server's connection tests.
- [ ] Every new test file is named `.unit.test.ts`, has a one- or two-line testing strategy comment below its box comment, names its tests `describe(subject)` with `it('condition → result')` in GLOSSARY terms, and uses no real-time wait.
- [ ] `pnpm test:unit` passes in both servers with Docker stopped, and in each `test:unit` and `test:integration` together run exactly the tests `test` runs.
- [ ] `pnpm test`, `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass in both servers.
- [ ] Every new source file starts with the AI-generated box, and each changed one gets a new row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
