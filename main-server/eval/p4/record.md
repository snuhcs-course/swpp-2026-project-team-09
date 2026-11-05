# The record of the P4 suite's runs

One entry per official run: the model with its `canonical_slug` that day, the decoding settings, the limits, the commit, the date, the command and the scores. Each run after the first adds one line: hypothesis → what changed → the cases that changed → kept or reverted. A change that makes things worse is reverted, and the revert stays here. The rules for P11 are in [ticket 06](../../../.scratch/iteration-3/P04-free-time-meals-parties/issues/06-evaluation-diagnostics.md).

The walked times stay in ticket 01's `## Comments`, as the walking evaluation says, and the real rides in ticket 02's. The wiki gets the summary in P20.

## The holdout

`pnpm eval:holdout` runs the 12 reworded cases of `holdout.yaml`, 3 times each. It runs twice: with the first official run, and on the final code of P11.

- Only the pass rates and the layer rates are read. The holdout's scorecard gives those, with what the run cost and its settings, and names no case and holds no reply.
- No holdout failure is opened until P11 is over.
- An entry sets the holdout's pass rate beside that of the same 12 fixed-set cases in the official run on that commit. The official scorecard gives that rate.

## Runs

The official runs are P11's ([spec](../../../.scratch/iteration-3/P11-free-time-meals-parties-improve/spec.md)). They run on the branch `3.0/P11-04-chat`, cut from **X = `74d5a0e8163718311d1f052a1843133ceb0c4472`**, the tip of `3.0/Main` on 2026-11-05 after P11's spec merged (#199). The branch does not merge `3.0/Main` until the after set has run.

Every run below has these settings:

| Item     | Value                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| Provider | OpenRouter, the path at X                                                                                  |
| Model    | `anthropic/claude-haiku-5.5`; on 2026-11-05 its `canonical_slug` was `anthropic/claude-haiku-5.5-20261007` |
| Decoding | Provider defaults: no temperature, top-p or seed passed                                                    |
| Limits   | 8 steps and 30 s; 4,000 output tokens for the P4 suite and the holdout, 1,000 for P19                      |

Costs are the scorecards' estimates at OpenRouter's prices. The result files of the before and after sets are in `eval/results/` and committed, although the folder is ignored; a change's run keeps its files locally.

### The before set, at X

#### The P4 suite's first official run

| Item        | Value                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| Date        | 2026-11-05, 03:49–04:01 KST                                                              |
| Commit      | `74d5a0e8`                                                                               |
| Command     | `pnpm eval --world p4 --model anthropic/claude-haiku-5.5 --budget 1.5 --yes`             |
| Result file | `2026-11-05-74d5a0e8-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault` |
| Usage       | 120 turns; input 10,049,230, output 86,892, no cache read or write; USD 1.0484           |

| Threshold                     | Passed         | Wanted | Verdict |
| ----------------------------- | -------------- | ------ | ------- |
| Overall                       | 85/120 (70.8%) | ≥ 80%  | Fail    |
| free-time-parties (공강 파티) | 27/45 (60.0%)  | ≥ 70%  | Fail    |
| free-time-meals (공강에 밥)   | 34/45 (75.6%)  | ≥ 70%  | Pass    |
| free-time-common (공통)       | 24/30 (80.0%)  | ≥ 70%  | Pass    |

| Layer                 | Passed          |
| --------------------- | --------------- |
| Action                | 118/120 (98.3%) |
| Tools                 | 107/120 (89.2%) |
| Arguments             | 102/111 (91.9%) |
| Cards and map buttons | 100/114 (87.7%) |
| Proposal              | 6/6 (100.0%)    |
| Words                 | 80/111 (72.1%)  |

The 20 runs that failed on the reply's words alone: `common-choice-clock-fits` run 1; `meals-no-noodles` runs 1–3; `meals-soup-wanted` run 2; `meals-no-shared-time` runs 1–3; `meals-no-restaurant-fits` runs 1 and 3; `parties-named-classes` run 2; `parties-abbreviated-gap-begun` runs 1 and 3; `parties-next-gap` run 1; `parties-named-classes-tomorrow` runs 1 and 2; `parties-nothing-fits` run 2; `parties-over-twenty-narrowed` runs 1–3.

#### The holdout

| Item        | Value                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Date        | 2026-11-05, 04:01–04:06 KST                                                                      |
| Commit      | `74d5a0e8`                                                                                       |
| Command     | `pnpm eval:holdout --model anthropic/claude-haiku-5.5 --budget 0.6 --yes`                        |
| Result file | `2026-11-05-74d5a0e8-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-holdout` |
| Usage       | 36 turns; input 3,254,484, output 31,111; USD 0.3410                                             |

Beside the same 12 cases in the fixed set's official run above:

| Measure               | Holdout        | Same 12 fixed-set cases |
| --------------------- | -------------- | ----------------------- |
| Overall               | 23/36 (63.9%)  | 25/36 (69.4%)           |
| free-time-parties     | 4/12 (33.3%)   | 6/12 (50.0%)            |
| free-time-meals       | 9/12 (75.0%)   | 9/12 (75.0%)            |
| free-time-common      | 10/12 (83.3%)  | 10/12 (83.3%)           |
| Action                | 36/36 (100.0%) | 35/36 (97.2%)           |
| Tools                 | 35/36 (97.2%)  | 35/36 (97.2%)           |
| Arguments             | 35/36 (97.2%)  | 35/36 (97.2%)           |
| Cards and map buttons | 30/33 (90.9%)  | 31/33 (93.9%)           |
| Proposal              | 3/3 (100.0%)   | 3/3 (100.0%)            |
| Words                 | 22/33 (66.7%)  | 22/33 (66.7%)           |

The fixed set's column is read from the official run's result file with `p4Report` over those 12 cases; its scorecard gives only the overall 25/36.

#### P19, three runs

| Item    | Value                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------- |
| Date    | 2026-11-05, 04:06–04:26 KST                                                                                           |
| Commit  | `74d5a0e8`                                                                                                            |
| Command | `pnpm eval --model anthropic/claude-haiku-5.5 --max-output-tokens 1000 --budget 1.0 --yes`; run 1 with `--budget 0.6` |

| Run | Result file                                                                                | Scored turns passed, known failures apart | Input     | Output | Cost       |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------- | --------- | ------ | ---------- |
| 1   | `2026-11-05-74d5a0e8-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault`   | 57/64 (89.1%)                             | 5,142,956 | 41,962 | USD 0.5353 |
| 2   | `2026-11-05-74d5a0e8-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault-2` | 57/64 (89.1%)                             | 5,168,504 | 41,944 | USD 0.5378 |
| 3   | `2026-11-05-74d5a0e8-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault-3` | 55/64 (85.9%)                             | 5,135,695 | 40,968 | USD 0.5341 |

Run 1 cost USD 0.5353, too close to the USD 0.6 budget that runs 2 and 3 had, so the first start of run 2 was stopped after about 30 s, before it saved anything; runs 2 and 3 then ran at `--budget 1.0`. That start's cost is in no scorecard. These three runs are read in ticket 06, against R0, to tell a case broken by another task since R0 from one broken by P11.

The before set cost USD 2.9966 by the scorecards.

#### The failures to fix

From the P4 suite's run above, each failure under the lowest layer it failed in, lowest layer first. Ticket 06 takes later changes from this list only.

1. **Action**
   - `common-off-campus-after`, run 1: `findFreeTimeEvents` answered `needs` with side after, and the model passed `leaveBy` 17:00, the start of the next item, instead of asking by when the User must leave.
   - `common-off-campus-answer-none`, run 3: after `resolvePlace` answered none, the model asked where the User enters the campus, but in English, in the rule's own words.
2. **Tools**
   - `parties-departure-after-asking`, runs 1–3: the User had answered "서울대 정문으로 들어가", and the model called `resolvePlace` with "정문", got two Places and asked again instead of calling `findFreeTimeEvents`.
   - `common-choice-clock-search`, runs 1–3: "수요일 2시부터 3시 반 파티 있어?" called `searchRecruitingQuests` only, not `searchGlobalEvents`, with `after` and `before` in place of the day's `from` and `to`.
   - `showGlobalEvents` not called for the Global Events `findFreeTimeEvents` returned: `parties-named-classes` run 3, `parties-before-first-class` runs 1 and 3, `parties-held-quests-busy` run 1.
   - `meals-soup-wanted`, runs 1 and 3: the follow-up "국밥 먹고 싶어" after Restaurant cards called `getMenus`, not `resolveFriend` and `findMealRestaurants`.
3. **Arguments**
   - `parties-held-quests-busy`, run 2: the gap between two named Classes was asked as two gaps that stop at the User's held Quests.
4. **Words**
   - How many candidates fit, missing: `common-choice-clock-fits` run 1, `parties-named-classes` run 2, `parties-abbreviated-gap-begun` run 3, `parties-next-gap` run 1, `parties-named-classes-tomorrow` runs 1 and 2, `parties-over-twenty-narrowed` runs 1–3. This is the smoke run's finding.
   - The gap's times, missing: `parties-abbreviated-gap-begun` runs 1 and 3.
   - No "없" when nothing fits or no time is shared: `meals-no-shared-time` runs 1–3, `meals-no-restaurant-fits` runs 1 and 3, `parties-nothing-fits` run 2.
   - The left-out Restaurant named: `meals-no-noodles` runs 1–3.
   - The shared time, missing: `meals-soup-wanted` run 2.

### The changes

One line each: hypothesis → what changed → the cases that changed → kept or reverted. Each is one P4 suite run with the before set's world and settings (`pnpm eval --world p4 --model anthropic/claude-haiku-5.5 --budget 1.5 --yes`), compared with the last kept run by `pnpm eval:compare`; its result files stay local. Before each run the unit project and the Assistant's integration tests passed, the labels tests among them: 973 unit tests, and 30 integration files after change 1, 9 after each later change. The case lists are the comparison's: a case is listed when it moved between passing all 3 runs and failing at least one.

1. **Change 1**, `1966d8e1`, 2026-11-05 04:29–04:41 KST, USD 1.0567. The model takes a Place named one turn earlier as which Restaurant to show, and the follow-up rule sends every follow-up back to `findMealRestaurants` (`follow-up-yes-after-menus`, the PM's promise on #160) → in the two 공강 rules that lead to `findMealRestaurants`, the meal rule says that a Place or a single clock time named in an earlier turn counts as named in the request, and the follow-up rule covers follow-ups on Restaurant cards only → 70.8% to 80.0%; now passing `common-off-campus-after`, `common-off-campus-answer-none`, `parties-named-classes`, `parties-abbreviated-gap-begun`, `parties-named-classes-tomorrow`, `parties-before-first-class`; now failing `common-refuse-friend-classes`, `common-no-timetable-named-classes`, `parties-after-last-class`. None of these nine cases goes through the two rules changed, and `follow-up-yes-after-menus` is in P19's set, read in the after set → **kept**.
2. **Change 2**, `7306c9f9`, 2026-11-05 04:43–04:55 KST, USD 1.0721. The lowest layer's failures, both in the rule for `needs` and off-campus departures: the model filled in `leaveBy` itself (`common-off-campus-after`) and asked in the rule's English (`common-off-campus-answer-none`); in the same rule it passed the shortened "정문" to `resolvePlace` (`parties-departure-after-asking`, Tools) → that rule says a `needs` answer is the User's to give and never filled in, `resolvePlace` takes the User's words as written, and the question is in the User's language → 80.0% to 76.7%; now failing `parties-named-classes`, `parties-abbreviated-gap-begun`, `parties-before-first-class`, `parties-over-twenty`, `parties-ambiguous-class`; now passing `meals-no-restaurant-fits`, `parties-after-last-class`, `parties-nothing-fits`. The two Action cases had already passed in change 1's run, and `parties-departure-after-asking` still failed 2 of 3 runs → **reverted** in `3a1578b8`; the next change compares with change 1's run.
3. **Change 3**, `6765780a`, 2026-11-05 04:56–05:10 KST, USD 0.9875. The next layer, Tools, and its failure with the most runs in the before set, 4 of 12: `showGlobalEvents` was not called for the Global Events that `findFreeTimeEvents` returned (`parties-named-classes`, `parties-before-first-class`, `parties-held-quests-busy`) → the rule for what `findFreeTimeEvents` returned says to call both show tools when it returned both kinds → 80.0% to 67.5%, 공강 파티 from 75.6% to 42.2%; now failing `meals-no-timetable-friends-dinner`, `meals-needs-departure`, `parties-named-classes`, `parties-abbreviated-gap-begun`, `parties-over-twenty`, `parties-what-is-on-meal-search`, `parties-ambiguous-class`, `parties-leave-by-after-asking`; now passing `common-refuse-friend-classes`, `common-no-timetable-named-classes`, `meals-no-restaurant-fits`. Both kinds were shown, as in `parties-named-classes`, but its replies then gave the two counts apart ("파티 5개와 행사 4개") instead of the total → **reverted** in `ae4ee33d`; the next change compares with change 1's run.
4. **Change 4**, `630b8dc1`, 2026-11-05 05:12–05:25 KST, USD 1.0638. Tools again, failing in every run of every set so far: for what is on at a time, `common-choice-clock-search` called `searchRecruitingQuests` alone, not `searchGlobalEvents`, with `after` and `before` instead of the day → the rule for what is on at a time says to search that whole day by `from` and `to` with `searchGlobalEvents` as well, and to show those that start inside the time asked → 80.0% to 76.7%, though the Tools layer rose from 92.5% to 95.8% and `common-choice-clock-search` passed 1 of 3 runs; now failing `common-ask-no-day-or-meal`, `parties-abbreviated-gap-begun`, `parties-over-twenty`, `parties-no-timetable-rest-of-day`; now passing `parties-next-gap`, `parties-after-last-class` → **reverted** in `82ca0688`.

The changes stop here, at the fourth. The branch's final code is change 1's: the code at the after set's commit equals `1966d8e1`'s.

Across these five runs of the same 40 cases, the pass rate moved between 67.5% and 80.0%, and cases that no change touched moved in and out of passing in every comparison. A change of a few points is within that spread.

### The after set, at the branch's final code

The final code is change 1's: the set ran at `bf738eb8` and its holdout at `55d882bc`, whose code equals `1966d8e1`'s, changes 2 to 4 being reverted. The commits after `bf738eb8` change only this record, the tickets and result files.

#### The P4 suite

| Item        | Value                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| Date        | 2026-11-05, 05:26–05:39 KST                                                              |
| Commit      | `bf738eb8`                                                                               |
| Command     | `pnpm eval --world p4 --model anthropic/claude-haiku-5.5 --budget 1.5 --yes`             |
| Result file | `2026-11-05-bf738eb8-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault` |
| Usage       | 120 turns; input 10,342,042, output 89,821, no cache read or write; USD 1.0791           |

| Threshold         | Before, at X   | After          | Wanted | Verdict after |
| ----------------- | -------------- | -------------- | ------ | ------------- |
| Overall           | 85/120 (70.8%) | 92/120 (76.7%) | ≥ 80%  | Fail          |
| free-time-parties | 27/45 (60.0%)  | 26/45 (57.8%)  | ≥ 70%  | Fail          |
| free-time-meals   | 34/45 (75.6%)  | 41/45 (91.1%)  | ≥ 70%  | Pass          |
| free-time-common  | 24/30 (80.0%)  | 25/30 (83.3%)  | ≥ 70%  | Pass          |

| Layer                 | Before          | After           |
| --------------------- | --------------- | --------------- |
| Action                | 118/120 (98.3%) | 118/120 (98.3%) |
| Tools                 | 107/120 (89.2%) | 112/120 (93.3%) |
| Arguments             | 102/111 (91.9%) | 107/111 (96.4%) |
| Cards and map buttons | 100/114 (87.7%) | 107/114 (93.9%) |
| Proposal              | 6/6 (100.0%)    | 6/6 (100.0%)    |
| Words                 | 80/111 (72.1%)  | 87/111 (78.4%)  |

The 19 runs that failed on the reply's words alone: `meals-no-timetable-friends-dinner` run 2; `meals-no-noodles` runs 1 and 3; `meals-no-shared-time` run 3; `parties-named-classes` run 2; `parties-abbreviated-gap-begun` runs 1 and 2; `parties-next-gap` runs 1–3; `parties-named-classes-tomorrow` run 2; `parties-after-last-class` run 1; `parties-nothing-fits` runs 1 and 3; `parties-over-twenty` run 2; `parties-over-twenty-narrowed` run 1; `parties-held-quests-busy` run 2; `parties-no-timetable-rest-of-day` run 3; `parties-departure-after-asking` run 3.

Change 1's own run measured the same code at 80.0%, with all four thresholds met; this run gives 76.7%.

#### P19, three runs

| Item    | Value                                                                                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date    | 2026-11-05, 05:39–05:59 KST                                                                                                                                                 |
| Commit  | `bf738eb8`                                                                                                                                                                  |
| Command | `pnpm eval --model anthropic/claude-haiku-5.5 --max-output-tokens 1000 --budget 1.0 --yes`; run 3 with `--budget 0.62`, so that the scorecards' total could not pass USD 10 |

| Run | Result file                                                                                | Scored turns passed, known failures apart | Input     | Output | Cost       |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------- | --------- | ------ | ---------- |
| 1   | `2026-11-05-bf738eb8-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault`   | 56/64 (87.5%)                             | 5,155,298 | 41,864 | USD 0.5365 |
| 2   | `2026-11-05-bf738eb8-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault-2` | 58/64 (90.6%)                             | 5,140,852 | 41,402 | USD 0.5348 |
| 3   | `2026-11-05-bf738eb8-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault-3` | 58/64 (90.6%)                             | 5,099,864 | 42,276 | USD 0.5311 |

Run 2 had one ERROR, an HTTP 503 in `compound-proposal-two-friends-place-event`, which failed in no other run.

#### The holdout

| Item        | Value                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Date        | 2026-11-05, 09:44–09:48 KST                                                                      |
| Commit      | `55d882bc`                                                                                       |
| Command     | `pnpm eval:holdout --model anthropic/claude-haiku-5.5 --budget 0.6 --yes`                        |
| Result file | `2026-11-05-55d882bc-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-holdout` |
| Usage       | 36 turns; input 2,984,619, output 28,697; USD 0.3128                                             |

Beside the same 12 cases in this set's P4 run, read as for the before set, and the before set's holdout:

| Measure               | Holdout, after | Same 12 fixed-set cases, after | Holdout, before |
| --------------------- | -------------- | ------------------------------ | --------------- |
| Overall               | 27/36 (75.0%)  | 26/36 (72.2%)                  | 23/36 (63.9%)   |
| free-time-parties     | 6/12 (50.0%)   | 5/12 (41.7%)                   | 4/12 (33.3%)    |
| free-time-meals       | 9/12 (75.0%)   | 10/12 (83.3%)                  | 9/12 (75.0%)    |
| free-time-common      | 12/12 (100.0%) | 11/12 (91.7%)                  | 10/12 (83.3%)   |
| Action                | 36/36 (100.0%) | 35/36 (97.2%)                  | 36/36 (100.0%)  |
| Tools                 | 33/36 (91.7%)  | 35/36 (97.2%)                  | 35/36 (97.2%)   |
| Arguments             | 34/36 (94.4%)  | 36/36 (100.0%)                 | 35/36 (97.2%)   |
| Cards and map buttons | 30/33 (90.9%)  | 32/33 (97.0%)                  | 30/33 (90.9%)   |
| Proposal              | 3/3 (100.0%)   | 3/3 (100.0%)                   | 3/3 (100.0%)    |
| Words                 | 24/33 (72.7%)  | 23/33 (69.7%)                  | 22/33 (66.7%)   |

The holdout would take P11's runs over the USD 10 the PM had approved, and the PM approved running it on 2026-11-05. P11's runs cost USD 10.1710 by the scorecards: USD 2.9966 for the before set, USD 4.1801 for the four changes' runs and USD 2.9943 for the after set.

#### The regression

Read by the frozen rule: the after set's three P19 runs against R0's three (`28c0ce1`, suffixes `-2`, `-3`, `-4`, 1,000 output tokens), over the 62 cases of the fixed set. A case fails a run when any of its repetitions in that run failed. X's three runs tell a case broken by another task since R0 from one broken by P11.

**Read by it, this is a fail, with six cases. None newly fails because of P11's code:** each also fails in at least 2 of X's 3 runs.

| Case                                 | Failed runs, R0 → X → after | Whose                               | Where it fails in the after runs |
| ------------------------------------ | --------------------------- | ----------------------------------- | -------------------------------- |
| `follow-up-yes-after-menus`          | 0 → 3 → 3                   | P04's chat; change 1 did not fix it | Action, tools, Proposal          |
| `follow-up-seven-oclock`             | 1 → 2 → 2                   | P04's chat                          | Words alone                      |
| `ask-missing-fields-in-one-question` | 0 → 3 → 3                   | Another task, between R0 and X      | Action                           |
| `ask-which-festival-event`           | 0 → 3 → 3                   | Another task, between R0 and X      | Action, words                    |
| `global-events-tonight-talk`         | 0 → 3 → 3                   | Another task, between R0 and X      | Arguments                        |
| `making-parties-for-event`           | 0 → 3 → 3                   | Another task, between R0 and X      | Action, tools, Proposal          |

`compound-menus-and-shuttle`, P04's other words-only regression, failed in no after run, so it no longer newly fails.

**`follow-up-yes-after-menus` still fails, in all 3 after runs.** After "응 김지은이랑", the model called `resolveFriend`, then `findMealRestaurants`, `showRestaurants` and `showOnMap`, twice also `getMenus`, and never `proposeQuest`, as at X. Its replies point to the card's 파티 만들기. Change 1 was judged by the P4 suite, which does not hold this case. It is recorded as a fail of P04's chat that P11's change did not fix, for P20.

**`follow-up-seven-oclock` still newly fails**, for the same cause as at P04: the Proposal is right at 19:00, and the 2 failed runs move the time without the words 오전, 아침 or 07:00 that check it against the morning.

Regressions remain after the prompt was changed, so by ADR 0009 a router is reconsidered in iteration 4.

### Merging `3.0/Main`

After the after set, at 09:48 KST on 2026-11-05, the branch merged `3.0/Main`. Its tip was still X, so nothing came in.

At 18:12 KST the branch merged `3.0/Main` again, to pass CI after the Judgement tests' dates were fixed. In came the walking scorer (#200), those tests' new dates (#208) and P12's spec (#206). None of them changes `src/`, so the code measured above is the code this branch brings.

### Smoke run, not scored

| Item        | Value                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Cases       | `parties-named-classes`, 3 runs                                                                                                             |
| Date        | 2026-11-01, 17:32 KST                                                                                                                       |
| Commit      | `871886a`                                                                                                                                   |
| Command     | `pnpm eval --world p4 --case parties-named-classes --model anthropic/claude-haiku-5.5 --budget 0.5`                                         |
| Model       | `anthropic/claude-haiku-5.5`; that day's `canonical_slug` was `anthropic/claude-haiku-5.5-20261007`, as P05's R0 looked it up on 2026-11-01 |
| Decoding    | Provider defaults: no temperature, top-p or seed passed                                                                                     |
| Limits      | 8 steps, 30 s, 1,000 output tokens                                                                                                          |
| Usage       | Input 172,383, output 3,232, USD 0.0189                                                                                                     |
| Result file | `eval/results/2026-11-01-871886a-anthropic_claude-haiku-5.5-s8-t30000-o1000-tempdefault-toppdefault`, kept locally and not committed        |

It was run to see that the suite reaches the real model. It is not scored, and nothing changed because of it. Its finding, a reply that leaves out the gap and the count, is not fixed before the first official run.

## The regression of tickets 03 and 05

Read from runs that exist. Nothing was run for this.

| Set      | Commit    | Runs                                                             | What it is                                                                    |
| -------- | --------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Baseline | `28c0ce1` | P05's R0, P19 runs with suffixes `-2`, `-3`, `-4`                | In place of `c94bcc7`, which never ran. Same assistant code, model and limits |
| Later    | `871886a` | P05's R0p, P19 runs of `871886a7` with suffixes `-3`, `-4`, `-5` | P04's chat, with no change of P05                                             |

All six are Haiku 5.5 with 8 steps, 30 s and 1,000 output tokens. The result files are in `eval/results/`, and each run holds the 62 cases of the fixed set. A case fails a run when any of its repetitions in that run failed.

### The result

The rule stands: a case newly fails when it fails in at least 2 later runs and at most 1 baseline run, and no case may newly fail. **Read by it, this is a fail, with three cases.**

| Case                         | Failed runs, baseline → later | Where it failed in the later runs | From P04's tools?  |
| ---------------------------- | ----------------------------- | --------------------------------- | ------------------ |
| `follow-up-yes-after-menus`  | 0 → 3                         | Action, tools, Proposal           | Yes                |
| `compound-menus-and-shuttle` | 1 → 2                         | Words alone                       | No new tool called |
| `follow-up-seven-oclock`     | 1 → 2                         | Words alone                       | No new tool called |

The other cases that moved did not newly fail. 8 failed less often, and 4 failed in one run more without reaching the rule.

### Why each one failed

**`follow-up-yes-after-menus`.** The User asked "내일 학생회관에서 점심", the Assistant offered to set up the lunch and asked who comes, and the User said "응 김지은이랑". In all 3 baseline runs the model called `proposeQuest`. In all 3 later runs it called `resolveFriend`, then `findMealRestaurants` and `showRestaurants`, and never `proposeQuest`. The third also ended in an empty reply and a 503.

By the 공강 rules, **the case's `proposeQuest` is right and `findMealRestaurants` is wrong.** `findMealRestaurants` is for Friends with a day and a meal and no Place, and a request that names a Place is a 파티 to propose. Here the conversation names 학생회관, and "응 김지은이랑" only answers the Assistant's question about it. The case and its label stand. It is the one real tool-choice fault of the three.

The model did keep the earlier turns: it passed tomorrow's lunch and showed only 학생회관식당. So it took 학생회관 as which Restaurant to show, not as a Place named in the request. Two things in the rules may lead there, and the traces cannot tell which did. They do not say in words that a Place from an earlier turn counts, and their follow-up rule says a follow-up calls `resolveFriend` and then `findMealRestaurants` again.

**`compound-menus-and-shuttle`.** The tools, their arguments and the two map buttons are right in all 3 later runs. In the 2 failed runs the reply says only that the menus and the shuttle are on the map ("지도에 표시해 두었어요"), with neither the dishes nor the stops. The baseline's one failure was of another kind, an empty reply and a 503.

**`follow-up-seven-oclock`.** The Proposal is right in all 6 runs, at 19:00, and no new tool is called. The case also wants the reply to check the time against the morning, through the words 오전, 아침 or 07:00. The 2 failed later runs say the time moved from lunch to dinner and offer to change it back, without those words. The baseline's one failure was of the same kind.

The last two are a change of one run each, on replies that vary between runs. These traces cannot tell whether P04's longer prompt caused them.

### Calls to new tools

The baseline could call none. The later runs made 22 calls in 6 cases, none of them to `findFreeTimeEvents`:

| Case                                | `findFreeFriends` | `findMealRestaurants` | `showRestaurants` | `getMyDay` |
| ----------------------------------- | ----------------: | --------------------: | ----------------: | ---------: |
| `follow-up-yes-after-menus`         |                   |                     3 |                 3 |            |
| `live-which-minsu`                  |                 2 |                     1 |                 1 |          1 |
| `follow-up-second-same-name-friend` |                 3 |                       |                   |            |
| `ask-which-same-name-friend`        |                 3 |                       |                   |            |
| `ask-lunch-already-past`            |                 3 |                       |                   |            |
| `ask-which-minsu`                   |                 2 |                       |                   |            |
| **All**                             |            **13** |                 **4** |             **4** |      **1** |

### Tokens and cost per turn

| Measure            |    Baseline |       Later | Change |
| ------------------ | ----------: | ----------: | -----: |
| Turns              |         224 |         223 |        |
| Input per turn     |      19,236 |      34,970 |   +82% |
| Output per turn    |         474 |         507 |    +7% |
| Cost per turn      | USD 0.00216 | USD 0.00375 |   +74% |
| Input per run      |   1,436,299 |   2,599,465 |   +81% |
| Cost of the 3 runs |    USD 0.48 |    USD 0.84 |   +73% |

No run read or wrote the prompt cache.
