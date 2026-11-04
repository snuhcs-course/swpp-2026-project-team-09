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
- [x] **Person, from the campus network, before 08:00 on 11-02.** A person installs the collector once on the Dev Server and checks it by hand there. _(Installed on 2026-11-01 at 22:30 KST and checked by hand in service hours on 11-02.)_
- [x] **Person, from the campus network, after 11-03.** A person fetches the CSVs and set logs and gzips them. _(Fetched on 11-03 at 19:03, and gzipped by [P11 ticket 03](../../P11-free-time-meals-parties-improve/issues/03-shuttle-times-and-rides.md).)_
- [x] **After the collection.** The gzipped days are committed as the fixed data of the shuttle metric.
- [x] **After the collection.** `pnpm shuttle:derive` produces `shuttle-timing.json` from them, and it is committed. It reaches Production with the next regular Release.
- [x] **After the collection.** `pnpm shuttle:score` runs, and the ride and wait MAEs, their baselines and whether the threshold holds are recorded in this ticket's comments.

## Comments

### Agent usage (2026-10-31)

- **Agent time** (estimate): about 42 minutes in all: about 30 minutes for the implementing subagent, about 7 for its two reviewers, and about 5 for this ticket's share of the session that ran all five tickets. Time spent waiting for a person is not counted.
- **Tokens** (measured from the agents' transcripts, reviewers included; the running session's share is an estimate, a fifth of its total):
  - Input: about 120 not cached, about 9,800,000 cache reads and about 906,000 cache writes.
  - Output: about 218,000.

### The days, the derived times and the score (2026-11-05)

The collector was installed on the Dev Server on 2026-11-01 at 22:30 KST and checked by hand in service hours on 11-02. It logged 11-02 and 11-03. The day CSVs and set logs, the PM's copy fetched on 11-03 at 19:03 (checksums matched, no set gap over 30 s), were gzipped by [P11 ticket 03](../../P11-free-time-meals-parties-improve/issues/03-shuttle-times-and-rides.md) into `main-server/eval/shuttle-days/`, the shuttle metric's fixed data.

**11-03's log ends at 19:03**, when the collector was stopped, so the 19–21 band comes from 11-02 only.

`pnpm shuttle:derive eval/shuttle-days` wrote `main-server/seed/shuttle-timing.json` from both days. It is committed whatever the score, as planned, and reaches Production with the next regular Release. It holds a wait for 11–14, 14–17 and 17–19 at every stop, a 19–21 wait at stop 4 only, and none for 08–11, where no headway was kept; and a median ride for every pair in 08–11, 11–14, 14–17 and 17–19, and for 3 pairs in 19–21. What it lacks, the fallback covers.

**The score.** `pnpm shuttle:score eval/shuttle-days`, the frozen leave-one-day-out metric over the 2 days, 2 folds:

|                       | Derived times | Baseline |
| --------------------- | ------------: | -------: |
| Ride MAE              |        30.8 s |   55.7 s |
| Ride within ±1 minute |         88.3% |    59.8% |
| Wait MAE (08–19)      |       347.0 s |  272.2 s |

The ride is over 19,339 held-out rides, against along-loop distance ÷ 4.15 m/s. The wait is over 27 scored stop-bands, each with equal weight, against 3.5 minutes.

**The threshold does not hold**: the ride MAE is below its baseline, the wait MAE is not.

**What the cleaning rules left out.** Both commands print the same list; the score adds the stop-bands that R11 does not score. Nothing stopped under R1, and R2 and R3 left nothing out. Stops are named by `loop_order`: 0 정문, 1 법과대, 2 자연대, 3 농생대, 4 38동, 5 신소재공동연구소, 6 302동, 7 301동, 8 유전공학연구소, 9 교수회관, 10 기숙사삼거리, 11 국제대학원, 12 수의대, 13 경영대.

| Rule | Reason                                              | 11-02 | 11-03 |
| ---- | --------------------------------------------------- | ----: | ----: |
| R4   | flicker                                             |     4 |     3 |
| R6   | no departure: BREAK                                 |     1 |     0 |
| R6   | no departure: JUMP                                  |    79 |    69 |
| R7   | LONG visit                                          |     6 |     2 |
| R8   | departure not confirmed                             |    16 |    15 |
| R9   | window: backward JUMP                               |    50 |    38 |
| R9   | window: BREAK                                       |     1 |     0 |
| R9   | window: first seen mid-day                          |     6 |     6 |
| R9   | window: forward JUMP                                |    26 |    25 |
| R9   | window: unconfirmed move                            |    16 |    15 |
| R10  | headway dropped: backward JUMP                      |    40 |    26 |
| R10  | headway dropped: first seen mid-day                 |   276 |   209 |
| R10  | headway dropped: forward JUMP                       |    84 |    68 |
| R10  | headway dropped: unconfirmed move                   |    13 |    12 |
| R12  | arrival not timed                                   |    27 |    22 |
| R11  | under 75% of the headway time kept (the score only) |    36 |    49 |
|      | All                                                 |   681 |   559 |

<details>
<summary>Every item, as <code>pnpm shuttle:score eval/shuttle-days</code> prints it</summary>

```text
The log files: 0 reported
2026-11-02: 645 reported
  R4 flicker: 4536 at stop 3, 09:23:30, 4 sets
  R8 departure not confirmed: 4536 at stop 6, 09:28:45
  R9 window: unconfirmed move: 4536, stops 6, 09:29:15–09:29:30
  R6 no departure: JUMP: 4536 at stop 7, 09:29:30
  R9 window: backward JUMP: 4536, stops 7, 09:30:30–09:30:45
  R12 arrival not timed: 4536 at stop 5, 09:30:45
  R8 departure not confirmed: 4536 at stop 6, 12:41:30
  R9 window: unconfirmed move: 4536, stops 6, 12:41:45–12:42:00
  R6 no departure: JUMP: 4536 at stop 7, 12:42:00
  R9 window: backward JUMP: 4536, stops 7, 12:43:15–12:43:30
  R12 arrival not timed: 4536 at stop 5, 12:43:30
  R8 departure not confirmed: 4536 at stop 6, 16:21:45
  R9 window: unconfirmed move: 4536, stops 6, 16:22:30–16:22:45
  R6 no departure: JUMP: 4536 at stop 7, 16:22:45
  R9 window: backward JUMP: 4536, stops 7, 16:24:15–16:24:30
  R6 no departure: JUMP: 4531 at stop 4, 08:54:15
  R9 window: forward JUMP: 4531, stops 4 5 6, 08:54:15–08:59:45
  R6 no departure: JUMP: 4531 at stop 7, 08:59:45
  R9 window: forward JUMP: 4531, stops 7 8 9, 08:59:45–09:05:30
  R12 arrival not timed: 4531 at stop 10, 09:05:30
  R6 no departure: JUMP: 4531 at stop 2, 09:33:15
  R9 window: forward JUMP: 4531, stops 2 3 4 5 6, 09:33:15–09:39:45
  R6 no departure: JUMP: 4531 at stop 7, 09:39:45
  R9 window: backward JUMP: 4531, stops 7, 09:39:45–09:40:00
  R6 no departure: JUMP: 4531 at stop 6, 09:40:00
  R9 window: forward JUMP: 4531, stops 6 7, 09:40:00–09:43:15
  R6 no departure: JUMP: 4531 at stop 8, 09:43:15
  R9 window: forward JUMP: 4531, stops 8 9 10 11 12 13 0 1 2 3 4, 09:43:15–09:44:00
  R12 arrival not timed: 4531 at stop 5, 09:44:00
  R6 no departure: JUMP: 4531 at stop 5, 12:52:45
  R9 window: forward JUMP: 4531, stops 5 6, 12:52:45–12:57:00
  R6 no departure: JUMP: 4531 at stop 7, 12:57:00
  R9 window: forward JUMP: 4531, stops 7 8 9 10 11, 12:57:00–13:03:15
  R12 arrival not timed: 4531 at stop 12, 13:03:15
  R6 no departure: JUMP: 4531 at stop 0, 13:06:30
  R9 window: forward JUMP: 4531, stops 0 1 2 3 4 5, 13:06:30–13:14:00
  R12 arrival not timed: 4531 at stop 6, 13:14:00
  R8 departure not confirmed: 4531 at stop 6, 13:56:00
  R9 window: unconfirmed move: 4531, stops 6, 13:56:45–13:57:00
  R6 no departure: JUMP: 4531 at stop 7, 13:57:00
  R9 window: backward JUMP: 4531, stops 7, 13:58:15–13:58:30
  R6 no departure: JUMP: 4531 at stop 5, 13:58:30
  R9 window: backward JUMP: 4531, stops 5, 13:58:30–13:58:45
  R6 no departure: JUMP: 4531 at stop 4, 13:58:45
  R9 window: backward JUMP: 4531, stops 4, 13:59:00–13:59:15
  R6 no departure: JUMP: 4531 at stop 3, 13:59:15
  R9 window: backward JUMP: 4531, stops 3, 14:00:00–14:00:15
  R6 no departure: JUMP: 4531 at stop 2, 14:00:15
  R9 window: backward JUMP: 4531, stops 2, 14:00:30–14:00:45
  R6 no departure: JUMP: 4531 at stop 1, 14:00:45
  R9 window: backward JUMP: 4531, stops 1, 14:01:30–14:01:45
  R12 arrival not timed: 4531 at stop 0, 14:01:45
  R7 LONG visit: 4531 at stop 5, 14:24:30
  R8 departure not confirmed: 4531 at stop 6, 17:35:00
  R9 window: unconfirmed move: 4531, stops 6, 17:35:45–17:36:00
  R6 no departure: JUMP: 4531 at stop 7, 17:36:00
  R9 window: backward JUMP: 4531, stops 7, 17:37:15–17:37:30
  R12 arrival not timed: 4531 at stop 5, 17:37:30
  R8 departure not confirmed: 4531 at stop 6, 18:10:15
  R9 window: unconfirmed move: 4531, stops 6, 18:10:15–18:10:30
  R6 no departure: JUMP: 4531 at stop 7, 18:10:30
  R9 window: backward JUMP: 4531, stops 7, 18:12:30–18:12:45
  R6 no departure: JUMP: 4531 at stop 5, 18:12:45
  R9 window: backward JUMP: 4531, stops 5, 18:12:45–18:13:00
  R6 no departure: JUMP: 4531 at stop 4, 18:13:00
  R9 window: backward JUMP: 4531, stops 4, 18:13:30–18:13:45
  R6 no departure: JUMP: 4531 at stop 3, 18:13:45
  R9 window: backward JUMP: 4531, stops 3, 18:14:30–18:14:45
  R6 no departure: JUMP: 4531 at stop 2, 18:14:45
  R9 window: backward JUMP: 4531, stops 2, 18:20:15–18:20:30
  R6 no departure: JUMP: 4531 at stop 1, 18:20:30
  R9 window: backward JUMP: 4531, stops 1, 18:24:00–18:24:15
  R12 arrival not timed: 4531 at stop 0, 18:24:15
  R9 window: first seen mid-day: 4531, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–08:00:15
  R4 flicker: 4525 at stop 3, 08:49:15, 22 sets
  R4 flicker: 4525 at stop 3, 09:11:45, 23 sets
  R6 no departure: JUMP: 4525 at stop 9, 08:17:15
  R9 window: forward JUMP: 4525, stops 9 10, 08:17:15–08:20:45
  R12 arrival not timed: 4525 at stop 11, 08:20:45
  R6 no departure: BREAK: 4525 at stop 4, 08:29:30
  R9 window: BREAK: 4525, stops 4, 08:49:00–08:54:45
  R6 no departure: JUMP: 4525 at stop 5, 08:54:45
  R6 no departure: JUMP: 4525 at stop 12, 09:23:30
  R9 window: forward JUMP: 4525, stops 12 13, 09:23:30–09:26:00
  R6 no departure: JUMP: 4525 at stop 0, 09:26:00
  R12 arrival not timed: 4525 at stop 6, 12:25:45
  R6 no departure: JUMP: 4525 at stop 7, 12:50:30
  R9 window: forward JUMP: 4525, stops 7 8 9 10 11, 12:50:30–12:57:30
  R12 arrival not timed: 4525 at stop 12, 12:57:30
  R6 no departure: JUMP: 4525 at stop 0, 12:59:15
  R9 window: forward JUMP: 4525, stops 0 1, 12:59:15–13:02:30
  R6 no departure: JUMP: 4525 at stop 2, 13:02:30
  R9 window: backward JUMP: 4525, stops 2, 13:18:30–13:18:45
  R12 arrival not timed: 4525 at stop 0, 13:18:45
  R8 departure not confirmed: 4525 at stop 6, 13:48:15
  R9 window: unconfirmed move: 4525, stops 6, 13:48:45–13:49:00
  R6 no departure: JUMP: 4525 at stop 7, 13:49:00
  R9 window: backward JUMP: 4525, stops 7, 13:50:30–13:50:45
  R6 no departure: JUMP: 4525 at stop 5, 13:50:45
  R9 window: backward JUMP: 4525, stops 5, 13:51:00–13:51:15
  R6 no departure: JUMP: 4525 at stop 4, 13:51:15
  R9 window: backward JUMP: 4525, stops 4, 13:51:30–13:51:45
  R6 no departure: JUMP: 4525 at stop 3, 13:51:45
  R9 window: backward JUMP: 4525, stops 3, 13:52:30–13:52:45
  R6 no departure: JUMP: 4525 at stop 2, 13:52:45
  R9 window: backward JUMP: 4525, stops 2, 13:53:15–13:53:30
  R6 no departure: JUMP: 4525 at stop 1, 13:53:30
  R9 window: backward JUMP: 4525, stops 1, 13:54:15–13:54:30
  R12 arrival not timed: 4525 at stop 0, 13:54:30
  R9 window: first seen mid-day: 4525, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–08:00:15
  R7 LONG visit: 4521 at stop 5, 09:38:30
  R8 departure not confirmed: 4521 at stop 6, 14:02:00
  R9 window: unconfirmed move: 4521, stops 6, 14:03:00–14:03:15
  R6 no departure: JUMP: 4521 at stop 7, 14:03:15
  R9 window: backward JUMP: 4521, stops 7, 14:05:45–14:06:00
  R12 arrival not timed: 4521 at stop 5, 14:06:00
  R8 departure not confirmed: 4521 at stop 6, 17:41:45
  R9 window: unconfirmed move: 4521, stops 6, 17:42:15–17:42:30
  R6 no departure: JUMP: 4521 at stop 7, 17:42:30
  R9 window: backward JUMP: 4521, stops 7, 17:44:00–17:44:15
  R12 arrival not timed: 4521 at stop 5, 17:44:15
  R8 departure not confirmed: 4521 at stop 6, 18:10:30
  R9 window: unconfirmed move: 4521, stops 6, 18:10:45–18:11:00
  R6 no departure: JUMP: 4521 at stop 7, 18:11:00
  R9 window: backward JUMP: 4521, stops 7, 18:12:45–18:13:00
  R6 no departure: JUMP: 4521 at stop 5, 18:13:00
  R9 window: backward JUMP: 4521, stops 5, 18:13:00–18:13:15
  R6 no departure: JUMP: 4521 at stop 4, 18:13:15
  R9 window: backward JUMP: 4521, stops 4, 18:14:15–18:14:30
  R6 no departure: JUMP: 4521 at stop 3, 18:14:30
  R9 window: backward JUMP: 4521, stops 3, 18:15:15–18:15:30
  R6 no departure: JUMP: 4521 at stop 2, 18:15:30
  R9 window: backward JUMP: 4521, stops 2, 18:20:45–18:21:00
  R6 no departure: JUMP: 4521 at stop 1, 18:21:00
  R9 window: backward JUMP: 4521, stops 1, 18:24:45–18:25:00
  R6 no departure: JUMP: 4521 at stop 13, 18:25:00
  R9 window: backward JUMP: 4521, stops 13, 18:25:15–18:25:30
  R6 no departure: JUMP: 4521 at stop 12, 18:25:30
  R9 window: backward JUMP: 4521, stops 12, 18:26:00–18:26:15
  R6 no departure: JUMP: 4521 at stop 11, 18:26:15
  R9 window: backward JUMP: 4521, stops 11, 18:26:45–18:27:00
  R6 no departure: JUMP: 4521 at stop 10, 18:27:00
  R9 window: backward JUMP: 4521, stops 10, 18:51:45–18:52:00
  R6 no departure: JUMP: 4521 at stop 9, 18:52:00
  R9 window: backward JUMP: 4521, stops 9, 18:52:15–18:52:30
  R6 no departure: JUMP: 4521 at stop 8, 18:52:30
  R9 window: forward JUMP: 4521, stops 8 9 10 11 12 13 0 1 2 3 4, 18:52:30–18:53:30
  R9 window: first seen mid-day: 4521, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–08:08:00
  R8 departure not confirmed: 4526 at stop 6, 11:08:00
  R9 window: unconfirmed move: 4526, stops 6, 11:09:00–11:09:15
  R6 no departure: JUMP: 4526 at stop 7, 11:09:15
  R9 window: backward JUMP: 4526, stops 7, 11:10:30–11:10:45
  R6 no departure: JUMP: 4526 at stop 5, 11:10:45
  R9 window: backward JUMP: 4526, stops 5, 11:10:45–11:11:00
  R6 no departure: JUMP: 4526 at stop 4, 11:11:00
  R9 window: backward JUMP: 4526, stops 4, 11:11:15–11:11:30
  R6 no departure: JUMP: 4526 at stop 3, 11:11:30
  R9 window: backward JUMP: 4526, stops 3, 11:12:30–11:12:45
  R6 no departure: JUMP: 4526 at stop 2, 11:12:45
  R9 window: backward JUMP: 4526, stops 2, 11:13:15–11:13:30
  R6 no departure: JUMP: 4526 at stop 1, 11:13:30
  R9 window: backward JUMP: 4526, stops 1, 11:13:45–11:14:00
  R12 arrival not timed: 4526 at stop 0, 11:14:00
  R7 LONG visit: 4526 at stop 5, 11:33:00
  R8 departure not confirmed: 4526 at stop 6, 15:08:15
  R9 window: unconfirmed move: 4526, stops 6, 15:09:15–15:09:30
  R6 no departure: JUMP: 4526 at stop 7, 15:09:30
  R9 window: backward JUMP: 4526, stops 7, 15:10:45–15:11:00
  R12 arrival not timed: 4526 at stop 5, 15:11:00
  R9 window: first seen mid-day: 4526, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–09:27:15
  R4 flicker: 4520 at stop 12, 11:09:45, 3 sets
  R6 no departure: JUMP: 4520 at stop 10, 09:46:45
  R9 window: forward JUMP: 4520, stops 10 11 12 13, 09:46:45–09:53:45
  R6 no departure: JUMP: 4520 at stop 0, 09:53:45
  R9 window: forward JUMP: 4520, stops 0 1, 09:53:45–09:54:45
  R12 arrival not timed: 4520 at stop 2, 09:54:45
  R6 no departure: JUMP: 4520 at stop 7, 10:22:45
  R9 window: forward JUMP: 4520, stops 7 8 9, 10:22:45–10:26:30
  R6 no departure: JUMP: 4520 at stop 10, 10:26:30
  R9 window: forward JUMP: 4520, stops 10 11, 10:26:30–10:30:30
  R12 arrival not timed: 4520 at stop 12, 10:30:30
  R7 LONG visit: 4520 at stop 13, 10:52:00
  R8 departure not confirmed: 4520 at stop 6, 11:21:30
  R9 window: unconfirmed move: 4520, stops 6, 11:22:15–11:22:30
  R6 no departure: JUMP: 4520 at stop 7, 11:22:30
  R9 window: backward JUMP: 4520, stops 7, 11:24:00–11:24:15
  R12 arrival not timed: 4520 at stop 5, 11:24:15
  R6 no departure: JUMP: 4520 at stop 7, 14:23:00
  R9 window: forward JUMP: 4520, stops 7 8 9, 14:23:00–14:27:00
  R12 arrival not timed: 4520 at stop 10, 14:27:00
  R6 no departure: JUMP: 4520 at stop 6, 14:41:30
  R9 window: forward JUMP: 4520, stops 6 7 8 9 10 11, 14:41:30–14:49:45
  R6 no departure: JUMP: 4520 at stop 12, 14:49:45
  R9 window: forward JUMP: 4520, stops 12 13, 14:49:45–14:52:15
  R12 arrival not timed: 4520 at stop 0, 14:52:15
  R8 departure not confirmed: 4520 at stop 6, 15:23:00
  R9 window: unconfirmed move: 4520, stops 6, 15:23:45–15:24:00
  R6 no departure: JUMP: 4520 at stop 7, 15:24:00
  R9 window: backward JUMP: 4520, stops 7, 15:25:15–15:25:30
  R12 arrival not timed: 4520 at stop 5, 15:25:30
  R6 no departure: JUMP: 4520 at stop 2, 17:54:30
  R6 no departure: JUMP: 4520 at stop 10, 18:14:30
  R9 window: forward JUMP: 4520, stops 10 11 12 13 0 1 2 3 4, 18:14:30–18:18:15
  R6 no departure: JUMP: 4520 at stop 5, 18:18:15
  R9 window: forward JUMP: 4520, stops 5 6, 18:18:15–18:24:00
  R6 no departure: JUMP: 4520 at stop 7, 18:24:00
  R9 window: forward JUMP: 4520, stops 7 8 9, 18:24:00–18:30:45
  R6 no departure: JUMP: 4520 at stop 10, 18:30:45
  R9 window: backward JUMP: 4520, stops 10, 18:32:45–18:33:00
  R6 no departure: JUMP: 4520 at stop 9, 18:33:00
  R9 window: forward JUMP: 4520, stops 9 10 11 12 13 0 1, 18:33:00–18:33:15
  R12 arrival not timed: 4520 at stop 2, 18:33:15
  R6 no departure: JUMP: 4520 at stop 8, 18:41:45
  R9 window: forward JUMP: 4520, stops 8 9, 18:41:45–18:44:00
  R12 arrival not timed: 4520 at stop 10, 18:44:00
  R9 window: first seen mid-day: 4520, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–09:40:30
  R7 LONG visit: 4524 at stop 0, 12:41:45
  R7 LONG visit: 4524 at stop 5, 12:59:30
  R8 departure not confirmed: 4524 at stop 6, 16:14:00
  R9 window: unconfirmed move: 4524, stops 6, 16:14:45–16:15:00
  R6 no departure: JUMP: 4524 at stop 7, 16:15:00
  R9 window: backward JUMP: 4524, stops 7, 16:16:00–16:16:15
  R12 arrival not timed: 4524 at stop 5, 16:16:15
  R8 departure not confirmed: 4524 at stop 9, 18:00:00
  R9 window: unconfirmed move: 4524, stops 9, 18:01:00–18:01:15
  R6 no departure: JUMP: 4524 at stop 10, 18:01:15
  R9 window: backward JUMP: 4524, stops 10, 18:27:30–18:27:45
  R6 no departure: JUMP: 4524 at stop 9, 18:27:45
  R9 window: backward JUMP: 4524, stops 9, 18:28:00–18:28:15
  R6 no departure: JUMP: 4524 at stop 8, 18:28:15
  R9 window: forward JUMP: 4524, stops 8 9 10 11 12 13 0 1 2 3 4, 18:28:15–18:29:00
  R9 window: first seen mid-day: 4524, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–11:15:15
  R10 headway dropped: first seen mid-day: stop 0, 08:01:30–08:06:15
  R10 headway dropped: first seen mid-day: stop 0, 08:06:15–08:11:45
  R10 headway dropped: first seen mid-day: stop 0, 08:11:45–08:15:45
  R10 headway dropped: first seen mid-day: stop 0, 08:15:45–08:20:45
  R10 headway dropped: first seen mid-day: stop 0, 08:20:45–08:25:30
  R10 headway dropped: first seen mid-day: stop 0, 08:25:30–08:30:15
  R10 headway dropped: first seen mid-day: stop 0, 08:30:15–08:35:45
  R10 headway dropped: first seen mid-day: stop 0, 08:35:45–08:41:15
  R10 headway dropped: first seen mid-day: stop 0, 08:41:15–08:50:45
  R10 headway dropped: first seen mid-day: stop 0, 08:50:45–08:55:45
  R10 headway dropped: first seen mid-day: stop 0, 08:55:45–09:00:45
  R10 headway dropped: first seen mid-day: stop 0, 09:00:45–09:11:45
  R10 headway dropped: first seen mid-day: stop 0, 09:11:45–09:15:30
  R10 headway dropped: first seen mid-day: stop 0, 09:15:30–09:21:00
  R10 headway dropped: first seen mid-day: stop 0, 09:21:00–09:32:15
  R10 headway dropped: first seen mid-day: stop 0, 09:32:15–09:33:45
  R10 headway dropped: first seen mid-day: stop 0, 09:33:45–09:40:45
  R10 headway dropped: forward JUMP: stop 0, 09:40:45–10:00:45
  R10 headway dropped: first seen mid-day: stop 0, 10:00:45–10:13:30
  R10 headway dropped: first seen mid-day: stop 0, 10:13:30–10:20:15
  R10 headway dropped: first seen mid-day: stop 0, 10:20:15–10:34:15
  R10 headway dropped: first seen mid-day: stop 0, 10:34:15–10:40:45
  R10 headway dropped: first seen mid-day: stop 0, 10:40:45–11:00:45
  R10 headway dropped: first seen mid-day: stop 0, 11:00:45–11:13:45
  R10 headway dropped: first seen mid-day: stop 0, 11:13:45–11:28:15
  R10 headway dropped: forward JUMP: stop 0, 12:57:00–13:13:00
  R10 headway dropped: forward JUMP: stop 0, 13:13:00–13:20:30
  R10 headway dropped: forward JUMP: stop 0, 18:00:30–18:21:00
  R10 headway dropped: forward JUMP: stop 0, 18:21:00–18:40:45
  R10 headway dropped: forward JUMP: stop 0, 18:51:45–18:59:30
  R10 headway dropped: first seen mid-day: stop 1, 08:02:00–08:07:00
  R10 headway dropped: first seen mid-day: stop 1, 08:07:00–08:12:00
  R10 headway dropped: first seen mid-day: stop 1, 08:12:00–08:16:30
  R10 headway dropped: first seen mid-day: stop 1, 08:16:30–08:21:30
  R10 headway dropped: first seen mid-day: stop 1, 08:21:30–08:26:00
  R10 headway dropped: first seen mid-day: stop 1, 08:26:00–08:31:15
  R10 headway dropped: first seen mid-day: stop 1, 08:31:15–08:36:15
  R10 headway dropped: first seen mid-day: stop 1, 08:36:15–08:41:45
  R10 headway dropped: first seen mid-day: stop 1, 08:41:45–08:51:30
  R10 headway dropped: first seen mid-day: stop 1, 08:51:30–08:56:30
  R10 headway dropped: first seen mid-day: stop 1, 08:56:30–09:01:15
  R10 headway dropped: first seen mid-day: stop 1, 09:01:15–09:12:30
  R10 headway dropped: first seen mid-day: stop 1, 09:12:30–09:16:00
  R10 headway dropped: first seen mid-day: stop 1, 09:16:00–09:21:30
  R10 headway dropped: first seen mid-day: stop 1, 09:21:30–09:33:15
  R10 headway dropped: first seen mid-day: stop 1, 09:33:15–09:34:15
  R10 headway dropped: first seen mid-day: stop 1, 09:34:15–09:41:45
  R10 headway dropped: forward JUMP: stop 1, 09:41:45–10:01:30
  R10 headway dropped: first seen mid-day: stop 1, 10:01:30–10:14:15
  R10 headway dropped: first seen mid-day: stop 1, 10:14:15–10:21:00
  R10 headway dropped: first seen mid-day: stop 1, 10:21:00–10:35:15
  R10 headway dropped: first seen mid-day: stop 1, 10:35:15–10:41:30
  R10 headway dropped: first seen mid-day: stop 1, 10:41:30–11:01:30
  R10 headway dropped: backward JUMP: stop 1, 11:01:30–11:14:45
  R10 headway dropped: first seen mid-day: stop 1, 11:14:45–11:28:45
  R10 headway dropped: forward JUMP: stop 1, 12:57:15–13:13:45
  R10 headway dropped: forward JUMP: stop 1, 13:13:45–13:21:30
  R10 headway dropped: backward JUMP: stop 1, 13:48:30–13:55:00
  R10 headway dropped: backward JUMP: stop 1, 13:55:00–14:01:45
  R10 headway dropped: forward JUMP: stop 1, 18:01:15–18:21:30
  R10 headway dropped: backward JUMP: stop 1, 18:21:30–18:41:45
  R10 headway dropped: forward JUMP: stop 1, 18:52:15–18:59:45
  R10 headway dropped: first seen mid-day: stop 2, 08:03:15–08:08:30
  R10 headway dropped: first seen mid-day: stop 2, 08:08:30–08:13:30
  R10 headway dropped: first seen mid-day: stop 2, 08:13:30–08:17:45
  R10 headway dropped: first seen mid-day: stop 2, 08:17:45–08:23:00
  R10 headway dropped: first seen mid-day: stop 2, 08:23:00–08:28:00
  R10 headway dropped: first seen mid-day: stop 2, 08:28:00–08:33:30
  R10 headway dropped: first seen mid-day: stop 2, 08:33:30–08:38:00
  R10 headway dropped: first seen mid-day: stop 2, 08:38:00–08:43:00
  R10 headway dropped: first seen mid-day: stop 2, 08:43:00–08:53:00
  R10 headway dropped: first seen mid-day: stop 2, 08:53:00–08:57:45
  R10 headway dropped: first seen mid-day: stop 2, 08:57:45–09:03:00
  R10 headway dropped: first seen mid-day: stop 2, 09:03:00–09:14:00
  R10 headway dropped: first seen mid-day: stop 2, 09:14:00–09:18:00
  R10 headway dropped: first seen mid-day: stop 2, 09:18:00–09:25:45
  R10 headway dropped: forward JUMP: stop 2, 09:25:45–09:36:15
  R10 headway dropped: forward JUMP: stop 2, 09:36:15–09:43:15
  R10 headway dropped: forward JUMP: stop 2, 09:43:15–09:56:15
  R10 headway dropped: first seen mid-day: stop 2, 09:56:15–10:02:45
  R10 headway dropped: first seen mid-day: stop 2, 10:02:45–10:16:00
  R10 headway dropped: first seen mid-day: stop 2, 10:16:00–10:22:15
  R10 headway dropped: first seen mid-day: stop 2, 10:22:15–10:37:15
  R10 headway dropped: first seen mid-day: stop 2, 10:37:15–10:43:00
  R10 headway dropped: first seen mid-day: stop 2, 10:43:00–11:03:00
  R10 headway dropped: backward JUMP: stop 2, 11:03:00–11:16:30
  R10 headway dropped: forward JUMP: stop 2, 12:58:15–13:15:30
  R10 headway dropped: backward JUMP: stop 2, 13:15:30–13:23:15
  R10 headway dropped: backward JUMP: stop 2, 13:50:45–13:58:15
  R10 headway dropped: backward JUMP: stop 2, 13:58:15–14:03:15
  R10 headway dropped: backward JUMP: stop 2, 18:02:45–18:22:45
  R10 headway dropped: forward JUMP: stop 2, 18:22:45–18:34:45
  R10 headway dropped: forward JUMP: stop 2, 18:52:30–18:53:00
  R10 headway dropped: forward JUMP: stop 2, 18:53:00–19:00:30
  R10 headway dropped: first seen mid-day: stop 3, 08:04:00–08:09:45
  R10 headway dropped: first seen mid-day: stop 3, 08:09:45–08:14:30
  R10 headway dropped: first seen mid-day: stop 3, 08:14:30–08:19:00
  R10 headway dropped: first seen mid-day: stop 3, 08:19:00–08:24:15
  R10 headway dropped: first seen mid-day: stop 3, 08:24:15–08:29:30
  R10 headway dropped: first seen mid-day: stop 3, 08:29:30–08:34:45
  R10 headway dropped: first seen mid-day: stop 3, 08:34:45–08:39:00
  R10 headway dropped: first seen mid-day: stop 3, 08:39:00–08:45:00
  R10 headway dropped: first seen mid-day: stop 3, 08:45:00–08:54:15
  R10 headway dropped: first seen mid-day: stop 3, 08:54:15–08:58:45
  R10 headway dropped: first seen mid-day: stop 3, 08:58:45–09:04:00
  R10 headway dropped: first seen mid-day: stop 3, 09:04:00–09:15:15
  R10 headway dropped: first seen mid-day: stop 3, 09:15:15–09:19:15
  R10 headway dropped: first seen mid-day: stop 3, 09:19:15–09:26:15
  R10 headway dropped: forward JUMP: stop 3, 09:26:15–09:37:30
  R10 headway dropped: forward JUMP: stop 3, 09:37:30–09:44:45
  R10 headway dropped: first seen mid-day: stop 3, 09:44:45–09:58:00
  R10 headway dropped: first seen mid-day: stop 3, 09:58:00–10:03:45
  R10 headway dropped: first seen mid-day: stop 3, 10:03:45–10:17:45
  R10 headway dropped: first seen mid-day: stop 3, 10:17:45–10:23:45
  R10 headway dropped: first seen mid-day: stop 3, 10:23:45–10:38:30
  R10 headway dropped: first seen mid-day: stop 3, 10:38:30–10:44:00
  R10 headway dropped: first seen mid-day: stop 3, 10:44:00–11:04:00
  R10 headway dropped: backward JUMP: stop 3, 11:04:00–11:17:45
  R10 headway dropped: forward JUMP: stop 3, 12:59:00–13:16:15
  R10 headway dropped: backward JUMP: stop 3, 13:52:15–13:59:15
  R10 headway dropped: backward JUMP: stop 3, 13:59:15–14:04:30
  R10 headway dropped: backward JUMP: stop 3, 18:04:00–18:24:00
  R10 headway dropped: forward JUMP: stop 3, 18:24:00–18:35:45
  R10 headway dropped: forward JUMP: stop 3, 18:44:15–18:53:15
  R10 headway dropped: forward JUMP: stop 3, 18:53:15–18:53:30
  R10 headway dropped: first seen mid-day: stop 4, 08:04:30–08:10:30
  R10 headway dropped: first seen mid-day: stop 4, 08:10:30–08:15:30
  R10 headway dropped: first seen mid-day: stop 4, 08:15:30–08:19:45
  R10 headway dropped: first seen mid-day: stop 4, 08:19:45–08:24:45
  R10 headway dropped: first seen mid-day: stop 4, 08:24:45–08:35:30
  R10 headway dropped: first seen mid-day: stop 4, 08:35:30–08:39:45
  R10 headway dropped: first seen mid-day: stop 4, 08:39:45–08:45:45
  R10 headway dropped: forward JUMP: stop 4, 08:45:45–08:59:30
  R10 headway dropped: forward JUMP: stop 4, 08:59:30–09:04:45
  R10 headway dropped: first seen mid-day: stop 4, 09:04:45–09:16:00
  R10 headway dropped: first seen mid-day: stop 4, 09:16:00–09:20:15
  R10 headway dropped: first seen mid-day: stop 4, 09:20:15–09:26:15
  R10 headway dropped: forward JUMP: stop 4, 09:26:15–09:38:30
  R10 headway dropped: forward JUMP: stop 4, 09:38:30–09:45:30
  R10 headway dropped: first seen mid-day: stop 4, 09:45:30–09:58:45
  R10 headway dropped: first seen mid-day: stop 4, 09:58:45–10:04:30
  R10 headway dropped: first seen mid-day: stop 4, 10:04:30–10:18:30
  R10 headway dropped: first seen mid-day: stop 4, 10:18:30–10:24:45
  R10 headway dropped: first seen mid-day: stop 4, 10:24:45–10:39:30
  R10 headway dropped: first seen mid-day: stop 4, 10:39:30–10:45:00
  R10 headway dropped: first seen mid-day: stop 4, 10:45:00–11:05:00
  R10 headway dropped: backward JUMP: stop 4, 11:05:00–11:18:30
  R10 headway dropped: forward JUMP: stop 4, 12:59:30–13:17:00
  R10 headway dropped: backward JUMP: stop 4, 13:45:00–13:53:15
  R10 headway dropped: backward JUMP: stop 4, 13:53:15–13:59:45
  R10 headway dropped: backward JUMP: stop 4, 18:05:00–18:24:45
  R10 headway dropped: forward JUMP: stop 4, 18:24:45–18:36:30
  R10 headway dropped: forward JUMP: stop 4, 18:45:00–18:53:45
  R10 headway dropped: first seen mid-day: stop 5, 08:07:45–08:13:45
  R10 headway dropped: first seen mid-day: stop 5, 08:13:45–08:17:45
  R10 headway dropped: first seen mid-day: stop 5, 08:17:45–08:22:30
  R10 headway dropped: first seen mid-day: stop 5, 08:22:30–08:27:30
  R10 headway dropped: first seen mid-day: stop 5, 08:27:30–08:37:45
  R10 headway dropped: first seen mid-day: stop 5, 08:37:45–08:42:00
  R10 headway dropped: first seen mid-day: stop 5, 08:42:00–08:48:00
  R10 headway dropped: forward JUMP: stop 5, 08:48:00–09:02:00
  R10 headway dropped: first seen mid-day: stop 5, 09:02:00–09:07:15
  R10 headway dropped: first seen mid-day: stop 5, 09:07:15–09:18:15
  R10 headway dropped: first seen mid-day: stop 5, 09:18:15–09:22:45
  R10 headway dropped: first seen mid-day: stop 5, 09:22:45–09:28:45
  R10 headway dropped: forward JUMP: stop 5, 09:28:45–09:48:15
  R10 headway dropped: first seen mid-day: stop 5, 09:48:15–10:01:45
  R10 headway dropped: first seen mid-day: stop 5, 10:01:45–10:07:15
  R10 headway dropped: first seen mid-day: stop 5, 10:07:15–10:21:30
  R10 headway dropped: first seen mid-day: stop 5, 10:21:30–10:29:15
  R10 headway dropped: first seen mid-day: stop 5, 10:29:15–10:42:15
  R10 headway dropped: first seen mid-day: stop 5, 10:42:15–10:47:15
  R10 headway dropped: first seen mid-day: stop 5, 10:47:15–11:08:00
  R10 headway dropped: backward JUMP: stop 5, 11:08:00–11:20:30
  R10 headway dropped: forward JUMP: stop 5, 12:49:15–13:00:00
  R10 headway dropped: forward JUMP: stop 5, 13:00:00–13:20:30
  R10 headway dropped: backward JUMP: stop 5, 13:48:15–13:56:00
  R10 headway dropped: backward JUMP: stop 5, 13:56:00–14:00:15
  R10 headway dropped: backward JUMP: stop 5, 18:10:30–18:27:30
  R10 headway dropped: first seen mid-day: stop 6, 08:00:45–08:10:30
  R10 headway dropped: first seen mid-day: stop 6, 08:10:30–08:15:00
  R10 headway dropped: first seen mid-day: stop 6, 08:15:00–08:20:45
  R10 headway dropped: first seen mid-day: stop 6, 08:20:45–08:25:45
  R10 headway dropped: first seen mid-day: stop 6, 08:25:45–08:32:15
  R10 headway dropped: first seen mid-day: stop 6, 08:32:15–08:39:30
  R10 headway dropped: first seen mid-day: stop 6, 08:39:30–08:45:30
  R10 headway dropped: first seen mid-day: stop 6, 08:45:30–08:51:15
  R10 headway dropped: forward JUMP: stop 6, 08:51:15–09:05:00
  R10 headway dropped: first seen mid-day: stop 6, 09:05:00–09:10:15
  R10 headway dropped: first seen mid-day: stop 6, 09:10:15–09:21:45
  R10 headway dropped: first seen mid-day: stop 6, 09:21:45–09:23:45
  R10 headway dropped: unconfirmed move: stop 6, 09:23:45–09:30:45
  R10 headway dropped: forward JUMP: stop 6, 09:30:45–09:43:00
  R10 headway dropped: forward JUMP: stop 6, 09:43:00–09:50:15
  R10 headway dropped: first seen mid-day: stop 6, 09:50:15–10:02:45
  R10 headway dropped: first seen mid-day: stop 6, 10:02:45–10:10:30
  R10 headway dropped: first seen mid-day: stop 6, 10:10:30–10:22:45
  R10 headway dropped: first seen mid-day: stop 6, 10:22:45–10:30:15
  R10 headway dropped: first seen mid-day: stop 6, 10:30:15–10:44:45
  R10 headway dropped: first seen mid-day: stop 6, 10:44:45–10:50:15
  R10 headway dropped: unconfirmed move: stop 6, 10:50:15–11:18:15
  R10 headway dropped: unconfirmed move: stop 6, 11:18:15–11:23:30
  R10 headway dropped: unconfirmed move: stop 6, 12:37:00–12:43:15
  R10 headway dropped: forward JUMP: stop 6, 12:50:30–13:03:00
  R10 headway dropped: unconfirmed move: stop 6, 13:43:30–13:50:15
  R10 headway dropped: unconfirmed move: stop 6, 13:50:15–14:04:00
  R10 headway dropped: forward JUMP: stop 6, 14:30:00–14:50:15
  R10 headway dropped: unconfirmed move: stop 6, 15:02:30–15:17:45
  R10 headway dropped: unconfirmed move: stop 6, 15:17:45–15:24:00
  R10 headway dropped: unconfirmed move: stop 6, 16:03:45–16:16:15
  R10 headway dropped: unconfirmed move: stop 6, 16:16:15–16:23:15
  R10 headway dropped: unconfirmed move: stop 6, 17:30:15–17:43:00
  R10 headway dropped: unconfirmed move: stop 6, 18:10:15–18:30:15
  R10 headway dropped: first seen mid-day: stop 7, 08:03:30–08:11:45
  R10 headway dropped: first seen mid-day: stop 7, 08:11:45–08:16:45
  R10 headway dropped: first seen mid-day: stop 7, 08:16:45–08:21:45
  R10 headway dropped: first seen mid-day: stop 7, 08:21:45–08:27:00
  R10 headway dropped: first seen mid-day: stop 7, 08:27:00–08:33:15
  R10 headway dropped: first seen mid-day: stop 7, 08:33:15–08:40:45
  R10 headway dropped: first seen mid-day: stop 7, 08:40:45–08:47:00
  R10 headway dropped: first seen mid-day: stop 7, 08:47:00–08:53:00
  R10 headway dropped: forward JUMP: stop 7, 08:53:00–09:06:00
  R10 headway dropped: first seen mid-day: stop 7, 09:06:00–09:11:30
  R10 headway dropped: first seen mid-day: stop 7, 09:11:30–09:22:45
  R10 headway dropped: first seen mid-day: stop 7, 09:22:45–09:25:45
  R10 headway dropped: backward JUMP: stop 7, 09:25:45–09:32:00
  R10 headway dropped: backward JUMP: stop 7, 09:32:00–09:44:30
  R10 headway dropped: first seen mid-day: stop 7, 09:44:30–09:51:45
  R10 headway dropped: first seen mid-day: stop 7, 09:51:45–10:04:15
  R10 headway dropped: first seen mid-day: stop 7, 10:04:15–10:11:45
  R10 headway dropped: forward JUMP: stop 7, 10:11:45–10:31:15
  R10 headway dropped: first seen mid-day: stop 7, 10:31:15–10:46:30
  R10 headway dropped: first seen mid-day: stop 7, 10:46:30–10:51:45
  R10 headway dropped: backward JUMP: stop 7, 10:51:45–11:19:45
  R10 headway dropped: backward JUMP: stop 7, 11:19:45–11:25:15
  R10 headway dropped: backward JUMP: stop 7, 12:38:30–12:44:30
  R10 headway dropped: forward JUMP: stop 7, 12:44:30–13:04:15
  R10 headway dropped: backward JUMP: stop 7, 13:45:15–13:51:45
  R10 headway dropped: backward JUMP: stop 7, 13:51:45–14:05:30
  R10 headway dropped: backward JUMP: stop 7, 14:05:30–14:11:15
  R10 headway dropped: forward JUMP: stop 7, 14:11:15–14:31:30
  R10 headway dropped: forward JUMP: stop 7, 14:31:30–14:51:30
  R10 headway dropped: backward JUMP: stop 7, 15:04:00–15:19:15
  R10 headway dropped: backward JUMP: stop 7, 15:19:15–15:25:30
  R10 headway dropped: backward JUMP: stop 7, 16:05:00–16:17:45
  R10 headway dropped: backward JUMP: stop 7, 16:17:45–16:24:30
  R10 headway dropped: backward JUMP: stop 7, 17:31:45–17:44:45
  R10 headway dropped: backward JUMP: stop 7, 18:12:00–18:32:00
  R10 headway dropped: first seen mid-day: stop 8, 08:04:00–08:08:30
  R10 headway dropped: first seen mid-day: stop 8, 08:08:30–08:12:30
  R10 headway dropped: first seen mid-day: stop 8, 08:12:30–08:17:15
  R10 headway dropped: first seen mid-day: stop 8, 08:17:15–08:22:15
  R10 headway dropped: first seen mid-day: stop 8, 08:22:15–08:27:30
  R10 headway dropped: first seen mid-day: stop 8, 08:27:30–08:34:00
  R10 headway dropped: first seen mid-day: stop 8, 08:34:00–08:41:15
  R10 headway dropped: first seen mid-day: stop 8, 08:41:15–08:47:45
  R10 headway dropped: first seen mid-day: stop 8, 08:47:45–08:53:45
  R10 headway dropped: forward JUMP: stop 8, 08:53:45–09:06:30
  R10 headway dropped: first seen mid-day: stop 8, 09:06:30–09:12:15
  R10 headway dropped: first seen mid-day: stop 8, 09:12:15–09:23:30
  R10 headway dropped: first seen mid-day: stop 8, 09:23:30–09:26:15
  R10 headway dropped: first seen mid-day: stop 8, 09:26:15–09:32:45
  R10 headway dropped: forward JUMP: stop 8, 09:32:45–09:45:15
  R10 headway dropped: first seen mid-day: stop 8, 09:45:15–09:52:30
  R10 headway dropped: first seen mid-day: stop 8, 09:52:30–10:05:00
  R10 headway dropped: first seen mid-day: stop 8, 10:05:00–10:12:45
  R10 headway dropped: forward JUMP: stop 8, 10:12:45–10:32:15
  R10 headway dropped: first seen mid-day: stop 8, 10:32:15–10:47:00
  R10 headway dropped: first seen mid-day: stop 8, 10:47:00–10:52:45
  R10 headway dropped: first seen mid-day: stop 8, 10:52:45–11:20:45
  R10 headway dropped: forward JUMP: stop 8, 12:45:15–13:05:00
  R10 headway dropped: forward JUMP: stop 8, 14:11:45–14:32:15
  R10 headway dropped: forward JUMP: stop 8, 14:32:15–14:52:15
  R10 headway dropped: forward JUMP: stop 8, 18:12:45–18:32:30
  R10 headway dropped: forward JUMP: stop 8, 18:32:30–18:53:30
  R10 headway dropped: first seen mid-day: stop 9, 08:05:30–08:09:45
  R10 headway dropped: first seen mid-day: stop 9, 08:09:45–08:13:30
  R10 headway dropped: forward JUMP: stop 9, 08:13:30–08:23:45
  R10 headway dropped: first seen mid-day: stop 9, 08:23:45–08:28:30
  R10 headway dropped: first seen mid-day: stop 9, 08:28:30–08:34:45
  R10 headway dropped: first seen mid-day: stop 9, 08:34:45–08:42:30
  R10 headway dropped: first seen mid-day: stop 9, 08:42:30–08:49:00
  R10 headway dropped: first seen mid-day: stop 9, 08:49:00–08:54:45
  R10 headway dropped: forward JUMP: stop 9, 08:54:45–09:07:30
  R10 headway dropped: first seen mid-day: stop 9, 09:07:30–09:13:15
  R10 headway dropped: first seen mid-day: stop 9, 09:13:15–09:24:30
  R10 headway dropped: first seen mid-day: stop 9, 09:24:30–09:27:30
  R10 headway dropped: first seen mid-day: stop 9, 09:27:30–09:34:00
  R10 headway dropped: forward JUMP: stop 9, 09:34:00–09:46:45
  R10 headway dropped: first seen mid-day: stop 9, 09:46:45–09:53:45
  R10 headway dropped: first seen mid-day: stop 9, 09:53:45–10:06:15
  R10 headway dropped: first seen mid-day: stop 9, 10:06:15–10:13:45
  R10 headway dropped: forward JUMP: stop 9, 10:13:45–10:33:15
  R10 headway dropped: first seen mid-day: stop 9, 10:33:15–10:48:30
  R10 headway dropped: first seen mid-day: stop 9, 10:48:30–10:54:00
  R10 headway dropped: first seen mid-day: stop 9, 10:54:00–11:22:00
  R10 headway dropped: forward JUMP: stop 9, 12:46:00–13:06:03
  R10 headway dropped: forward JUMP: stop 9, 14:13:00–14:33:30
  R10 headway dropped: forward JUMP: stop 9, 14:33:30–14:53:45
  R10 headway dropped: unconfirmed move: stop 9, 17:54:00–18:14:00
  R10 headway dropped: forward JUMP: stop 9, 18:14:00–18:34:00
  R10 headway dropped: backward JUMP: stop 9, 18:34:00–18:54:30
  R10 headway dropped: first seen mid-day: stop 10, 08:01:30–08:07:15
  R10 headway dropped: first seen mid-day: stop 10, 08:07:15–08:11:45
  R10 headway dropped: first seen mid-day: stop 10, 08:11:45–08:16:45
  R10 headway dropped: forward JUMP: stop 10, 08:16:45–08:25:30
  R10 headway dropped: first seen mid-day: stop 10, 08:25:30–08:30:00
  R10 headway dropped: first seen mid-day: stop 10, 08:30:00–08:37:15
  R10 headway dropped: first seen mid-day: stop 10, 08:37:15–08:46:00
  R10 headway dropped: first seen mid-day: stop 10, 08:46:00–08:51:15
  R10 headway dropped: first seen mid-day: stop 10, 08:51:15–08:56:30
  R10 headway dropped: first seen mid-day: stop 10, 08:56:30–09:06:30
  R10 headway dropped: first seen mid-day: stop 10, 09:06:30–09:10:00
  R10 headway dropped: first seen mid-day: stop 10, 09:10:00–09:15:45
  R10 headway dropped: first seen mid-day: stop 10, 09:15:45–09:27:15
  R10 headway dropped: first seen mid-day: stop 10, 09:27:15–09:29:00
  R10 headway dropped: first seen mid-day: stop 10, 09:29:00–09:36:15
  R10 headway dropped: forward JUMP: stop 10, 09:36:15–09:56:15
  R10 headway dropped: first seen mid-day: stop 10, 09:56:15–10:09:00
  R10 headway dropped: first seen mid-day: stop 10, 10:09:00–10:16:00
  R10 headway dropped: forward JUMP: stop 10, 10:16:00–10:36:15
  R10 headway dropped: first seen mid-day: stop 10, 10:36:15–10:50:15
  R10 headway dropped: first seen mid-day: stop 10, 10:50:15–10:56:00
  R10 headway dropped: first seen mid-day: stop 10, 10:56:00–11:23:45
  R10 headway dropped: forward JUMP: stop 10, 12:48:00–13:07:45
  R10 headway dropped: forward JUMP: stop 10, 14:35:45–14:55:30
  R10 headway dropped: forward JUMP: stop 10, 17:55:45–18:15:45
  R10 headway dropped: forward JUMP: stop 10, 18:15:45–18:35:45
  R10 headway dropped: backward JUMP: stop 10, 18:46:00–18:56:00
  R10 headway dropped: first seen mid-day: stop 11, 08:02:00–08:07:45
  R10 headway dropped: first seen mid-day: stop 11, 08:07:45–08:12:15
  R10 headway dropped: first seen mid-day: stop 11, 08:12:15–08:17:00
  R10 headway dropped: first seen mid-day: stop 11, 08:17:00–08:21:30
  R10 headway dropped: first seen mid-day: stop 11, 08:21:30–08:26:00
  R10 headway dropped: first seen mid-day: stop 11, 08:26:00–08:30:30
  R10 headway dropped: first seen mid-day: stop 11, 08:30:30–08:37:45
  R10 headway dropped: first seen mid-day: stop 11, 08:37:45–08:46:30
  R10 headway dropped: first seen mid-day: stop 11, 08:46:30–08:52:00
  R10 headway dropped: first seen mid-day: stop 11, 08:52:00–08:57:00
  R10 headway dropped: first seen mid-day: stop 11, 08:57:00–09:07:00
  R10 headway dropped: first seen mid-day: stop 11, 09:07:00–09:10:30
  R10 headway dropped: first seen mid-day: stop 11, 09:10:30–09:16:15
  R10 headway dropped: first seen mid-day: stop 11, 09:16:15–09:27:45
  R10 headway dropped: first seen mid-day: stop 11, 09:27:45–09:29:30
  R10 headway dropped: first seen mid-day: stop 11, 09:29:30–09:36:45
  R10 headway dropped: forward JUMP: stop 11, 09:36:45–09:57:00
  R10 headway dropped: first seen mid-day: stop 11, 09:57:00–10:10:00
  R10 headway dropped: first seen mid-day: stop 11, 10:10:00–10:16:30
  R10 headway dropped: forward JUMP: stop 11, 10:16:30–10:36:30
  R10 headway dropped: first seen mid-day: stop 11, 10:36:30–10:51:00
  R10 headway dropped: first seen mid-day: stop 11, 10:51:00–10:56:30
  R10 headway dropped: first seen mid-day: stop 11, 10:56:30–11:24:15
  R10 headway dropped: forward JUMP: stop 11, 12:48:30–13:08:30
  R10 headway dropped: forward JUMP: stop 11, 14:36:30–14:56:15
  R10 headway dropped: forward JUMP: stop 11, 17:56:30–18:16:30
  R10 headway dropped: backward JUMP: stop 11, 18:16:30–18:36:45
  R10 headway dropped: forward JUMP: stop 11, 18:46:30–18:56:30
  R10 headway dropped: first seen mid-day: stop 12, 08:03:00–08:08:30
  R10 headway dropped: first seen mid-day: stop 12, 08:08:30–08:13:15
  R10 headway dropped: first seen mid-day: stop 12, 08:13:15–08:17:30
  R10 headway dropped: first seen mid-day: stop 12, 08:17:30–08:22:30
  R10 headway dropped: first seen mid-day: stop 12, 08:22:30–08:26:45
  R10 headway dropped: first seen mid-day: stop 12, 08:26:45–08:31:00
  R10 headway dropped: first seen mid-day: stop 12, 08:31:00–08:39:00
  R10 headway dropped: first seen mid-day: stop 12, 08:39:00–08:47:30
  R10 headway dropped: first seen mid-day: stop 12, 08:47:30–08:52:45
  R10 headway dropped: first seen mid-day: stop 12, 08:52:45–08:58:00
  R10 headway dropped: first seen mid-day: stop 12, 08:58:00–09:07:45
  R10 headway dropped: first seen mid-day: stop 12, 09:07:45–09:11:15
  R10 headway dropped: first seen mid-day: stop 12, 09:11:15–09:16:45
  R10 headway dropped: forward JUMP: stop 12, 09:16:45–09:28:45
  R10 headway dropped: first seen mid-day: stop 12, 09:28:45–09:30:15
  R10 headway dropped: first seen mid-day: stop 12, 09:30:15–09:37:30
  R10 headway dropped: forward JUMP: stop 12, 09:37:30–09:57:30
  R10 headway dropped: first seen mid-day: stop 12, 09:57:30–10:10:45
  R10 headway dropped: first seen mid-day: stop 12, 10:10:45–10:17:15
  R10 headway dropped: first seen mid-day: stop 12, 10:17:15–10:31:00
  R10 headway dropped: first seen mid-day: stop 12, 10:31:00–10:37:30
  R10 headway dropped: first seen mid-day: stop 12, 10:37:30–10:52:00
  R10 headway dropped: first seen mid-day: stop 12, 10:52:00–10:57:30
  R10 headway dropped: first seen mid-day: stop 12, 10:57:30–11:24:45
  R10 headway dropped: forward JUMP: stop 12, 14:37:15–14:57:00
  R10 headway dropped: forward JUMP: stop 12, 17:57:15–18:17:30
  R10 headway dropped: backward JUMP: stop 12, 18:17:30–18:37:30
  R10 headway dropped: forward JUMP: stop 12, 18:47:30–18:57:15
  R10 headway dropped: first seen mid-day: stop 13, 08:03:45–08:09:45
  R10 headway dropped: first seen mid-day: stop 13, 08:09:45–08:14:15
  R10 headway dropped: first seen mid-day: stop 13, 08:14:15–08:18:30
  R10 headway dropped: first seen mid-day: stop 13, 08:18:30–08:23:45
  R10 headway dropped: first seen mid-day: stop 13, 08:23:45–08:28:45
  R10 headway dropped: first seen mid-day: stop 13, 08:28:45–08:33:00
  R10 headway dropped: first seen mid-day: stop 13, 08:33:00–08:40:00
  R10 headway dropped: first seen mid-day: stop 13, 08:40:00–08:48:45
  R10 headway dropped: first seen mid-day: stop 13, 08:48:45–08:54:00
  R10 headway dropped: first seen mid-day: stop 13, 08:54:00–08:59:15
  R10 headway dropped: first seen mid-day: stop 13, 08:59:15–09:09:00
  R10 headway dropped: first seen mid-day: stop 13, 09:09:00–09:12:30
  R10 headway dropped: first seen mid-day: stop 13, 09:12:30–09:18:00
  R10 headway dropped: forward JUMP: stop 13, 09:18:00–09:30:00
  R10 headway dropped: first seen mid-day: stop 13, 09:30:00–09:31:45
  R10 headway dropped: first seen mid-day: stop 13, 09:31:45–09:38:45
  R10 headway dropped: forward JUMP: stop 13, 09:38:45–09:59:00
  R10 headway dropped: first seen mid-day: stop 13, 09:59:00–10:12:00
  R10 headway dropped: first seen mid-day: stop 13, 10:12:00–10:18:30
  R10 headway dropped: first seen mid-day: stop 13, 10:18:30–10:32:15
  R10 headway dropped: first seen mid-day: stop 13, 10:32:15–10:38:45
  R10 headway dropped: first seen mid-day: stop 13, 10:38:45–10:58:45
  R10 headway dropped: first seen mid-day: stop 13, 10:58:45–11:11:45
  R10 headway dropped: first seen mid-day: stop 13, 11:11:45–11:26:00
  R10 headway dropped: forward JUMP: stop 13, 14:38:45–14:58:15
  R10 headway dropped: forward JUMP: stop 13, 17:58:30–18:19:00
  R10 headway dropped: backward JUMP: stop 13, 18:19:00–18:38:45
  R10 headway dropped: forward JUMP: stop 13, 18:48:30–18:58:15
2026-11-03: 510 reported
  R4 flicker: 4526 at stop 7, 13:57:45, 2 sets
  R7 LONG visit: 4526 at stop 5, 09:34:45
  R8 departure not confirmed: 4526 at stop 6, 14:01:30
  R9 window: unconfirmed move: 4526, stops 6, 14:02:15–14:02:30
  R6 no departure: JUMP: 4526 at stop 7, 14:02:30
  R9 window: backward JUMP: 4526, stops 7, 14:04:00–14:04:15
  R12 arrival not timed: 4526 at stop 5, 14:04:15
  R8 departure not confirmed: 4526 at stop 6, 17:40:30
  R9 window: unconfirmed move: 4526, stops 6, 17:41:15–17:41:30
  R6 no departure: JUMP: 4526 at stop 7, 17:41:30
  R9 window: backward JUMP: 4526, stops 7, 17:43:00–17:43:15
  R6 no departure: JUMP: 4526 at stop 5, 17:43:15
  R9 window: backward JUMP: 4526, stops 5, 17:43:15–17:43:30
  R6 no departure: JUMP: 4526 at stop 4, 17:43:30
  R9 window: backward JUMP: 4526, stops 4, 17:43:45–17:44:00
  R6 no departure: JUMP: 4526 at stop 3, 17:44:00
  R9 window: backward JUMP: 4526, stops 3, 17:44:30–17:44:45
  R6 no departure: JUMP: 4526 at stop 2, 17:44:45
  R9 window: backward JUMP: 4526, stops 2, 18:20:30–18:20:45
  R6 no departure: JUMP: 4526 at stop 1, 18:20:45
  R9 window: backward JUMP: 4526, stops 1, 18:24:45–18:25:00
  R6 no departure: JUMP: 4526 at stop 13, 18:25:00
  R9 window: backward JUMP: 4526, stops 13, 18:25:30–18:25:45
  R6 no departure: JUMP: 4526 at stop 12, 18:25:45
  R9 window: backward JUMP: 4526, stops 12, 18:26:15–18:26:30
  R6 no departure: JUMP: 4526 at stop 11, 18:26:30
  R9 window: backward JUMP: 4526, stops 11, 18:27:15–18:27:30
  R6 no departure: JUMP: 4526 at stop 10, 18:27:30
  R9 window: backward JUMP: 4526, stops 10, 18:51:30–18:51:45
  R6 no departure: JUMP: 4526 at stop 9, 18:51:45
  R9 window: backward JUMP: 4526, stops 9, 18:52:00–18:52:15
  R6 no departure: JUMP: 4526 at stop 8, 18:52:15
  R9 window: forward JUMP: 4526, stops 8 9 10 11 12 13 0 1 2 3 4, 18:52:15–18:53:00
  R9 window: first seen mid-day: 4526, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–08:00:45
  R8 departure not confirmed: 4524 at stop 6, 09:34:15
  R9 window: unconfirmed move: 4524, stops 6, 09:35:00–09:35:15
  R6 no departure: JUMP: 4524 at stop 7, 09:35:15
  R9 window: backward JUMP: 4524, stops 7, 09:36:15–09:36:30
  R12 arrival not timed: 4524 at stop 5, 09:36:30
  R8 departure not confirmed: 4524 at stop 6, 13:49:00
  R9 window: unconfirmed move: 4524, stops 6, 13:50:00–13:50:15
  R6 no departure: JUMP: 4524 at stop 7, 13:50:15
  R9 window: backward JUMP: 4524, stops 7, 13:51:15–13:51:30
  R12 arrival not timed: 4524 at stop 5, 13:51:30
  R8 departure not confirmed: 4524 at stop 6, 17:27:45
  R9 window: unconfirmed move: 4524, stops 6, 17:28:30–17:28:45
  R6 no departure: JUMP: 4524 at stop 7, 17:28:45
  R9 window: backward JUMP: 4524, stops 7, 17:30:00–17:30:15
  R9 window: first seen mid-day: 4524, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–08:00:45
  R8 departure not confirmed: 4521 at stop 6, 09:41:15
  R9 window: unconfirmed move: 4521, stops 6, 09:41:45–09:42:00
  R6 no departure: JUMP: 4521 at stop 7, 09:42:00
  R9 window: backward JUMP: 4521, stops 7, 09:43:30–09:43:45
  R12 arrival not timed: 4521 at stop 5, 09:43:45
  R8 departure not confirmed: 4521 at stop 6, 13:56:30
  R9 window: unconfirmed move: 4521, stops 6, 13:57:30–13:57:45
  R6 no departure: JUMP: 4521 at stop 7, 13:57:45
  R9 window: backward JUMP: 4521, stops 7, 13:59:15–13:59:30
  R12 arrival not timed: 4521 at stop 5, 13:59:30
  R8 departure not confirmed: 4521 at stop 6, 17:35:00
  R9 window: unconfirmed move: 4521, stops 6, 17:35:45–17:36:00
  R6 no departure: JUMP: 4521 at stop 7, 17:36:00
  R9 window: backward JUMP: 4521, stops 7, 17:37:15–17:37:30
  R12 arrival not timed: 4521 at stop 5, 17:37:30
  R8 departure not confirmed: 4521 at stop 6, 18:10:15
  R9 window: unconfirmed move: 4521, stops 6, 18:10:45–18:11:00
  R6 no departure: JUMP: 4521 at stop 7, 18:11:00
  R9 window: backward JUMP: 4521, stops 7, 18:12:30–18:12:45
  R6 no departure: JUMP: 4521 at stop 5, 18:12:45
  R9 window: backward JUMP: 4521, stops 5, 18:13:00–18:13:15
  R6 no departure: JUMP: 4521 at stop 4, 18:13:15
  R9 window: backward JUMP: 4521, stops 4, 18:13:45–18:14:00
  R6 no departure: JUMP: 4521 at stop 3, 18:14:00
  R9 window: backward JUMP: 4521, stops 3, 18:14:45–18:15:00
  R6 no departure: JUMP: 4521 at stop 2, 18:15:00
  R9 window: backward JUMP: 4521, stops 2, 18:20:15–18:20:30
  R6 no departure: JUMP: 4521 at stop 1, 18:20:30
  R9 window: backward JUMP: 4521, stops 1, 18:23:15–18:23:30
  R12 arrival not timed: 4521 at stop 0, 18:23:30
  R9 window: first seen mid-day: 4521, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–08:01:45
  R4 flicker: 4520 at stop 3, 11:08:45, 1 sets
  R4 flicker: 4520 at stop 5, 14:43:15, 3 sets
  R6 no departure: JUMP: 4520 at stop 2, 09:49:00
  R9 window: forward JUMP: 4520, stops 2 3 4 5 6, 09:49:00–09:58:45
  R6 no departure: JUMP: 4520 at stop 7, 09:58:45
  R9 window: forward JUMP: 4520, stops 7 8 9 10 11 12 13, 09:58:45–10:07:00
  R8 departure not confirmed: 4520 at stop 0, 10:07:00
  R9 window: unconfirmed move: 4520, stops 0, 10:34:45–10:35:00
  R6 no departure: JUMP: 4520 at stop 1, 10:35:00
  R9 window: backward JUMP: 4520, stops 1, 10:46:15–10:46:30
  R6 no departure: JUMP: 4520 at stop 0, 10:46:30
  R9 window: forward JUMP: 4520, stops 0 1 2 3 4 5 6 7 8 9 10, 10:46:30–10:48:15
  R6 no departure: JUMP: 4520 at stop 11, 10:48:15
  R9 window: forward JUMP: 4520, stops 11 12 13 0 1 2, 10:48:15–10:51:45
  R12 arrival not timed: 4520 at stop 3, 10:51:45
  R6 no departure: JUMP: 4520 at stop 7, 10:57:45
  R9 window: forward JUMP: 4520, stops 7 8 9, 10:57:45–11:01:30
  R6 no departure: JUMP: 4520 at stop 10, 11:01:30
  R9 window: forward JUMP: 4520, stops 10 11, 11:01:30–11:04:45
  R12 arrival not timed: 4520 at stop 12, 11:04:45
  R6 no departure: JUMP: 4520 at stop 0, 11:06:45
  R9 window: forward JUMP: 4520, stops 0 1, 11:06:45–11:08:15
  R12 arrival not timed: 4520 at stop 2, 11:08:15
  R8 departure not confirmed: 4520 at stop 6, 11:16:00
  R9 window: unconfirmed move: 4520, stops 6, 11:16:45–11:17:00
  R6 no departure: JUMP: 4520 at stop 7, 11:17:00
  R9 window: backward JUMP: 4520, stops 7, 11:18:30–11:18:45
  R12 arrival not timed: 4520 at stop 5, 11:18:45
  R6 no departure: JUMP: 4520 at stop 3, 14:10:30
  R9 window: forward JUMP: 4520, stops 3 4 5 6, 14:10:30–14:19:15
  R6 no departure: JUMP: 4520 at stop 7, 14:19:15
  R9 window: forward JUMP: 4520, stops 7 8 9 10 11, 14:19:15–14:24:30
  R6 no departure: JUMP: 4520 at stop 12, 14:24:30
  R6 no departure: JUMP: 4520 at stop 0, 14:46:15
  R12 arrival not timed: 4520 at stop 5, 15:20:00
  R6 no departure: JUMP: 4520 at stop 10, 17:42:15
  R9 window: forward JUMP: 4520, stops 10 11 12 13, 17:42:15–17:46:45
  R12 arrival not timed: 4520 at stop 0, 17:46:45
  R6 no departure: JUMP: 4520 at stop 4, 17:52:30
  R9 window: forward JUMP: 4520, stops 4 5 6, 17:52:30–17:58:45
  R6 no departure: JUMP: 4520 at stop 7, 17:58:45
  R9 window: forward JUMP: 4520, stops 7 8 9 10 11 12 13, 17:58:45–18:07:30
  R12 arrival not timed: 4520 at stop 0, 18:07:30
  R6 no departure: JUMP: 4520 at stop 0, 18:28:00
  R6 no departure: JUMP: 4520 at stop 4, 18:42:00
  R9 window: forward JUMP: 4520, stops 4 5 6 7 8, 18:42:00–18:42:30
  R12 arrival not timed: 4520 at stop 9, 18:42:30
  R6 no departure: JUMP: 4520 at stop 10, 18:44:00
  R9 window: forward JUMP: 4520, stops 10 11, 18:44:00–18:47:30
  R12 arrival not timed: 4520 at stop 12, 18:47:30
  R8 departure not confirmed: 4520 at stop 6, 18:58:15
  R9 window: unconfirmed move: 4520, stops 6, 18:59:15–18:59:30
  R6 no departure: JUMP: 4520 at stop 7, 18:59:30
  R9 window: backward JUMP: 4520, stops 7, 19:00:45–19:01:00
  R9 window: first seen mid-day: 4520, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–09:34:15
  R6 no departure: JUMP: 4531 at stop 5, 11:25:30
  R9 window: forward JUMP: 4531, stops 5 6 7 8 9, 11:25:30–11:34:15
  R6 no departure: JUMP: 4531 at stop 10, 11:34:15
  R9 window: forward JUMP: 4531, stops 10 11, 11:34:15–11:37:30
  R6 no departure: JUMP: 4531 at stop 12, 11:37:30
  R9 window: forward JUMP: 4531, stops 12 13 0 1 2, 11:37:30–11:45:18
  R6 no departure: JUMP: 4531 at stop 3, 11:45:18
  R9 window: forward JUMP: 4531, stops 3 4 5 6, 11:45:18–11:51:45
  R6 no departure: JUMP: 4531 at stop 7, 11:51:45
  R9 window: forward JUMP: 4531, stops 7 8 9, 11:51:45–11:55:00
  R6 no departure: JUMP: 4531 at stop 10, 11:55:00
  R9 window: forward JUMP: 4531, stops 10 11 12, 11:55:00–11:58:00
  R12 arrival not timed: 4531 at stop 13, 11:58:00
  R6 no departure: JUMP: 4531 at stop 0, 11:59:45
  R9 window: forward JUMP: 4531, stops 0 1 2 3, 11:59:45–12:06:00
  R6 no departure: JUMP: 4531 at stop 4, 12:06:00
  R6 no departure: JUMP: 4531 at stop 12, 12:17:00
  R9 window: forward JUMP: 4531, stops 12 13, 12:17:00–12:19:00
  R12 arrival not timed: 4531 at stop 0, 12:19:00
  R8 departure not confirmed: 4531 at stop 7, 12:30:00
  R9 window: unconfirmed move: 4531, stops 7, 12:31:15–12:31:30
  R6 no departure: JUMP: 4531 at stop 8, 12:31:30
  R9 window: backward JUMP: 4531, stops 8, 15:06:15–15:06:30
  R12 arrival not timed: 4531 at stop 6, 15:06:30
  R6 no departure: JUMP: 4531 at stop 8, 15:33:15
  R9 window: forward JUMP: 4531, stops 8 9, 15:33:15–15:35:30
  R12 arrival not timed: 4531 at stop 10, 15:35:30
  R6 no departure: JUMP: 4531 at stop 2, 15:42:15
  R6 no departure: JUMP: 4531 at stop 10, 16:00:30
  R9 window: forward JUMP: 4531, stops 10 11 12 13 0 1 2 3, 16:00:30–16:03:45
  R9 window: first seen mid-day: 4531, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–11:06:45
  R8 departure not confirmed: 4536 at stop 6, 12:35:30
  R9 window: unconfirmed move: 4536, stops 6, 12:36:30–12:36:45
  R6 no departure: JUMP: 4536 at stop 7, 12:36:45
  R9 window: backward JUMP: 4536, stops 7, 12:38:15–12:38:30
  R6 no departure: JUMP: 4536 at stop 5, 12:38:30
  R9 window: backward JUMP: 4536, stops 5, 12:38:30–12:38:45
  R6 no departure: JUMP: 4536 at stop 4, 12:38:45
  R9 window: backward JUMP: 4536, stops 4, 12:39:00–12:39:15
  R6 no departure: JUMP: 4536 at stop 3, 12:39:15
  R9 window: backward JUMP: 4536, stops 3, 12:39:45–12:40:00
  R6 no departure: JUMP: 4536 at stop 2, 12:40:00
  R9 window: backward JUMP: 4536, stops 2, 12:40:30–12:40:45
  R6 no departure: JUMP: 4536 at stop 1, 12:40:45
  R9 window: backward JUMP: 4536, stops 1, 12:41:00–12:41:15
  R12 arrival not timed: 4536 at stop 0, 12:41:15
  R7 LONG visit: 4536 at stop 5, 12:58:00
  R8 departure not confirmed: 4536 at stop 6, 16:21:45
  R9 window: unconfirmed move: 4536, stops 6, 16:22:15–16:22:30
  R6 no departure: JUMP: 4536 at stop 7, 16:22:30
  R9 window: backward JUMP: 4536, stops 7, 16:23:45–16:24:00
  R12 arrival not timed: 4536 at stop 5, 16:24:00
  R6 no departure: JUMP: 4536 at stop 10, 17:56:15
  R9 window: first seen mid-day: 4536, stops 0 1 2 3 4 5 6 7 8 9 10 11 12 13, 07:59:59–11:14:30
  R6 no departure: JUMP: 4522 at stop 3, 13:57:30
  R9 window: backward JUMP: 4522, stops 3, 13:58:00–13:58:15
  R6 no departure: JUMP: 4522 at stop 2, 13:58:15
  R9 window: backward JUMP: 4522, stops 2, 13:58:30–13:58:45
  R6 no departure: JUMP: 4522 at stop 1, 13:58:45
  R9 window: backward JUMP: 4522, stops 1, 13:58:45–13:59:00
  R10 headway dropped: first seen mid-day: stop 0, 08:06:00–08:11:30
  R10 headway dropped: first seen mid-day: stop 0, 08:11:30–08:16:00
  R10 headway dropped: first seen mid-day: stop 0, 08:16:00–08:26:45
  R10 headway dropped: first seen mid-day: stop 0, 08:26:45–08:31:45
  R10 headway dropped: first seen mid-day: stop 0, 08:31:45–08:36:00
  R10 headway dropped: first seen mid-day: stop 0, 08:36:00–08:46:30
  R10 headway dropped: first seen mid-day: stop 0, 08:46:30–08:51:00
  R10 headway dropped: first seen mid-day: stop 0, 08:51:00–08:55:45
  R10 headway dropped: first seen mid-day: stop 0, 08:55:45–09:06:15
  R10 headway dropped: first seen mid-day: stop 0, 09:06:15–09:10:45
  R10 headway dropped: first seen mid-day: stop 0, 09:10:45–09:15:15
  R10 headway dropped: first seen mid-day: stop 0, 09:15:15–09:28:00
  R10 headway dropped: first seen mid-day: stop 0, 09:28:00–09:32:30
  R10 headway dropped: first seen mid-day: stop 0, 09:32:30–09:33:30
  R10 headway dropped: first seen mid-day: stop 0, 09:33:30–09:48:15
  R10 headway dropped: unconfirmed move: stop 0, 09:48:15–11:20:45
  R10 headway dropped: forward JUMP: stop 0, 11:33:30–11:47:45
  R10 headway dropped: forward JUMP: stop 0, 11:53:30–12:07:45
  R10 headway dropped: forward JUMP: stop 0, 15:54:15–16:07:45
  R10 headway dropped: first seen mid-day: stop 1, 08:06:45–08:12:45
  R10 headway dropped: first seen mid-day: stop 1, 08:12:45–08:16:30
  R10 headway dropped: first seen mid-day: stop 1, 08:16:30–08:27:45
  R10 headway dropped: first seen mid-day: stop 1, 08:27:45–08:32:15
  R10 headway dropped: first seen mid-day: stop 1, 08:32:15–08:37:00
  R10 headway dropped: first seen mid-day: stop 1, 08:37:00–08:47:00
  R10 headway dropped: first seen mid-day: stop 1, 08:47:00–08:51:45
  R10 headway dropped: first seen mid-day: stop 1, 08:51:45–08:56:30
  R10 headway dropped: first seen mid-day: stop 1, 08:56:30–09:06:45
  R10 headway dropped: first seen mid-day: stop 1, 09:06:45–09:11:30
  R10 headway dropped: first seen mid-day: stop 1, 09:11:30–09:15:45
  R10 headway dropped: first seen mid-day: stop 1, 09:15:45–09:28:30
  R10 headway dropped: first seen mid-day: stop 1, 09:28:30–09:33:00
  R10 headway dropped: first seen mid-day: stop 1, 09:33:00–09:33:45
  R10 headway dropped: first seen mid-day: stop 1, 09:33:45–09:49:00
  R10 headway dropped: backward JUMP: stop 1, 09:49:00–11:22:00
  R10 headway dropped: forward JUMP: stop 1, 11:34:45–11:48:45
  R10 headway dropped: forward JUMP: stop 1, 11:54:15–12:08:34
  R10 headway dropped: backward JUMP: stop 1, 12:34:45–12:41:45
  R10 headway dropped: backward JUMP: stop 1, 13:54:15–14:08:45
  R10 headway dropped: forward JUMP: stop 1, 15:55:00–16:09:00
  R10 headway dropped: backward JUMP: stop 1, 18:09:30–18:51:30
  R10 headway dropped: first seen mid-day: stop 2, 08:08:15–08:14:00
  R10 headway dropped: first seen mid-day: stop 2, 08:14:00–08:17:30
  R10 headway dropped: first seen mid-day: stop 2, 08:17:30–08:29:00
  R10 headway dropped: first seen mid-day: stop 2, 08:29:00–08:33:30
  R10 headway dropped: first seen mid-day: stop 2, 08:33:30–08:38:00
  R10 headway dropped: first seen mid-day: stop 2, 08:38:00–08:48:15
  R10 headway dropped: first seen mid-day: stop 2, 08:48:15–08:53:00
  R10 headway dropped: first seen mid-day: stop 2, 08:53:00–08:57:45
  R10 headway dropped: first seen mid-day: stop 2, 08:57:45–09:08:15
  R10 headway dropped: first seen mid-day: stop 2, 09:08:15–09:12:45
  R10 headway dropped: first seen mid-day: stop 2, 09:12:45–09:17:30
  R10 headway dropped: first seen mid-day: stop 2, 09:17:30–09:30:00
  R10 headway dropped: first seen mid-day: stop 2, 09:30:00–09:33:45
  R10 headway dropped: first seen mid-day: stop 2, 09:33:45–09:35:15
  R10 headway dropped: forward JUMP: stop 2, 09:35:15–11:10:45
  R10 headway dropped: first seen mid-day: stop 2, 11:10:45–11:23:30
  R10 headway dropped: forward JUMP: stop 2, 11:36:00–11:50:00
  R10 headway dropped: forward JUMP: stop 2, 11:56:00–12:10:15
  R10 headway dropped: backward JUMP: stop 2, 12:36:15–12:43:15
  R10 headway dropped: backward JUMP: stop 2, 13:56:00–14:10:30
  R10 headway dropped: forward JUMP: stop 2, 15:56:30–16:10:00
  R10 headway dropped: backward JUMP: stop 2, 18:11:15–18:52:45
  R10 headway dropped: forward JUMP: stop 2, 18:52:45–18:53:15
  R10 headway dropped: first seen mid-day: stop 3, 08:09:15–08:15:15
  R10 headway dropped: first seen mid-day: stop 3, 08:15:15–08:18:30
  R10 headway dropped: first seen mid-day: stop 3, 08:18:30–08:30:00
  R10 headway dropped: first seen mid-day: stop 3, 08:30:00–08:34:30
  R10 headway dropped: first seen mid-day: stop 3, 08:34:30–08:39:00
  R10 headway dropped: first seen mid-day: stop 3, 08:39:00–08:49:30
  R10 headway dropped: first seen mid-day: stop 3, 08:49:30–08:54:15
  R10 headway dropped: first seen mid-day: stop 3, 08:54:15–08:59:00
  R10 headway dropped: first seen mid-day: stop 3, 08:59:00–09:09:15
  R10 headway dropped: first seen mid-day: stop 3, 09:09:15–09:14:15
  R10 headway dropped: first seen mid-day: stop 3, 09:14:15–09:18:30
  R10 headway dropped: first seen mid-day: stop 3, 09:18:30–09:31:15
  R10 headway dropped: first seen mid-day: stop 3, 09:31:15–09:34:15
  R10 headway dropped: first seen mid-day: stop 3, 09:34:15–09:36:15
  R10 headway dropped: forward JUMP: stop 3, 09:36:15–10:52:30
  R10 headway dropped: first seen mid-day: stop 3, 10:52:30–11:12:15
  R10 headway dropped: first seen mid-day: stop 3, 11:12:15–11:24:45
  R10 headway dropped: forward JUMP: stop 3, 11:37:00–11:51:15
  R10 headway dropped: forward JUMP: stop 3, 11:51:15–11:57:15
  R10 headway dropped: forward JUMP: stop 3, 11:57:15–12:12:00
  R10 headway dropped: backward JUMP: stop 3, 12:37:30–12:44:30
  R10 headway dropped: forward JUMP: stop 3, 13:57:00–15:25:45
  R10 headway dropped: forward JUMP: stop 3, 15:57:30–16:11:15
  R10 headway dropped: backward JUMP: stop 3, 17:37:00–17:52:30
  R10 headway dropped: forward JUMP: stop 3, 18:12:30–18:53:15
  R10 headway dropped: first seen mid-day: stop 4, 08:09:45–08:15:30
  R10 headway dropped: first seen mid-day: stop 4, 08:15:30–08:19:00
  R10 headway dropped: first seen mid-day: stop 4, 08:19:00–08:30:45
  R10 headway dropped: first seen mid-day: stop 4, 08:30:45–08:35:15
  R10 headway dropped: first seen mid-day: stop 4, 08:35:15–08:39:30
  R10 headway dropped: first seen mid-day: stop 4, 08:39:30–08:50:15
  R10 headway dropped: first seen mid-day: stop 4, 08:50:15–08:54:45
  R10 headway dropped: first seen mid-day: stop 4, 08:54:45–09:00:15
  R10 headway dropped: first seen mid-day: stop 4, 09:00:15–09:10:15
  R10 headway dropped: first seen mid-day: stop 4, 09:10:15–09:15:00
  R10 headway dropped: first seen mid-day: stop 4, 09:15:00–09:19:30
  R10 headway dropped: first seen mid-day: stop 4, 09:19:30–09:31:45
  R10 headway dropped: first seen mid-day: stop 4, 09:31:45–09:34:45
  R10 headway dropped: first seen mid-day: stop 4, 09:34:45–09:37:15
  R10 headway dropped: forward JUMP: stop 4, 09:37:15–10:53:30
  R10 headway dropped: first seen mid-day: stop 4, 10:53:30–11:13:15
  R10 headway dropped: first seen mid-day: stop 4, 11:13:15–11:25:30
  R10 headway dropped: forward JUMP: stop 4, 11:38:00–11:51:45
  R10 headway dropped: backward JUMP: stop 4, 12:37:45–12:45:15
  R10 headway dropped: forward JUMP: stop 4, 13:57:15–15:27:00
  R10 headway dropped: backward JUMP: stop 4, 17:37:45–18:13:30
  R10 headway dropped: forward JUMP: stop 4, 18:13:30–18:53:45
  R10 headway dropped: first seen mid-day: stop 5, 08:12:15–08:18:15
  R10 headway dropped: first seen mid-day: stop 5, 08:18:15–08:21:45
  R10 headway dropped: first seen mid-day: stop 5, 08:21:45–08:33:30
  R10 headway dropped: first seen mid-day: stop 5, 08:33:30–08:37:45
  R10 headway dropped: first seen mid-day: stop 5, 08:37:45–08:41:45
  R10 headway dropped: first seen mid-day: stop 5, 08:41:45–08:52:45
  R10 headway dropped: first seen mid-day: stop 5, 08:52:45–08:57:30
  R10 headway dropped: first seen mid-day: stop 5, 08:57:30–09:02:15
  R10 headway dropped: first seen mid-day: stop 5, 09:02:15–09:12:15
  R10 headway dropped: first seen mid-day: stop 5, 09:12:15–09:17:30
  R10 headway dropped: first seen mid-day: stop 5, 09:17:30–09:22:00
  R10 headway dropped: first seen mid-day: stop 5, 09:22:00–09:34:15
  R10 headway dropped: first seen mid-day: stop 5, 09:34:15–09:41:15
  R10 headway dropped: forward JUMP: stop 5, 09:41:15–10:56:30
  R10 headway dropped: first seen mid-day: stop 5, 10:56:30–11:16:00
  R10 headway dropped: forward JUMP: stop 5, 11:19:30–11:35:00
  R10 headway dropped: forward JUMP: stop 5, 11:40:30–11:55:45
  R10 headway dropped: backward JUMP: stop 5, 12:35:30–12:41:15
  R10 headway dropped: forward JUMP: stop 5, 14:01:30–15:12:15
  R10 headway dropped: backward JUMP: stop 5, 17:40:30–17:53:45
  R10 headway dropped: forward JUMP: stop 5, 17:53:45–18:10:15
  R10 headway dropped: backward JUMP: stop 5, 18:10:15–18:17:00
  R10 headway dropped: forward JUMP: stop 5, 18:17:00–18:58:15
  R10 headway dropped: first seen mid-day: stop 6, 08:02:15–08:15:45
  R10 headway dropped: first seen mid-day: stop 6, 08:15:45–08:21:30
  R10 headway dropped: first seen mid-day: stop 6, 08:21:30–08:25:15
  R10 headway dropped: first seen mid-day: stop 6, 08:25:15–08:35:45
  R10 headway dropped: first seen mid-day: stop 6, 08:35:45–08:40:30
  R10 headway dropped: first seen mid-day: stop 6, 08:40:30–08:45:45
  R10 headway dropped: first seen mid-day: stop 6, 08:45:45–08:55:45
  R10 headway dropped: first seen mid-day: stop 6, 08:55:45–09:00:45
  R10 headway dropped: first seen mid-day: stop 6, 09:00:45–09:05:00
  R10 headway dropped: first seen mid-day: stop 6, 09:05:00–09:17:30
  R10 headway dropped: first seen mid-day: stop 6, 09:17:30–09:20:45
  R10 headway dropped: first seen mid-day: stop 6, 09:20:45–09:23:15
  R10 headway dropped: unconfirmed move: stop 6, 09:23:15–09:37:00
  R10 headway dropped: unconfirmed move: stop 6, 09:37:00–10:57:45
  R10 headway dropped: first seen mid-day: stop 6, 10:57:45–11:10:00
  R10 headway dropped: unconfirmed move: stop 6, 11:10:00–11:18:15
  R10 headway dropped: forward JUMP: stop 6, 11:23:30–11:38:00
  R10 headway dropped: forward JUMP: stop 6, 11:42:45–11:57:15
  R10 headway dropped: unconfirmed move: stop 6, 12:30:45–12:37:15
  R10 headway dropped: unconfirmed move: stop 6, 13:43:15–13:58:00
  R10 headway dropped: unconfirmed move: stop 6, 13:58:00–15:10:15
  R10 headway dropped: unconfirmed move: stop 6, 16:17:30–16:23:15
  R10 headway dropped: unconfirmed move: stop 6, 17:23:00–17:37:00
  R10 headway dropped: unconfirmed move: stop 6, 17:37:00–17:54:00
  R10 headway dropped: unconfirmed move: stop 6, 17:54:00–18:18:15
  R10 headway dropped: first seen mid-day: stop 7, 08:03:15–08:08:15
  R10 headway dropped: first seen mid-day: stop 7, 08:08:15–08:17:00
  R10 headway dropped: first seen mid-day: stop 7, 08:17:00–08:22:45
  R10 headway dropped: first seen mid-day: stop 7, 08:22:45–08:26:15
  R10 headway dropped: first seen mid-day: stop 7, 08:26:15–08:37:00
  R10 headway dropped: first seen mid-day: stop 7, 08:37:00–08:42:00
  R10 headway dropped: first seen mid-day: stop 7, 08:42:00–08:47:00
  R10 headway dropped: first seen mid-day: stop 7, 08:47:00–08:56:45
  R10 headway dropped: first seen mid-day: stop 7, 08:56:45–09:02:00
  R10 headway dropped: first seen mid-day: stop 7, 09:02:00–09:06:15
  R10 headway dropped: first seen mid-day: stop 7, 09:06:15–09:18:45
  R10 headway dropped: first seen mid-day: stop 7, 09:18:45–09:21:45
  R10 headway dropped: first seen mid-day: stop 7, 09:21:45–09:24:15
  R10 headway dropped: backward JUMP: stop 7, 09:24:15–09:38:15
  R10 headway dropped: backward JUMP: stop 7, 09:38:15–11:11:30
  R10 headway dropped: backward JUMP: stop 7, 11:11:30–11:19:30
  R10 headway dropped: forward JUMP: stop 7, 11:24:45–11:39:15
  R10 headway dropped: forward JUMP: stop 7, 11:44:15–11:58:45
  R10 headway dropped: unconfirmed move: stop 7, 12:25:15–12:32:15
  R10 headway dropped: backward JUMP: stop 7, 12:32:15–12:39:00
  R10 headway dropped: backward JUMP: stop 7, 13:44:15–13:59:30
  R10 headway dropped: backward JUMP: stop 7, 13:59:30–15:11:45
  R10 headway dropped: backward JUMP: stop 7, 16:18:45–16:24:45
  R10 headway dropped: backward JUMP: stop 7, 17:24:30–17:38:45
  R10 headway dropped: backward JUMP: stop 7, 17:38:45–17:55:00
  R10 headway dropped: backward JUMP: stop 7, 17:55:00–18:20:00
  R10 headway dropped: first seen mid-day: stop 8, 08:03:45–08:08:45
  R10 headway dropped: first seen mid-day: stop 8, 08:08:45–08:17:30
  R10 headway dropped: first seen mid-day: stop 8, 08:17:30–08:23:15
  R10 headway dropped: first seen mid-day: stop 8, 08:23:15–08:26:45
  R10 headway dropped: first seen mid-day: stop 8, 08:26:45–08:37:30
  R10 headway dropped: first seen mid-day: stop 8, 08:37:30–08:42:45
  R10 headway dropped: first seen mid-day: stop 8, 08:42:45–08:47:30
  R10 headway dropped: first seen mid-day: stop 8, 08:47:30–08:57:30
  R10 headway dropped: first seen mid-day: stop 8, 08:57:30–09:02:45
  R10 headway dropped: first seen mid-day: stop 8, 09:02:45–09:06:45
  R10 headway dropped: first seen mid-day: stop 8, 09:06:45–09:19:15
  R10 headway dropped: first seen mid-day: stop 8, 09:19:15–09:22:45
  R10 headway dropped: first seen mid-day: stop 8, 09:22:45–09:25:00
  R10 headway dropped: first seen mid-day: stop 8, 09:25:00–09:39:00
  R10 headway dropped: forward JUMP: stop 8, 09:39:00–11:12:15
  R10 headway dropped: first seen mid-day: stop 8, 11:12:15–11:20:15
  R10 headway dropped: forward JUMP: stop 8, 11:25:30–11:40:15
  R10 headway dropped: forward JUMP: stop 8, 11:44:45–11:59:30
  R10 headway dropped: forward JUMP: stop 8, 14:00:30–15:12:30
  R10 headway dropped: forward JUMP: stop 8, 15:25:45–15:39:00
  R10 headway dropped: forward JUMP: stop 8, 17:55:30–18:21:00
  R10 headway dropped: first seen mid-day: stop 9, 08:05:00–08:10:00
  R10 headway dropped: first seen mid-day: stop 9, 08:10:00–08:18:45
  R10 headway dropped: first seen mid-day: stop 9, 08:18:45–08:24:15
  R10 headway dropped: first seen mid-day: stop 9, 08:24:15–08:27:45
  R10 headway dropped: first seen mid-day: stop 9, 08:27:45–08:38:45
  R10 headway dropped: first seen mid-day: stop 9, 08:38:45–08:43:45
  R10 headway dropped: first seen mid-day: stop 9, 08:43:45–08:48:45
  R10 headway dropped: first seen mid-day: stop 9, 08:48:45–08:58:30
  R10 headway dropped: first seen mid-day: stop 9, 08:58:30–09:04:00
  R10 headway dropped: first seen mid-day: stop 9, 09:04:00–09:08:00
  R10 headway dropped: first seen mid-day: stop 9, 09:08:00–09:20:30
  R10 headway dropped: first seen mid-day: stop 9, 09:20:30–09:23:45
  R10 headway dropped: first seen mid-day: stop 9, 09:23:45–09:25:45
  R10 headway dropped: first seen mid-day: stop 9, 09:25:45–09:40:30
  R10 headway dropped: forward JUMP: stop 9, 09:40:30–11:13:45
  R10 headway dropped: first seen mid-day: stop 9, 11:13:45–11:21:15
  R10 headway dropped: forward JUMP: stop 9, 11:21:15–11:26:45
  R10 headway dropped: forward JUMP: stop 9, 11:26:45–11:41:15
  R10 headway dropped: forward JUMP: stop 9, 11:46:15–12:00:30
  R10 headway dropped: forward JUMP: stop 9, 14:01:30–15:13:45
  R10 headway dropped: forward JUMP: stop 9, 15:27:15–15:40:30
  R10 headway dropped: forward JUMP: stop 9, 17:56:15–18:22:30
  R10 headway dropped: first seen mid-day: stop 10, 08:02:15–08:07:00
  R10 headway dropped: first seen mid-day: stop 10, 08:07:00–08:11:30
  R10 headway dropped: first seen mid-day: stop 10, 08:11:30–08:21:15
  R10 headway dropped: first seen mid-day: stop 10, 08:21:15–08:26:15
  R10 headway dropped: first seen mid-day: stop 10, 08:26:15–08:31:00
  R10 headway dropped: first seen mid-day: stop 10, 08:31:00–08:41:30
  R10 headway dropped: first seen mid-day: stop 10, 08:41:30–08:46:00
  R10 headway dropped: first seen mid-day: stop 10, 08:46:00–08:50:30
  R10 headway dropped: first seen mid-day: stop 10, 08:50:30–09:01:30
  R10 headway dropped: first seen mid-day: stop 10, 09:01:30–09:06:15
  R10 headway dropped: first seen mid-day: stop 10, 09:06:15–09:10:30
  R10 headway dropped: first seen mid-day: stop 10, 09:10:30–09:23:15
  R10 headway dropped: first seen mid-day: stop 10, 09:23:15–09:26:30
  R10 headway dropped: first seen mid-day: stop 10, 09:26:30–09:28:30
  R10 headway dropped: first seen mid-day: stop 10, 09:28:30–09:43:15
  R10 headway dropped: forward JUMP: stop 10, 09:43:15–11:16:30
  R10 headway dropped: forward JUMP: stop 10, 11:28:30–11:43:30
  R10 headway dropped: forward JUMP: stop 10, 11:48:45–12:03:15
  R10 headway dropped: forward JUMP: stop 10, 14:03:15–15:16:15
  R10 headway dropped: forward JUMP: stop 10, 15:49:45–16:02:30
  R10 headway dropped: forward JUMP: stop 10, 16:02:30–16:09:30
  R10 headway dropped: forward JUMP: stop 10, 17:28:30–18:24:45
  R10 headway dropped: first seen mid-day: stop 11, 08:02:45–08:07:30
  R10 headway dropped: first seen mid-day: stop 11, 08:07:30–08:12:00
  R10 headway dropped: first seen mid-day: stop 11, 08:12:00–08:21:45
  R10 headway dropped: first seen mid-day: stop 11, 08:21:45–08:26:45
  R10 headway dropped: first seen mid-day: stop 11, 08:26:45–08:31:45
  R10 headway dropped: first seen mid-day: stop 11, 08:31:45–08:42:00
  R10 headway dropped: first seen mid-day: stop 11, 08:42:00–08:46:30
  R10 headway dropped: first seen mid-day: stop 11, 08:46:30–08:51:00
  R10 headway dropped: first seen mid-day: stop 11, 08:51:00–09:02:00
  R10 headway dropped: first seen mid-day: stop 11, 09:02:00–09:06:45
  R10 headway dropped: first seen mid-day: stop 11, 09:06:45–09:11:15
  R10 headway dropped: first seen mid-day: stop 11, 09:11:15–09:24:00
  R10 headway dropped: first seen mid-day: stop 11, 09:24:00–09:26:45
  R10 headway dropped: first seen mid-day: stop 11, 09:26:45–09:29:00
  R10 headway dropped: first seen mid-day: stop 11, 09:29:00–09:44:15
  R10 headway dropped: forward JUMP: stop 11, 09:44:15–11:17:15
  R10 headway dropped: forward JUMP: stop 11, 11:29:15–11:44:15
  R10 headway dropped: forward JUMP: stop 11, 11:49:30–12:03:45
  R10 headway dropped: forward JUMP: stop 11, 14:04:00–15:17:00
  R10 headway dropped: forward JUMP: stop 11, 15:50:15–16:03:30
  R10 headway dropped: forward JUMP: stop 11, 16:03:30–16:10:00
  R10 headway dropped: forward JUMP: stop 11, 17:29:15–18:25:30
  R10 headway dropped: first seen mid-day: stop 12, 08:03:15–08:08:15
  R10 headway dropped: first seen mid-day: stop 12, 08:08:15–08:12:30
  R10 headway dropped: first seen mid-day: stop 12, 08:12:30–08:22:30
  R10 headway dropped: first seen mid-day: stop 12, 08:22:30–08:27:45
  R10 headway dropped: first seen mid-day: stop 12, 08:27:45–08:32:15
  R10 headway dropped: first seen mid-day: stop 12, 08:32:15–08:43:15
  R10 headway dropped: first seen mid-day: stop 12, 08:43:15–08:47:15
  R10 headway dropped: first seen mid-day: stop 12, 08:47:15–08:52:00
  R10 headway dropped: first seen mid-day: stop 12, 08:52:00–09:03:00
  R10 headway dropped: first seen mid-day: stop 12, 09:03:00–09:07:30
  R10 headway dropped: first seen mid-day: stop 12, 09:07:30–09:11:45
  R10 headway dropped: first seen mid-day: stop 12, 09:11:45–09:25:00
  R10 headway dropped: first seen mid-day: stop 12, 09:25:00–09:27:30
  R10 headway dropped: first seen mid-day: stop 12, 09:27:30–09:29:30
  R10 headway dropped: first seen mid-day: stop 12, 09:29:30–09:45:00
  R10 headway dropped: forward JUMP: stop 12, 09:45:00–11:05:30
  R10 headway dropped: first seen mid-day: stop 12, 11:05:30–11:17:45
  R10 headway dropped: forward JUMP: stop 12, 11:30:00–11:45:18
  R10 headway dropped: forward JUMP: stop 12, 11:50:15–12:04:30
  R10 headway dropped: forward JUMP: stop 12, 12:10:30–12:25:00
  R10 headway dropped: forward JUMP: stop 12, 15:51:00–16:04:00
  R10 headway dropped: backward JUMP: stop 12, 17:30:15–18:26:30
  R10 headway dropped: first seen mid-day: stop 13, 08:04:15–08:09:30
  R10 headway dropped: first seen mid-day: stop 13, 08:09:30–08:13:30
  R10 headway dropped: first seen mid-day: stop 13, 08:13:30–08:23:30
  R10 headway dropped: first seen mid-day: stop 13, 08:23:30–08:29:00
  R10 headway dropped: first seen mid-day: stop 13, 08:29:00–08:33:45
  R10 headway dropped: first seen mid-day: stop 13, 08:33:45–08:44:30
  R10 headway dropped: first seen mid-day: stop 13, 08:44:30–08:48:15
  R10 headway dropped: first seen mid-day: stop 13, 08:48:15–08:53:15
  R10 headway dropped: first seen mid-day: stop 13, 08:53:15–09:04:30
  R10 headway dropped: first seen mid-day: stop 13, 09:04:30–09:09:00
  R10 headway dropped: first seen mid-day: stop 13, 09:09:00–09:13:00
  R10 headway dropped: first seen mid-day: stop 13, 09:13:00–09:26:15
  R10 headway dropped: first seen mid-day: stop 13, 09:26:15–09:30:00
  R10 headway dropped: first seen mid-day: stop 13, 09:30:00–09:31:00
  R10 headway dropped: first seen mid-day: stop 13, 09:31:00–09:46:30
  R10 headway dropped: forward JUMP: stop 13, 09:46:30–11:06:45
  R10 headway dropped: first seen mid-day: stop 13, 11:06:45–11:19:00
  R10 headway dropped: forward JUMP: stop 13, 11:31:00–11:46:30
  R10 headway dropped: forward JUMP: stop 13, 12:12:00–12:26:30
  R10 headway dropped: forward JUMP: stop 13, 15:52:00–16:05:15
  R10 headway dropped: backward JUMP: stop 13, 17:31:30–18:28:00
2026-11-02, not scored: 36 reported
  R11 under 75% of the headway time kept: stop 0, 08-11: kept 0 s, dropped 10790 s
  R11 under 75% of the headway time kept: stop 0, 11-14: kept 7775 s, dropped 3025 s
  R11 under 75% of the headway time kept: stop 0, 17-19: kept 4210 s, dropped 2880 s
  R11 under 75% of the headway time kept: stop 1, 08-11: kept 0 s, dropped 10746 s
  R11 under 75% of the headway time kept: stop 1, 11-14: kept 6930 s, dropped 3870 s
  R11 under 75% of the headway time kept: stop 1, 17-19: kept 4239 s, dropped 2880 s
  R11 under 75% of the headway time kept: stop 2, 08-11: kept 0 s, dropped 10691 s
  R11 under 75% of the headway time kept: stop 2, 11-14: kept 7755 s, dropped 3045 s
  R11 under 75% of the headway time kept: stop 2, 17-19: kept 4744 s, dropped 2400 s
  R11 under 75% of the headway time kept: stop 3, 08-11: kept 0 s, dropped 10621 s
  R11 under 75% of the headway time kept: stop 3, 17-19: kept 4739 s, dropped 2460 s
  R11 under 75% of the headway time kept: stop 4, 08-11: kept 0 s, dropped 10569 s
  R11 under 75% of the headway time kept: stop 4, 11-14: kept 7794 s, dropped 3006 s
  R11 under 75% of the headway time kept: stop 4, 17-19: kept 4785 s, dropped 2415 s
  R11 under 75% of the headway time kept: stop 5, 08-11: kept 0 s, dropped 10599 s
  R11 under 75% of the headway time kept: stop 5, 11-14: kept 7239 s, dropped 3561 s
  R11 under 75% of the headway time kept: stop 6, 08-11: kept 0 s, dropped 10800 s
  R11 under 75% of the headway time kept: stop 6, 11-14: kept 7275 s, dropped 3525 s
  R11 under 75% of the headway time kept: stop 6, 14-17: kept 6955 s, dropped 3845 s
  R11 under 75% of the headway time kept: stop 6, 17-19: kept 4640 s, dropped 1965 s
  R11 under 75% of the headway time kept: stop 7, 08-11: kept 0 s, dropped 10673 s
  R11 under 75% of the headway time kept: stop 7, 11-14: kept 6855 s, dropped 3945 s
  R11 under 75% of the headway time kept: stop 7, 14-17: kept 5333 s, dropped 5467 s
  R11 under 75% of the headway time kept: stop 7, 17-19: kept 4702 s, dropped 1980 s
  R11 under 75% of the headway time kept: stop 8, 08-11: kept 0 s, dropped 10615 s
  R11 under 75% of the headway time kept: stop 8, 17-19: kept 4310 s, dropped 2445 s
  R11 under 75% of the headway time kept: stop 9, 08-11: kept 0 s, dropped 10612 s
  R11 under 75% of the headway time kept: stop 9, 17-19: kept 3098 s, dropped 3630 s
  R11 under 75% of the headway time kept: stop 10, 08-11: kept 0 s, dropped 10800 s
  R11 under 75% of the headway time kept: stop 10, 17-19: kept 3840 s, dropped 3000 s
  R11 under 75% of the headway time kept: stop 11, 08-11: kept 0 s, dropped 10737 s
  R11 under 75% of the headway time kept: stop 11, 17-19: kept 3918 s, dropped 3015 s
  R11 under 75% of the headway time kept: stop 12, 08-11: kept 0 s, dropped 10673 s
  R11 under 75% of the headway time kept: stop 12, 17-19: kept 3982 s, dropped 3000 s
  R11 under 75% of the headway time kept: stop 13, 08-11: kept 0 s, dropped 10657 s
  R11 under 75% of the headway time kept: stop 13, 17-19: kept 4013 s, dropped 3000 s
2026-11-03, not scored: 49 reported
  R11 under 75% of the headway time kept: stop 0, 08-11: kept 0 s, dropped 10520 s
  R11 under 75% of the headway time kept: stop 0, 11-14: kept 7925 s, dropped 2875 s
  R11 under 75% of the headway time kept: stop 1, 08-11: kept 0 s, dropped 10461 s
  R11 under 75% of the headway time kept: stop 1, 11-14: kept 7016 s, dropped 3784 s
  R11 under 75% of the headway time kept: stop 1, 17-19: kept 4134 s, dropped 2520 s
  R11 under 75% of the headway time kept: stop 2, 08-11: kept 0 s, dropped 10391 s
  R11 under 75% of the headway time kept: stop 2, 11-14: kept 7035 s, dropped 3765 s
  R11 under 75% of the headway time kept: stop 2, 17-19: kept 4189 s, dropped 2520 s
  R11 under 75% of the headway time kept: stop 3, 08-11: kept 0 s, dropped 10306 s
  R11 under 75% of the headway time kept: stop 3, 11-14: kept 6615 s, dropped 4185 s
  R11 under 75% of the headway time kept: stop 3, 14-17: kept 4891 s, dropped 5909 s
  R11 under 75% of the headway time kept: stop 3, 17-19: kept 3434 s, dropped 3375 s
  R11 under 75% of the headway time kept: stop 4, 08-11: kept 0 s, dropped 10254 s
  R11 under 75% of the headway time kept: stop 4, 11-14: kept 7830 s, dropped 2970 s
  R11 under 75% of the headway time kept: stop 4, 14-17: kept 5619 s, dropped 5181 s
  R11 under 75% of the headway time kept: stop 4, 17-19: kept 2331 s, dropped 4560 s
  R11 under 75% of the headway time kept: stop 5, 08-11: kept 0 s, dropped 10329 s
  R11 under 75% of the headway time kept: stop 5, 11-14: kept 7740 s, dropped 3060 s
  R11 under 75% of the headway time kept: stop 5, 14-17: kept 6729 s, dropped 4071 s
  R11 under 75% of the headway time kept: stop 5, 17-19: kept 2166 s, dropped 4665 s
  R11 under 75% of the headway time kept: stop 6, 08-11: kept 0 s, dropped 10735 s
  R11 under 75% of the headway time kept: stop 6, 11-14: kept 6570 s, dropped 4230 s
  R11 under 75% of the headway time kept: stop 6, 14-17: kept 6310 s, dropped 4490 s
  R11 under 75% of the headway time kept: stop 6, 17-19: kept 1310 s, dropped 3315 s
  R11 under 75% of the headway time kept: stop 7, 08-11: kept 0 s, dropped 10688 s
  R11 under 75% of the headway time kept: stop 7, 11-14: kept 6120 s, dropped 4680 s
  R11 under 75% of the headway time kept: stop 7, 14-17: kept 6218 s, dropped 4582 s
  R11 under 75% of the headway time kept: stop 7, 17-19: kept 1387 s, dropped 3330 s
  R11 under 75% of the headway time kept: stop 8, 08-11: kept 0 s, dropped 10630 s
  R11 under 75% of the headway time kept: stop 8, 11-14: kept 7845 s, dropped 2955 s
  R11 under 75% of the headway time kept: stop 8, 14-17: kept 5710 s, dropped 5090 s
  R11 under 75% of the headway time kept: stop 8, 17-19: kept 3275 s, dropped 1530 s
  R11 under 75% of the headway time kept: stop 9, 08-11: kept 0 s, dropped 10642 s
  R11 under 75% of the headway time kept: stop 9, 11-14: kept 7560 s, dropped 3240 s
  R11 under 75% of the headway time kept: stop 9, 14-17: kept 5722 s, dropped 5078 s
  R11 under 75% of the headway time kept: stop 9, 17-19: kept 4523 s, dropped 1575 s
  R11 under 75% of the headway time kept: stop 10, 08-11: kept 0 s, dropped 10785 s
  R11 under 75% of the headway time kept: stop 10, 14-17: kept 5235 s, dropped 5565 s
  R11 under 75% of the headway time kept: stop 10, 17-19: kept 1590 s, dropped 3375 s
  R11 under 75% of the headway time kept: stop 11, 08-11: kept 0 s, dropped 10692 s
  R11 under 75% of the headway time kept: stop 11, 11-14: kept 8067 s, dropped 2733 s
  R11 under 75% of the headway time kept: stop 11, 14-17: kept 5235 s, dropped 5565 s
  R11 under 75% of the headway time kept: stop 11, 17-19: kept 1698 s, dropped 3375 s
  R11 under 75% of the headway time kept: stop 12, 08-11: kept 0 s, dropped 10658 s
  R11 under 75% of the headway time kept: stop 12, 11-14: kept 7145 s, dropped 3655 s
  R11 under 75% of the headway time kept: stop 12, 17-19: kept 3112 s, dropped 3375 s
  R11 under 75% of the headway time kept: stop 13, 08-11: kept 0 s, dropped 10627 s
  R11 under 75% of the headway time kept: stop 13, 11-14: kept 7942 s, dropped 2858 s
  R11 under 75% of the headway time kept: stop 13, 17-19: kept 3128 s, dropped 3390 s
```

</details>

### The five rides (2026-11-05)

TaeHyun79 rode route 41946 five times on 11-03, not on 11-02 as [the walking diagnostics](../evidence/06-walking-and-ride-diagnostics.md#the-real-shuttle-rides) planned. All five reached the stop in the 11–14 band, so only that band is compared. The waits are recorded and not compared.

| Ride | Rider     | Date       | Boards at | Alights at | Reached the stop | Boarded  | Alighted | Wait (s) | Ride (s) |
| ---- | --------- | ---------- | --------- | ---------- | ---------------- | -------- | -------- | -------: | -------: |
| r1   | TaeHyun79 | 2026-11-03 | 농생대    | 302동      | 13:43:51         | 13:51:29 | 13:56:36 |      458 |      307 |
| r2   | TaeHyun79 | 2026-11-03 | 302동     | 교수회관   | 13:10:53         | 13:15:02 | 13:19:30 |      249 |      268 |
| r3   | TaeHyun79 | 2026-11-03 | 교수회관  | 경영대     | 13:19:49         | 13:25:21 | 13:29:34 |      332 |      253 |
| r4   | TaeHyun79 | 2026-11-03 | 경영대    | 농생대     | 13:29:40         | 13:37:21 | 13:43:46 |      461 |      385 |
| r5   | TaeHyun79 | 2026-11-03 | 농생대    | 301동      | 13:43:51         | 13:51:29 | 13:58:33 |      458 |      424 |

**The comparison.** The ride, boarding to alighting, against the logged median of its pair in the 11–14 band of the committed `shuttle-timing.json`, and against the fallback, along-loop distance ÷ 4.15 m/s. Every pair has a logged median in that band, so no ride is compared with the fallback only. Positive errors mean the times read longer than the ride.

| Ride | Pair (`loop_order`)        | Ride (s) | Logged median (s) | Logged − ride (s) | Along the loop (m) | Fallback (s) | Fallback − ride (s) |
| ---- | -------------------------- | -------: | ----------------: | ----------------: | -----------------: | -----------: | ------------------: |
| r1   | 농생대 (3) → 302동 (6)     |      307 |               300 |                -7 |              1,510 |        363.9 |               +56.9 |
| r2   | 302동 (6) → 교수회관 (9)   |      268 |               278 |               +10 |                866 |        208.7 |               -59.3 |
| r3   | 교수회관 (9) → 경영대 (13) |      253 |               285 |               +32 |              1,543 |        371.8 |              +118.8 |
| r4   | 경영대 (13) → 농생대 (3)   |      385 |               345 |               -40 |              1,305 |        314.5 |               -70.5 |
| r5   | 농생대 (3) → 301동 (7)     |      424 |               435 |               +11 |              1,800 |        433.7 |                +9.7 |
| MAE  |                            |          |                   |            20.0 s |                    |              |              63.1 s |
