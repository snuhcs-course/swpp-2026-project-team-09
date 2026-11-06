# 04: What each caching mode costs

Parent: [A01 spec](../spec.md) ("The model port", "Testing Decisions")
Status: ready-for-human
Blocked by: 01

## What to build

A measurement of the three caching modes on the Anthropic path, so that the default is chosen from what they cost and not from an estimate. It runs locally after ticket 01 is merged, before the baseline.

## Acceptance criteria

- [x] The runs' cost is estimated and 안진영 approves it before anything runs (rough estimate on 2026-11-02: under USD 2 in all).
- [x] On one commit, with today's limits:
  - **chat:** P19 (62 cases, `--repeat 1`) under `--cache off`, `--cache auto` and `--cache breakpoints`, and once more under `breakpoints` with `--repeat 3`, to see what repetitions add (`--repeat` reaches only the cases that have a `repeat` of their own, so the record says which ones);
  - **Judgement:** collection evaluation A under `off`, `auto` and `breakpoints`, on the development part (`--part development`), never held-out: cost is all this measures. Its record names A01's one retry on 429/529 as a changed condition against P05 ticket 09's "one call per post, with no retry".
- [x] A table per caller: for each mode, input, cache-read and cache-write tokens, the cache hit rate, cost in total and per turn (or per post), time per turn, and pass rate. Written to the A01 directory as `caching-experiment.md`, with the commands and the results directories.
- [x] Pass rates are compared: caching never changes outputs, so a difference beyond the suite's run-to-run noise is read and reported.
- [x] The finding fixes `MODEL_CACHE`'s default (expected `breakpoints`), and the spec's estimate is replaced by the measured numbers.

## Comments

### Results (2026-11-06)

- 안진영 approved the runs on 2026-11-06, about USD 1–2 for this ticket, within USD 6 for A01's runs. The estimate before the runs was about USD 1.1. The runs cost **USD 0.9559**, including one interrupted Judgement run of USD 0.0188.
- All runs are on commit `6f042872` (ticket 01, PR #210). The tables, commands and results directories are in [`caching-experiment.md`](../caching-experiment.md).
- **`breakpoints` stays the default**, so no code or tests change. A P19 turn costs USD 0.00110 under it, against 0.00375 under `auto` and 0.00717 under `off`, with 98.4% of the input read from the cache. A Judgement call costs USD 0.00052, against 0.00070 under `auto` (a pure surcharge) and 0.00061 under `off`. Time per turn does not change.
- No pass rate moved past noise. P19 passed 48, 45 and 48 of 54 cases, inside the 5-of-64 spread of the suite's OpenRouter records. The Judgement's C2 and C5 differ by one post (`a-014`), and other posts vary the same way between runs. That 1/13 is over C2's floor, which ticket 03 should keep in mind.
- The first Judgement `off` run lost 9 of 42 calls to a network error (`HTTP none`) while the VM's clock jumped about 9 hours. It is kept as `…-interrupted`, left out of the tables, and `off` ran again.

### Agent usage (2026-11-06)

- Agent time: about 45 minutes (an estimate). That is one agent session, of which about 35 minutes were the eight eval runs. The 9 hours that the VM's clock jumped are not counted.
- Tokens: input 188, with 9,590,008 cache reads and 705,036 cache writes shown apart; output 36,384. No subagents. Counted before the commit that added these numbers. This session goes on to ticket 03, which records its own share.
