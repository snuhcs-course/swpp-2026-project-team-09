# The record of the P4 suite's runs

One entry per official run: the model with its `canonical_slug` that day, the decoding settings, the limits, the commit, the date, the command and the scores. Each run after the first adds one line: hypothesis → what changed → the cases that changed → kept or reverted. A change that makes things worse is reverted, and the revert stays here. The rules for P11 are in [ticket 06](../../../.scratch/iteration-3/P04-free-time-meals-parties/issues/06-evaluation-diagnostics.md).

The walked times stay in ticket 01's `## Comments`, as the walking evaluation says, and the real rides in ticket 02's. The wiki gets the summary in P20.

## The holdout

`pnpm eval:holdout` runs the 12 reworded cases of `holdout.yaml`, 3 times each. It runs twice: with the first official run, and on the final code of P11.

- Only the pass rates and the layer rates are read. The holdout's scorecard gives those, with what the run cost and its settings, and names no case and holds no reply.
- No holdout failure is opened until P11 is over.
- An entry sets the holdout's pass rate beside that of the same 12 fixed-set cases in the official run on that commit. The official scorecard gives that rate.

## Runs

No official run yet. It waits for P05's ticket 10a and for a person to confirm the cost.

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
