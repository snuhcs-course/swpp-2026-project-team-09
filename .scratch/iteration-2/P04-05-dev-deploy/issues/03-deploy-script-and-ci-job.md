# 03: The deploy script, its tests, and the CI job for shell

Parent: [P04-05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)
Touches: the deploy folder (the deploy script and its tests) and the CI workflow. Not the bootstrap, the unit files or the settings example, which ticket 04 owns in the same folder.

## What to build

One run of the deploy script does the eight steps of the spec's "The deploy run" and writes the status file of "The status file": fetch and compare the tip of `development` with the last deployed commit; gate on the five server check runs of that commit read from GitHub's public API; dump the databases and keep the newest seven dumps; reset the checkout to the tip and clean it; build and start the stack with the deployment override and the settings file; smoke-check the main server's readiness and the socket server's handshake through the proxy on the loopback; prune dangling images and week-old build cache; write the status file. A commit whose build fails is retried on the next two runs and then held; a new commit clears the hold. A settings file with `CHANGE_ME` in it stops the run before Docker is touched. Every step logs to standard output, which systemd sends to the journal.

The script separates deciding from doing. The decisions are functions that take plain inputs and print a verdict; the commands with side effects are reached through variables, so the tests replace them with fakes on `PATH`. The script takes the checkout, the settings file, the status folder and the backups folder from its environment, with defaults equal to the spec's "Server layout". It exits non-zero when the run ends in `build-failed`, `unhealthy` or `secrets-missing`, so that systemd marks the unit failed, and zero otherwise.

The CI workflow gets one job outside the pnpm matrix that installs `bats` and `shellcheck` from apt, runs `shellcheck` on every shell script under the deploy folder and `bats` on every test file there, so ticket 04's files are covered without another change to the workflow.

## Shared contract

Fixed here so that tickets 02 and 04 match without seeing this ticket: the deploy folder is `infra/deploy`; the override is `compose.deploy.yaml` at the repository root; the settings file defaults to `/srv/team/snu-now-secrets/snu-now.env`; the status file is `status.json` in the status folder; the required check runs are named `main-server`, `socket-server`, `worker-server`, `match-server` and `flow-tests`.

## Acceptance criteria

- [ ] bats: the tip equal to the last deployed commit gives `up-to-date` and no other command runs.
- [ ] bats: all five required checks `success` gives `deploy`; one missing or `in_progress` gives `waiting-for-ci`; one `failure` gives `ci-failed` and the commit is not looked at again; a failed `admin` or `mobile` check alone still gives `deploy`.
- [ ] bats: after a failed build, attempts 1 and 2 retry the same commit, attempt 3 gives `held`, and a new tip clears the hold.
- [ ] bats: nine dumps give the two oldest for deletion; no running database gives no dump.
- [ ] bats: `CHANGE_ME` in the settings file gives `secrets-missing` and no `docker` call.
- [ ] bats: with the fakes, a successful run calls fetch, the check-runs request, the dump, reset and clean, `compose up`, the two smoke requests, the prunes, in that order, and writes a status file with every field of the spec's "The status file" and `recreatedServices` taken from Compose's output.
- [ ] bats: the exit status is non-zero for `build-failed`, `unhealthy` and `secrets-missing`, zero otherwise.
- [ ] `shellcheck` reports nothing on the script and the tests run green locally with `bats`.
- [ ] The CI job runs on push beside the matrix, installs `bats` and `shellcheck` from apt, and runs them over the whole deploy folder.
- [ ] Every new source file (the script, the tests) starts with the AI-generated box below its shebang, and the workflow file gets a new row (`CLAUDE.md`).
- [ ] When done, the agent time and tokens are recorded under `## Comments` in an `### Agent usage (YYYY-MM-DD)` section.
