# 09: The app's test shards may run 45 minutes

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

In the merge queue's full runs of 2026-11-16, the four `mobile-tests` shards took 17 to 28 minutes each, right under their 30-minute limit, and one shard that had passed all its 1,194 tests was cancelled by the limit ten seconds later (run 43818405413). A cancelled required check takes its pull request out of the queue and rebuilds every pull request behind it. The limit goes to 45 minutes; the shards, their number and their names stay.

## Acceptance criteria

- [x] `mobile-tests` in `.github/workflows/ci.yml` has `timeout-minutes: 45`; nothing else in the job changes, and its four check names stay `mobile-tests (1/4)` to `(4/4)`.

## Comments

### Decisions (2026-11-16)

- For after the Release, not done here: single app integration test files take 170 to 270 seconds on the runners, and more shards would change the required checks, which needs the ruleset changed with them.

### Agent usage (2026-11-16)

The A03 session did this ticket alone, without subagents.

- Agent time: about 3 minutes, an estimate from the transcript's timestamps.
- Tokens: output 2,639; input 2,514,150, of which 1,730,285 were cache reads, 783,859 cache writes, and 6 uncached. Without cache reads: 786,504. Counted up to the commit.
