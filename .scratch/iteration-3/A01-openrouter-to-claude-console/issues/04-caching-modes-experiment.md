# 04: What each caching mode costs

Parent: [A01 spec](../spec.md) ("The model port", "Testing Decisions")
Status: ready-for-human
Blocked by: 01

## What to build

A measurement of the three caching modes on the Anthropic path, so that the default is chosen from what they cost and not from an estimate. It runs locally after ticket 01 is merged, before the baseline.

## Acceptance criteria

- [ ] The runs' cost is estimated and 안진영 approves it before anything runs (rough estimate on 2026-11-02: under USD 2 in all).
- [ ] On one commit, with today's limits:
  - **chat:** P19 (62 cases, `--repeat 1`) under `--cache off`, `--cache auto` and `--cache breakpoints`, and once more under `breakpoints` with `--repeat 3`, to see what a case's repetitions add;
  - **Judgement:** collection evaluation A under `off`, `auto` and `breakpoints`.
- [ ] A table per caller: for each mode, input, cache-read and cache-write tokens, the cache hit rate, cost in total and per turn (or per post), time per turn, and pass rate. Written to the A01 directory as `caching-experiment.md`, with the commands and the results directories.
- [ ] Pass rates are compared: caching never changes outputs, so a difference beyond the suite's run-to-run noise is read and reported.
- [ ] The finding fixes `MODEL_CACHE`'s default (expected `breakpoints`), and the spec's estimate is replaced by the measured numbers.
