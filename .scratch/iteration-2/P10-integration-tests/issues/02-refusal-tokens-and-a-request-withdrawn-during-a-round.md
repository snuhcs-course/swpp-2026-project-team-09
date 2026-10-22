# 02: Refusal tokens that differ in one property, and a request withdrawn during a round

Parent: [P10 spec](../spec.md)
Status: resolved
Blocked by: P09-03 (match-server, socket-server and worker-server: tests named by level, run and measured apart)
Touches: socket-server's users integration test file and match-server's rounds integration test file. No server code, no test helpers or doubles, no CI workflow.

## What to build

Three socket refusal tests cannot fail, and one round rule has no test (spec: Problem Statement, items 2 and 3). Both are fixed on the files as P09-03 renamed them.

In socket-server's users test, the valid-token builder `accessToken()` takes the one property each refusal changes, so each refusal token is valid in every way but the one its test is named after: an expiry an hour in the past, a fresh ES256 key pair, or the admin site's audience `snu-now-admin` (spec: "Refusal tokens differ from a valid token in one property"). The third test, today named after an Administrator's token, is renamed after the audience it checks.

In match-server's rounds test, one new test holds a round at the main server's answer to which requests stand, withdraws one of two requests that would be grouped, releases the answer, and checks that the withdrawn request is left withdrawn and the other is grouped with no one (spec: "A request withdrawn during a round").

Each changed or new test gets a break check (spec: "Break checks"). This ticket merges before P09-08, so that P09's move of the socket token check and extraction of the round's split are made under these tests.

## Acceptance criteria

- [x] `accessToken()` takes the property each refusal changes; the expired, other-key and admin-audience tokens each carry `sub` and `sid` and differ from the valid token in that one property only.
- [x] The third refusal test is named after the admin site's audience, and every refusal still asserts that the connection rejects with `Unauthorized`.
- [x] The tests for a missing token, an altered token and a token without a Session are unchanged.
- [x] The new rounds test, "a request withdrawn while the main server answers which requests stand is left withdrawn, and the other is grouped with no one", has the spec's setup (two waiting requests of new Users for one Global Event, both of size 2, the `MainServerStub` holding its standing answer and offering no Open Quest) and steps (withdraw through the match server's withdraw route with 204, release the answer with both requests standing).
- [x] Its oracle: the withdrawn request reads `{ state: 'withdrawn', questId: null }`, the other `{ state: 'waiting', questId: null }`, and no match is formed for the Global Event. The round is held by the stub, not raced by timing.
- [x] Each of the four break checks in the spec's table is made in a working copy of the branch tip, never committed: the named test fails on its own assertion with the table's expected failure (the connection accepted, or the withdrawn request reading `matched`), not on a setup error, and the file passes after restoring.
- [x] `## Comments` records each break check: the commit, the check removed, the failing test's name and message, and the green run after restoring.
- [x] No server code, other integration test, test double or CI workflow changes.
- [x] socket-server's and match-server's `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.
- [x] The pull request merges before P09-08 (match-server's round split and assign, and socket-server's token check, as units).
- [x] Each changed source file gets a new row in its AI-generated box (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **The builder.** `accessToken(userId, { sessionId, expiresIn, key, audience } = {})` replaces the positional `sessionId` and `expiresIn`, so each refusal names the one property it changes: `{ expiresIn: -HOUR }` (signed now, `exp` an hour ago), `{ key: es256KeyPair().privateKey }`, `{ audience: 'snu-now-admin' }`. The four session and expiry tests that passed `sessionId` or `expiresIn` by position now pass them by name; what they sign is unchanged. The missing-token, altered-token and without-Session tests are as before, character for character.
- **The third test** is now "is refused with an access token for the admin site's audience".
- **The rounds test** sits in a `describe` of its own, "A withdrawal during a round": inside "The groups of a round" the `describe` callback grew past oxlint's `max-lines-per-function` (50). The stub's `standing` holds its answer as "run one at a time" does, and the stub's default `eligible` (no Open Quest) is kept. The test waits with `vi.waitFor` until the stub has been asked, withdraws the second request through `withdraw()` (the match server's route, 204), then answers with every request it was asked about standing. The file passed in each of its 5 green runs.
- **Merge order.** This lands in `2.0/P09-11-tests` before P09-08, in the one pull request for P09 to P11; the criterion is ticked on that note.

### Break checks (2026-10-22)

Each was made in this worktree on the commit named, by editing `src/` only, running the one test file, restoring the file from the commit and rerunning it. The working tree was clean before the next commit; no break was committed.

| Commit | Check removed | Failing test | Message | After restoring |
|---|---|---|---|---|
| d159223e | the expiry check: `ignoreExpiration: true` added to `verifyOptions` in `socket-server/src/users/users.module.ts` | A socket connection > is refused with an expired access token | `AssertionError: promise resolved "Socket{ connected: false, …(15) }" instead of rejecting` (1 failed, 10 passed) | 11 passed |
| d159223e | the signature check: in `users.gateway.ts`'s `verify`, `this.jwt.verifyAsync` replaced by `this.jwt.decode` plus a check that `aud` is `snu-now-app` and `exp` is ahead | A socket connection > is refused with an access token signed with another key; also > is refused with an altered access token, as the spec's table expects | `AssertionError: promise resolved "Socket{ connected: true, …(16) }" instead of rejecting`, for each (2 failed, 9 passed) | 11 passed |
| d159223e | the audience check: `audience: USER_TOKEN_AUDIENCE` removed from `verifyOptions` in `users.module.ts` | A socket connection > is refused with an access token for the admin site's audience | `AssertionError: promise resolved "Socket{ connected: true, …(16) }" instead of rejecting` (1 failed, 10 passed) | 11 passed |
| 73fee95c | the round's re-check: in `match-server/src/matching/round.service.ts`, the `FOR UPDATE` re-select of the requests still `waiting` replaced by `const open = waiting` | A withdrawal during a round > a request withdrawn while the main server answers which requests stand is left withdrawn, and the other is grouped with no one | `AssertionError: expected { state: 'matched', …(1) } to deeply equal { state: 'withdrawn', questId: null }`, received `{ questId: '7969da88-…', state: 'matched' }` (1 failed, 6 passed) | 7 passed |

The expired token's message says `connected: false` because the gateway's expiry timer closes the connection at once after accepting it; the promise resolved, so the connection was accepted.

### Evidence (2026-10-22)

- `socket-server/test/users.integration.test.ts`: 11 passed. `match-server/test/rounds.integration.test.ts`: 7 passed (6 before).
- `pnpm test:unit`: match-server 1 file, 6 passed; socket-server `No test files found, exiting with code 0`.
- `pnpm lint` (`11 test file(s), each named by its test level.` in match-server, `6 test file(s), …` in socket-server), `pnpm format:check` and `pnpm typecheck` pass in both servers.
- Full `pnpm test`: CI run 39800045794 at P10-02's merge, bed2e93a, passed; every package's `pnpm test` is a job of the CI workflow.
- Changed files: the two test files only, each with the row `2026-10-22  Opus 5.5   prompted by TaeHyun79`. No file under `src/`, no other test or test double, no CI workflow.

### Agent usage (2026-10-22)

- Agent time: about 9 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 5,609 thousand in all (cache reads 5,508 thousand, cache writes 100 thousand, uncached under 1 thousand); output 5 thousand, a lower bound, since the transcript keeps only partial output counts.
