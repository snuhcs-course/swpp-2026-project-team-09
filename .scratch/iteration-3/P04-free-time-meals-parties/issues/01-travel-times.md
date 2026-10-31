# 01: Travel Times between Places, on foot and by shuttle

Parent: [P04 spec](../spec.md) ("Travel Time (ADR 0010)", "Evaluation plan" 2)
Status: ready-for-human
Blocked by: None

## What to build

One function, `travel`, says how long the way from one Place to another takes at a given departure time, and whether that is on foot or by the circular shuttle. Both scenarios use it. Nothing in the chat calls it yet: ticket 04 does.

Walking comes from an offline table computed on OpenStreetMap's paths with elevation, so that a building behind a hill is not "2 minutes away". The shuttle works from day one on the notice's values, and on logged values once ticket 02 has produced `shuttle-timing.json`.

The walking pairs are frozen here at 11-01, before any walk, each with the table's and the baseline's seconds. The ADR and the attribution of the new data land with the table. The app changes only in JavaScript.

An item marked **Person** is a person's work, not an agent's.

## Acceptance criteria

- [x] **The table.** One offline TypeScript command in the main server writes a seed file of seconds for every directed pair: Place → Place, 230 × 230, and Place ↔ Shuttle Stop, 230 × 14 each way. The server loads the file at start and only looks values up.
- [x] **The graph.**
  - Its ways are every highway a pedestrian can use: footway, path, steps, pedestrian, living_street, service, residential, unclassified, tertiary, secondary and track.
  - Motorway, trunk and `foot=no` are excluded. `access=private` is excluded unless `foot=yes`.
  - The OpenStreetMap extract is a pinned Overpass export with its timestamp, committed so that the table can be rebuilt. The PM's export of 2026-10-28T08:30Z can be used.
- [x] **Joining a point to the graph.** Each Place point and each Shuttle Stop joins its nearest path and every other path within that distance + 20 m. A join is only to the graph's main connected component, and never to a way tagged `sac_scale`. The walk from the point to the path costs its straight-line length.
- [x] **Speed and climb.**
  - Speed is 1.1 m/s.
  - Climbing adds 0.5 minutes per 10 m, only when the destination is higher. Going down adds nothing, and steps are not modelled apart.
  - Each Place and Shuttle Stop has one elevation, read once from SRTM 30 m and stored in the seed. The PM's saved SRTM values can be used.
  - Speed and climb are not calibrated before 11-01.
- [x] **Sensitivity mode.** The builder can move every pin 10 m and 20 m in random directions, 10 runs each, rebuild and compare. It prints the mean change and the Places that move most, which is the fragile-Place list.
- [x] **Licence and Kakao.** The table file carries the ODbL notice the other OpenStreetMap seed files carry. Kakao's walking route stays only for drawing routes: it never feeds the table, and nothing is compared with it.
- [x] **`travel`.** It takes a from Place, a to Place and a departure time, and returns seconds and a mode, walk or shuttle. Minutes are shown whole and rounded up. It sits behind an injectable provider, so that ticket 04 can bind the frozen travel fixture to it.
- [x] **Shuttle travel.**
  - Only the circular route 41946 (anticlockwise) is used. The clockwise 41914 has no stop data.
  - Shuttle travel = walk to a boarding stop + average wait at that stop + ride to an alighting stop ahead on the loop (1 to 13 stops) + walk from that stop. The best pair of stops wins.
  - The wait and the ride use the band of the time the User reaches the stop. Bands are 08–11, 11–14, 14–17, 17–19 and 19–21.
  - The shuttle is offered only when the User reaches the boarding stop on a weekday between 08:00 and 21:00.
  - It is chosen when it is at least 3 minutes faster than walking. Otherwise the walk is shown.
- [x] **Shuttle values.**
  - A committed `shuttle-timing.json` gives, per stop and band, the average wait, and per pair of stops and band, the median ride. Its shape is the one `pnpm shuttle:derive` writes (ticket 02). Whichever ticket lands second takes the first's shape.
  - Until the file exists, and for any stop-band or pair-band it lacks, the fallback applies: wait 3.5 minutes from 08:00 to 19:00 and 10 minutes from 19:00 to 21:00, and ride = along-loop distance ÷ 4.15 m/s.
  - The fallback has one definition, which ticket 02's score also uses.
- [x] **Constants.** The one constants table of the judgement starts here, with the 3 minutes of shuttle advantage. Tickets 04 and 05 add the other numbers.
- [x] **The walking evaluation, committed by the 11-01 freeze, before any walk.**
  - 30 test pairs, each with the table's seconds and the baseline's seconds at the freeze.
  - Most are walks of 15 minutes or less. They include the engineering hill (301동, 302동) and 관악사, plus a few longer pairs. Where coverage allows, they are arranged as chains, each pair's destination the next pair's origin. Shuttle legs are not walked.
  - Calibration pairs, for later, are chosen apart from the test pairs.
  - The walking method: a stopwatch, recording only the time, the walker, the date and the time of day. A pair more than 2 minutes off gets one line on the route taken.
  - The metric: per pair, |table − walked|, summarised as the MAE and the share within ±2 minutes.
  - The baseline: (straight-line distance × 1.2 + 60 m) at 1.1 m/s, on the same pairs.
  - The threshold: at least 70% within ±2 minutes, and the table's MAE below the baseline's.
- [x] **ADR 0010** records Travel Time: the OpenStreetMap pedestrian graph and the join rule, SRTM elevation, shuttle times derived from a few days of Dev logging and why positions are collected there and not in a Production table, that Kakao is not used for the table, and ODbL.
- [x] **Attribution.**
  - The README's OpenStreetMap row adds "도보 시간", and an SRTM row is added.
  - The 지도 데이터 출처 screen's OpenStreetMap card adds "도보 시간", and a card for SRTM elevation is added.
- [x] **Tests.**
  - Unit tests of the builder on small hand-made graphs: the join rule (nearest + 20 m, main component only, no `sac_scale`), and the climb cost going up and none going down.
  - A test checks that the committed table covers every seeded Place and Shuttle Stop.
  - The shuttle's choice is tested in ticket 04, at the assistant endpoint, where the spec's Testing Decisions place it.
- [ ] **Person, after the 11-01 freeze.** A person walks the 30 pairs by the committed method. The times, the MAE, the share within ±2 minutes, the baseline's MAE and whether the threshold holds are recorded in this ticket's comments.

## Comments

### Walking evaluation (2026-10-31)

The pairs, the method, the metric, the baseline, the threshold and the fragile Places are frozen in [evidence/01-walking-evaluation.md](../evidence/01-walking-evaluation.md). The Person walk remains.

### Agent usage (2026-10-31)

- **Agent time** (estimate): about 35 minutes in all: about 23 minutes for the implementing subagent, about 7 for its two reviewers, and about 5 for this ticket's share of the session that ran all five tickets. Time spent waiting for a person is not counted.
- **Tokens** (measured from the agents' transcripts, reviewers included; the running session's share is an estimate, a fifth of its total):
  - Input: about 160 not cached, about 12,300,000 cache reads and about 568,000 cache writes.
  - Output: about 163,000.
