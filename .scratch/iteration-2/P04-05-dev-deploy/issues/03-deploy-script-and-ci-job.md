# 03: The deploy script, its tests, and the CI job for shell

Parent: [P04-05 spec](../spec.md)
Status: done
Blocked by: None (can start immediately)
Touches: the deploy folder (the deploy script and its tests) and the CI workflow. Not the bootstrap, the unit files or the settings example, which ticket 04 owns in the same folder.

## What to build

One run of the deploy script does the eight steps of the spec's "The deploy run" and writes the status file of "The status file": fetch and compare the tip of `development` with the last deployed commit; gate on the five server check runs of that commit read from GitHub's public API; dump the databases and keep the newest seven dumps; reset the checkout to the tip and clean it; build and start the stack with the deployment override and the settings file; smoke-check the main server's readiness and the socket server's handshake through the proxy on the loopback; prune dangling images and week-old build cache; write the status file. A commit whose build fails is retried on the next two runs and then held; a new commit clears the hold. A settings file with `CHANGE_ME` in it stops the run before Docker is touched. Every step logs to standard output, which systemd sends to the journal.

The script separates deciding from doing. The decisions are functions that take plain inputs and print a verdict; the commands with side effects are reached through variables, so the tests replace them with fakes on `PATH`. The script takes the checkout, the settings file, the status folder and the backups folder from its environment, with defaults equal to the spec's "Server layout". It exits non-zero when the run ends in `build-failed`, `unhealthy` or `secrets-missing`, so that systemd marks the unit failed, and zero otherwise.

The CI workflow gets one job outside the pnpm matrix that installs `bats` and `shellcheck` from apt, runs `shellcheck` on every shell script under the deploy folder and `bats` on every test file there, so ticket 04's files are covered without another change to the workflow.

## Shared contract

Fixed here so that tickets 02 and 04 match without seeing this ticket: the deploy folder is `infra/deploy`; the override is `compose.deploy.yaml` at the repository root; the settings file defaults to `/srv/team/snu-now-secrets/snu-now.env`; the status file is `status.json` in the status folder; the required check runs are named `main-server`, `socket-server`, `worker-server`, `match-server` and `flow-tests`.

## Acceptance criteria

- [x] bats: the tip equal to the last deployed commit gives `up-to-date` and no other command runs.
- [x] bats: all five required checks `success` gives `deploy`; one missing or `in_progress` gives `waiting-for-ci`; one `failure` gives `ci-failed` and the commit is not looked at again; a failed `admin` or `mobile` check alone still gives `deploy`.
- [x] bats: after a failed build, attempts 1 and 2 retry the same commit, attempt 3 gives `held`, and a new tip clears the hold.
- [x] bats: nine dumps give the two oldest for deletion; no running database gives no dump.
- [x] bats: `CHANGE_ME` in the settings file gives `secrets-missing` and no `docker` call.
- [x] bats: with the fakes, a successful run calls fetch, the check-runs request, the dump, reset and clean, `compose up`, the two smoke requests, the prunes, in that order, and writes a status file with every field of the spec's "The status file" and `recreatedServices` taken from Compose's output.
- [x] bats: the exit status is non-zero for `build-failed`, `unhealthy` and `secrets-missing`, zero otherwise.
- [x] `shellcheck` reports nothing on the script and the tests run green locally with `bats`.
- [x] The CI job runs on push beside the matrix, installs `bats` and `shellcheck` from apt, and runs them over the whole deploy folder.
- [x] Every new source file (the script, the tests) starts with the AI-generated box below its shebang, and the workflow file gets a new row (`CLAUDE.md`).
- [x] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.

## Comments

### Decisions the spec left open

- The previous `status.json` is the memory between runs (the deployed commit, the candidate, its attempt, held, a skipped `ci-failed`). There is no other state file.
- JSON is read with `jq`, which the bootstrap installs.
- A commit pushed to several branches has one run of each check per push. One `success` per required check is enough.
- `unhealthy` counts as a failed attempt, as `build-failed` does: retried on the next two runs, then `held`.
- A run started by hand (systemd sets no `TRIGGER_UNIT`) asks GitHub again about a `held` or `ci-failed` commit and starts again at attempt 1.
- A refused check-runs request, such as one past GitHub's 60 an hour without a token, gives `waiting-for-ci`. A failed fetch exits non-zero and leaves the status file as it was.
- `recreatedServices` lists the services Compose created or recreated, gathered over the attempts at one commit.

### Agent usage (2026-10-17)

- Agent time: about 24 minutes, an estimate: the implementer subagent and the subagent that merged its branch.
- Tokens: input 12,509,000 in all (cache reads 12,192,000, cache writes 317,000, uncached under 1,000); output about 34,000 (estimated from what the transcripts hold, which keep only partial output counts, so a lower bound).
- The orchestrating session, the code review and its fix round are shared by tickets 01–05 and recorded once, under ticket 05.

### Review round (2026-10-17)

- By hand: systemd 255 hands every later start of the service the timer's stale `TRIGGER_UNIT`, so `deploy.sh` no longer reads it. A run is by hand when it finds the request file `redeploy` in the status folder (written by the new `snu-now-redeploy.service`, removed by the run) or runs outside systemd (`INVOCATION_ID` unset).
- `compose build` runs before `compose up --detach`: a failed build is `build-failed` and stops nothing; a failed `up` is `unhealthy`, with the new containers running and `deployedCommit` unchanged.
- A required check with no success whose run is cancelled, stale or `action_required` gives `waiting-for-ci`, not `ci-failed`.
- The clean step logs on success too. The tests' `[[ ]]` checks end in `|| false` for bash 3.2, `deploy.bats` is shellcheck-clean and CI shellchecks the `*.bats` files, and `fake-command.sh` is now `deploy-fakes.sh`.
