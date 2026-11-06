# 03: Every eval suite's baseline on the Anthropic path

Parent: [A01 spec](../spec.md) ("Testing Decisions")
Status: ready-for-human
Blocked by: 01, 02, 04

## What to build

One run of every suite on the Anthropic path, recorded beside the last OpenRouter run of each, so that later work is measured on the path production uses.

## Acceptance criteria

- [ ] The cost of the runs is estimated from the last runs' tokens and the Anthropic prices with caching, and 안진영 approves it before anything runs (estimate on 2026-11-02: about USD 1.5–2 for the chat suites; this ticket adds the collection evaluations' share, and states the basis: the system-prompt breakpoint read by every case after the first, and the steps of a message reading each other).
- [ ] P19, P4, P5 (small and large worlds), P6 and the collection evaluations A and B (`pnpm eval:collection`, the Judgement and the same-event choice) run once each on one commit, on the caching mode ticket 04 chose, with today's limits (8 steps, 30 s, 4,000 output tokens; the collection runs with their own).
- [ ] The estimate uses today's per-turn input, not the older runs': after P06-07 a chat turn reads about 70k input tokens, up from 44k (`eval/p6/r1.md`). P13 ticket 05 measures where the growth comes from; if it has landed, use its numbers.
- [ ] The estimate allows for P4's cases that set their own `now`: they miss the system-prompt breakpoint, so P4 caches less than the other suites. The collection runs' records name A01's retry as a changed condition.
- [ ] Each suite's record gets an "Anthropic baseline" entry beside its last OpenRouter run, marked as a different condition (metrics 4.3): pass rates, the cache hit rate, cost per turn and time.
- [ ] Any metric that moves past the noise the suite's records already show is read, and the record says what it found.

## Comments

### Estimate (2026-11-06)

안진영 approved about USD 3–4 for these runs on 2026-11-06. Each turn is priced at ticket 04's `breakpoints` cost (`../caching-experiment.md`): the input is read from the cache at 0.1x, about 1.1k tokens a turn are written at 1.25x, and the output is paid in full. Input per turn is today's. For a suite whose last run came before P06-07, it is that run's input plus about 9.7k tokens per step, which is P19's growth from 45k to 69k over 2.65 steps.

| Suite | Turns | Input a turn | Output a turn | Basis | Estimate |
| --- | --- | --- | --- | --- | --- |
| P19 | 75 | 69k | 570 | ticket 04, measured | USD 0.08 |
| P4 | 120 | 85k | 740 | P11's runs `74d5a0e8`, `bf738eb8` on `3.0/Main`. The 5 cases with their own `now` (15 turns) miss the system-prompt breakpoint, and each writes about 27k tokens once | USD 0.19 |
| P5, small world | 300 | 81k | 750 | `e171a95c`, 52k + 2.92 steps × 9.7k | USD 0.40 |
| P5, large world | 240 | 88k | 940 | `e171a95c`, 60k + 2.95 steps × 9.7k, with 3k written a turn for its long tool results | USD 0.42 |
| P6 | 192 | 54k | 590 | `869acde2`, already after P06-07 | USD 0.19 |
| Collection A (Judgement, held-out) | 141 calls | 1.9k | 810 | ticket 09's run, at ticket 04's USD 0.00052 a call | USD 0.08 |
| Collection B (AI choice, held-out) | 8 calls | 3.9k | 320 | ticket 09's run | USD 0.004 |
| **All** | | | | | **about USD 1.4**, at most 1.8 with 30% margin |

The estimate before ticket 04 was about USD 1.5–2 for the chat suites alone. The collection runs add under USD 0.1.

### Not run yet (2026-11-06)

The runs were stopped before any call. This branch is ticket 04's, on ticket 01 (`6f042872`), which is 10 commits behind `3.0/Main`. Those commits include P11's P4 fix and its official P4 runs (#204), which this branch's `eval/p4/record.md` does not have, and P12's changes to the Assistant and the Judgement (#211–#215). A baseline run here would measure code that production will not run. Its P4 entry would also sit beside OpenRouter runs on other code, so the path's effect could not be told apart from the code's.

Merging `3.0/Main` in conflicts in `adapter.ts`, `judgements.service.ts`, `eval/runner.ts`, `eval/collection/one.run.ts` and `eval/collection/report.ts`. Those are ticket 01's files, so the merge belongs on #210. Once #210 has `3.0/Main` merged in (or has merged), this branch takes it, and the runs go ahead on that commit.
