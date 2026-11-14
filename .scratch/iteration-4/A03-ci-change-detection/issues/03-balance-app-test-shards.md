# 03: The app's four test shards are packed by time

Parent: [A03 spec](../spec.md)
Status: needs-triage
Blocked by: a decision to balance the shards

## What to build

Jest splits the app's tests into four shards by file, not by time. In one busy run the shards' test times summed to 1,137, 1,277, 2,256 and 720 seconds. The slowest shard is 1.3 to 1.5 times as long as an even split would be: 399 against 302 seconds in quiet hours, 667 against 445 under load. Packing the files by measured time would bring the slowest shard from about 6.6 to 5.3 minutes in quiet hours, and from 11.1 to about 8 under load (estimates).

A custom test sequencer assigns each test file to a shard from a table of measured times, with unknown files spread by Jest's default. It is passed on the command line of the `mobile-tests` job in `ci.yml` (`--testSequencer=<path>`), never in `mobile/package.json`: that file holds the Jest config, and changing it may change the app's fingerprint, which stops over-the-air updates from reaching installed APKs until a native Release.

## Acceptance criteria

- [ ] A sequencer and its table of times live outside `mobile/package.json`, and `ci.yml` passes `--testSequencer` to the four shards; the shard count and check names stay.
- [ ] Every test file runs in exactly one shard, including files missing from the table.
- [ ] The table can be regenerated from a CI run's results by one documented command.
- [ ] `app-fingerprint` is green on the change and reports no fingerprint change.
- [ ] The slowest shard of a full run is measured before and after.

## Comments
