# The walking criterion, revised on 2026-11-05

Task: [P11](../spec.md). This file lands on `3.0/Main` with the spec, before any calibration fit runs. [The walking evaluation](../../P04-free-time-meals-parties/evidence/01-walking-evaluation.md) and [the walking diagnostics](../../P04-free-time-meals-parties/evidence/06-walking-and-ride-diagnostics.md) are not changed.

## What stays

- The 30 test pairs, the walking method, the metric (per pair, |table − walked|, summarised as the MAE and a share within), the baseline, and the threshold's form: at least 70% of the pairs within, and the table's MAE below the baseline's.
- The walked times are those recorded in P04 ticket 01's `## Comments`, with the late presses taken off.
- The result of 11-02 under the original ±2 minutes stays as recorded there: the table's MAE 168.5 s with 14 of 30 within, the baseline's 124.6 s with 18 of 30, and the threshold missed. It is reported beside every result below.
- The rule that a pair more than 2 minutes off gets one line on the route taken.

## The revision

- **Within**, per pair: |table − walked| ≤ min(0.25 × walked, 120 s). The walked time is the reference. A difference equal to the limit counts as within.
- **The threshold** from this date: at least 70% of the 30 pairs within this tolerance, and the table's MAE below the baseline's.
- The original ±2 minutes is still computed and reported beside it, for every table scored on the 30 walks.

## Why

±2 minutes is the same allowance for every walk, and on this campus most walks are short.

- 22 of the 30 walks took under 300 s, where ±120 s allows an error of 40% or more. Pair 14 was walked in 58 s and the table says 119 s; pair 30 in 70 s against 110 s. Both count as within ±2 minutes.
- 25 of the 30 took under 480 s, where 25% of the walk is the smaller limit. From 8 minutes on, the limit stays at 2 minutes.

So a table could meet 70% within ±2 minutes while doubling every short walk, and the share would not show which of two tables is closer.

## What was known when revising

This revision comes after the 11-02 result. Under the revised tolerance, the original table has 3 of 30 pairs within (pairs 2, 13 and 16) and the baseline 4 of 30 (pairs 4, 5, 16 and 24). The MAEs do not change. When this file was committed, no calibrated table had been built or scored under either tolerance.

## The calibration fit, as read here

[The walking diagnostics](../../P04-free-time-meals-parties/evidence/06-walking-and-ride-diagnostics.md#calibration) set the fit: speed and the climb value by ordinary least squares over all 13 calibration pairs, once, with nothing else changed. Its "a climb value below 0 becomes 0" is read literally: the speed stays the value of that same fit and is not fitted again.

## Adopting the calibrated table

The calibrated table replaces the committed walking table only when its MAE over the 30 test pairs is lower than the original table's 168.5 s, whether or not either threshold is met. Otherwise the original table stays, and ticket 01 records why. The calibrated table's result is recorded either way.
