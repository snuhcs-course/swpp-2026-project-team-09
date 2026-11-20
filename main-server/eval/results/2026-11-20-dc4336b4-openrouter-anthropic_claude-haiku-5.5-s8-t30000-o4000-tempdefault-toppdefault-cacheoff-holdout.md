# Holdout scorecard: 2026-11-20-dc4336b4-openrouter-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-cacheoff-holdout

## The P4 holdout

Only these rates are read. No holdout failure is opened until P11 is over, so this file names no case and holds no reply. Its pass rate is set beside that of the same 12 cases in the official run on this commit.

| Measure | Passed |
| --- | --- |
| Overall | 15/36 (41.7%) |
| free-time-parties | 2/12 (16.7%) |
| free-time-meals | 6/12 (50.0%) |
| free-time-common | 7/12 (58.3%) |

### By layer

A run counts in a layer only when its case checks that layer. The action is read as if the words were right, so that a question or a "none" without its words fails in the words alone.

| Layer | Passed |
| --- | --- |
| Action | 35/36 (97.2%) |
| Tools | 33/36 (91.7%) |
| Arguments | 32/36 (88.9%) |
| Cards and map buttons | 32/33 (97.0%) |
| Proposal | 3/3 (100.0%) |
| Words | 15/33 (45.5%) |

## Steps, latency and cost

| Turns | Average steps | Average latency | Tokens in | Cache read | Cache write | Tokens out | Estimated cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36 | 3.22 | 5.8 s | 3,259,685 | 0 | 0 | 29,931 | USD 0.3409 |

## Settings

| Setting | Value |
| --- | --- |
| provider | openrouter |
| cache | off |
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
| commit | dc4336b4 |
