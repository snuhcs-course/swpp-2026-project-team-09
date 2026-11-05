# Holdout scorecard: 2026-11-05-55d882bc-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-holdout

## The P4 holdout

Only these rates are read. No holdout failure is opened until P11 is over, so this file names no case and holds no reply. Its pass rate is set beside that of the same 12 cases in the official run on this commit.

| Measure | Passed |
| --- | --- |
| Overall | 27/36 (75.0%) |
| free-time-parties | 6/12 (50.0%) |
| free-time-meals | 9/12 (75.0%) |
| free-time-common | 12/12 (100.0%) |

### By layer

A run counts in a layer only when its case checks that layer. The action is read as if the words were right, so that a question or a "none" without its words fails in the words alone.

| Layer | Passed |
| --- | --- |
| Action | 36/36 (100.0%) |
| Tools | 33/36 (91.7%) |
| Arguments | 34/36 (94.4%) |
| Cards and map buttons | 30/33 (90.9%) |
| Proposal | 3/3 (100.0%) |
| Words | 24/33 (72.7%) |

## Steps, latency and cost

| Turns | Average steps | Average latency | Tokens in | Cache read | Cache write | Tokens out | Estimated cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 3.14 | 5.9 s | 2,984,619 | 0 | 0 | 28,697 | USD 0.3128 |

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
| commit | 55d882bc |
