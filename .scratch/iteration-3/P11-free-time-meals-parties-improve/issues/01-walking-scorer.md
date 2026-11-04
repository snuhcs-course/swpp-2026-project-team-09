# 01: A walking scorer, and the walked times as data

Parent: [P11 spec](../spec.md) ("The walking scorer", "The walking criterion's revision")
Status: ready-for-agent
Blocked by: none

## What to build

One command, beside the walking-table builder, that scores a walking table against the 30 test walks under both tolerances. It reads committed data, calls no model and needs no network. The walked times of the 30 test pairs and the 13 calibration pairs become a data file in the repository, so that no number depends on a web page.

Run on the committed walking table, it gives the walking strand's "before": the 11-02 result under ±2 minutes, and the revision file's numbers under the revised tolerance.

This ticket adds no fit. Ticket 02 adds it.

It starts on a new branch from `3.0/Main` after the spec's pull request has merged.

## Acceptance criteria

- [x] **The walked times are data.** The 30 test pairs and the 13 calibration pairs as recorded in P04 ticket 01's `## Comments`, each with the walker, the date, the start time, the walked seconds with the late presses taken off, and the seconds taken off (pairs 8, 13 and 26: 95, 15 and 30 s).
- [x] **The frozen pairs are data.** Each test pair with its table and baseline seconds at the freeze, as the walking evaluation lists them.
- [x] **The command**, given a walking table (the committed one unless another is named), prints for the 30 test pairs, for the table and beside it for the baseline:
  - the MAE;
  - the share within ±2 minutes, and within min(0.25 × walked, 120 s), where a difference equal to the limit counts as within;
  - the threshold's verdict under each tolerance: at least 70% within, and the table's MAE below the baseline's;
  - late risk: the share of pairs where walked − predicted is more than 120 s;
  - k = Σ(walked × table) / Σ(table²);
  - the MAE over pairs 5, 11, 15, 20, 22, 23, 24 and 27.
- [x] **It reproduces the recorded numbers** on the committed walking table, whose test-pair seconds equal those at the freeze:
  - under ±2 minutes: the table's MAE 168.5 s with 14 of 30 within, the baseline's 124.6 s with 18 of 30, and the threshold missed;
  - late risk 0 of 30 for the table and 1 of 30 for the baseline; k = 0.663; over the 8 pairs, 360.2 s and 189.5 s;
  - under the revised tolerance: 3 of 30 for the table (pairs 2, 13, 16) and 4 of 30 for the baseline (pairs 4, 5, 16, 24).
- [x] **Unit tests** on hand-made numbers:
  - the revised tolerance at, just inside and just outside its limit, for a short walk where 25% is the limit and a long one where 120 s is;
  - ±2 minutes;
  - both verdicts;
  - late risk, k and the 8 pairs' MAE.
- [x] The tests are unit tests by [ADR 0007](../../../../docs/adr/0007-test-levels-by-what-a-test-starts.md).
- [x] The main server's README lists the command beside `pnpm walking:build`.

## Comments

### The walking scorer (2026-11-05)

`pnpm walking:score` (`scripts/walking-score.ts`) scores a walking table, the committed one unless another is named, against the 30 test walks. It reads the frozen pairs from `main-server/eval/walking/pairs.json` and the walked times from `main-server/eval/walking/walks.json`, both with the 13 calibration pairs as well. On the committed table, the walking strand's "before":

```text
Walking table: seed/walking-table.json
Equal to the table at the freeze on 30 of 30 test pairs

30 test pairs                   Table               Baseline
MAE                             168.5 s             124.6 s
Within ±2 minutes               14 / 30 (46.7%)     18 / 30 (60.0%)
Within min(25%, 2 minutes)      3 / 30 (10.0%)      4 / 30 (13.3%)
Late by more than 2 minutes     0 / 30 (0.0%)       1 / 30 (3.3%)
MAE over the 8 pairs            360.3 s             189.5 s

The 8 pairs: 5, 11, 15, 20, 22, 23, 24, 27
Within min(25%, 2 minutes): the table's 2, 13, 16; the baseline's 4, 5, 16, 24
Late: the table's none; the baseline's 15
k = 0.663

Threshold: at least 70% within, and the MAE below the baseline's
  under ±2 minutes: missed
  under min(25%, 2 minutes): missed
```

The 8 pairs' table MAE is exactly 360.25 s (2,882 / 8), which the command prints as 360.3 and the 11-02 record gives as 360.2, rounded half to even; every other recorded number is printed as recorded.
