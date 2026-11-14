# 02: Approved pull requests merge through GitHub's merge queue

Parent: [A03 spec](../spec.md)
Status: needs-triage
Blocked by: 01 on every iteration Main, and a decision to use a merge queue

## What to build

With "up to date with Main" required, each merge makes the next pull request take Main in and wait for another run. In the measured night, branches took Main in 2.8 times per merge, and merge commits used 47% of the runner time. A merge queue tests each approved pull request together with Main and the pull requests ahead of it, and merges them in order, so nobody takes Main in by hand.

Ticket 01 already made `ci.yml` answer the queue: `merge_group` is a trigger, the queue's branches (`gh-readonly-queue/**`) start no push run, and a `merge_group` run does every job. What is left is the ruleset, which only the repository administrator can change:

1. Check that ticket 01's `ci.yml` is on every iteration Main that the ruleset covers. If the ruleset required the queue before that, no queued pull request would get its required checks and every merge would stop.
2. Turn on "Require merge queue" in the iteration branches' ruleset: squash, two or three groups built at once.
3. Send one documents-only pull request through the queue first. Whether the "up to date" rule left on still blocks entry to the queue is not documented; this is where it is checked.

## Acceptance criteria

- [ ] The ruleset requires the merge queue only after `ci.yml` with `merge_group` is on the iteration Main.
- [ ] One pull request has gone through the queue with its 15 required checks green.

## Comments
