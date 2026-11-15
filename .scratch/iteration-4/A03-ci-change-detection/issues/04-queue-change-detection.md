# 04: Main's push does no work the merge queue already passed on the same commit, and the gates read only full runs

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The merge queue tests each pull request on top of Main with every job, and then moves Main to the very commit it tested. Main's push then started a second full run of the same commit: the commit `01a95dfc` ran in full in the queue from 16:56 to 17:22 and again on Main from 17:23 to 17:43. A commit verified once needs no second check.

A job of a push to a `<line>/Main` skips its work when a `merge_group` run of CI completed with success on exactly that commit. In every other case it does its work: a direct push that no queue run tested, a failed or unfinished queue run, or GitHub not answering. The merge queue's own runs keep doing every job.

Main's push runs may now have skipped work, so the Release and Dev Server gates read only the runs that always do every job: the tag's own, the merge queue's, and those of pushes to `main` or `development`.

## Acceptance criteria

- [x] `changes.sh` asks GitHub (`gh api …/actions/workflows/ci.yml/runs?head_sha=<commit>&event=merge_group`) on a push to a Main and answers `run=false` only for a completed, successful `merge_group` run of that commit; anything else, an error or an answer that is not a list of runs gives `run=true`. A working branch's push asks GitHub nothing.
- [x] `ci.yml` grants `actions: read` and gives each decision step `GH_TOKEN`. A `merge_group` run still does every job.
- [x] The Release gate's `read_ci_jobs` reads only the runs of the tag, of the merge queue, and of pushes to `main` or `development`, and fetches no other run's jobs.
- [x] The Dev Server gate keeps only the check runs whose check suite was made for the merge queue (`gh-readonly-queue/…`), `development` or `main`.
- [x] Tests: a Main push after a passed queue run of the same commit skips; after a failed, cancelled, unfinished or other commit's queue run, with no queue run, or when GitHub fails, it runs. A successful Main or working-branch run passes neither gate where a full run failed.
- [x] The spec and the Release and Dev Server READMEs say which runs the gates read.

## Comments

### Decisions (2026-11-15)

- The merge queue's run is the commit's full check, and Main's push after it does no work again. The queue is where a pull request waits, so it keeps every job, and a break shows before the merge.
- The gates need not tell a skipped Main run from a full one, because they read no Main runs: the tag's run is always full and is always waited for, and the queue's, `development`'s and `main`'s runs are always full.
- Each of a Main run's 16 jobs asks GitHub once, with the run's own token. A job that asks while the queue's run is not yet completed (its non-required `app-fingerprint` may still be running) does its work.
- The Dev Server gate makes two requests to GitHub per poll instead of one: the commit's check suites, which carry their branch, and its check runs, which carry their suite. It polls once a minute only while it waits for CI on a new `development` tip, so a normal wait stays within the 60 unauthenticated requests an hour; a refused request is asked again the next minute.

### Agent usage (2026-11-15)

The A03 session did this ticket alone, without subagents.

- Agent time: about 30 minutes up to the push, an estimate from the transcript's timestamps; reading the pull request's run adds a few minutes.
- Tokens: output 93,688; input 32,067,821, of which 31,935,714 were cache reads, 131,953 cache writes, and 154 uncached. Without cache reads: 225,795.
