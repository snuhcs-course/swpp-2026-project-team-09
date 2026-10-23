# 01: A1 and A2: a Session replaced, and a Leader running a group, in flow-tests

Parent: [P11 spec](../spec.md)
Status: resolved
Blocked by: P09-06 (flow-tests: flows named by level)
Touches: flow-tests only: two new flow files in `test/`, the harness's `people.ts` and `inbox.ts`, and the README's table of flows. Not the stack, the Compose files or any server.

## What to build

Two new end-to-end flows in `flow-tests`, named `*.e2e.test.ts` from the start, beside the flows P09-06 renamed, and run by `pnpm test` and so by the per-push flow-tests check. They are written like the existing flows, so a failure names the User, the call and what was waited for.

A1 (US-AUTH-02 scenario 1; NFR-07) signs a User in on a second phone and checks that the first phone is told its Session ended, is disconnected, and has its uploads refused, while the second phone's uploads still reach the Friend (spec: "A1: one phone at a time"). A2 (US-QUEST-03 scenarios 1 and 2) has a Leader accept two join requests to an Approval Quest and then end the group with its Party on, as the app does, and checks that the other members are told each time and that the Quest, its post and the Party are gone (spec: "A2: a Leader runs a group").

The harness gains the two additions these flows need (spec: "The harness"): a `Student` that signs in again "on another phone" with the same Google account, and an `Inbox` that can wait for the server to close its connection. The Administrator's ID token export belongs to P11-02.

## Acceptance criteria

- [x] A `Student` keeps the Google account it signed in with and can sign in again on another phone, answering a second `Student` for the same User with its own token and socket and skipping Onboarding.
- [x] An `Inbox` can wait for its connection to be closed by the server (`io server disconnect`), with the same bounded wait as a message.
- [x] A1 is one test in a new `flow-tests/test/*.e2e.test.ts` file following the spec's five steps: phone 1 receives `session-ended` with `{ code: 'SESSION_REPLACED' }` and is then disconnected; its `POST /positions` answers 401 with `code: 'SESSION_REPLACED'`; B receives no position of A within the quiet window; phone 2's upload on campus reaches B.
- [x] A2 is one test in a new `flow-tests/test/*.e2e.test.ts` file with four Users following the spec's five steps: D finds the Approval Quest on the Board's list; A is told of B's join request and B of its acceptance; after C is accepted, A, B and C each receive `quests-changed` and B's and C's reads list A, B and C as Holders.
- [x] In A2, after `POST /parties/mine/end` then `POST /quests/:questId/end`, B and C each receive `party-changed` and `quests-changed`; B's read of the Quest is refused as not found, B and C are in no Party, and D's Board no longer lists the Quest.
- [x] Waits are the harness's (10 s for a message that must come, 1.5 s for one that must not); nothing sleeps for a fixed time or is retried.
- [x] Every expected value comes from the scenario or from the test's own input; the flows read no database and no server's internal state beyond the existing empty state between tests.
- [x] `pnpm test` in `flow-tests` passes with A1, A2 and every existing flow unchanged, and `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass.
- [x] No product code, CI workflow or other test changes.
- [x] `flow-tests/README.md`'s table of flows lists A1 and A2.
- [x] Every new source file starts with the AI-generated box, and each changed source file gets a new row (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions (2026-10-22)

- **Files.** A1 is `flow-tests/test/session.e2e.test.ts` and A2 is `flow-tests/test/quest-group.e2e.test.ts`, at the top
  of `test/`, so `pnpm test` picks them up with no config change.
- **The harness.** `Student.signsInOnAnotherPhone()` signs in again with the Google account the Student kept (a fresh
  ID token), skips Onboarding, reads `GET /users/me` and opens a new socket. The new Student is named
  `<name> on another phone`, so a failure says which phone. `Inbox.isDisconnectedByServer(waitMs = 10 s)` waits until
  the socket's `disconnect` reason is `io server disconnect`, and otherwise names the owner and whether the connection
  is still open or closed for another reason. `signIn()` now shares the sign-in and the connection with the new method;
  its behaviour is unchanged. `administratorIdToken()` is left to P11-02.
- **A1.** Phone 1's refused upload goes through `call()`, since `uploadsPosition()` throws on any refusal; its body is
  the one the app uploads. The flow also checks that phone 2 answers the same User id. A `session-ended` that
  reached the Inbox came before the disconnect, since Socket.IO's client hands on no event once its socket is
  disconnected, so the flow checks no order.
- **A2.** The Leader accepts the request she finds in her own list (`GET /quests/:questId/join-requests`), as the app
  does, not the id from the asker's answer. The Quest is on the `hobby` Board with a Sub Quest 24 to 26 hours ahead.
  A signal carries nothing, and a wait takes the first one that came, so the flow takes every signal the server sends
  on the way: `quests-changed` to the Leader when she makes the Quest, and `party-changed` to all three Holders when the
  Party opens and when each enters. Only the end's signals can then meet the waits after the end. The refusals are
  checked by status and code, 404 `QUEST_NOT_FOUND` and `NOT_IN_PARTY`, as main-server's README lists them.
- **Parallel waits.** oxlint refuses `await` in a loop, so A2 waits for several Users' signals with `Promise.all`. Each
  User's own waits stay in order.
- **README.** Besides the two rows, the folder layout's comment said "the three flows of the table above"; it now says
  "the flows of the table above".

### Evidence (2026-10-22)

No other test ran on the machine during these runs.

- **Red first.** With A1 written and the harness unchanged, `pnpm typecheck` failed on
  `Property 'isDisconnectedByServer' does not exist on type 'Inbox'` and
  `Property 'signsInOnAnotherPhone' does not exist on type 'Student'`.
- **A1 alone**, after the harness additions: `Tests  1 passed (1)`, the test 1.9 s.
- **A2 alone**, beside a planted copy of A1 whose second phone was a new User (`signIn()` instead of
  `signsInOnAnotherPhone()`): A2 passed, and the plant failed after the bounded wait, naming the User and the message:

  ```
  Error: 김민지 did not receive session-ended within 10000 ms; received nothing else
  ```

  The plant was removed before the commit.
- **`pnpm test --reporter=verbose`** at `a4c83ccc`: `Test Files  7 passed (7)`, `Tests  13 passed (13)`, 130 s. That is
  P09-06's 11 tests in 5 files plus A1 (3.1 s) and A2 (1.9 s); every existing test passed as before.
- `pnpm lint` printed `7 test file(s), each named by its test level.`, and `pnpm format:check` and `pnpm typecheck`
  pass.
- The branch changes only `flow-tests/README.md`, `test/inbox.ts`, `test/people.ts` and the two new flows: no product
  code, CI workflow or other test. Both new files carry the box, and `inbox.ts` and `people.ts` got the row
  `2026-10-22  Opus 5.5   prompted by TaeHyun79`.
- **After merging the integration tip** (P09-02's main-server rename, which rebuilt the main server's image):
  `pnpm test` passed `Test Files  7 passed (7)`, `Tests  13 passed (13)`, 264 s, and lint, format and typecheck pass.

### Agent usage (2026-10-22)

- Agent time: about 42 minutes, an estimate: the implementer subagent, measured just before its last commit. About 24
  of them were spent waiting for the heavy lock while another ticket's agent held it.
- Tokens: input 10,672 thousand in all (cache reads 10,017 thousand, cache writes 654 thousand, uncached under 1
  thousand); output 3 thousand, a lower bound, since the transcript keeps only partial output counts.
- The orchestrating session, the merges, the code review and its fix round are recorded once, under
  [P09-10](../../P09-unit-tests/issues/10-mobile-renewal-answers-and-adapters-as-units.md).

### Review round (2026-10-23)

The code review of P09–P11 (2026-10-23); each line starts with what it found.

- **flow-tests' README still said "the three flows of the demo".** flow-tests' README intro names what `pnpm test` runs,
  the demo's flows, A1 and A2, and the checks of the stacks, with no count of flows.
- **The root README still counted three demo flows.** The root README's flow-tests rows ("Running the tests" and the
  layout) say the same, without a count.
