# 11: The merge queue runs the basic checks, a Main's push runs everything, and the gates read the full runs

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The merge queue ran every job with every test before each merge, and a Main's push after it did no work again (ticket 04). On 2026-11-17 and 18 a queue run took 23 to 31 minutes, and the queue builds three entries at a time, so about 6 pull requests merged an hour, while up to 100 a day are expected. A full run takes about 115 runner-minutes; a run of the basic checks takes 3 to 5.

The level of a run, and which jobs it does, now follow from its event alone:

| Run | Jobs | Level |
| --- | --- | --- |
| Push to a working branch (anything but `<line>/Main`, `main` and `development`) | The jobs its changed paths reach, against `origin/<line>/Main` | Basic |
| Merge queue | The jobs its changed paths reach, against the merge group's base | Basic |
| Push to `<line>/Main`, `main` or `development` | Every job | Full |
| Tag push | Every job | Full |

The basic level is each job's lint, format and type checks and only the unit tests (`tests=unit`): the app's four test shards do nothing, and flow-tests runs no tests. The full level is every test (`tests=all`). A merge group's changed paths are those from its base (`github.event.merge_group.base_sha`, given to `changes.sh` as `MERGE_GROUP_BASE_SHA`) to its commit, matched by the same map as a working branch's. A run of an event that `ci.yml` does not trigger on does every job at the full level.

A Main's run in progress is still not cancelled, and a newer push's run replaces one still waiting, so a Main has one full run at a time, on its newest commit, and that run covers every commit merged before it.

The merge queue's runs are no longer full, so the Release and Dev Server gates stop reading them. They read the tag's own run and the runs of pushes to a `<line>/Main`, `main` or `development`. A Release is tagged on the newest Main commit whose full run passed.

## Acceptance criteria

- [x] `changes.sh` sets `tests` first, from `GITHUB_EVENT_NAME` and `GITHUB_REF` alone, by string checks that cannot fail: `unit` for a working branch's push and the merge queue, `all` for a push to a `<line>/Main`, `main` or `development`, a tag's push and any other event. Nothing after that changes it: CI's own files reach every job at the event's level, and every doubt or failure (a shallow checkout, an empty, malformed or unreadable merge group base, no shared history, a commit already on a Main, a working branch not named `<line>/<name>`, a git error, the script stopping early, an unwritable `GITHUB_OUTPUT`) gives `run=true` at that level.
- [x] On a `merge_group` run, `changes.sh` compares `MERGE_GROUP_BASE_SHA` with `GITHUB_SHA` through the path map and gives `run=false` to a job that no changed path reaches.
- [x] A push to a `<line>/Main`, `main` or `development` does every job. The script asks GitHub nothing; `queue_passed` is gone.
- [x] `ci.yml` gives each decision step `MERGE_GROUP_BASE_SHA` instead of `GH_TOKEN`, and no longer grants `actions: read`. Job names, the shard count, timeouts and the concurrency stay. A job whose steps skip still reports success under its own name, so the ruleset's 15 required checks stay as they are.
- [x] The Release gate's `read_ci_jobs` reads the tag's run and the runs of pushes to a `<line>/Main`, `main` or `development`, and no `merge_group` run. The Dev Server gate keeps the check suites of `<line>/Main`, `main` and `development`, and not the merge queue's.
- [x] Tests: a merge group that changes the app runs the app's jobs with the unit tests only; one that changes only documents skips every job; one behind another counts only its own paths when its base is the group ahead of it, and both groups' paths when its base is Main; CI's own files give unit tests on a branch and in the queue; every doubt keeps the event's level; a push to a Main, `main` or `development` gives every job and every test; no run asks GitHub. Neither gate counts a merge queue run, and both count a Main's.
- [x] The spec and the root README state the policy as the four rows above. The Dev Server and Production READMEs point to the root README's table and say which runs the gates read. The Production README says which commit a Release is tagged on, with a `gh` command that finds it.

## Comments

### Decisions (2026-11-18)

- The queue keeps the basic checks rather than none. On 2026-11-15, pull requests 272, 281, 284 and 288 passed lint and types on their own push and failed them in the queue, on top of the pull requests merged before them.
- The integration and flow tests move from before a merge to after it. Since 2026-11-17, 3 of the 14 queue runs caught an app test failure (pull requests 348, 351 and 352). Such a failure now shows on Main's full run, about 30 to 60 minutes after the merge, and a new pull request fixes it; pull requests keep merging meanwhile.
- The level has no exceptions. A pull request that changes CI is now itself checked in full only by Main's run after it merges.
- When the decision step sets no output at all (`GITHUB_OUTPUT` cannot be written), `ci.yml` runs every step of that job, since a missing output counts as every test there; the script cannot hand it the level then.
- A merge group's base is either Main's tip or the head of the group ahead of it. Either way the paths include the group's own changes, at worst together with those of the groups ahead, which only runs more.
- A Main run from before this change that skipped its work did so because the queue's full run of the same commit had passed, so the gates may count its success.
- The Release gate still waits for the tag's own run, which no other push replaces. Main's runs only let it pass sooner.
- The Dev Server deploys the tip of `development`, which is moved by hand, and needs no search for an older commit that passed. The push to `development` starts a full run of its own, which only a newer push to `development` replaces, so the tip always gets a finished full run. Counting Main's runs lets a commit whose Main run passed deploy without waiting for `development`'s run. A required check that failed in a Main's run counts as failed, as one that failed in `development`'s run does; one success among the runs read is still enough.

### Agent usage (2026-11-18)

One session, started from the session that watches CI, did this ticket alone, without subagents.

- Agent time: about 30 minutes over both pushes (the first change and the move to a level set by the event alone), an estimate from the transcript's timestamps with gaps over three minutes cut; waiting for CI and for the review is not counted.
- Tokens: output 116,084; input 20,957,607, of which 20,688,749 were cache reads, 268,660 cache writes, and 198 uncached. Without cache reads: 384,942. Counted just before the second commit.
