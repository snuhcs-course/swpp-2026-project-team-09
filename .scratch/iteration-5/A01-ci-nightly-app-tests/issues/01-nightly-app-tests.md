# 01: The full level leaves out the app's integration tests, which run at a nightly level

Parent: [A01 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The three levels of the spec: `changes.sh` decides the level, `ci.yml` takes `workflow_dispatch` and names such a run, `nightly.yml` starts the nightly level from `main`, and the Release gate reads push runs only. The root README, the Production README and the Dev Server README say the new levels and what a Release waits for.

## Acceptance criteria

- [x] `changes.sh` sets `level` (basic, full or nightly) and `tests` from `GITHUB_EVENT_NAME` and `GITHUB_REF` alone. At the full level `mobile-tests` gets `run=false` with a notice, and every other job `run=true` with `tests=all`. A `workflow_dispatch` or `schedule` run does every job.
- [x] Job names stay. A job that skips its work reports success, so no ruleset change is needed.
- [x] The `mobile` job runs the app's unit tests at every level; the shards run `pnpm test:integration`.
- [x] A run started by hand is named "Nightly level on <ref>" and is in a concurrency group apart from the pushes' runs.
- [x] `release.sh gate` passes on a tag run whose `mobile-tests` jobs skipped, still fails on a tag run with a failed job, ignores `workflow_dispatch` runs on the tag or on a Main, and waits for the tag's own push run even when a run started by hand is listed.
- [x] `bats` on `.github/ci` and `.github/release` passes, and `shellcheck` and `actionlint` are clean.
- [x] A run started by hand on the pull request's branch does every job, `mobile-tests` included.
- [x] The READMEs give the five rows, the nightly level, the command for a run by hand on a branch or on an older commit, and how to find a red nightly run.

## Comments

### Done (2026-11-21)

- Merged as #410 (`278b5e0c`). The first Release at the full level, `snunow/all/26.11.21-2`, had its tag's CI run green in about 11 minutes.
- Run started by hand on the branch: 44897783575, every job including the four shards, 34 minutes. Two app integration test files failed there; both were already fixed on `5.0/Main` by #409 and #411.
- `main-server` and `flow-tests` stay at the full level: green in every full run measured that day.

### Agent usage (2026-11-21)

Covers tickets 01 and 02: one Claude Code session (Opus 5.5), no subagents.

- Agent time: about 0.5 hours of active work, an estimate from the session's message times (gaps over 5 minutes, mostly waiting for CI runs, left out).
- Tokens: output 93,391; input 26,993,129, of which 26,757,927 cache reads, 234,936 cache writes and 266 uncached.
