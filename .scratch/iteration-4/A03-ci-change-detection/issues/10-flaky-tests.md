# 10: The tests that fail only sometimes in CI, found and fixed

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The tag run of the Release `snunow/all/26.11.16-1` (run 43859639284) failed `main-server/test/better-plan.integration.test.ts:184` on a commit whose merge queue run had passed. Every failed job of `ci.yml` from 2026-11-01 to 2026-11-16 was gone through for tests that failed on a commit that passed elsewhere or on a re-run: 176 jobs over 978 runs, every attempt of a re-run run included, 159 that failed and 17 that the time limit cancelled. The test helpers were read for what depends on timing: collectors of signals with no filter on the test's own ids, fixed sleeps, waits on a slow runner, state shared between tests or files, and the clock. Each cause still open is removed in the tests; no product code changes.

- `signalsWhile` (`main-server/test/signals.ts`) returned every signal that reached Redis between its two markers. Every test file's server in a CI run sends to the one Redis, so another file's signal of the same name fell inside the window. Since `plans-meet.integration.test.ts` came on 2026-11-16, two files change a Quest's Plan, and `better-plan`'s check of `plan-changed` received the other file's Quest first. `signalsWhile` now keeps only the signals the test's own server put on Redis: it records what that server's messaging client publishes as `signal` and matches the window against it.
- `global-events.integration.test.ts` kept its own copy of `collected`, which waited only for the posts to be marked finished, the cause ticket 06 removed from the shared one. The step's `global-events-changed` could then go out inside the next check's window, as it did once on 2026-11-14 ("is not sent when a Collection stores nothing new"). The file now uses the shared `collected` of `source-posts.ts`.
- `same-event-races.integration.test.ts` ("leaves a post alone while another server asks…") and `judgement-failures.integration.test.ts` ("has used its try, and its claim is taken up only once it is old") make a claim at the real time and expect the judging server to take it as a call still running. That server's `JUDGEMENT_TIMEOUT_MS` is 200 ms, and a claim older than twice that counts as left by a server that stopped. On a slow runner the step reached the claim after 400 ms, and the post was held for `ai_failed` (once, 2026-11-14). Both tests now hold the judging server's clock at the claim's time for that call.
- `better-plan.integration.test.ts` had loosened its two checks of whom `quests-changed` tells to `arrayContaining` on 2026-11-15, because of other files' signals. With the cause gone, both are exact again.

## Acceptance criteria

- [x] Each cause above, put back on purpose (another server's signal published inside the window, the step's signal held until the next window's start marker, 500 ms between the claim and the step), fails its test with the message CI gave before the change and passes after it.
- [x] `better-plan` and `plans-meet` together, `global-events`, `same-event-races` and `judgement-failures` each pass 20 runs in a row locally; the 26 files that use `signalsWhile` pass once.
- [x] Lint, format and the type check of `main-server` pass.
- [x] What each test checks is unchanged, and no check is loosened.

## Comments

### Decisions (2026-11-16)

- The window of `signalsWhile` stays on Redis, and each signal in it must match one this server published. A test still fails when its own server's signal is lost on the way, and the files that gave their server a Redis of its own keep it.
- Matching uses the published event, compared as JSON with sorted keys, so a payload with a `Date` matches its copy read back from Redis.
- The claim tests hold the clock rather than lengthen `JUDGEMENT_TIMEOUT_MS`: other tests of the same world rely on the 200 ms limit to make the model's call time out.
- Left, with reasons:
  - `assistant-free-time-shuttle.integration.test.ts:67` ran out of its 5 seconds once (2026-11-14, run 43561492314; attempt 2 passed). It takes 0.3 to 0.56 s in nine other runs. Its dates are its own, the stage holds the server's clock, and no other server's work is in its path. The cause was not found, so nothing was changed.
  - Failures outside the tests: `redis:8` not found when the socket server's tests started (2026-11-14); the app fingerprint job's `app-version.json` answered 504 (twice on 2026-11-05); the npm registry unreachable for worker-server's install (2026-11-05).
  - The 17 app test shards cancelled by their time limit (15 at 20 minutes on 2026-11-15, 2 at 30 minutes on 2026-11-16) were slow, not stuck; ticket 09 raised the limit to 45 minutes.
- Already fixed before this ticket, and not failing since: the teardown's `permission denied to terminate process` (#154), `judgement-sessions:182` (#312, #318), `publication-step:124` (#310), the 2026-11-05 Judgement fixture dated that day (#208), and the date shared by `assistant-search-room` and `assistant-join-or-recruit`.
- Of the failures that looked like chance in the merge queue on 2026-11-15, all were the pull requests' own: the type checks of #281 and #284 (#288 inherited #284's), app shards 2 and 3 for #307 (its own mock; #295 passed alone), shard 4 for #326, and the line-count lint for #272. No app test failed only sometimes.
- No test compares a date before the end of 2026 with the real clock.

### Local runs (2026-11-16)

Each cause was put back by a change to the test that was never committed, then run with the tests of `4.0/Main` and with the fixed ones:

| Cause put back | `4.0/Main` | Fixed |
|---|---|---|
| Another server's `plan-changed` for another Quest published inside the window (`better-plan` :184) | failed: "expected [ { questId: 'another-quest' }, …(1) ] to deeply equal [ Array(1) ]", as in run 43859639284 | passed |
| Another server's `plan-changed` and `quests-changed` to three other Users in every `bothSignalsWhile` window, with the exact checks | 2 of 13 failed | 13 of 13 passed |
| The step's `global-events-changed` held until the next start marker (`global-events` :296) | failed: "expected [ { name: 'global-events-changed' } ] to deeply equal []", as in run 43622095411 | passed |
| 500 ms between the claim and the step (`same-event-races` :137) | failed: "expected { …(11) } to match object { Object (heldFor, globalEvent) }", as in run 43631312404 | passed |
| 500 ms between the claim and `judgePost` (`judgement-failures` :122) | failed: the model was called | passed |

Without them, through the shared locks with two workers: `better-plan` and `plans-meet` together 40 of 40 runs, 20 before the exact checks came back and 20 after; `global-events` 20 of 20; `same-event-races` 20 of 20; `judgement-failures` 20 of 20; the 26 files that use `signalsWhile` once, 317 of 317 tests. The race between two files is narrow, so the runs alone would rarely have shown the old failure; the put-back causes are the proof.

### Agent usage (2026-11-16)

The A03 session did this ticket with two subagents: one went through the CI history, one looked for tests that compare a written date with the real clock.

- Agent time: about an hour, an estimate from the transcripts' timestamps: 20 minutes in the session, 31 in the CI history subagent, 7 in the date subagent. Most of the rest was waiting for the test runs under the shared lock.
- Tokens: output 267,935; input 63,222,598, of which 62,409,096 were cache reads, 812,878 cache writes, and 624 uncached. Without cache reads: 813,502. Counted up to the commit, subagents included.
