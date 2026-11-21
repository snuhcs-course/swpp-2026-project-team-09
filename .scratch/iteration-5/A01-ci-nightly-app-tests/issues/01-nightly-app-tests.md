# 01: The full level leaves out the app's integration tests, which run at a nightly level

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Blocked by: None

## What to build

The three levels of the spec: `changes.sh` decides the level, `ci.yml` takes `workflow_dispatch` and names such a run, `nightly.yml` starts the nightly level from `main`, and the Release gate reads push runs only. The root README, the Production README and the Dev Server README say the new levels and what a Release waits for.

## Acceptance criteria

- [ ] `changes.sh` sets `level` (basic, full or nightly) and `tests` from `GITHUB_EVENT_NAME` and `GITHUB_REF` alone. At the full level `mobile-tests` gets `run=false` with a notice, and every other job `run=true` with `tests=all`. A `workflow_dispatch` or `schedule` run does every job.
- [ ] Job names stay. A job that skips its work reports success, so no ruleset change is needed.
- [ ] The `mobile` job runs the app's unit tests at every level; the shards run `pnpm test:integration`.
- [ ] A run started by hand is named "Nightly level on <ref>" and is in a concurrency group apart from the pushes' runs.
- [ ] `release.sh gate` passes on a tag run whose `mobile-tests` jobs skipped, still fails on a tag run with a failed job, ignores `workflow_dispatch` runs on the tag or on a Main, and waits for the tag's own push run even when a run started by hand is listed.
- [ ] `bats` on `.github/ci` and `.github/release` passes, and `shellcheck` and `actionlint` are clean.
- [ ] A run started by hand on the pull request's branch does every job, `mobile-tests` included.
- [ ] The READMEs give the five rows, the nightly level, the command for a run by hand on a branch or on an older commit, and how to find a red nightly run.

## Comments
