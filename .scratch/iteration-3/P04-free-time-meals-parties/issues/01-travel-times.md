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
- [x] **Person, after the 11-01 freeze.** A person walks the 30 pairs by the committed method. The times, the MAE, the share within ±2 minutes, the baseline's MAE and whether the threshold holds are recorded in this ticket's comments.

## Comments

### Walking evaluation (2026-10-31)

The pairs, the method, the metric, the baseline, the threshold and the fragile Places are frozen in [evidence/01-walking-evaluation.md](../evidence/01-walking-evaluation.md). The Person walk remains.

### Agent usage (2026-10-31)

- **Agent time** (estimate): about 35 minutes in all: about 23 minutes for the implementing subagent, about 7 for its two reviewers, and about 5 for this ticket's share of the session that ran all five tickets. Time spent waiting for a person is not counted.
- **Tokens** (measured from the agents' transcripts, reviewers included; the running session's share is an estimate, a fifth of its total):
  - Input: about 160 not cached, about 12,300,000 cache reads and about 568,000 cache writes.
  - Output: about 163,000.

### The walks (2026-11-02)

TaeHyun79 walked all 30 test pairs by the frozen method, from 23:00 on 11-01 to 02:19 on 11-02 KST. The first walk started after ticket 06's Part 1 (#159) and Part 2 (#160) had landed on `3.0/Main`. The table's and the baseline's seconds are those in [the walking evaluation](../evidence/01-walking-evaluation.md).

**The threshold is missed.** Both conditions fail: 46.7% is below 70%, and the table's MAE is above the baseline's.

|                   |           Table |        Baseline |
| ----------------- | --------------: | --------------: |
| MAE               |         168.5 s |         124.6 s |
| Within ±2 minutes | 14 / 30 (46.7%) | 18 / 30 (60.0%) |

**The diagnostics** of [evidence/06](../evidence/06-walking-and-ride-diagnostics.md), with no threshold:

- **Late risk:** the table 0 / 30, the baseline 1 / 30 (pair 15, by 123 s).
- **Speed factor:** k = 0.663. The 30 walks took 2 h 24 min; the table says 3 h 48 min and the baseline 3 h 21 min.
- **The pairs that tell them apart** (5, 11, 15, 20, 22, 23, 24, 27): the table's MAE is 360.2 s and the baseline's 189.5 s. On the other 22 pairs they are 98.7 s and 101.0 s.

The table reads long on 29 of the 30 pairs; only pair 16 is walked slower, by 15 s. All 16 pairs off by more than 2 minutes are off on the long side, so the table never makes the walker late, and the fail is mostly in speed, which calibration fits. k is not applied to the table.

Where the walks depart from the method:

- **Late presses.** On pairs 8, 13 and 26 the stop was pressed late, by 95, 15 and 30 s by the walker's estimate. Those seconds are taken off. With the raw stopwatch times the threshold is missed as well: the table's MAE 163.8 s and 15 / 30 within, the baseline's 119.9 s and 18 / 30.
- **False starts.** Pair 6 was restarted twice (after 20 and 32 s) and pair 23 once (after 48 s). The times below are the full walks.
- **Dates.** Pairs 6 to 18 were walked late on 11-01, not on 11-02 as ticket 06 planned. That is after the freeze and after #159 and #160, so nothing declared before the walks changes.
- **Route lines.** Of the 16 pairs more than 2 minutes off, only pair 20 has its line on the route taken. The other 15 are owed (`owed` below).

Walker TaeHyun79 on every pair. Positive differences mean the table reads longer than the walk.

| Pair | From                                  | To                                    | Walked (s) | Table (s) | Baseline (s) | Table − walked (s) | Date  | Started | Route                             |
| ---- | ------------------------------------- | ------------------------------------- | ---------: | --------: | -----------: | -----------------: | ----- | ------- | --------------------------------- |
| 1    | 63동 학생회관                         | 56동 자연과학관10                     |        187 |       278 |          266 |                +91 | 11-02 | 01:58   |                                   |
| 2    | 56동 자연과학관10                     | 43-1동 이공계멀티미디어강의동         |        102 |       120 |          180 |                +18 | 11-02 | 02:02   |                                   |
| 3    | 43-1동 이공계멀티미디어강의동         | 38동 글로벌공학교육센터               |        154 |       260 |          284 |               +106 | 11-02 | 02:04   |                                   |
| 4    | 38동 글로벌공학교육센터               | 131동 신소재공동연구소                |        182 |       304 |          215 |               +122 | 11-02 | 02:07   | owed                              |
| 5    | 131동 신소재공동연구소                | 301동 제1공학관                       |        516 |       734 |          503 |               +218 | 11-02 | 02:11   | owed                              |
| 6    | 301동 제1공학관                       | 302동 제2공학관                       |        121 |       279 |          211 |               +158 | 11-01 | 23:00   | owed                              |
| 7    | 302동 제2공학관                       | 301동 제1공학관                       |        115 |       204 |          211 |                +89 | 11-01 | 23:02   |                                   |
| 8    | 301동 제1공학관                       | 104동 반도체공동연구소                |        390 |       588 |          615 |               +198 | 11-01 | 23:05   | owed                              |
| 9    | 104동 반도체공동연구소                | 105동 유전공학연구소                  |         80 |       141 |          136 |                +61 | 11-01 | 23:14   |                                   |
| 10   | 105동 유전공학연구소                  | 65동 교수회관                         |        311 |       479 |          478 |               +168 | 11-01 | 23:16   | owed                              |
| 11   | 65동 교수회관                         | 76동 제4식당(서당골)                  |        330 |       849 |          450 |               +519 | 11-01 | 23:22   | owed                              |
| 12   | 76동 제4식당(서당골)                  | 902동 (관악사)대학원 생활관           |        158 |       215 |          238 |                +57 | 11-01 | 23:28   |                                   |
| 13   | 902동 (관악사)대학원 생활관           | 919동 (관악사)학부 생활관             |        205 |       242 |          283 |                +37 | 11-01 | 23:31   |                                   |
| 14   | 919동 (관악사)학부 생활관             | 920동 관악사후생관                    |         58 |       119 |          166 |                +61 | 11-01 | 23:35   |                                   |
| 15   | 920동 관악사후생관                    | 140동 국제대학원                      |        582 |       815 |          459 |               +233 | 11-01 | 23:36   | owed                              |
| 16   | 140동 국제대학원                      | 222동 생활과학대학                    |        224 |       209 |          218 |                -15 | 11-01 | 23:47   |                                   |
| 17   | 222동 생활과학대학                    | 70동 박물관                           |         97 |       133 |          137 |                +36 | 11-01 | 23:51   |                                   |
| 18   | 70동 박물관                           | 83동 인문사회계멀티미디어강의동       |        109 |       288 |          203 |               +179 | 11-01 | 23:54   | owed                              |
| 19   | 83동 인문사회계멀티미디어강의동       | 15동 법학관1                          |        119 |       166 |          189 |                +47 | 11-02 | 00:03   |                                   |
| 20   | 15동 법학관1                          | 3동 인문관3                           |        194 |       450 |          317 |               +256 | 11-02 | 00:06   | 자하연이랑 농협은행 사이 가로지름 |
| 21   | 3동 인문관3                           | 63동 학생회관                         |        221 |       327 |          387 |               +106 | 11-02 | 00:09   |                                   |
| 22   | 63동 학생회관                         | 302동 제2공학관                       |       1074 |      1652 |         1338 |               +578 | 11-02 | 00:17   | owed                              |
| 23   | 302동 제2공학관                       | 919동 (관악사)학부 생활관             |       1149 |      1693 |         1872 |               +544 | 11-02 | 00:57   | owed                              |
| 24   | 919동 (관악사)학부 생활관             | 서울대 정문                           |       1140 |      1294 |         1120 |               +154 | 11-02 | 01:16   | owed                              |
| 25   | 서울대 정문                           | 58동 SK경영관                         |        264 |       419 |          410 |               +155 | 11-02 | 01:38   | owed                              |
| 26   | 58동 SK경영관                         | 59동 LG경영관(경영연구관및산학협동관) |        103 |       298 |          179 |               +195 | 11-02 | 01:43   | owed                              |
| 27   | 59동 LG경영관(경영연구관및산학협동관) | 16동 사회과학관                       |        186 |       566 |          316 |               +380 | 11-02 | 01:46   | owed                              |
| 28   | 16동 사회과학관                       | 73동 문화관                           |        151 |       235 |          290 |                +84 | 11-02 | 01:50   |                                   |
| 29   | 73동 문화관                           | 60동 행정관                           |         77 |       226 |          247 |               +149 | 11-02 | 01:54   | owed                              |
| 30   | 60동 행정관                           | 63동 학생회관                         |         70 |       110 |          164 |                +40 | 11-02 | 01:55   |                                   |

### The calibration walks (2026-11-02)

Both conditions of [evidence/06's calibration](../evidence/06-walking-and-ride-diagnostics.md#calibration) hold: the threshold is missed and k is outside 0.9–1.1. So TaeHyun79 walked all 13 calibration pairs by the same method on 11-02, from 17:22 to 19:25 KST, with no late press and no false start. The test pairs were walked at night and these in the early evening.

The two pairs more than 2 minutes off, C9 and C12, have their route lines. C12's line names C11, but the pair that walks C12's road the other way is C13.

| Pair | From                            | To                          | Walked (s) | Table (s) | Baseline (s) | Table − walked (s) | Started | Route         |
| ---- | ------------------------------- | --------------------------- | ---------: | --------: | -----------: | -----------------: | ------- | ------------- |
| C1   | 7동 인문관6                     | 12동 사범교육협력센터       |         64 |        99 |          138 |                +35 | 18:54   |               |
| C2   | 24동 자연과학관6                | 200동 농업생명과학대학      |        218 |       252 |          295 |                +34 | 18:13   |               |
| C3   | 75동 복지관                     | 32동 공학관3                |         95 |       124 |          162 |                +29 | 18:21   |               |
| C4   | 30-2동 공대간이식당             | 44-1동 신양학술정보관       |        227 |       321 |          334 |                +94 | 18:25   |               |
| C5   | 139동 공동기기원                | 142동 약학관5               |        170 |       174 |          201 |                 +4 | 18:36   |               |
| C6   | 100동 버들골 풍산마당           | 111동 사범대학 간이식당     |         83 |        96 |          145 |                +13 | 18:58   |               |
| C7   | 82동 환경대학원                 | 74동 예술복합연구동         |         83 |        93 |          162 |                +10 | 19:15   |               |
| C8   | 903동 (관악사)대학원 생활관     | 905동 (관악사)대학원 생활관 |         45 |       136 |          145 |                +91 | 19:06   |               |
| C9   | 153동 우정원 글로벌사회공헌센터 | 57동 행정대학원             |         91 |       239 |          192 |               +148 | 19:23   | 주차장 안으로 |
| C10  | 313동 정밀기계공동연구소        | 300동 유회진 학술정보관     |        164 |       237 |          133 |                +73 | 17:26   |               |
| C11  | 300동 유회진 학술정보관         | 313동 정밀기계공동연구소    |        156 |       191 |          133 |                +35 | 17:22   |               |
| C12  | 22동 자연과학관4                | 20동 약학관3                |        169 |       293 |          263 |               +124 | 18:47   | C11이랑 동일  |
| C13  | 20동 약학관3                    | 22동 자연과학관4            |        146 |       228 |          263 |                +82 | 18:44   |               |

The fit has not run yet: speed and the climb value by ordinary least squares over these 13 pairs, then the rebuilt table scored on the same 30 walked times as a new entry. Both go here when they do.
