# 02: Calibrate speed and climb, rebuild the walking table, and adopt or keep it

Parent: [P11 spec](../spec.md) ("The walking table: before, improvement, after", "The walking scorer", "P04's open items")
Status: ready-for-agent
Blocked by: 01

## What to build

The walking scorer gains the calibration fit. It runs once on the 13 calibration walks and gives a speed and a climb value. The builder rebuilds the walking table with them and nothing else. The rebuilt table is scored on the 30 test walks beside the original, under both tolerances. The adoption rule then decides whether it becomes the committed walking table. The results go to P04 ticket 01, as a new entry beside the original result.

The revision file, with the adoption rule and the reading of the fit, is on `3.0/Main` before this ticket starts, since it lands with the spec.

It starts on a new branch from `3.0/Main` after the spec's pull request and ticket 01 have merged.

## Acceptance criteria

- [x] **The fit**, as the walking diagnostics froze it:
  - seconds = path metres ÷ speed + climb metres × climb seconds per metre, where climb = max(0, destination elevation − origin elevation), with no constant term;
  - by ordinary least squares over all 13 calibration pairs, never the test pairs, with no pair left out;
  - the path metres and climbs are those of the frozen build, either recovered from the frozen table and the seed's elevations or exposed by the builder. Which one is chosen, and the fit's inputs per pair, are recorded with the result.
- [x] **A climb value below 0** becomes 0, and the speed stays the value of that same fit. It is not fitted again.
- [x] **Unit tests:** pairs built from a known speed and climb value give them back, and pairs whose fit gives a negative climb value give 0 with that fit's speed.
- [x] **The fit runs once** on the real data and prints the fitted values unrounded.
- [x] **The rebuild.** The builder's two constants take the fitted values as used, and the rounding is recorded. Nothing else changes: not the graph, the pins, the elevations or the join rule. k is not applied.
- [x] The graph's unit tests that state 1.1 m/s and the climb cost follow the constants, by importing them or by new expected values. The test that the table covers every Place and Shuttle Stop stays green.
- [x] **The after.** Ticket 01's command scores the rebuilt table on the 30 test walks: the MAE, the share within under both tolerances, the verdict under both, and the three diagnostics. The baseline stays the frozen one.
- [x] **Adoption.** When the rebuilt table's MAE over the 30 is lower than 168.5 s, it replaces the committed walking table, with the new constants. Otherwise the constants and the committed table stay as they were, and the reason is recorded.
- [x] **P04 ticket 01's `## Comments`** get a dated "The calibration" entry:
  - the fit's inputs and the fitted values, unrounded and as used;
  - the rebuilt table's results beside the original's, under both tolerances, with the three diagnostics;
  - whether it was adopted, and why.
- [x] **P04 ticket 01's `## Comments`** also get one dated line: the 15 owed route lines are not written, as the PM decided on 2026-11-05.

## Comments

### The fit and the rebuild (2026-11-05)

The fit ran once, and the rebuilt table is adopted: its MAE over the 30 test pairs is 70.4 s, below the original's 168.5 s. The inputs, the fitted values, the rounding (none), the result beside the original and the adoption are recorded in [P04 ticket 01's "The calibration"](../../P04-free-time-meals-parties/issues/01-travel-times.md#the-calibration-2026-11-05). The path metres and climbs are recovered from the frozen table and the seed's elevations. `pnpm walking:score` on the adopted table, the walking strand's "after":

```text
Walking table: seed/walking-table.json
Equal to the table at the freeze on 0 of 30 test pairs

30 test pairs                   Table               Baseline
MAE                             70.4 s              124.6 s
Within ±2 minutes               24 / 30 (80.0%)     18 / 30 (60.0%)
Within min(25%, 2 minutes)      16 / 30 (53.3%)     4 / 30 (13.3%)
Late by more than 2 minutes     1 / 30 (3.3%)       1 / 30 (3.3%)
MAE over the 8 pairs            156.6 s             189.5 s

The 8 pairs: 5, 11, 15, 20, 22, 23, 24, 27
Within min(25%, 2 minutes): the table's 1, 2, 4, 5, 8, 10, 12, 13, 15, 17, 19, 21, 22, 25, 28, 30; the baseline's 4, 5, 16, 24
Late: the table's 24; the baseline's 15
k = 0.909

Threshold: at least 70% within, and the MAE below the baseline's
  under ±2 minutes: met
  under min(25%, 2 minutes): missed

Calibration fit over the 13 calibration pairs, by ordinary least squares, no constant term:
  seconds = metres / speed + climb × climb seconds per metre
Metres and climbs recovered from the table's seconds at the freeze, at 1.1 m/s and 3 s per metre of climb:
  Pair    Walked (s)    Metres  Climb (m)
  C1              64     87.12        6.6
  C2             218    273.24        1.2
  C3              95    115.28        6.4
  C4             227    291.06       18.8
  C5             170    191.40        0.0
  C6              83    105.60        0.0
  C7              83    102.30        0.0
  C8              45    145.64        1.2
  C9              91    213.73       14.9
  C10            164    210.87       15.1
  C11            156    210.10        0.0
  C12            169    250.36       21.8
  C13            146    250.80        0.0
Speed: 1.3966856966974264 m/s
Climb: -0.40634283201311705 s per metre, below 0, so 0 with the same speed
```

### Agent usage (2026-11-05)

- **Agent time** (estimate): about 22 minutes: about 11 for the implementing agent, about 5 for the two reviewers, and about 6 of the orchestrating session, with the review's fixes. Time spent waiting for a person is not counted.
- **Tokens** (measured from the agents' transcripts; the orchestrating session's are counted once, under ticket 06):
  - Input: 142 not cached, 10,838,826 cache reads and 367,362 cache writes.
  - Output: 66,907.
