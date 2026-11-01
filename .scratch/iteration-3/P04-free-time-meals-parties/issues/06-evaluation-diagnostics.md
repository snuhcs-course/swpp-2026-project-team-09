# 06: What the evaluation shows beyond its thresholds

Parent: [P04 spec](../spec.md) ("Evaluation plan")
Status: ready-for-human
Blocked by: None

## What to build

The frozen evaluation says whether P04 passes. It cannot yet say whether an improvement is real, because:

- P11 would tune the prompt on the same 40 cases it is scored on;
- a run can fail on the reply's words while its tools and cards are right, as the one smoke run did;
- on 22 of the 30 walking pairs the table and the straight-line baseline already agree within 2 minutes, so meeting 21 of 30 does not show the table is the better one;
- the shuttle metric compares logged days with each other, and no real ride is timed.

This ticket adds what closes those gaps. It does not change the evaluation: the 40 cases, the rules, the labels, the world, the fixture, the thresholds and the walking evaluation stay as they are at `d0cb28d`. Everything added is a diagnostic with no pass threshold, reported beside the thresholds.

The work lands as two pull requests with different deadlines. An item marked **Person** is a person's work, not an agent's.

## Acceptance criteria

### Part 1: before the first walk on 11-02

Declared in a new evidence file beside the walking evaluation, which does not change. It lands on `3.0/Main` before any pair is walked.

- [x] **Walking diagnostics**, read from the same 30 walked times. No extra walk is needed.
  - **Late risk:** the share of pairs where walked − predicted is more than 120 seconds, for the table and for the baseline.
  - **Speed factor:** k = Σ(walked × table) / Σ(table²), the one factor that best scales the table to the walks.
  - **The pairs that tell them apart:** the MAE of the table and of the baseline over pairs 5, 11, 15, 20, 22, 23, 24 and 27, where the two differ by more than 2 minutes at the freeze.
- [x] **Who walks.** TaeHyun79 walks all 30 pairs, so that k reads one person's pace.
- [x] **Calibration.** The 13 calibration pairs are walked only when a threshold is missed or k is outside 0.9–1.1.
  - The fit uses the calibration pairs only, never the test pairs: speed and the climb value, by ordinary least squares over all 13 pairs, once, with nothing else changed. [The evidence file](../evidence/06-walking-and-ride-diagnostics.md) gives the rule.
  - The calibrated table is scored against the same 30 walked times as a new entry, beside the original result.
  - When neither condition holds, nothing is calibrated and the reason is recorded.
- [x] **Real shuttle rides.** The procedure is declared here, and the rides are Person work below.
  - 5 rides in service hours on 11-02, in one band. So only that band is compared.
  - At least 2 rides include the longest segment, 신소재공동연구소 → 302동 (1,096 m).
  - Each ride records the date, the rider, the boarding and alighting stops, and the times of reaching the stop, boarding and alighting.
  - Only the ride, boarding to alighting, is compared: with the logged median of that pair and band, and with the fallback, as an error per ride and an MAE. A wait is recorded and not compared, since 5 waits depend too much on the headway.
- [ ] **Person: the rides.** TaeHyun79 rides on 11-02 and records the times under ticket 02's `## Comments`. The comparison follows after the collection ends.

### Part 2: before the first official run of the P4 suite

- [ ] **The holdout set: 12 fixed-set cases, reworded.** Taken by rule, not by hand: each category sorted by id, divided into 4 equal parts, and the middle case of each part.

  | Category | Cases |
  | --- | --- |
  | 공강 파티 | `parties-after-last-class`, `parties-held-quests-busy`, `parties-next-gap`, `parties-over-twenty-narrowed` |
  | 공강에 밥 | `meals-friend-off-campus-item`, `meals-no-noodles`, `meals-same-name-asks`, `meals-who-lunch-begun` |
  | 공통 | `common-choice-clock-fits`, `common-choice-meal-clock`, `common-no-timetable-named-classes`, `common-off-campus-answer-none` |

  - Only the last User turn changes. The world, the clock, the asker, the fixed history and the expected result stay as in the original, and a test checks it.
  - A case runs 3 times, as in the fixed set.
- [ ] **Who rewords.** A separate session drafts the wordings. It sees the original questions and the world, not the prompts, the tools or the code. It may use abbreviations, spoken wording and another word order, and adds no condition.
- [ ] **Person: the wordings.** TaeHyun79 reviews the 12 and confirms each still has its original's answer.
- [x] **Kept apart.** The holdout has its own command. `pnpm eval --world p4` still runs exactly the 40 cases, and their pinned counts do not change.
- [x] **How it is read.**
  - It runs twice: with the first official run, and on the final code of P11.
  - Only the pass rates and the layer rates are read. No holdout failure is opened until P11 is over.
  - The record sets its pass rate beside that of the same 12 fixed-set cases in the same run.
- [x] **The report by layer.** The P4 suite's scorecard shows, as P05's does for its suite, computed from a stored run without the model:
  - each threshold's pass or fail: overall and per category;
  - the pass rate of 6 layers: the action, the tools, the arguments, the cards with the map buttons, the Proposal, and the reply's words (`text.mentions` and `text.absent`). A run counts in a layer only when its case checks that layer;
  - the runs that failed on the reply's words alone.
- [x] **The record of runs.** A file beside the suite holds, per official run, the model with its `canonical_slug` that day, the decoding settings, the limits, the commit, the date, the command and the scores.
  - Each run after the first has one line: hypothesis → what changed → the cases that changed → kept or reverted.
  - Its first entry is the smoke run: `parties-named-classes`, 3 runs on `871886a`, 2026-11-01, not scored, and nothing changed because of it.
  - The walked times stay in ticket 01's `## Comments`, as the walking evaluation says. The wiki gets the summary in P20.
- [x] **The regression of tickets 03 and 05, from runs that exist.** Nothing is run for this.
  - The baseline is the three P19 runs of P05's R0 on `28c0ce1`, in place of `c94bcc7`, which never ran. It holds the same assistant code, model and limits.
  - The later runs are the three P19 runs of P05's R0p on `871886a`: P04's chat, with no change of P05.
  - The rule and "no case may newly fail" stay. Read by it, this is a fail, with three cases: `follow-up-yes-after-menus` (0 → 3 failed runs), `compound-menus-and-shuttle` (1 → 2) and `follow-up-seven-oclock` (1 → 2).
  - The record gives each one's cause from its traces. For `follow-up-yes-after-menus`, it says whether the case's `proposeQuest` or the new `findMealRestaurants` is right by the 공강 rules.
  - The record also gives the calls to new tools, and the tokens and cost per turn of both sets. R0p's input per run is 81% above R0's.

## Rules for P11

Nothing to build here. P11 follows these, and the first official run waits for P05's ticket 10a.

- Each run changes one thing, with the same set, world and settings, compared with `pnpm eval:compare`.
- The first change goes to the lowest layer of the report.
- When the first official run already meets the thresholds, P11 still makes one improvement.
- A change that makes things worse is reverted, and the revert stays in the record.
- The smoke run's finding, a reply that leaves out the gap and the count, is not fixed before the first official run.
- P11's final code runs P19 three times and the holdout once.

## Out of scope

- A floor beside "no case may newly fail".
- A git tag for the freeze. The wiki gives the commit `d0cb28d`.
- A second labeller, or comparing against a chat with the judgement in the model.

## Comments

### Part 1 (2026-11-01)

Declared in [evidence/06-walking-and-ride-diagnostics.md](../evidence/06-walking-and-ride-diagnostics.md). The file goes beyond the ticket's wording in a few places: the rider names the band before the first ride, a ride's band is that of the time of reaching the stop, a pair and band with no logged median is compared with the fallback only, the rides are on route 41946, the same walker walks the calibration pairs, and k is never applied to the table. The Person walks and rides remain.

### Part 2 (2026-11-01)

- The 12 wordings in `main-server/eval/p4/holdout.yaml` are a draft until TaeHyun79 reviews them, so "The holdout set", "Who rewords" and "Person: the wordings" stay open. `reviewedBy` and `reviewedOn` are set with the review.
- The drafting agent was given the 12 questions and `world.yaml`, with each question's clock, asker and earlier turns, since a follow-up such as "운동만" has no meaning without them. It was also told to keep people's and places' names as written, because the cases check those words as arguments.
- The report reads the action as if the reply's words were right, since the scorer's action check also reads the mentions, and a bare ASK must also end by asking. So a run's failure lands in the lowest layer that needs fixing.
- A run of the holdout gets a scorecard that names no case, and `pnpm eval:compare` refuses it, so that no failure of it is opened by accident.
- The regression is recorded in `main-server/eval/p4/record.md`: a fail by the rule, with one real tool-choice fault (`follow-up-yes-after-menus`) and two failures of the words alone.
- Part 1's boxes are ticked here because PR #159 was to add only the ticket and the evidence file.
