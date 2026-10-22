# 01: The event flow waits for the Shared Quest

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)
Touches: flow-tests' event flow (`bothAreMatched` in `flow-tests/test/event.flow.ts`). No server code, no other flow, no CI workflow.

## What to build

The required `flow-tests` check fails with nothing wrong (spec: Problem Statement, item 1). The main server sends `matching-changed` once it has created the Shared Quest, before the match server writes that Quest onto the match, so a read in that window says `matched` with `questId: null`. The event flow compares two reads taken at different moments.

After both Users receive `matching-changed`, as today, the flow reads the first User's request again until it reads `matched` with a `questId`, and only then checks that the second User's request names the same Shared Quest (spec: "The event flow waits for the Shared Quest"). The wait is bounded by the flow's `MATCHING_WAIT_MS` and uses Vitest's `vi.waitFor`, so the flow runs as fast as the servers answer, never sleeps, and on timeout shows the last request it read. The flow still checks that both Users hold the same Shared Quest for the Global Event.

This lands first, in its own pull request into `2.0/Main`, before P09's rename of flow-tests (P09-06), while the file is still `event.flow.ts` (spec: Order).

## Acceptance criteria

- [ ] Both Users still wait for `matching-changed` within `MATCHING_WAIT_MS` before any read.
- [ ] The first User's request is then read over HTTP with `vi.waitFor`, within `MATCHING_WAIT_MS` (15 seconds), until it reads `matched` with a `questId`; the flow has no fixed sleep.
- [ ] The second User's request must then equal `{ state: 'matched', questId }` with that `questId`, and the existing checks on the Shared Quest (its Global Event, both Users as its Holders) stay.
- [ ] On timeout the failure is the last failed assertion from `vi.waitFor`, so it shows the last request read.
- [ ] No server code, no other flow and no CI workflow or required check changes.
- [ ] `pnpm test` in `flow-tests` passes, and `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.
- [ ] The pull request merges into `2.0/Main` before P09-06 (flow-tests: flows named by level).
- [ ] The changed source file gets a new row in its AI-generated box (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
