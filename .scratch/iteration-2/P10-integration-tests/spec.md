# P10: Integration tests that fail when the checks they are named after break

Status: ready-for-agent

## Problem Statement

The schedule's P10 is "Add integration tests". The servers already have many: most of their test files start the Nest application against real PostgreSQL or Redis containers, and by ADR 0007 (`docs/adr/0007-test-levels-by-what-a-test-starts.md`) those are integration tests. More of the same is not what is missing. What is missing is trust: a test should pass when its property holds and fail when it does not. Three places fall short.

1. **A required check fails with nothing wrong.** The push run of `2.0/Main` at 42863c1f (run 39769113351, 2026-10-22) failed the required `flow-tests` check at `flow-tests/test/event.flow.ts:57`: `expected { state: 'matched', …(1) } to deeply equal { state: 'matched', questId: null }`. The change was PR #115, which touches only the app, and its own run passed `flow-tests` (run 39768435168). The main server sends `matching-changed` once it has created the Shared Quest (`main-server/src/matching/matching.service.ts`, `createQuest`), before the match server writes that Quest onto the match (`match-server/src/matching/round.service.ts`, `askForQuest`). A read in that window says `matched` with `questId: null`, and the flow compares two reads taken at different moments.
2. **Three socket refusal tests cannot fail.** socket-server's tests for an expired access token, a token signed with another key and an Administrator's token (`socket-server/test/users.e2e-spec.ts`, lines 105–139) sign tokens without a Session (`sid`). The gateway refuses any token without one (`socket-server/src/users/users.gateway.ts`, line 95). So when the check a test is named after is removed, the missing Session refuses the token instead, and the test stays green. A throwaway copy of 42863c1f showed it: with the expiry ignored or the audience left out of the verify options (`socket-server/src/users/users.module.ts`, line 24), all 11 tests of the file pass.
3. **One server rule has no test.** A round of the match server reads the waiting requests, asks the main server which still stand, and then locks only those still `waiting`, so a request withdrawn while the main server answered is left as it is (`round.service.ts`, lines 85–91). No test withdraws a request during a round. On a throwaway copy of 42863c1f, with the re-check removed, all 73 tests in match-server's 11 files pass.

## Solution

Three small changes, each shown to work by making it fail on purpose.

- The event flow waits, within a bound, until the first User's request reads `matched` with its Shared Quest, and then checks that the second User's request names the same Quest. It never sleeps.
- Each socket refusal test signs a token that is valid in every way but the one property it is named after.
- A new match-server integration test withdraws a request while a round is held at the main server's answer, and checks that the round leaves it withdrawn and groups the other request with no one.

Each changed test gets a **break check**: in a working copy, remove the one check the test is named after, run it, see that test fail on its own assertion, and restore. The rest of the integration suite and its isolation stay as they are.

## User Stories

1. As a developer, I want the `flow-tests` check to fail only when the system is wrong, so that a red check on my pull request means my change broke something.
2. As a reviewer, I want the event flow still to check that both Users hold the same Shared Quest, so that the fix makes the flow wait and does not make it check less.
3. As a developer, I want the flow to wait on the state it needs and never on a fixed sleep, so that it runs as fast as the servers answer and fails at a known bound when they do not.
4. As a developer reading a failed event flow, I want the failure to show the last request it read, so that I see which state never came.
5. As a User, I want a connection with an expired access token, or with a token signed with another key, refused, so that a leaked or forged token does not open my connection.
6. As a developer, I want a token meant for the admin site refused by the socket server, so that it never opens a User's connection.
7. As a developer, I want each refusal test's token to be a valid token in every way but one, so that the test fails when, and only when, the check it is named after is gone.
8. As a User who withdraws a request for Matching, I want a round that was already running to leave it withdrawn, so that I do not end up in a Shared Quest I left.
9. As a developer, I want the round held at a point the test controls, not raced by timing, so that the test gives the same result on every run.
10. As the person doing P09's extractions, I want these tests merged first, so that the extractions are made under tests that fail if behaviour changes.
11. As a reviewer, I want each break check recorded in the ticket, so that I can repeat it.

## Implementation Decisions

### Order

1. The event flow fix, in its own pull request into `2.0/Main`, before P09's rename. A flaky required check can fail any pull request, the rename's included, and the fix is one function in one file. ADR 0007 puts the rename before the test work built on it; this fix is not built on it.
2. P09's rename, in place: `event.flow.ts` becomes `event.e2e.test.ts`, and the socket-server and match-server files become `*.integration.test.ts`.
3. The socket refusal tokens and the match-server test, on the renamed files. Both merge before P09 moves the socket-server's token check into its own module (P09, socket-server) and before P09 extracts the round's re-check (P09, match-server), so that each move is made under a test that fails if it changes behaviour.

### The event flow waits for the Shared Quest

- In `bothAreMatched`, both Users still wait for `matching-changed` as today. Then the first User's request is read again until it reads `matched` with a `questId`, within the flow's `MATCHING_WAIT_MS` (15 seconds), using Vitest's `vi.waitFor`. Then the second User's request must equal `{ state: 'matched', questId }` with that `questId`.
- No message follows the match server's write of the `questId`, so the wait reads over HTTP, in the flow itself.
- On timeout, `vi.waitFor` throws the last failed assertion, so the failure shows the last request read.
- No server changes.

### Refusal tokens differ from a valid token in one property

- The test file's valid-token builder (`accessToken()`: ES256, the private key the test run's global setup makes, `sub`, `sid`, audience `snu-now-app`, an expiry an hour ahead) takes the property each refusal changes:
  - expired: its expiry an hour in the past;
  - signed with another key: signed with a fresh ES256 key pair, everything else as valid;
  - the admin site's audience: audience `snu-now-admin`, everything else as valid.
- The third test is renamed after its audience. An Administrator's token as the main server signs it carries no `sid` (`main-server/src/auth/administrator-auth.service.ts`), so a real one is refused by the missing Session alone; the test checks the audience, and its name says so.
- The assertion stays: the connection rejects with `Unauthorized`. The tests for a missing token, an altered token and a token without a Session stay as they are.

### A request withdrawn during a round

- One new test in match-server's rounds test file: "a request withdrawn while the main server answers which requests stand is left withdrawn, and the other is grouped with no one".
- Setup: two waiting requests of new Users for the same Global Event, both of size 2, so that a round would group them. The `MainServerStub` holds its answer to the standing question until the test releases it, as the existing tests "Two match servers running a round at the same moment" and "run one at a time" do. The stub offers no Open Quest, so grouping is the path that carries the check.
- Steps: start a round; wait until the stub has been asked; withdraw the second request through the match server's withdraw route (204); release the answer, with both requests standing; wait for the round to end.
- Oracle: the withdrawn request reads `{ state: 'withdrawn', questId: null }`, the other reads `{ state: 'waiting', questId: null }`, and no match is formed for the Global Event.
- P09 moves the re-check into a pure function and unit-tests its rule. This test shows that the round uses it at the right moment.

### Break checks

- Made in a working copy of the branch tip, never committed: remove the one check, wherever it lives at that tip, run the test file, see the named test fail on its own assertion (not on a setup error), restore, and see the file pass.
- The ticket's `## Comments` records each: the commit, the check removed, the failing test's name and message, and the green run after restoring.

| Test | Check removed | Expected failure |
|---|---|---|
| expired token | the expiry check | the connection is accepted |
| token signed with another key | the signature check (audience and expiry still checked) | the connection is accepted (the altered-token test fails too) |
| token for the admin site | the audience check | the connection is accepted |
| request withdrawn during a round | the round's re-check | the withdrawn request reads `matched` |

## Testing Decisions

- **What makes a good test here.** A test reveals a fault only if it reaches the fault, the fault infects the state, and the state propagates to an output the test checks (the RIP model, Testing I, pp. 12–13). The socket refusals reach the verification, but the missing Session refuses the token anyway, so nothing propagates. The round's re-check runs in every round the main server answers, so line coverage counts it, but no test changes a request between the read and the lock, so the fault is never infected.
- **Each test's oracle is the property it is named after**, and nothing else decides its verdict.
- **A test is done when its break check fails it.** Green in CI is required too, but it is not evidence that the test can fail.
- **Deterministic waits.** The event flow compared two reads taken at different moments: a flaky test (Testing II, p. 37), not a missed fault. The fixed flow waits on a read with a bound, and the round test holds the main server's answer, so neither depends on timing.
- **Levels (ADR 0007).** The socket-server and match-server tests are integration tests: each starts its Nest application against real containers. The event flow is an end-to-end test: it drives the started servers through their public interfaces. In the official measurement (P09) they count at those levels.
- **Prior art.** `vi.waitFor` in main-server's signal tests and match-server's placement tests; the held standing answer in match-server's round tests; the valid-token builder `accessToken()` in socket-server's users test.

## Out of Scope

- Any change to server code. P09 makes the extractions.
- Moving tests, adding test doubles, or changing other integration tests or their isolation.
- Changes to CI workflows or required checks.
- A measurement of P10's own. The official measurement and its Results are in P09's spec.

## Further Notes

- **The race in the product.** After `matching-changed`, a read of one request can say `matched` with no `questId` for a moment. The app already shows the right state then, because it refetches its open requests and Quests on that signal and the Shared Quest exists before the signal is sent. P10 changes only the flow.
- **Coverage did not show the gap.** Lines 85–91 of the round run in every round the main server answers, so line coverage counts them. P09's coverage numbers should be read with this in mind.
