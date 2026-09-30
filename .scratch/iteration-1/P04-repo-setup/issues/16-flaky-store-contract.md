# 16: Redis store contract that fails now and then

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 10 (Make creating requests safe to repeat)

## What to build

When the whole main server suite runs, `test/redis-idempotency-store.e2e-spec.ts` now and then fails in "a completed record expires after ttl, and its key is free again": the record is gone before its time to live has passed. The file passes when run again or alone. The suite has to pass every time, and the store has to keep passing the whole contract that the idempotency module provides, with concurrency on.

## Acceptance criteria

- [x] The cause is found by reproducing the failure, not guessed.
- [x] The fix removes the cause without weakening the contract: every case still runs, with concurrency on, against a real Redis, and no margin or timeout is raised.
- [x] The fix is checked by measuring the time each wait of the contract takes, with and without it. No test can reach the cause, which is how the suite schedules its files.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm format:check` and `pnpm test` pass.

## Comments

### Cause (2026-09-30)

- The case completes a record with a time to live of 1,800 ms, waits 1,650 ms in real time and expects the record to be there. Redis expires records on its own clock, so the reply that stored the record, the wait's timer and the next request have 150 ms to spare between them. "extend() leaves a completed record's ttl alone" and "extend() renews the lock for the owner only" have the same 150 ms. The cases without a wait rely on a lock that lives 600 ms.
- `concurrent: true` adds six cases in which 16 callers race for a key. It does not run the cases at the same time: Vitest runs a file's cases one after another. The failing case is not one of the six.
- Measured with a copy of the test file that ran the same store, the same contract and the same order, with the Redis client and the wait wrapped. Each script also read Redis's `TIME`, so each wait could be split, on Redis's clock, into the reply, the timer and the next request.
  - Alone, a wait used at most 2.9 ms of the 150 ms.
  - In 4 runs of the whole suite, which ran its 13 files in parallel with load averages up to 30 on 8 cores, the failure came back once, in "extend() leaves a completed record's ttl alone". That wait went 229.7 ms over: the timer fired 182 ms late, because the worker's event loop was held up to 192 ms, the next request took 38 ms to reach Redis, and the reply 9 ms. In the four runs, three waits went more than 150 ms over, up to 1,204 ms; the other two waited past an expiry, which a late timer does not break.
  - The host's clock and Redis's kept the same offset, within 13 ms, so the Docker VM's clock did not jump.
- The other test files keep the CPUs busy while this file waits. Its worker gets the CPU late, and the 150 ms run out. The store is not at fault.

### Fix (2026-09-30)

- `vitest.config.ts` has two projects. `store-contract` holds this file and has `sequence.groupOrder: 1`, so it runs alone once `e2e`, which holds every other file, has finished. The contract is unchanged: all 19 cases, `concurrent: true`, the test Redis and waits in real time.
- The projects do not extend the root config. With `extends: true`, each project ran the global setup as well, three times in all, each starting its own containers. The root keeps `globalSetup`, and Vitest gives every project what the root's setup provides. `globals`, `unstubEnvs` and `hookTimeout` are given to both projects.
- Vitest 4.1 has no `poolMatchGlobs`. The module's documentation says only that, without `advanceTime`, the contract waits for real expiry and takes about ten seconds; Redis's clock cannot be moved.
- Not chosen:
  - Leaving out `concurrent` drops the six race cases and the spec's "with concurrency on", and leaves the failing case as it is.
  - Fewer workers for the whole suite make the failure rarer, not impossible, and slow every file.
  - Retrying the file would also hide a race that fails now and then.
- Measured the same way with the fix, in 4 runs of the whole suite: every case passed, and a wait used at most 3.7, 3.3, 24.3 and 59.1 ms. The 59.1 ms run had a load average of 57, from outside the suite.
- The file now runs after the others instead of beside them, so the suite takes up to its 11 seconds longer. On this machine, whose load varied, runs took 26 to 68 seconds with the fix and 21 to 53 seconds without.

### Left as is (2026-09-30)

- The file still waits in real time. Load from outside the suite, such as another suite running on the same machine, can still use up the 150 ms.
- In the same runs, three tests elsewhere ran out of the default 5 seconds now and then, before and after the fix: "stops when the database cannot be reached" in `test/startup.e2e-spec.ts` (also in ticket 15), and "end the session when one brings back a token used long ago while the other refreshes" and "is told that a sign-in on another phone replaced the session" in `test/session.e2e-spec.ts`. They were not investigated here.

### Agent usage (2026-09-30)

- Agent time: about 22 minutes, an estimate. One session in the worktree `ticket-review-feedback-09cfc6` worked from the start to the commit, less about 68 minutes waiting for answers. Most of it went into runs of the whole suite. No subagents.
- Tokens, for that session, counted when this section was written:
  - Input: 8,596,923 in total, of which 8,348,934 were cache reads, 247,855 cache writes and 134 uncached.
  - Output: 54,507.
