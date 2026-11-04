# 02: Calibrate speed and climb, rebuild the walking table, and adopt or keep it

Parent: [P11 spec](../spec.md) ("The walking table: before, improvement, after", "The walking scorer", "P04's open items")
Status: ready-for-agent
Blocked by: 01

## What to build

The walking scorer gains the calibration fit. It runs once on the 13 calibration walks and gives a speed and a climb value. The builder rebuilds the walking table with them and nothing else. The rebuilt table is scored on the 30 test walks beside the original, under both tolerances. The adoption rule then decides whether it becomes the committed walking table. The results go to P04 ticket 01, as a new entry beside the original result.

The revision file, with the adoption rule and the reading of the fit, is on `3.0/Main` before this ticket starts, since it lands with the spec.

It starts on a new branch from `3.0/Main` after the spec's pull request and ticket 01 have merged.

## Acceptance criteria

- [ ] **The fit**, as the walking diagnostics froze it:
  - seconds = path metres ÷ speed + climb metres × climb seconds per metre, where climb = max(0, destination elevation − origin elevation), with no constant term;
  - by ordinary least squares over all 13 calibration pairs, never the test pairs, with no pair left out;
  - the path metres and climbs are those of the frozen build, either recovered from the frozen table and the seed's elevations or exposed by the builder. Which one is chosen, and the fit's inputs per pair, are recorded with the result.
- [ ] **A climb value below 0** becomes 0, and the speed stays the value of that same fit. It is not fitted again.
- [ ] **Unit tests:** pairs built from a known speed and climb value give them back, and pairs whose fit gives a negative climb value give 0 with that fit's speed.
- [ ] **The fit runs once** on the real data and prints the fitted values unrounded.
- [ ] **The rebuild.** The builder's two constants take the fitted values as used, and the rounding is recorded. Nothing else changes: not the graph, the pins, the elevations or the join rule. k is not applied.
- [ ] The graph's unit tests that state 1.1 m/s and the climb cost follow the constants, by importing them or by new expected values. The test that the table covers every Place and Shuttle Stop stays green.
- [ ] **The after.** Ticket 01's command scores the rebuilt table on the 30 test walks: the MAE, the share within under both tolerances, the verdict under both, and the three diagnostics. The baseline stays the frozen one.
- [ ] **Adoption.** When the rebuilt table's MAE over the 30 is lower than 168.5 s, it replaces the committed walking table, with the new constants. Otherwise the constants and the committed table stay as they were, and the reason is recorded.
- [ ] **P04 ticket 01's `## Comments`** get a dated "The calibration" entry:
  - the fit's inputs and the fitted values, unrounded and as used;
  - the rebuilt table's results beside the original's, under both tolerances, with the three diagnostics;
  - whether it was adopted, and why.
- [ ] **P04 ticket 01's `## Comments`** also get one dated line: the 15 owed route lines are not written, as the PM decided on 2026-11-05.

## Comments
