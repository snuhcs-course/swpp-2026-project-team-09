# 04: A queued pull request runs only the jobs its changes reach, and the gates read only full runs

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

Since the merge queue took over merging into the iteration Main, every queued pull request gets a `merge_group` run that does every job, so a server-only pull request waits in the queue for the app's four test shards. The queue's run is compared with the queue's base instead, as a branch is compared with its Main, and Main's own run after the merge still does every job.

The queue's tested commit becomes the Main commit itself. Its run would then sit on every Main commit, and the Release and Dev Server gates take one success of a check among a commit's runs. So the gates first read only the runs that do every job: those of the tag and of pushes to a Main, `main` or `development`.

## Acceptance criteria

- [x] `changes.sh` compares a `merge_group` run's commit with `merge_group.base_sha` from the event (`GITHUB_EVENT_PATH`); a missing or unreadable base gives a full run.
- [x] The Release gate's `read_ci_jobs` reads only the runs of the tag and of pushes to a Main, `main` or `development`, and fetches no other run's jobs.
- [x] The Dev Server gate keeps only the check runs whose check suite was made for a push to `development`, `main` or a Main.
- [x] Tests: a merge group that changes only documents runs no job and one that changes the app runs the app's jobs; a successful working-branch or queue run does not pass either gate where a full run failed.
- [x] The Release and Dev Server READMEs and the spec say which runs the gates read.

## Comments

### Decisions (2026-11-15)

- A queued pull request runs only what its changes reach; Main's run after the merge does every job, and a break in an area the pull request does not touch shows there.
- The queue's base comes from the event's `merge_group.base_sha`. A group behind another in the queue also counts the changes of the pull requests ahead of it, which errs toward running.
- The Dev Server gate makes two requests to GitHub per poll instead of one: the commit's check suites, which carry their branch, and its check runs, which carry their suite. Check runs carry no branch of their own. It polls once a minute only while it waits for CI on a new `development` tip, so a normal wait stays within the 60 unauthenticated requests an hour; a refused request is asked again the next minute.
- A commit already on a Main, `main` or `development` still runs every job wherever it is pushed. The gates no longer need it, but it costs one `git for-each-ref`.

### Agent usage (2026-11-15)

The A03 session did this ticket alone, without subagents.

- Agent time: about 15 minutes up to the push, an estimate from the transcript's timestamps; reading the pull request's run adds a few minutes.
- Tokens: output 47,438; input 16,442,379, of which 16,370,244 were cache reads, 72,049 cache writes, and 86 uncached. Without cache reads: 119,573. Counted up to the last local check.
