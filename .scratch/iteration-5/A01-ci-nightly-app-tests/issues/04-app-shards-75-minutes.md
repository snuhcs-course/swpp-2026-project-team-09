# 04: The app's integration test shards have time to finish

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Pull request: #611, and the rebuilt table's pull request
Blocked by: None

Native files: none. Releases: none; only CI changes.

## What happens now

The nightly-level run on 5.0/Main at 2d0cb5ba9 (run 45807726226) cut `mobile-tests` (2/4), (3/4), and (4/4) at the job's 45-minute limit. The nightly runs of 2026-11-23 and of 2026-11-26 at 05:20 UTC were cut the same way. No test hung: each cut shard was still finishing files in its last minute.

- Shard 1 finished its 79 files in 37 minutes. Shards 2 to 4 had done 39, 41, and 49 of their 80 files when cut; finishing would have taken about 55 to 60 minutes each.
- The shards are packed by `.github/ci/app-test-times.json`, last rebuilt on 2026-11-16.
  - It holds 176 of today's 318 integration files. The other 142 count as the median, 47.6 seconds.
  - The files measured 1.75 to 2.7 times the table's seconds, so the shards came out uneven.
- A shard cut by its limit prints no `app-test-time` lines, so `app-test-times.sh` cannot rebuild the table from a cut run.
- The whole suite takes about 200 runner-minutes, about 50 minutes a shard when packed evenly.

## What to build

1. `mobile-tests` runs for up to 75 minutes. The four jobs keep their names, which the Iteration Main ruleset requires: `mobile-tests (1/4)` to `(4/4)`.
2. The first nightly-level run whose four shards finish rebuilds `app-test-times.json` with `app-test-times.sh`, in a pull request of its own.
3. A file that run finds slow under its shard's load gets 150 seconds a case, as `ask-for-push` has.

The Release's gate leaves the app's integration tests out, so its 45 minutes stay as they are. Eight shards, at about 25 minutes each, would also need the ruleset's required checks renamed; they are not part of this ticket.

## Acceptance criteria

- [x] `mobile-tests` has `timeout-minutes: 75`; its job names are unchanged.
- [x] A nightly-level run on 5.0/Main finishes all four shards.
- [x] `app-test-times.json` is rebuilt from that run.

## Comments

Built in PR #611. The nightly-level run after its merge and the rebuilt table follow here.

Nightly-level run 45827589719 on 5.0/Main at 98bfb96f2, after #611 and #610 merged: all four shards finished, in 47, 64, 40, and 49 minutes. All 319 files printed their seconds, 35,503 in all.

- Packed by the rebuilt table, each shard gets 8,876 file-seconds, about 50 minutes.
- The old table held 311 entries: 131 unit-test files the shards no longer run, 4 unit and 1 integration file that no longer exist, and 175 integration files. The new one holds the 319 integration files of that run.
- `answer-question-list.integration.test.tsx` was the run's only red file. It ran 378 seconds in shard 2, the heaviest, and two of its cases passed the 60-second limit; a third failed while the first was still running.
  - Alone at that commit it passed 9 of 9 twice, in 194 and 220 seconds, its slowest case 37 seconds.
  - It now has 150 seconds a case.
- Every file #610 fixed passed in this run, `ask-for-push` in 518 seconds.
