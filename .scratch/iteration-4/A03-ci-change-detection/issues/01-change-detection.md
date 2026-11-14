# 01: Each CI job asks the change-detection script whether the branch's changes reach it

Parent: [A03 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

`.github/ci/changes.sh <job key>` decides whether a CI job has work on this run, and every job of `.github/workflows/ci.yml` calls it right after a checkout with history. The job's later steps run unless the script said `run=false`. Main's runs are no longer cancelled by the next push to Main. The script's tests run in the `release-script` job.

## Acceptance criteria

- [ ] `.github/ci/changes.sh` takes one job key of the 13 (`main-server`, `socket-server`, `worker-server`, `match-server`, `admin`, `mobile`, `flow-tests`, `mobile-tests`, `app-fingerprint`, `deploy-scripts`, `release-script`, `terraform`, `manifests`), reads `GITHUB_EVENT_NAME`, `GITHUB_REF`, `GITHUB_REF_NAME` and `GITHUB_SHA`, appends `run=true` or `run=false` to the file named by `GITHUB_OUTPUT` (prints it when unset), prints one line saying what it decided and why (a `::notice::` when it skips), and always exits 0.
- [ ] A branch `<line>/<name>`, for any `<line>`, is compared with `origin/<line>/Main` from every common ancestor (`git merge-base --all`), listing paths with `--no-renames`, `-z` and `core.quotePath=false`; the union of the paths decides. The previous push is never the base.
- [ ] Every job runs in each case the spec lists: an event other than `push`, a ref that is not a branch, a branch name without a slash or ending in `/Main`, a missing or unreadable Main, a commit already on a Main of any line or on `main` or `development`, no common ancestor, a failed git command, a change to `ci.yml` or `.github/ci/`, a path no rule names, an unknown job key, any failure inside the script.
- [ ] The path map is the spec's table, each rule's reason stated next to it where it is not obvious.
- [ ] Every job of `ci.yml` starts with `actions/checkout` (`fetch-depth: 0`, `filter: blob:none`) and a step with an `id` that runs the script from the repository root with the job's key. Every later step carries `if: steps.<id>.outputs.run != 'false'` (joined with any condition it already had).
- [ ] The 16 check names, job ids, shard count, timeouts, env and tool versions are unchanged.
- [ ] `ci.yml` also runs on `merge_group`; its push trigger leaves out `gh-readonly-queue/**` and names every tag (`tags: ['**']`), so Release tags still start a run.
- [ ] `concurrency.cancel-in-progress` is false for refs whose name ends in `/Main` and true otherwise.
- [ ] The `release-script` job also runs shellcheck over `.github/ci` and `bats --recursive .github/ci`; its check name is unchanged.
- [ ] `.github/ci/test/changes.bats` builds throwaway repositories with a fake origin and covers each kind of path rule, each full-run condition, a branch that took Main in, two merge bases, a branch behind Main, a stacked branch, a file moved out of a folder, a path with a space and one with a Korean name, an unknown job key, and a failure inside the script. Deleting any rule makes a test fail.
- [ ] Replayed by hand on every `origin/4.0/*` branch, the decisions match what each branch changes.
- [ ] On GitHub, the branch's own run is a full run with 16 green checks, and trial branches (`ci-trial/Main` with one branch changing only `.scratch/` and one changing only a `main-server` test) each report 16 green checks, with exactly the expected jobs doing their work. The trial branches are deleted afterwards.
- [ ] Each changed source file has its AI-generated row.

## Comments
