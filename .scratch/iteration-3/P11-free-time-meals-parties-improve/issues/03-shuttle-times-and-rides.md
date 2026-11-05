# 03: The shuttle's times from the two logged days, and the five rides

Parent: [P11 spec](../spec.md) ("The shuttle: before, improvement, after", "P04's open items")
Status: ready-for-agent
Blocked by: none

## What to build

The two logged days become the shuttle metric's fixed data, `shuttle-timing.json` is derived from them, and the Travel Time of a shuttle trip uses observed waits and rides instead of the fallback. The frozen leave-one-day-out metric scores the derived times against the fallback, and the five real rides are compared with the logged medians and the fallback. The results go to P04 ticket 02, and P04's open shuttle items close.

No code changes. The fallback is the "before" and the derived file the "after".

It starts on a new branch from `3.0/Main` after the spec's pull request has merged.

## Acceptance criteria

- [x] **The days.** The day CSVs and set logs of 11-02 and 11-03, from the PM's copy fetched on 11-03 (checksums matched, no set gap over 30 s), are gzipped and committed as the shuttle metric's fixed data.
- [x] **The derived file.** `pnpm shuttle:derive` on both days writes `shuttle-timing.json`, which is committed whatever the score. It reaches Production with the next regular Release.
- [x] **The score.** `pnpm shuttle:score` runs the frozen leave-one-day-out metric over the 2 days. P04 ticket 02's `## Comments` get:
  - the ride MAE and its baseline, and the wait MAE and its baseline;
  - the shares within ±1 minute;
  - whether the threshold holds: each MAE below its baseline;
  - every item the cleaning rules dropped, with its reason.
- [x] Ticket 02's Comments say that 11-03's log ends at 19:03, when the collector was stopped, so the 19–21 band comes from 11-02 only.
- [x] **The five rides**, as the spec's table gives them, are compared by the walking diagnostics' rule:
  - the ride, boarding to alighting, against the logged median of that pair in the 11–14 band and against the fallback (along-loop distance ÷ 4.15 m/s), as an error per ride and an MAE;
  - a pair with no logged median in that band is compared with the fallback only, and the record says so;
  - the waits are recorded and not compared.
- [x] Ticket 02's Comments get the rides (rider, date, stops, the time of reaching the stop, boarding and alighting) and the comparison, and state that the rides were on 11-03, not on 11-02 as planned.
- [x] **P04 ticket 02's open boxes** are ticked:
  - the collector: installed on 2026-11-01 at 22:30 KST and checked by hand in service hours on 11-02;
  - fetching and gzipping: fetched on 11-03 at 19:03 and gzipped here;
  - the committed days, the derived file and the score.
- [x] **P04 ticket 06's "Person: the rides"** is ticked: ridden on 11-03 and recorded in ticket 02.
- [x] The existing shuttle and travel tests stay green.

## Comments

The results are recorded in [P04 ticket 02's `## Comments`](../../P04-free-time-meals-parties/issues/02-shuttle-log.md#the-days-the-derived-times-and-the-score-2026-11-05).

Later on 2026-11-05 the PM accepted Jaehyun0320's two suggestions in the review of #201, in place of committing the derived file whatever its score: `seed/shuttle-timing.json` holds no wait until a third logged day agrees, and a ride only for a pair and band logged on at least two days. The score is unchanged. See ["What the app is given"](../../P04-free-time-meals-parties/issues/02-shuttle-log.md#what-the-app-is-given-2026-11-05).

### Agent usage (2026-11-05)

- **Agent time** (estimate): about 21 minutes: about 13 for the implementing agent, about 4 for the reviewer, and about 4 of the orchestrating session. Time spent waiting for a person is not counted.
- **Tokens** (measured from the agents' transcripts; the orchestrating session's are counted once, under ticket 06):
  - Input: 212 not cached, 11,357,250 cache reads and 267,132 cache writes.
  - Output: 71,225.
