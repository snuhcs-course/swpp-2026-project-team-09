# Holdout scorecard: 2026-11-05-74d5a0e8-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-holdout

## The P4 holdout

Only these rates are read. No holdout failure is opened until P11 is over, so this file names no case and holds no reply. Its pass rate is set beside that of the same 12 cases in the official run on this commit.

| Measure | Passed |
| --- | --- |
| Overall | 23/36 (63.9%) |
| free-time-parties | 4/12 (33.3%) |
| free-time-meals | 9/12 (75.0%) |
| free-time-common | 10/12 (83.3%) |

### By layer

A run counts in a layer only when its case checks that layer. The action is read as if the words were right, so that a question or a "none" without its words fails in the words alone.

| Layer | Passed |
| --- | --- |
| Action | 36/36 (100.0%) |
| Tools | 35/36 (97.2%) |
| Arguments | 35/36 (97.2%) |
| Cards and map buttons | 30/33 (90.9%) |
| Proposal | 3/3 (100.0%) |
| Words | 22/33 (66.7%) |

## Steps, latency and cost

| Turns | Average steps | Average latency | Tokens in | Cache read | Cache write | Tokens out | Estimated cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 3.42 | 6.9 s | 3,254,484 | 0 | 0 | 31,111 | USD 0.3410 |

## Settings

| Setting | Value |
| --- | --- |
| model | anthropic/claude-haiku-5.5 |
| temperature | default |
| topP | default |
| maxSteps | 8 |
| timeoutMs | 30000 |
| maxOutputTokens | 4000 |
| repeat | default |
| categories | all |
| caseIds | all |
| budgetUsd | 0.6 |
| world | p4 |
| holdout | true |
| commit | 74d5a0e8 |
