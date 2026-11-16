# 05: A pull request's own push runs lint, types, format and unit tests; the merge queue runs everything

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The merge queue now runs every job with every test before each merge (ticket 04). A pull request's own push still ran the integration and flow tests of every area it touched: in the full queue run of `01a95dfc`, the app's four test shards took 19.7, 16.4, 11.5 and 8.8 minutes, main-server 8.3 and flow-tests 3.3, and everything else about a minute. The app's 176 integration test files take 9,096 seconds, its 136 unit test files 350.

A pull request's own push now runs, for each job its changes reach, the lint, format and type checks and only the unit tests. The integration and flow tests run in the merge queue, where a failure sends the entry back and rebuilds the ones behind it. Every required check still reports on the pull request's head under its own name: steps are cut, not jobs.

## Acceptance criteria

- [x] `changes.sh` also answers `tests=unit` on a working branch's push and `tests=all` otherwise (a Main, `main`, `development`, a tag, the merge queue, any other event). A change to `.github/workflows/ci.yml` or `.github/ci/**` gives `tests=all` on the branch too. A failure inside the script gives `tests=all`.
- [x] In `ci.yml`, the package checks run `pnpm test` when `tests` is not `unit`, and `pnpm test:unit` when it is (`mobile` included, `flow-tests` excepted). The app's four test shards do nothing when `tests` is `unit`. A missing output counts as every test.
- [x] Job names, the shard count and the required checks are unchanged.
- [x] Tests: `tests=unit` on a working branch, `tests=all` for CI's own files, a Main, a branch without a slash, a tag, the merge queue, another event and a failure inside the script; the output contract with both lines.
- [x] The root README says what a pull request's push runs, and that the integration and end-to-end test files a pull request touches are run locally before it is ready.

## Comments

### Decisions (2026-11-15)

- The app's unit tests run in the `mobile` job on a pull request's push, which already has the app installed, instead of in one of the four shards; the shards end in seconds.
- `run` still means "the branch's changes reach this job", and `tests` says how deep. A job told `run=true` and `tests=unit` with no unit tests of its own, the app's shards and flow-tests, does only its other steps; the decision line says "with unit tests only".
- Before a pull request is reported ready, the integration and end-to-end test files it touches are run locally, since its own push no longer runs them.

### Agent usage (2026-11-15)

The A03 session did this ticket alone, without subagents.

- Agent time: about 15 minutes up to the push, an estimate from the transcript's timestamps; reading the pull request's run adds a few minutes.
- Tokens: output 31,470; input 13,517,914, of which 13,473,938 were cache reads, 43,926 cache writes, and 50 uncached. Without cache reads: 75,446.
