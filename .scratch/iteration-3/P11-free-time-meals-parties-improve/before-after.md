# P11: before and after

The three strands of [P11](spec.md), each measured by P04's frozen evaluation before and after its improvement. Every number links to where it is recorded. The walks were made on 11-01 and 11-02 and the rides on 11-03; every score and run here is of 2026-11-05.

## The walking table

Before is the frozen table (1.1 m/s, 3 s per metre of climb); after is the table rebuilt with speed and climb fitted to the 13 calibration walks (1.3966856966974264 m/s; the fitted climb value, −0.406 s per metre, became 0). Both are scored on the same 30 test walks against the frozen straight-line baseline. Recorded in [P04 ticket 01, "The calibration"](../P04-free-time-meals-parties/issues/01-travel-times.md#the-calibration-2026-11-05), beside the [11-02 result](../P04-free-time-meals-parties/issues/01-travel-times.md#the-walks-2026-11-02).

| 30 test pairs                                               | Before                   | After                      | Baseline                   |
| ----------------------------------------------------------- | ------------------------ | -------------------------- | -------------------------- |
| MAE                                                         | 168.5 s                  | 70.4 s                     | 124.6 s                    |
| Within ±2 minutes                                           | 14 / 30 (46.7%)          | 24 / 30 (80.0%)            | 18 / 30 (60.0%)            |
| Within min(25%, 2 minutes), the threshold from 11-05        | 3 / 30 (10.0%)           | 16 / 30 (53.3%)            | 4 / 30 (13.3%)             |
| Threshold under ±2 minutes (≥ 70% and MAE below baseline's) | Missed                   | Met                        |                            |
| Threshold under min(25%, 2 minutes)                         | Missed                   | Missed                     |                            |
| Late risk (walked − predicted > 120 s)                      | 0 / 30                   | 1 / 30 (pair 24, by 121 s) | 1 / 30 (pair 15, by 123 s) |
| k = Σ(walked × table) / Σ(table²)                           | 0.663                    | 0.909                      |                            |
| MAE over pairs 5, 11, 15, 20, 22, 23, 24, 27                | 360.2 s (exactly 360.25) | 156.6 s                    | 189.5 s                    |
| Adopted as `seed/walking-table.json`                        |                          | Yes: 70.4 s < 168.5 s      |                            |

The revision of the tolerance is [declared here](evidence/01-walking-criterion-revision.md), dated 2026-11-05, before the fit.

## The shuttle

Before is the fallback: a wait of 3.5 minutes from 08:00 to 19:00 and 10 minutes from 19:00 to 21:00, and a ride of along-loop distance ÷ 4.15 m/s. After is `seed/shuttle-timing.json`, derived from the Dev log of 11-02 and 11-03. Recorded in [P04 ticket 02](../P04-free-time-meals-parties/issues/02-shuttle-log.md#the-days-the-derived-times-and-the-score-2026-11-05).

| Leave-one-day-out score, 2 folds        | Fallback (baseline) | Derived times                      |
| --------------------------------------- | ------------------- | ---------------------------------- |
| Ride MAE, 19,339 held-out rides         | 55.7 s              | 30.8 s                             |
| Ride within ±1 minute                   | 59.8%               | 88.3%                              |
| Wait MAE, 27 stop-bands of 08–19        | 272.2 s             | 347.0 s                            |
| Threshold (each MAE below its baseline) |                     | Does not hold: the wait's is above |

The [five real rides](../P04-free-time-meals-parties/issues/02-shuttle-log.md#the-five-rides-2026-11-05) of 11-03, all in the 11–14 band, each with a logged median:

| Five rides, boarding to alighting | Against the fallback | Against the logged medians |
| --------------------------------- | -------------------- | -------------------------- |
| MAE                               | 63.1 s               | 20.0 s                     |

## The chat

Measured on `3.0/P11-04-chat`, cut from X = `74d5a0e8`. Before is X's code; after is the branch's final code, which keeps change 1 only: changes 2 to 4 made the P4 suite worse and were reverted. Recorded in [`record.md`](../../../main-server/eval/p4/record.md): [the before set](../../../main-server/eval/p4/record.md#the-before-set-at-x), [the changes](../../../main-server/eval/p4/record.md#the-changes) and [the after set](../../../main-server/eval/p4/record.md#the-after-set-at-the-branchs-final-code).

| The P4 suite, mean of 3 runs  | Wanted | Before      | After       |
| ----------------------------- | ------ | ----------- | ----------- |
| Overall                       | ≥ 80%  | 70.8%, fail | 76.7%, fail |
| 공강 파티 (free-time-parties) | ≥ 70%  | 60.0%, fail | 57.8%, fail |
| 공강에 밥 (free-time-meals)   | ≥ 70%  | 75.6%, pass | 91.1%, pass |
| 공통 (free-time-common)       | ≥ 70%  | 80.0%, pass | 83.3%, pass |
| Layer: Action                 |        | 98.3%       | 98.3%       |
| Layer: Tools                  |        | 89.2%       | 93.3%       |
| Layer: Arguments              |        | 91.9%       | 96.4%       |
| Layer: Cards and map buttons  |        | 87.7%       | 93.9%       |
| Layer: Proposal               |        | 100.0%      | 100.0%      |
| Layer: Words                  |        | 72.1%       | 78.4%       |

Change 1's own run, on the same code as the after set, gave 80.0% with all four thresholds met. Over the five runs of the 40 cases, the pass rate moved between 67.5% and 80.0%.

| The holdout, 12 reworded cases | Holdout, before | Same 12 fixed-set cases, before | Holdout, after | Same 12 fixed-set cases, after |
| ------------------------------ | --------------- | ------------------------------- | -------------- | ------------------------------ |
| Overall                        | 23/36 (63.9%)   | 25/36 (69.4%)                   | Not run yet    | 26/36 (72.2%)                  |
| 공강 파티                      | 4/12            | 6/12                            |                | 5/12                           |
| 공강에 밥                      | 9/12            | 9/12                            |                | 10/12                          |
| 공통                           | 10/12           | 10/12                           |                | 11/12                          |
| Layer: Action                  | 36/36           | 35/36                           |                | 35/36                          |
| Layer: Tools                   | 35/36           | 35/36                           |                | 35/36                          |
| Layer: Arguments               | 35/36           | 35/36                           |                | 36/36                          |
| Layer: Cards and map buttons   | 30/33           | 31/33                           |                | 32/33                          |
| Layer: Proposal                | 3/3             | 3/3                             |                | 3/3                            |
| Layer: Words                   | 22/33           | 22/33                           |                | 23/33                          |

Recorded under "The holdout" of the before set and of [the after set](../../../main-server/eval/p4/record.md#the-after-set-at-the-branchs-final-code) in `record.md`. The after set's holdout run would take P11's runs over the USD 10 the PM approved, so it waits for the PM.

| The regression, P19 against R0 (`28c0ce1`, 1,000 output tokens) | After                                                                                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verdict by the frozen rule                                      | [Fail, with six cases](../../../main-server/eval/p4/record.md#the-regression)                                                                                                             |
| Newly failing because of P11's code                             | None: each of the six also fails in at least 2 of X's 3 runs                                                                                                                              |
| P04's own regressions                                           | `follow-up-yes-after-menus` still fails 3 of 3, change 1 having not fixed it; `follow-up-seven-oclock` still newly fails, on the words alone; `compound-menus-and-shuttle` no longer does |
| From other tasks between R0 and X                               | `ask-missing-fields-in-one-question`, `ask-which-festival-event`, `global-events-tonight-talk`, `making-parties-for-event`                                                                |

| [Cost of P11's runs](../../../main-server/eval/p4/record.md#the-after-set-at-the-branchs-final-code), by the scorecards | USD        |
| ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| The before set                                                                                                          | 2.9966     |
| The four changes' runs                                                                                                  | 4.1801     |
| The after set, without its holdout                                                                                      | 2.6815     |
| **All**                                                                                                                 | **9.8582** |

A start of the before set's second P19 run was stopped after about 30 s and is in no scorecard.
