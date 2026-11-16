# 06: The tests' `collected` waits for the publication step to return, its signal sent

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

A merge queue build failed on `main-server/test/publication-step.integration.test.ts`, "The step after the answer > publishes what the rules read with the route rule, at version 1, and tells the apps once": `global-events-changed` came twice where once was expected. The pull requests under test touched no global event.

The second signal was the previous test's. "is answered while the step has not ended" leaves a post the rules read before the step, and its `nextCollection` publishes it, with a signal of its own. `nextCollection` goes through `collected`, which waited only until every post's `stepFinishedAt` was set (`stepOver`). The step sets it inside each post's transaction, but `PublicationStepService.run` sends `global-events-changed` only after its whole loop returns. So under load the next test's first marker could go out before that signal, and the signal was counted as the next test's.

`collected` now also waits for the step's own `run` to return, through a spy that calls through, so the step's signal is sent before it returns. The check that the step under test tells the apps once is unchanged.

## Acceptance criteria

- [x] `collected` in `main-server/test/source-posts.ts` spies on `PublicationStepService.run` without changing it, waits for the call that the message started, awaits its result, restores the spy, and then waits for the posts as before.
- [x] With the step's signal delayed by 100 ms only for the run that publishes the previous test's post, the test fails as the queue build did before the change and passes after it.
- [x] `test/publication-step.integration.test.ts` and `test/source-posts.integration.test.ts`, the two files that use `collected`, pass without the delay; lint, format and typecheck pass.

## Comments

### Decisions (2026-11-16)

- No code of the server changes. Only the publication step, an Administrator's change and the same-event queue's `publishAsOwn` send `global-events-changed`, and each sends it once per change it commits; the topics step sends no signal.
- `stepOver` stays after the wait for `run`, so that a test still fails when the step leaves a post unfinished.

### Agent usage (2026-11-16)

The A03 session did this ticket alone, without subagents.

- Agent time: about 15 minutes, an estimate from the transcript's timestamps.
- Tokens: output 22,781; input 15,135,915, of which 14,515,212 were cache reads, 620,657 cache writes, and 46 uncached. Without cache reads: 643,484.
