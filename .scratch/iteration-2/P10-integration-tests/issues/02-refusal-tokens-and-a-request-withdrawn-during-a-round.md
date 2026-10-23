# 02: Refusal tokens that differ in one property, and a request withdrawn during a round

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart)
Touches: socket-server's users integration test file and match-server's rounds integration test file. No server code, no test helpers or doubles, no CI workflow.

## What to build

Three socket refusal tests cannot fail, and one round rule has no test (spec: Problem Statement, items 2 and 3). Both are fixed on the files as P09-03 renamed them.

In socket-server's users test, the valid-token builder `accessToken()` takes the one property each refusal changes, so each refusal token is valid in every way but the one its test is named after: an expiry an hour in the past, a fresh ES256 key pair, or the admin site's audience `snu-now-admin` (spec: "Refusal tokens differ from a valid token in one property"). The third test, today named after an Administrator's token, is renamed after the audience it checks.

In match-server's rounds test, one new test holds a round at the main server's answer to which requests stand, withdraws one of two requests that would be grouped, releases the answer, and checks that the withdrawn request is left withdrawn and the other is grouped with no one (spec: "A request withdrawn during a round").

Each changed or new test gets a break check (spec: "Break checks"). This ticket merges before P09-08, so that P09's move of the socket token check and extraction of the round's split are made under these tests.

## Acceptance criteria

- [ ] `accessToken()` takes the property each refusal changes; the expired, other-key and admin-audience tokens each carry `sub` and `sid` and differ from the valid token in that one property only.
- [ ] The third refusal test is named after the admin site's audience, and every refusal still asserts that the connection rejects with `Unauthorized`.
- [ ] The tests for a missing token, an altered token and a token without a Session are unchanged.
- [ ] The new rounds test, "a request withdrawn while the main server answers which requests stand is left withdrawn, and the other is grouped with no one", has the spec's setup (two waiting requests of new Users for one Global Event, both of size 2, the `MainServerStub` holding its standing answer and offering no Open Quest) and steps (withdraw through the match server's withdraw route with 204, release the answer with both requests standing).
- [ ] Its oracle: the withdrawn request reads `{ state: 'withdrawn', questId: null }`, the other `{ state: 'waiting', questId: null }`, and no match is formed for the Global Event. The round is held by the stub, not raced by timing.
- [ ] Each of the four break checks in the spec's table is made in a working copy of the branch tip, never committed: the named test fails on its own assertion with the table's expected failure (the connection accepted, or the withdrawn request reading `matched`), not on a setup error, and the file passes after restoring.
- [ ] `## Comments` records each break check: the commit, the check removed, the failing test's name and message, and the green run after restoring.
- [ ] No server code, other integration test, test double or CI workflow changes.
- [ ] socket-server's and match-server's `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.
- [ ] The pull request merges before P09-08 (match-server's round split and assign, and socket-server's token check, as units).
- [ ] Each changed source file gets a new row in its AI-generated box (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
