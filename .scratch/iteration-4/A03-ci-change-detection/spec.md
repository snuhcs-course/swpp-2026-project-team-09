# A03: A CI job does its work only when the branch's changes reach it

Status: ready-for-agent

CI is one workflow, `.github/workflows/ci.yml`. Every push to every branch starts its 16 jobs, whatever the push changed. The ruleset on the iteration branches (`*.*/Main`) requires 15 of them by name, the branch up to date with Main, and squash merges, so pull requests merge one at a time and each waits for a full run after it takes Main in.

## Problem Statement

Measured over the 100 runs of the night of 2026-11-14 (21:47 to 02:21 KST):

- A run takes 7.3 minutes when it runs alone, and 16.6 minutes on average (23.4 at most) when runs overlap. The slowest jobs are the app's test shard 3 of 4 (6.6 minutes alone, 11.1 under load) and main-server (6.3 and 6.5).
- The account runs about 20 jobs at once and one run starts 16, so two overlapping runs already wait for runners. 565 of the 1,501 jobs (38%) waited over 2 minutes for one; the longest wait was 15.3 minutes.
- A pull request that changed only documents waited 16 minutes for app and server tests its change cannot affect.
- Of the last 82 merged pull requests, 15 changed documents only, 29 changed main-server (with flow-tests) only, 12 changed the app only, and 27 needed the app's tests. None needed every job.
- A run on Main is cancelled by the next push to Main (1 of the 13 Main runs that night), so a break on Main can show only several merges later.

## Solution

Every job still starts on every push and reports its check under the same name. Its first two steps are a checkout with the history of every branch but no file contents until they are needed (`fetch-depth: 0`, `filter: blob:none`) and a call to `.github/ci/changes.sh <job key>`. The script says `run=true` or `run=false`; every later step of the job runs unless it said `run=false`. A job told `run=false` ends in seconds with success and a notice that says why.

The script compares a branch named `<line>/<name>` with `origin/<line>/Main` from their common ancestors: `git merge-base --all`, then the paths changed from each ancestor to the pushed commit, together. It never compares with the previous push, whose run may have been cancelled before it checked anything. So a branch that took Main in counts only its own changes, a force push or a new branch counts everything it changes, and a branch stacked on another counts both, which is safe.

A path reaches the jobs that read it. The map lives in the script, one `case` arm per rule:

| Changed path | Jobs that do their work |
| --- | --- |
| `.github/workflows/ci.yml`, `.github/ci/**` | every job |
| `.nvmrc` | every job that sets up Node |
| `scripts/**` | the seven package checks (their lint runs `../scripts/check-test-levels.ts`) |
| `main-server/seed/**` | main-server, flow-tests, mobile, mobile-tests (the app's tests read the seed's JSON) |
| `main-server/.env.example` | main-server, flow-tests, deploy-scripts (the Dev Server bootstrap's tests read it) |
| `main-server/**`, `socket-server/**`, `worker-server/**`, `match-server/**` | that server and flow-tests (the flow tests build the four servers' images) |
| `admin/**` | admin |
| `mobile/**` | mobile, mobile-tests, app-fingerprint |
| `flow-tests/**`, `compose.yaml`, `compose.deploy.yaml`, `infra/proxy/**` | flow-tests |
| `infra/postgres/**` | main-server, match-server, flow-tests (their tests build the database image) |
| `infra/deploy/**` | deploy-scripts |
| `infra/production/terraform/**` | terraform |
| `infra/production/k8s/**` | manifests |
| `.github/release/**` | release-script, app-fingerprint |
| `.github/workflows/release.yml` | release-script |
| `.scratch/**`, `docs/**`, `.claude/**`, `.agents/**`, `.github/CODEOWNERS`, `.github/pull_request_template.md`, Markdown outside the packages | no job |
| anything else | every job |

Every job does its work when:

- the run was not started by a push, or the ref is not a branch (a Release tag);
- the branch name has no slash (`main`, `development`);
- the branch is itself `<line>/Main`, unless the merge queue's run of the same commit has passed (below);
- `origin/<line>/Main` is missing or unreadable, or the two share no history;
- the commit is already on a Main of any line, on `main` or on `development`;
- any git command fails, a changed path matches no rule, the job key is unknown, or the script fails in any way.

In doubt, the job runs. The workflow skips a step only when the script's output is exactly `false`.

A run on a branch whose name ends in `/Main` is no longer cancelled by the next push to it, because a job that skips on a branch leans on Main's last full run. A run still waiting to start is replaced by a newer push's run (GitHub keeps one pending run per concurrency group), and the newer Main commit contains the replaced one's changes.

The script's bats tests and its shellcheck run in the `release-script` job, whose check name stays.

The workflow also answers a merge queue: `merge_group` is a trigger, and pushes to the queue's own branches (`gh-readonly-queue/**`) start no push run. Tags are named in the push trigger, because a branch filter alone would leave them out and the Release gate waits for the tag's run. A `merge_group` run does every job, since its event is not `push`.

The queue moves Main to the very commit it tested, so Main's push would check that commit a second time. A job of a push to a `<line>/Main` therefore asks GitHub (`gh api`, with the run's token and `actions: read`) whether a `merge_group` run of CI completed with success on exactly that commit. If one did, the job skips its work; if none did, or GitHub does not answer, it does its work. A direct push to a Main, which no queue run tested, runs everything.

## Decisions

- The decision is a script file with bats tests (the pattern of `.github/release/release.sh`), not a separate `changes` job that every job waits for. Under load a separate job adds a second wait for a runner to every run, and a long script inside YAML cannot be tested. The cost is one history fetch per job; it carries no file contents.
- No third-party action decides the paths.
- Nothing else in `ci.yml` changes: job ids, job names, shard counts, timeouts, env and tool versions stay. The merge queue's trigger goes in with this change, so that turning the queue on later needs only the ruleset.
- The base is found for any `<line>`, not only an iteration number, so the workflow can be tried on throwaway branches `ci-trial/<name>` against `ci-trial/Main`, which the ruleset does not match.

## What changes for the team

- A pull request no longer re-tests areas it does not touch on its branch. A documents-only pull request finishes in about a minute in quiet hours. In the merge queue every job runs, and Main's push after the queue's merge does no work again.
- A broken Main no longer blocks pull requests that do not touch the broken area. Main's own full run shows the break.
- Main's own runs are no longer cancelled by the next merge; the run of a merge that lands during a Main run waits for that run to finish.
- A dependency across folders that the map does not know is missed on a branch and shows on Main's next run. When a new test reads a file outside its package, its rule is added to the map.

## Risks

- A working branch's run and a Main's push run may skip work, and the commits they share with the gates' commits are many: the queue's commit is the Main commit itself. So the Release gate (`.github/release/release.sh`, `read_ci_jobs`) reads only the runs that always do every job: the tag's own, the merge queue's, and those of pushes to `main` or `development`. The Dev Server gate (`infra/deploy/deploy.sh`, `gate_on_ci`) does the same for its check runs, telling them apart by their check suites' branches: the merge queue's (`gh-readonly-queue/…`), `development` and `main`. Neither has to tell a skipped Main run from a full one, because neither reads Main's runs. One success of a check among the runs read is enough, as before.
- Inputs no path covers change only what a working job sees, and Main's full runs see them: repository variables, the published `app-version.json`, floating base images and action majors, and the unpinned `shellcheck` and `bats` from apt.

## Out of Scope

- Requiring a merge queue in the ruleset (ticket 02). It waits for a decision.
- More app test shards, or splitting main-server's tests: both rename required checks, which needs the ruleset changed.
- `scripts/test/*.integration.test.ts`, which no CI job runs today.
