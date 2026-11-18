# 12: The tests of the settings copy no longer race the minute

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The merge queue run 44275861886 (2026-11-18 09:32:00Z) failed `main-server/test/admin-settings.integration.test.ts:131` for a pull request that changed only `mobile/` files: "expected 'claude' to be 'default'". The test saves `llm.key` and expects the listing to show the value still in effect. `list()` and `forAdministrators()` in `global-settings.service.ts` read `value` from the pod's copy in memory. After start, only `check()` reloads that copy, run by the `global-settings-check` job (`@Cron('0 * * * * *')`) on the real clock; `save()` never touches it. So 'claude' in the listing means the job ran between the save and the listing: the test straddled 09:32:00. It is the test's first failure in the merge queue. The queue's earlier `main-server` failures since 2026-11-15 were other tests (`publication-step` for #305, `judgement-sessions` for #302, `better-plan` for #327) or pull requests' own lint and type checks. Once the queue runs only the basic checks and Main runs every test (ticket 11), such a failure turns Main red with no pull request at fault. The tests that read the copy no longer depend on the wall clock; no product code changes.

- `admin-settings.integration.test.ts` stops the server's `global-settings-check` job right after start. No test there runs a check, so nothing reloads the copy during the file.
- `llm-key-per-answer.integration.test.ts` runs the check itself after each save. A check that starts while another is running returns at once (the guard that `global-settings`' "skips a check while the previous one is still running" tests), so when the server's own check at second 0 met the test's, the test went on before the copy was loaded. Each of its servers now has the job stopped too.
- `global-settings.integration.test.ts` ("is read by no pod…") compared the save's `appliesAt` with `Date.now()` taken after the save. When the minute turned between the save's reading of the clock and the test's, `appliesAt` was already past. Its pods have no scheduler, so that test pins only `Date`, at mid-minute.

## Acceptance criteria

- [x] Each cause, put back on purpose (a wait past the real second 0 between the save and the listing, or between the save and the check of `appliesAt`), fails the test of `4.0/Main` and passes after the change.
- [x] The three changed files pass locally with two workers.
- [x] Lint, format and the type check of `main-server` pass.
- [x] What each test checks is unchanged, and no check is loosened.

## Comments

### Decisions (2026-11-18)

- The server tests stop the job rather than fake the clock. The copy switches when the job's timer fires, and that timer was set on the real clock when the server started: pinning `Date` does not move it, and fake timers in a test that starts the whole server would hold its database and HTTP timers as well. `admin-settings` claims only that a save does not change the value in effect before the check; the check's schedule stays tested by `global-settings`' "runs the check at second 0 of every minute in the server".
- `global-settings`' pods have no scheduler and no HTTP, so its one test pins only `Date`, with `toFake: ['Date']`, as `assistant-cached-prefix` does; its save and checks ran with the pinned `Date` through a 61-second wait.
- `llm-key-per-answer`'s race was not put back in a run. It needs the server's check to be running at the instant the test's starts, a window of a few milliseconds at second 0; it follows from the guard.
- Left, with reasons: the checks that compare `appliesAt` with a time within 60 seconds (`admin-settings` :129, `global-settings` :252) hold whatever the clock; `judgement-settings` replaces `GlobalSettings.get` with a fixed value, and `model-port-keys` is a unit test with no scheduler.

### Local runs (2026-11-18)

Each cause was put back by a change to the test that was never committed, then run with the tests of `4.0/Main` and with the fixed ones, through the shared locks with two workers:

| Cause put back | `4.0/Main` | Fixed |
|---|---|---|
| A wait until 0.3 s past the next second 0 between the save and the listing (`admin-settings` :131) | failed: "expected 'claude' to be 'default'", as in run 44275861886 | passed, with the whole file |
| A wait past second 0 between the save and the check of `appliesAt` (`global-settings` :186) | failed: "expected 1794995400000 to be greater than 1794995400304" | passed (61 s), with the whole file |

Without them: `admin-settings` 8 of 8, `llm-key-per-answer` 6 of 6.

### Agent usage (2026-11-18)

One session, no subagents.

- Agent time: about 15 minutes, an estimate from the transcript's timestamps. About 5 of them were the test runs, two of which waited for the real minute to turn.
- Tokens: output 40,715; input 5,322,740, of which 5,197,621 were cache reads, 125,045 cache writes, and 74 uncached. Without cache reads: 165,834. Counted up to the commit.
