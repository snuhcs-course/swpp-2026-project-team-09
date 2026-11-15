# 03: The app's four test shards are packed by time

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

Jest splits the app's tests into four shards by file, not by time. In one busy run the shards' test times summed to 1,137, 1,277, 2,256 and 720 seconds. The slowest shard is 1.3 to 1.5 times as long as an even split would be: 399 against 302 seconds in quiet hours, 667 against 445 under load. Packing the files by measured time would bring the slowest shard from about 6.6 to 5.3 minutes in quiet hours, and from 11.1 to about 8 under load (estimates).

A custom test sequencer assigns each test file to a shard from a table of measured times; a file missing from the table counts as a typical file of its level. It is passed on the command line of the `mobile-tests` job in `ci.yml` (`--testSequencer=<path>`), never in `mobile/package.json`: that file holds the Jest config, and changing it may change the app's fingerprint, which stops over-the-air updates from reaching installed APKs until a native Release.

## Acceptance criteria

- [ ] A sequencer and its table of times live outside `mobile/package.json`, and `ci.yml` passes `--testSequencer` to the four shards; the shard count and check names stay.
- [ ] Every test file runs in exactly one shard, including files missing from the table.
- [ ] The table can be regenerated from a CI run's results by one documented command.
- [ ] `app-fingerprint` is green on the change and reports no fingerprint change.
- [ ] The slowest shard of a full run is measured before and after.

## Comments

### Decisions (2026-11-15)

- The shards now run into the job's 20-minute timeout: in the last full runs the test step of shard 1 took 15.6 to 16.1 minutes, shard 2 11.2 to 12.2, shard 3 12.6 to 19.3, and shard 4 7.1 to 8.5. The timeout is raised to 30 minutes.
- The sequencer is `.github/ci/app-test-sequencer.cjs`, passed with `--testSequencer` in `ci.yml`. It packs the files longest first into the shard with the least seconds so far, and runs each shard's files longest first. It needs no package, so it lives with CI's files and not in `mobile/`.
- The table, `.github/ci/app-test-times.json`, first came from two full runs' logs (43691344884 and 43692175634). Jest prints a file's seconds there only above 5 seconds, so the 170 faster files start at 2 seconds. After every run the sequencer prints each file's seconds (`app-test-time <seconds> <file>`), and `.github/ci/app-test-times.sh <run id>` rewrites the table from them. A file missing from the table counts as the median file of its level.
- By the table, the four shards each hold about 13.1 minutes of test time on three workers, against 16 to 19 for today's slowest shard. Five shards would hold about 10.5 minutes and six about 8.7. A different count renames required checks, so it waits for the ruleset.

### Agent usage (2026-11-15)

The A03 session did this ticket alone, without subagents.

- Agent time: about 10 minutes up to the push, an estimate from the transcript's timestamps; reading the pull request's run adds a few minutes.
- Tokens: output 23,359; input 4,594,337, of which 4,284,527 were cache reads, 309,782 cache writes, and 28 uncached. Without cache reads: 333,169. Counted up to the first local check; the commit and push add little.
