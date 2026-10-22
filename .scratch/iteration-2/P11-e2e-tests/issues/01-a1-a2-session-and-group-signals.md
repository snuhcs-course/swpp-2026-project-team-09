# 01: A1 and A2: a Session replaced, and a Leader running a group, in flow-tests

Parent: [P11 spec](../spec.md)
Status: ready-for-agent
Blocked by: P09-06 (flow-tests: flows named by level)
Touches: flow-tests only: two new flow files in `test/`, the harness's `people.ts` and `inbox.ts`, and the README's table of flows. Not the stack, the Compose files or any server.

## What to build

Two new end-to-end flows in `flow-tests`, named `*.e2e.test.ts` from the start, beside the flows P09-06 renamed, and run by `pnpm test` and so by the per-push flow-tests check. They are written like the existing flows, so a failure names the User, the call and what was waited for.

A1 (US-AUTH-02 scenario 1; NFR-07) signs a User in on a second phone and checks that the first phone is told its Session ended, is disconnected, and has its uploads refused, while the second phone's uploads still reach the Friend (spec: "A1: one phone at a time"). A2 (US-QUEST-03 scenarios 1 and 2) has a Leader accept two join requests to an Approval Quest and then end the group with its Party on, as the app does, and checks that the other members are told each time and that the Quest, its post and the Party are gone (spec: "A2: a Leader runs a group").

The harness gains the two additions these flows need (spec: "The harness"): a `Student` that signs in again "on another phone" with the same Google account, and an `Inbox` that can wait for the server to close its connection. The Administrator's ID token export belongs to P11-02.

## Acceptance criteria

- [ ] A `Student` keeps the Google account it signed in with and can sign in again on another phone, answering a second `Student` for the same User with its own token and socket and skipping Onboarding.
- [ ] An `Inbox` can wait for its connection to be closed by the server (`io server disconnect`), with the same bounded wait as a message.
- [ ] A1 is one test in a new `flow-tests/test/*.e2e.test.ts` file following the spec's five steps: phone 1 receives `session-ended` with `{ code: 'SESSION_REPLACED' }` and is then disconnected; its `POST /positions` answers 401 with `code: 'SESSION_REPLACED'`; B receives no position of A within the quiet window; phone 2's upload on campus reaches B.
- [ ] A2 is one test in a new `flow-tests/test/*.e2e.test.ts` file with four Users following the spec's five steps: D finds the Approval Quest on the Board's list; A is told of B's join request and B of its acceptance; after C is accepted, A, B and C each receive `quests-changed` and B's and C's reads list A, B and C as Holders.
- [ ] In A2, after `POST /parties/mine/end` then `POST /quests/:questId/end`, B and C each receive `party-changed` and `quests-changed`; B's read of the Quest is refused as not found, B and C are in no Party, and D's Board no longer lists the Quest.
- [ ] Waits are the harness's (10 s for a message that must come, 1.5 s for one that must not); nothing sleeps for a fixed time or is retried.
- [ ] Every expected value comes from the scenario or from the test's own input; the flows read no database and no server's internal state beyond the existing empty state between tests.
- [ ] `pnpm test` in `flow-tests` passes with A1, A2 and every existing flow unchanged, and `pnpm lint` (with the level check), `pnpm format:check` and `pnpm typecheck` pass.
- [ ] No product code, CI workflow or other test changes.
- [ ] `flow-tests/README.md`'s table of flows lists A1 and A2.
- [ ] Every new source file starts with the AI-generated box, and each changed source file gets a new row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
