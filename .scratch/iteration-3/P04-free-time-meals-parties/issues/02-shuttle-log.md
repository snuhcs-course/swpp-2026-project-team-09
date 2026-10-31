# 02: Shuttle times from a Dev log

Parent: [P04 spec](../spec.md) ("Shuttle timing from the Dev log", "Evaluation plan" 3)
Status: ready-for-human
Blocked by: None

## What to build

The circular shuttle's real waits and rides, derived from a few days of logged vehicle positions, with rules that survive the operator's faulty feed.

A collector on the Dev Server writes every set of vehicles to one CSV per day. `pnpm shuttle:derive` turns those days into `shuttle-timing.json`, which `travel` reads (ticket 01). `pnpm shuttle:score` checks those times against held-out days, so that the log-based model is shown to beat the notice's values.

Collection is on 11-02 (Mon) and 11-03 (Tue). 10-30 passed without a collector, so the metric has 2 folds. A real User is never disturbed: nothing on Production changes.

An item marked **Person** is a person's work, not an agent's. The last items come after the collection.

## Acceptance criteria

- [x] **Collector.** A small script and a systemd unit sit with the existing `snu-now-*` units.
  - It reads Dev Redis through `redis-cli` inside the Compose service, because Redis publishes no port on the Dev Server.
  - Every 5 seconds it reads `shuttle:vehicles` and its remaining lifetime. The main server rewrites the key, with a 60-second lifetime, on each set the worker posts every 15 seconds.
  - A new set is a lifetime that jumped back towards 60 s. Its time is `receivedAt`, or for an empty set the read time − (60 s − the remaining lifetime). A missing key is an outage.
  - It records weekdays 08:00–21:00 only, since Demo vehicles can appear at night and at weekends.
- [x] **Log format.**
  - One CSV per day, outside the deployed checkout.
  - One row per car per set, every car in every set, even unchanged ones.
  - Columns: `received_at` (KST, with `+09:00`), `car_id`, `stop_id`, `stop_name` and `loop_order` (the stop's place in the stop seed).
  - A set log beside it keeps one line per set (time, number of cars), so that an empty set can be told from an outage.
  - Raw drawing positions are not kept.
- [x] **Installing it.** The installed copy of the script and the unit lives outside the checkout. The Dev Server's checkout follows `development`, which does not hold them yet, and each deploy cleans the checkout.
- [x] **Nothing on Production changes:** no Production Redis, manifest, image, Prisma schema or table.
- [x] **`pnpm shuttle:derive`** turns the CSV days, plain or gzipped, into `shuttle-timing.json`: per stop and band, the average wait, and per pair of stops and band, the median ride. Its shape is the one `travel` reads (ticket 01).
  - The average wait at a stop is Σh² / (2Σh) over the observed headways h, not half the headway.
  - Bands are 08–11, 11–14, 14–17, 17–19 and 19–21.
- [x] **Cleaning rules.** Both tools share one implementation of the frozen rules R1–R12, with the spec's constants (D_s, the parking stops, the LONG limit), and every dropped item is reported with its reason. The PM keeps a Python reference implementation. Where it differs from the spec, such as raw x, y in each row, the spec wins.
- [x] **`pnpm shuttle:score`** runs the shuttle metric.
  - Leave-one-day-out: each collected day in turn is held out, and the constants derived from the other days are compared with it.
  - Ride: the held-out day's A → B rides against the per-band median, with MAE and the share within ±1 minute. Baseline: along-loop distance ÷ 4.15 m/s.
  - Wait: the held-out day's Σh² / (2Σh) per stop and band against the prediction. Baseline: 3.5 minutes. Scored for 08–19 only.
  - Pooling: errors are pooled over all folds. The ride MAE is over every held-out A → B ride. The wait MAE is over every scored stop-band (R11), each with equal weight.
  - A stop-band or pair-band missing from the training days is predicted with the fallback values (ticket 01).
  - Threshold: the ride MAE and the wait MAE each below its baseline.
  - The 30-minute pilot sample of 10-29 is never scored.
- [x] **Tests.** Unit tests on hand-written CSV fixtures:
  - one fault-free day, on which nothing is dropped;
  - one fault fixture per rule, checking what is dropped and the reason given;
  - the leave-one-day-out score.
- [ ] **Person, from the campus network, before 08:00 on 11-02.** A person installs the collector once on the Dev Server and checks it by hand there.
- [ ] **Person, from the campus network, after 11-03.** A person fetches the CSVs and set logs and gzips them.
- [ ] **After the collection.** The gzipped days are committed as the fixed data of the shuttle metric.
- [ ] **After the collection.** `pnpm shuttle:derive` produces `shuttle-timing.json` from them, and it is committed. It reaches Production with the next regular Release.
- [ ] **After the collection.** `pnpm shuttle:score` runs, and the ride and wait MAEs, their baselines and whether the threshold holds are recorded in this ticket's comments.

## Comments

### Agent usage (2026-10-31)

- **Agent time** (estimate): about 42 minutes in all: about 30 minutes for the implementing subagent, about 7 for its two reviewers, and about 5 for this ticket's share of the session that ran all five tickets. Time spent waiting for a person is not counted.
- **Tokens** (measured from the agents' transcripts, reviewers included; the running session's share is an estimate, a fifth of its total):
  - Input: about 120 not cached, about 9,800,000 cache reads and about 906,000 cache writes.
  - Output: about 218,000.
