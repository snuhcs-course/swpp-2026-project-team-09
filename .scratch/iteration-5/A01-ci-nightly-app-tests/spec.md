# A01: The app's integration tests run nightly and by hand, not on a Main's push or a Release

Status: ready-for-agent

## Problem Statement

A full CI run, on every push to `5.0/Main` and on every Release tag, took 32 to 37 minutes on 2026-11-21. The four `mobile-tests` shards, the app's integration tests, take 21 to 32 minutes each and set that time. Every other job ends 6 to 9 minutes after the run starts; `main-server` is the slowest. The Release gate waits for the tag's own full run, so every Release waited over half an hour for those tests.

The same day the full runs on `5.0/Main` were red from the afternoon on, on three outdated app integration tests, and the failure was found only when a Release was prepared.

## Solution

CI runs at one of three levels, set by the run's event alone in `.github/ci/changes.sh`:

| Run | Jobs | Level |
| --- | --- | --- |
| Push to a working branch | The jobs its changed paths reach | Basic |
| Merge queue | The jobs its changed paths reach | Basic |
| Push to `<line>/Main`, `main` or `development` | Every job but `mobile-tests` | Full |
| Tag push | Every job but `mobile-tests` | Full |
| Run started by hand or by the nightly (`workflow_dispatch`), or any other event | Every job | Nightly |

- The basic level runs lint, format, types and the unit tests. The full level runs every test but the app's integration tests. The nightly level runs everything.
- At the full level the four `mobile-tests` jobs start, skip their work with a notice, and report success, so the Iteration Main ruleset's required checks are unchanged.
- The `mobile` job runs the app's unit tests at every level. The `mobile-tests` shards run only the integration project (`pnpm test:integration`), so no test runs twice at the nightly level.
- `ci.yml` takes `workflow_dispatch`. Such a run is named "Nightly level on <ref>" and has a concurrency group of its own, so it neither waits for a Main's push run nor holds one up.
- `.github/workflows/nightly.yml` runs at 03:00 KST and starts `ci.yml` on the newest `<line>/Main`, with `actions: write` and `contents: read` only. GitHub fires a schedule only from the default branch's copy of a workflow, so the same file also goes to `main`, through a pull request of its own that adds nothing else. A Main whose `ci.yml` has no `workflow_dispatch` yet is skipped with a notice, so the order in which the two pull requests merge does not matter. By hand: `gh workflow run ci.yml --ref 5.0/Main`.
- The Release gate (`release.sh`'s `read_ci_jobs`) reads only push runs: the tag's own and those of a `<line>/Main`, `main` or `development`. A run started by hand or by the nightly is never read, whichever way it ended, and does not stand for the tag's own run.

## Decisions

- `main-server` (8 to 9 minutes) and `flow-tests` (about 2) stay at the full level. They were green in every full run measured on 2026-11-21, and `main-server` alone sets the full level's time.
- No Release waits for the app's integration tests, for now. Whoever wants them green first starts the nightly level on the commit before tagging.
- `nightly.yml` reaches `main` now, by a pull request that adds only that file, rather than at the next iteration hand-over. Nothing is pushed to `main` directly, and no repository setting or ruleset changes.

## Out of Scope

- Making the app's integration tests faster.
- Alerting other than the run's name and the list of `workflow_dispatch` runs: no issue, mail or chat message is sent on a red nightly run.
