# 01: The event flow waits for the Shared Quest

Parent: [P10 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)
Touches: flow-tests' event flow (`bothAreMatched` in `flow-tests/test/event.flow.ts`). No server code, no other flow, no CI workflow.

## What to build

The required `flow-tests` check fails with nothing wrong (spec: Problem Statement, item 1). The main server sends `matching-changed` once it has created the Shared Quest, before the match server writes that Quest onto the match, so a read in that window says `matched` with `questId: null`. The event flow compares two reads taken at different moments.

After both Users receive `matching-changed`, as today, the flow reads the first User's request again until it reads `matched` with a `questId`, and only then checks that the second User's request names the same Shared Quest (spec: "The event flow waits for the Shared Quest"). The wait is bounded by the flow's `MATCHING_WAIT_MS` and uses Vitest's `vi.waitFor`, so the flow runs as fast as the servers answer, never sleeps, and on timeout shows the last request it read. The flow still checks that both Users hold the same Shared Quest for the Global Event.

This lands first, in its own pull request into `2.0/Main`, before P09's rename of flow-tests (P09-06), while the file is still `event.flow.ts` (spec: Order).

## Acceptance criteria

- [x] Both Users still wait for `matching-changed` within `MATCHING_WAIT_MS` before any read.
- [x] The first User's request is then read over HTTP with `vi.waitFor`, within `MATCHING_WAIT_MS` (15 seconds), until it reads `matched` with a `questId`; the flow has no fixed sleep.
- [x] The second User's request must then equal `{ state: 'matched', questId }` with that `questId`, and the existing checks on the Shared Quest (its Global Event, both Users as its Holders) stay.
- [x] On timeout the failure is the last failed assertion from `vi.waitFor`, so it shows the last request read.
- [x] No server code, no other flow and no CI workflow or required check changes.
- [x] `pnpm test` in `flow-tests` passes, and `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.
- [ ] The pull request merges into `2.0/Main` before P09-06 (flow-tests: flows named by level).
- [x] The changed source file gets a new row in its AI-generated box (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

- **Where it lands.** The person running P09–P11 asked for one pull request for all of them, so this change lands in the integration branch `2.0/P09-11-tests` (from `2.0/P10-01`), before P09-06, not in a pull request of its own into `2.0/Main`. The pull request criterion stays unticked for that reason.
- **Decisions.** The wait checks the whole request, `toEqual({ state: 'matched', questId: expect.any(String) as unknown })`, so a timeout prints the last request in full; `as unknown` is how main-server's tests get an asymmetric matcher past lint's `no-unsafe-assignment`. `vi.waitFor` keeps its default 50 ms interval. The second User's request is read once, after the wait. Only `bothAreMatched` changed (and its box row); `vi` is a Vitest global here, so no import.
- **The wait works.** Each run is `event.flow.ts` alone, with no other test run on the machine meanwhile. The planted sleep and the read counter were in the working copy only, never committed, and removed before the final run.
  - Red: the old flow, with a 1 s sleep planted in match-server's `askForQuest` between the main server's answer and the write of the `questId`, fails with `이준: GET /quests/null answered 400 {"message":["Invalid UUID"],…}`: both reads said `matched` with `questId: null`.
  - Green, same plant, new flow: passes. The wait took 21 reads; 20 said `questId: null`, the 21st, at +1026 ms, named the Quest.
  - Timeout, a 20 s plant: fails after 15.5 s, after 285 reads, with the last failed assertion from `vi.waitFor`: `expected { state: 'matched', questId: null } to deeply equal { state: 'matched', …(1) }` (diff `"questId": Any<String>` against `null`), at the `expect` inside the wait.
  - No plant, the flow repeated 10 times in one stack: 10 passes, each on its first read, 4–8 ms after the signals. On this machine the window is usually closed before the first read; CI's failure (run 39769113351) shows it is not always.
- **Final run.** `pnpm test` in `flow-tests`: 5 files, 11 tests passed. `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.

### Agent usage (2026-10-22)

- Agent time: about 8 minutes, an estimate: the implementer subagent, measured just before its last commit.
- Tokens: input 5,476,000 in all (cache reads 5,347,000, cache writes 128,000, uncached under 1,000); output 2,000, a lower bound, since the transcript keeps only partial output counts.
- The orchestrating session, the merges, the code review and its fix round are recorded once, under [P09-10](../../P09-unit-tests/issues/10-mobile-renewal-answers-and-adapters-as-units.md).
