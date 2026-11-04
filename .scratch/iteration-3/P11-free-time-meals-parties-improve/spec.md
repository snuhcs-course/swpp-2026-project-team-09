# P11: 공강 파티 and 공강에 밥 improved from the P4 results

Status: ready-for-agent

Schedule row: Iteration 3 P11, "Improve AI assistant feature: meals and parties in free time (from evaluation results)", deadline 2026-11-04. Owner: TaeHyun79 (Worker).

References:
- [The P04 spec](../P04-free-time-meals-parties/spec.md): the two scenarios, the Travel Time model and the evaluation plan frozen at `d0cb28d`.
- [P04 ticket 06, "Rules for P11"](../P04-free-time-meals-parties/issues/06-evaluation-diagnostics.md#rules-for-p11): how this task changes the chat and measures it.
- [The walking evaluation](../P04-free-time-meals-parties/evidence/01-walking-evaluation.md) and [the walking diagnostics and real rides](../P04-free-time-meals-parties/evidence/06-walking-and-ride-diagnostics.md), frozen before the first walk. This spec changes neither.
- [The walking criterion's revision](evidence/01-walking-criterion-revision.md), dated 2026-11-05, which lands with this spec.
- `main-server/eval/p4/record.md`: the record of the P4 suite's runs, with the regression of P04's chat.
- P04 ticket 01's `## Comments`: the 30 test walks and the 13 calibration walks. They land in their own pull request before this one.
- PR #160, TaeHyun79's reply of 2026-11-01: who fixes `follow-up-yes-after-menus`, where, and how it is read again.
- The PM's data pages (Claude artifacts): the walks `JdQizfFd1GoD1vCrRmGGMy`, the calibration walks `Gm458doq9iL9UKgGzb8ZTQ` and the rides `KZ1niuKqwPBZVtPvwVVY1b`.

This spec writes down the PM's decisions from the grilling on 2026-11-05. It inherits P04's evaluation as it stands and changes one criterion.

## Problem Statement

P04 built 공강 파티 and 공강에 밥 in the chat and froze how they are judged before any result. The results so far show three things that are not yet good enough, and one of them has not been measured at all.

The walking table reads long. TaeHyun79 walked the 30 test pairs on 11-01 and 11-02. The table's MAE is 168.5 s against the straight-line baseline's 124.6 s, and 14 of 30 pairs are within ±2 minutes, so the threshold is missed on both counts. The table is longer than the walk on 29 of 30 pairs, and k = 0.663. A User who trusts it leaves earlier than needed and sees fewer 공강 candidates as reachable than there are.

±2 minutes is also too loose to tell tables apart on this campus. 22 of the 30 walks took under 5 minutes, where ±2 minutes allows an error of 40% or more. Pair 14 was walked in 58 s, the table says 119 s, and it counts as within.

The shuttle's times are still the fallback values. The Dev log was collected on 11-02 and 11-03 and five real rides were timed on 11-03, but the days are not in the repository, `shuttle-timing.json` does not exist, and nothing has been scored.

The chat has had no official P4 run. The regression rule of P04's change already fails, with three cases:
- one real tool-choice fault, `follow-up-yes-after-menus`: after "응 김지은이랑", the Assistant shows Restaurants instead of making a Proposal for the lunch at 학생회관, the Place named one turn earlier. P05's R1 still fails it in all 3 runs;
- two failures of the reply's words alone, `compound-menus-and-shuttle` and `follow-up-seven-oclock`.

The smoke run found a reply that leaves out the gap and the count. The 12 holdout cases have never run.

P04's tickets also leave items open: the calibration fit, the shuttle's derive and score, the rides' comparison, the P4 suite's run, route lines owed by the walker, and a TA item.

P12, P13 and P14 change the same Assistant prompt at the same time. A measurement on whatever `3.0/Main` holds that day would mix their changes with this one.

## Solution

Each of three strands, the walking table, the shuttle's times and the chat, is measured before, improved, and measured after, by P04's frozen evaluation. The before and after numbers of all three sit in one table that P20 cites.

- **The walking table.** The speed and the climb value are fitted to the 13 calibration walks, once, and the table is rebuilt with nothing else changed. It is scored on the same 30 test walks. The tolerance is revised to min(25% of the walk, 2 minutes) as a dated revision, and every result is reported under both the original and the revised tolerance. The rebuilt table becomes the seed only when its MAE is lower.
- **The shuttle.** The two logged days are committed, `shuttle-timing.json` is derived from them and committed, and the frozen shuttle metric scores it against the fallback. The five real rides are compared with the logged medians and with the fallback.
- **The chat.** On a branch cut from one fixed commit, the first official run of the P4 suite, one holdout run and three P19 runs make the before set. Up to four changes follow, one per run, starting with the PM's fix of `follow-up-yes-after-menus`. The same set on the branch's final code makes the after set.

Nothing else in P04's evaluation changes: the 40 cases, the labels, the world, the travel fixture, the holdout, the thresholds, the regression rule, the shuttle metric and the walking method stay as they are.

## User Stories

### Using the Assistant

1. As a User, I want the Travel Times in 공강 파티 and 공강에 밥 to be close to how long I actually walk, so that I do not leave earlier than I need to.
2. As a User, I want a short walk shown as short, so that a candidate in the next building is not dropped as out of reach.
3. As a User, I want the shuttle's wait and ride to come from how the shuttle really ran, so that the shuttle is offered when it actually saves time.
4. As a User, I want "응 김지은이랑" after asking for lunch at 학생회관 to become a Proposal for that lunch, so that I am not asked to pick a Restaurant I already named.
5. As a User, I want the reply to a 공강 question to say the gap and how many candidates fit, so that I know what the cards cover.
6. As a User, I want the Assistant's other answers to be no worse after these changes, so that the rest of the chat keeps working.

### The walking table

7. As the PM, I want the original ±2-minute result kept and reported, so that the revision does not hide the first verdict.
8. As the PM, I want the stricter tolerance declared with its date and reason before any calibrated table is scored, so that it is not chosen to suit a result.
9. As the PM, I want the tolerance to scale with the walk below 8 minutes, so that a 1-minute walk read as 2 minutes counts as wrong.
10. As the PM, I want speed and climb fitted to the calibration walks only, so that the 30 test walks stay a test.
11. As the PM, I want the fit to run once with nothing else changed, so that the after result shows what calibration alone does.
12. As the PM, I want the fitted values recorded unrounded and as used, so that anyone can rebuild the same table.
13. As the PM, I want late risk, k and the pairs that tell the two apart reported for the calibrated table too, so that a faster table that makes Users late shows up.
14. As the PM, I want the rule for adopting the calibrated table set before the fit, so that adopting it is not a judgement made after seeing it.
15. As the PM, I want one command that scores a table against the walks and runs the fit, so that every number can be reproduced from the repository.
16. As the PM, I want the walked times committed as data, so that the scorer does not depend on a web page.
17. As the PM, I want pairs that are off because of a missing path recorded as a limitation, so that the test walks are not used to edit the graph.
18. As the walker, I want the route lines I owe listed as my items, so that the walking method's record is complete.

### The shuttle

19. As the PM, I want the two logged days committed, so that the shuttle metric can be run again.
20. As the PM, I want `shuttle-timing.json` derived and committed whatever its score, as P04 planned, so that the app uses observed times.
21. As the PM, I want the frozen leave-one-day-out score recorded against its baselines, so that the fallback (before) and the derived times (after) are compared on held-out days.
22. As the PM, I want the five rides compared with the logged medians and the fallback, so that the log is checked against real rides.
23. As a reader of ticket 02, I want to be told that 11-03's log ends at 19:03, so that I know the evening band comes from one day.

### The chat

24. As the PM, I want the before and after measured on a branch from one fixed commit, so that the difference is this task's alone while P12–P14 work in parallel.
25. As the PM, I want that commit's hash in the record, so that the before set can be run again.
26. As the PM, I want every run on OpenRouter, even if A01 lands meanwhile, so that the provider does not change between before and after.
27. As the PM, I want the P4 suite and the holdout run at 4,000 output tokens, the current default, so that they measure what ships.
28. As the PM, I want the P19 runs at 1,000 output tokens, R0's limit, so that the regression is read against R0 as I wrote on #160.
29. As the PM, I want P19 run at the fixed commit as well, so that a case broken by another task since R0 is not charged to this one.
30. As the PM, I want the first change to be my fix of `follow-up-yes-after-menus`, so that the promise on #160 is kept.
31. As the PM, I want later changes taken only from the first run's layer report, lowest layer first, so that each change goes where a failure is.
32. As the PM, I want one change per run, compared with `pnpm eval:compare`, and a change that makes things worse reverted with the revert recorded, so that every kept change is shown to help.
33. As the PM, I want the changes to stop after the fourth or when nothing is left to fix, so that the work has a fixed end.
34. As the PM, I want each real-model run's command and estimated cost shown before it starts, within USD 10 in all, so that the spend stays approved.
35. As the PM, I want the holdout's pass rate read beside that of the same 12 fixed-set cases, so that I can see whether a change only fits the fixed set's wording.
36. As the PM, I want the two words-only regressions read again rather than targeted, so that run-to-run flutter is not tuned away and reported as a fix.
37. As the PM, I want no router, and one line in the record if ADR 0009's condition holds, so that the question stays where ADR 0009 put it.

### Records

38. As an evaluator, I want each official run's model, settings, commit, date, command and scores in the record, so that the result can be checked.
39. As an evaluator, I want the official runs' result files committed, so that the scores can be recomputed without the model.
40. As an evaluator, I want a revised criterion shown beside the original, dated and explained, as the course requires.
41. As a teammate, I want one before/after table for the three strands, so that P20 can cite it without reading three tickets.
42. As a reviewer of a squash-merged pull request, I want the record's commit hashes to stay reachable, so that a reverted change can still be inspected.
43. As the PM, I want P04's open items moved here and ticked on P04's tickets when done, with what replaced them, so that P04 closes.

## Implementation Decisions

### What stays from P04

- The evaluation frozen at `d0cb28d`, and ticket 06's additions, stay as they are:
  - the 40 cases, their labels, the world, the travel fixture, and the 12 holdout cases as approved;
  - the P4 suite's thresholds: overall ≥ 80% and each category ≥ 70%, the mean of 3 runs;
  - the regression rule: a case newly fails when it fails in at least 2 later runs but in at most 1 baseline run, and no case may newly fail;
  - the walking method, metric, baseline and threshold form, and the calibration rule;
  - the rides' procedure and comparison;
  - the shuttle metric, its cleaning rules and its threshold.
- Ticket 06's "Rules for P11" hold, as made definite below.
- The chat's score reads the frozen travel fixture, so the walking and shuttle strands cannot move it. The three strands are independent of each other.

### The walking criterion's revision

- Declared in [the revision file](evidence/01-walking-criterion-revision.md), dated 2026-11-05. It lands on `3.0/Main` with this spec, before any fit.
- Within, per pair: |table − walked| ≤ min(0.25 × walked, 120 s). The walked time is the reference, and a difference equal to the limit counts as within.
- The threshold keeps its form: at least 70% of the 30 pairs within the tolerance, and the table's MAE below the baseline's.
- The reason: 22 of the 30 walks took under 300 s, where ±120 s is 40% of the walk or more. On 25 of them, those under 480 s, the 25% term is the smaller.
- The original ±2-minute result of 11-02 stays as recorded. Every table scored on the 30 walks is reported under both tolerances, and the revised one is the threshold from 11-05.
- Known when revising, and stated in the file: under the revised tolerance the original table has 3 of 30 within (pairs 2, 13, 16) and the baseline 4 of 30 (pairs 4, 5, 16, 24). No calibrated table had been built or scored.
- The rule that a pair more than 2 minutes off gets one route line does not change.

### The walking table: before, improvement, after

- **Before:** the frozen table, at 1.1 m/s and 3 seconds per metre of climb, scored on the 30 walks recorded in ticket 01.
- **Improvement:** the calibration of the walking diagnostics, as frozen:
  - the model: seconds = path metres ÷ speed + climb metres × climb seconds per metre, where climb = max(0, destination elevation − origin elevation), with no constant term;
  - fitted by ordinary least squares over all 13 calibration pairs and never the test pairs, once;
  - the path metres and climbs are those of the frozen build: the same graph, pins and seed elevations;
  - a climb value below 0 becomes 0, and the speed stays the value of that same fit, not fitted again. The revision file records this reading;
  - nothing else changes, and k is never applied.
- The existing builder rebuilds the table with the fitted speed and climb value. Its two constants take the fitted values as used, and the rounding is recorded.
- **After:** the rebuilt table scored on the same 30 walks, beside the original result:
  - the MAE, the share within under both tolerances, and the threshold under both;
  - the three diagnostics of the walking diagnostics: late risk, k, and the MAE over pairs 5, 11, 15, 20, 22, 23, 24 and 27;
  - the baseline stays the frozen one.
- **Adoption:** the rebuilt table replaces the committed walking table only when its MAE over the 30 is lower than the original's, whatever either threshold says. Otherwise the original stays and ticket 01 records why. The revision file declares this rule.
- A rebuilt table also changes the walking legs of shuttle travel, so it can change when the shuttle is 3 minutes faster. No rule changes with it.
- The table is a server seed. It reaches the Dev Server with the merge and Production with the next regular Release. No native file changes.
- **Paths are a limitation.** A pair that is off because the graph lacks a path stays off. The graph, the pins and the elevations are not edited from the test walks. Only pair 20 has its route line so far (a cut between 자하연 and 농협은행); the 15 owed lines will show which other pairs walk a path the graph lacks.

### The walking scorer

- One command beside the builder. It calls no model and needs no network. It reads:
  - the walked times, committed as a data file: the 30 test pairs and the 13 calibration pairs as recorded in ticket 01's `## Comments`, each with the walker, the date, the start time, the walked seconds with the late presses taken off, and the seconds taken off;
  - the frozen pair list, with each test pair's table and baseline seconds at the freeze, from the walking evaluation;
  - a walking table: the committed seed or a rebuilt one.
- For that table on the 30 test pairs it prints the MAE, the share within under both tolerances, the threshold under both and the three diagnostics, with the baseline's numbers beside them.
- It runs the calibration fit on the 13 calibration pairs and prints the fitted speed and climb value unrounded.
- The fit's path metres and climbs come from the frozen build: either recovered from the frozen table and the seed's elevations, or exposed by the builder. The ticket chooses, and the fit's inputs are recorded with its result.

### The shuttle: before, improvement, after

- The day CSVs and set logs of 11-02 and 11-03, as fetched on 11-03 (checksums matched, no set gap over 30 s), are gzipped and committed as the shuttle metric's fixed data.
- `pnpm shuttle:derive` produces `shuttle-timing.json` from both days. It is committed whatever the score, as P04 planned, and reaches Production with the next regular Release.
- **Before** is the fallback: a wait of 3.5 minutes from 08:00 to 19:00 and 10 minutes from 19:00 to 21:00, and a ride of along-loop distance ÷ 4.15 m/s. **After** is the derived file.
- `pnpm shuttle:score` runs the frozen leave-one-day-out metric, 2 folds. Ticket 02's `## Comments` get the ride and wait MAEs with their baselines, the shares within ±1 minute, whether the threshold holds, and every item the cleaning rules dropped, with its reason.
- 11-03's log ends at 19:03, when the collector was stopped, so the 19–21 band comes from 11-02 only. Ticket 02's Comments say so. Waits are scored for 08–19 only, as frozen.
- **The real rides** follow the walking diagnostics' comparison:
  - the ride, boarding to alighting, against the logged median of that pair and band and against the fallback, as an error per ride and an MAE;
  - a pair and band with no logged median is compared with the fallback only, and the record says so;
  - the wait is recorded and not compared.
  - No code: the five numbers are computed from the committed file and recorded in ticket 02.
- The five rides, by TaeHyun79 on route 41946, all in the 11–14 band. They were ridden on 11-03, not on 11-02 as the walking diagnostics planned, and the record states the date.

  | Ride | Boards at | Alights at | Reached the stop | Boarded | Alighted | Ride (s) |
  |---|---|---|---|---|---|---:|
  | r1 | 농생대 | 302동 | 13:43:51 | 13:51:29 | 13:56:36 | 307 |
  | r2 | 302동 | 교수회관 | 13:10:53 | 13:15:02 | 13:19:30 | 268 |
  | r3 | 교수회관 | 경영대 | 13:19:49 | 13:25:21 | 13:29:34 | 253 |
  | r4 | 경영대 | 농생대 | 13:29:40 | 13:37:21 | 13:43:46 | 385 |
  | r5 | 농생대 | 301동 | 13:43:51 | 13:51:29 | 13:58:33 | 424 |

### The chat: the fixed commit and the branch

- X is the tip of `3.0/Main` when the chat's working branch is cut, after this spec's pull request has merged. Its hash goes into `record.md`.
- The branch does not merge `3.0/Main` until the after set has run. Then it merges, and the record says what came in.
- Every run uses OpenRouter, the path at X, even if A01 lands meanwhile. A01's own baseline records the P4 suite on the Anthropic path as a different condition; P11 does not run it.
- A confirmation run of the P4 suite on `3.0/Main` after P11 merges is the PM's choice later, not part of this task.

### The chat: settings and sets

- The model `anthropic/claude-haiku-5.5`, 8 steps, 30 s, and the provider's default decoding: no temperature, top-p or seed is passed. The record gives that day's `canonical_slug`.
- The P4 suite and the holdout: 4,000 output tokens, `3.0/Main`'s default since #185.
- P19: 1,000 output tokens, R0's limit, passed explicitly.
- **The before set, at X:** the P4 suite once (`pnpm eval --world p4`, where every case runs 3 times), the holdout once (`pnpm eval:holdout`), and P19 three times (`pnpm eval`). It is the P4 suite's first official run.
- **The after set, at the branch's final code:** the same three.
- **Cost and time**, estimated: each set about USD 1.8 and 35 minutes, and each change's P4 run about USD 0.75 and 15 minutes. With four changes, about USD 6.6 and 3 to 3.5 hours in all. The PM approved up to USD 10 on 2026-11-05.
- An agent starts every real-model run from the main checkout with the PM's `main-server/.env`. Before each run it shows the command and the estimated cost and waits for the PM's approval. Each run passes `--budget`.

### The chat: changes

- **Change 1, required:** `follow-up-yes-after-menus`, as the PM wrote on #160, in the two 공강 rules that lead to `findMealRestaurants`:
  - the rules do not say that a Place named in an earlier turn counts as a Place named in the request;
  - their follow-up rule says a follow-up calls `resolveFriend` and then `findMealRestaurants` again.
  - By the 공강 rules, the case's `proposeQuest` is right, and the case and its label stand.
- **Later changes** are only for failures in the before set's layer report, lowest layer first: the action, the tools, the arguments, the cards with the map buttons, the Proposal, the reply's words. The smoke run's finding, a reply that leaves out the gap and the count, is a candidate only if the report shows it.
- **Each change** is one change, followed by one run of the P4 suite with the same set, world and settings, compared with the last kept run by `pnpm eval:compare`. A change that makes things worse is reverted, and the revert stays in the record.
- **The changes stop** when the before set's report has no failure left to fix, or after the fourth change. There is no fifth, and no date cutoff. Change 1 meets ticket 06's "at least one improvement".
- `compound-menus-and-shuttle` and `follow-up-seven-oclock`, the two words-only regressions, are not targeted. The after set's P19 reads them again. If they still newly fail, they are recorded as fails with their cause.
- **No router** ([ADR 0009](../../../docs/adr/0009-new-capabilities-join-the-chat-as-tools-and-prompt-fragments.md)). If its condition holds after the changes, regressions or worse tool choice left after the prompt is fixed, `record.md` gets one line saying a router is reconsidered in iteration 4. Otherwise nothing is written.

### The chat: reading the after set

- **The P4 suite:** each threshold's pass or fail, overall and per category, and the 6 layer rates, before and after.
- **The holdout:** only the pass rates and the layer rates are read, beside those of the same 12 fixed-set cases in the same official run. No holdout failure is opened until P11 is over.
- **The regression:** the after set's P19 runs against R0's (`28c0ce1`, 1,000 output tokens) by the frozen rule.
  - A case that newly fails is charged to another task when it also fails in at least 2 of X's 3 runs, the rule's own count.
  - A case that newly fails because of P11's code is recorded as a fail and reported in P20, as the PM wrote on #160.

### Records

- **`record.md`** holds:
  - X's hash;
  - one entry per official run: the model with that day's `canonical_slug`, the decoding, the limits, the commit, the date, the command and the scores;
  - one line per change: hypothesis → what changed → the cases that changed → kept or reverted;
  - the regression's reading and the holdout's lines.
- **Result files.** The official runs' files, the before and after sets with their holdout runs, are committed although `eval/results/` is ignored, as P05 and P06 did. A change's run gets its line in the record, and its files stay local.
- **Squash merges.** A result file's name carries its date, commit, model and limits, and the record carries the commit and the date, so the before and after sets can land in one squash-merged pull request. The hashes of a branch's intermediate commits stay reachable from that pull request's commit list after the squash.
- **The walking results** go to P04 ticket 01's `## Comments`, as a new entry beside the original: the fitted values, both tolerances, the diagnostics and the adoption. **The shuttle's** go to ticket 02's.
- **One before/after table** for the three strands goes under this spec's directory. P20 cites it.

### P04's open items

Each moves here as an acceptance item. When it is done, it is ticked on its P04 ticket, with what replaced it where something did.

- **Ticket 01**
  - The calibration fit and the rebuilt table's score: its Comments say the fit has not run.
  - **Person:** the 15 owed route lines, and C12's line, which names C11 although the pair that walks that road the other way is C13.
- **Ticket 02**
  - Person, the collector: installed on 2026-11-01 at 22:30 KST and checked by hand in service hours on 11-02. Ticked with those dates.
  - Person, fetching and gzipping: fetched on 11-03 at 19:03. P11 gzips them.
  - The committed days, the derived file and the score: P11.
- **Ticket 03**
  - The reply-text fix: replaced by P05's ticket 10a (#164).
  - **Person: the TA:** closed by the PM on 2026-11-05. Nothing about it goes into the testing document.
  - Person, the cost: the PM's approval of 2026-11-05 for P11's runs.
  - The baseline: replaced by P05's R0 on `28c0ce1`, as ticket 06 recorded.
- **Tickets 04 and 05, landing before P05's R0:** they landed on 11-01, after R0. P05's R0p on `871886a` stands in, as ticket 06 recorded.
- **Ticket 05**
  - Person, the cost: as in ticket 03.
  - The regression: recorded in `record.md` from R0 and R0p by ticket 06, and read again in P11's after set.
  - The P4 suite: P11's before set.
- **Ticket 06, Person, the rides:** ridden on 11-03 and recorded in ticket 02 by P11.

### Order

- Pull requests land in this order: P04 ticket 01's walk records, then this spec with its tickets and the revision file, then P11's working branches.
- The working branches are cut from `3.0/Main` after this spec's pull request merges, so the revision is on `3.0/Main` before any fit.
- The three strands can run in parallel.

## Testing Decisions

- A good test checks what a module does from the outside: given walks and a table, the numbers it prints, not how it computes them.
- **The chat** is tested by the real-model runs above. Prompt wording gets no unit test. The existing unit and integration tests of the Assistant, including the labels test (the server's judgement on the world equals the labels), stay green after every kept change.
- **The walking scorer** gets unit tests on hand-made numbers:
  - the revised tolerance at and around its limit, for short and long walks, and the original ±2 minutes;
  - both thresholds' verdicts;
  - late risk, k and the MAE over the pairs that tell the two apart;
  - the fit: pairs built from a known speed and climb value give them back, and a negative climb value becomes 0 while the speed stays that fit's.
  - Prior art: `shuttle-score.unit.test.ts`, a scorer over fixed data, and `walking-graph.unit.test.ts`.
- **The builder:** the graph tests that state 1.1 m/s and the climb cost follow the constants, by importing them or by new expected values, as the ticket chooses. The test that the table covers every Place and Shuttle Stop stays.
- **The shuttle:** no code changes. Derive and score keep their existing tests.
- Test files follow [ADR 0007](../../../docs/adr/0007-test-levels-by-what-a-test-starts.md): the scorer's tests are unit tests.

## Out of Scope

- A router.
- Editing the walking graph, the pins or the elevations, or any path fix.
- New walks or rides.
- Changing the baseline, applying k, or calibrating anything but speed and climb.
- Any criterion other than the walking tolerance. The P4 suite's thresholds, the regression rule, and the shuttle metric with its cleaning rules stay.
- Changes to the P4 suite's cases, labels, world, travel fixture or holdout.
- Runs of other suites (P5, P6, P7) or of the Anthropic path (A01).
- Asking the TA, and any mention of the TA item in the testing document.
- A date cutoff for the changes.
- The confirmation run on `3.0/Main` after the merge, which the PM decides later.
- Writing P20's wiki page.
- Everything P04 left out of scope.

## Further Notes

- **Data outside the repository.** The shuttle's day files are the PM's copy, fetched on 11-03: `~/Desktop/SNU/3-2/SWPP/shuttle-log-2026-11-02_03/`, four files, 3.2 MB, uncompressed. The walk and ride pages above hold the raw records.
- **What the chat's numbers can say.** A branch measurement shows P11's effect on X. It does not show how P11 combines with P12–P14 on `3.0/Main`.
- **Paths.** On 8 test pairs (6, 11, 14, 18, 20, 26, 27, 29) the table is more than twice the walk, more than speed alone explains, since k = 0.663 means about 1.5 times. They are the likely path problems.
- **P13** measures on the Anthropic path (A01) and P11 on OpenRouter, so their numbers are on different paths.
- **Dates.** P11's deadline in the schedule was 11-04. P20, which cites the before/after table, is due 11-06.
- The decision record of this spec, as questions and answers, is the grilling of 2026-11-05, kept outside the repository.
