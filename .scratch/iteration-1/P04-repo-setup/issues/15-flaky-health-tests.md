# 15: Health tests that fail now and then

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Data stores and main server connection)

## What to build

When the whole main server suite runs, `test/health.e2e-spec.ts` now and then fails in a hook: "Health checks with Redis down" once and "Health checks with the database down" once, while every test in it passes. It passes when run again or alone. The suite has to pass every time, so that a failing run means a broken change.

## Acceptance criteria

- [x] The cause is found by reproducing the failure, not guessed.
- [x] The fix removes the cause. No timeout is raised to hide it.
- [x] Where a test can reach the cause, a test fails without the fix and passes with it.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm format:check` and `pnpm test` pass.

## Comments

### Cause (2026-09-29)

- The failing hook was `afterAll`, that is `app.close()`. Vitest reports a failing `beforeAll` with its tests skipped and a failing `afterAll` with them passed, and the recorded run had all 128 tests passed.
- The two groups took their store away by stopping a container of their own while the server was connected to it. testcontainers kills a container at once. Under load, Docker Desktop does not always close the container's port with it: after `stop()` had returned, the port still took a connection, never answered and reset it about a second later, and the messaging client still took its old connection to be open more than 2 seconds after the stop.
- The server closed its Redis connections with QUIT, which waits for Redis to answer:
  - `RedisModule`'s client queues QUIT behind the commands it holds for Redis. ioredis resolves `quit()` at once only when it holds none; here it held its own `CLIENT SETINFO`, left from a connection that was reset while it was being set up. `app.close()` had not returned after 30 seconds, so the hook ran out of its 60 seconds.
  - Nest's Redis messaging server sent QUIT on a connection it still took to be open. When that connection closed, ioredis rejected the QUIT with `Connection is closed.` and `app.close()` threw.
- Reproduced with a test that repeated the "Redis down" group with container stops, four copies at a time, while busy loops kept the CPUs of the host and of Docker's VM full. In about 230 closes, `app.close()` hung 7 times and threw 3 times. About 45 runs of the whole suite without that load, on this branch and with ticket 07 merged, all passed. The "database down" failure was not reproduced; its group took the database away the same way.

### Fix (2026-09-29)

- `RedisModule` closes its client with `disconnect()`, which waits for nothing. Nest calls `onApplicationShutdown` after the HTTP server and the messaging server have closed, so no request is still waiting for a reply. `test/redis-module.e2e-spec.ts` takes Redis away through a proxy while a command waits in the client. With `quit()` the close had not returned after 30 seconds; with `disconnect()` it returns within a few milliseconds.
- The two health groups reach a shared store through a TCP proxy of the test's own, `test/proxy.ts`, and stop the proxy once the server is running. Every connection is dropped and new ones are refused, as a stopped store does, on every run. The groups start no containers of their own, so "database down" no longer migrates a database either.
- With the fix, 6 runs of the whole suite, 3 at a time under the same load, passed the health file every time.

### Left as is (2026-09-29)

- Nest's Redis messaging server and client still close with QUIT. When Redis stops answering on an open connection just as the server shuts down, `app.close()` can still wait or throw. The tests no longer create that state; changing it means replacing the close of Nest's Redis transport.
- Under the same load, tests with the default 5-second timeout also failed now and then, such as "stops when the database cannot be reached", and so did the Redis store contract cases "extend() leaves a completed record's ttl alone" and "keeps keys apart exactly, however similar or long" (another key's record came back). They pass without that load and were not investigated here.

### Agent usage (2026-09-29)

- Agent time: about 1 hour 35 minutes, an estimate. One session in the worktree `ticket-review-feedback-09cfc6` worked from the start to the commit, less about 3 minutes waiting for an answer. Most of it went into runs of the suite under load. No subagents.
- Tokens, for that session, counted when this section was written:
  - Input: 18,620,657 in total, of which 18,346,321 were cache reads, 274,132 cache writes and 204 uncached.
  - Output: 141,077.
