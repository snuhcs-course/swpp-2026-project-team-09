# Scorecard: 2026-11-18-d4774178-anthropic-claude-haiku-5-5-s8-t30000-o4000-tempdefault-toppdefault-cachebreakpoints

## Action recall

A turn counts toward the kinds of the action it took when the case accepts it, else of the first action the case accepts; it is recalled when the action it took is accepted and, when it asks, the text holds the case's mentions. Known failures are included.

| Kind | Expected | Recalled | Recall |
| --- | --- | --- | --- |
| TOOL | 0 | 0 | — |
| ASK | 0 | 0 | — |
| PROPOSE | 0 | 0 | — |
| REFUSE | 0 | 0 | — |
| CHAT | 0 | 0 | — |

## Expected and observed actions

For diagnosis only: the observed action is read without the case, the last sentence asking back by a fixed list of cues (`ASK_CUES` in eval/observed.ts) or the trace calling for a question. NO_TOOL is a reply with no tool and no question, REFUSE and CHAT alike; NONE called tools and took none of the kinds.

No scored turn.

## Tools

| Measure | Value |
| --- | --- |
| Tool selection accuracy | 0/0 (—) |
| Argument accuracy | 0/0 (—) |
| Over-calling | 0/0 (—) of turns, 0 calls |
| Under-calling | 0/0 (—) of turns, 0 tools |

## Pass rate per category

Known failures are counted apart and never as regressions. Failure kinds count the scored turns that failed so.

| Category | Passed | Known failures passed | STEP_LIMIT | TIMEOUT | ERROR |
| --- | --- | --- | --- | --- | --- |
| adhoc-campus-terms | 0/7 (0.0%) | 0/0 | 0 | 0 | 0 |
| **All** | 0/7 (0.0%) | 0/0 | 0 | 0 | 0 |

## pass^k

No case ran more than once.

## Steps, latency and cost

| Turns | Average steps | Average latency | Tokens in | Cache read | Cache write | Tokens out | Estimated cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | 2.43 | 4.5 s | 466,845 | 461,227 | 5,570 | 4,452 | USD 0.0075 |

## Settings

| Setting | Value |
| --- | --- |
| provider | anthropic |
| cache | breakpoints |
| model | claude-haiku-5-5 |
| temperature | default |
| topP | default |
| maxSteps | 8 |
| timeoutMs | 30000 |
| maxOutputTokens | 4000 |
| repeat | default |
| categories | adhoc-campus-terms |
| caseIds | all |
| budgetUsd | 0.2 |
| world | small |
| commit | d4774178 |

## Failed cases

### adhoc-terms-lower-engineering (adhoc-campus-terms)

- The case has no expectation to score.

### adhoc-terms-student-center-menu (adhoc-campus-terms)

- The case has no expectation to score.

### adhoc-terms-central-library-seat (adhoc-campus-terms)

- The case has no expectation to score.

### adhoc-terms-thousand-won-meal (adhoc-campus-terms)

- The case has no expectation to score.

### adhoc-terms-department-room (adhoc-campus-terms)

- The case has no expectation to score.

### adhoc-terms-upper-engineering-to-dorm (adhoc-campus-terms)

- The case has no expectation to score.

### adhoc-terms-stadium-party (adhoc-campus-terms)

- The case has no expectation to score.

## Replies to review

Every reply of a case that accepts REFUSE or CHAT, and of the ambiguous-intent category, in full.

None.
