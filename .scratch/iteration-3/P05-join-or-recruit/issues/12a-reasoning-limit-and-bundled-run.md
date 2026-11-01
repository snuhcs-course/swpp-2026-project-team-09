# 12a: Reasoning leaves room for the answer, and the bundled run

**What to build:** A model call's reasoning no longer uses up its output limit, so that a run does not end with no answer. Then one full evaluation measures tickets 10, 11, 12 and this one together. Cause: `main-server/eval/p5/r0a.md`, "출력 한도에 잘린 실행".

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Reasoning cannot use up the output limit, by a higher `maxOutputTokens` or a reasoning setting, whichever works on this model through OpenRouter. The ticket records which it chose and why.
- [ ] Its effect is checked with `pnpm eval --world large-world-v1 --case` on the cases with a cut step in R0a: `large-v-01`, `large-v-02`, `large-v-04`, `large-v-05`, `large-l-03`, `large-t2-03`, `large-h-03`, `large-s-04`, `large-o-03`, `large-o-05`, `large-c-01`, `large-c-07`, `large-c-11`, `large-c-13`.
- [ ] R1, the bundled run, is run in both worlds, with P19 three times on the same commit for G1, compared with R0a and recorded beside it with a failure analysis. Its cost and command are approved before it runs. A setting of the run's limits that changed is written as that run's condition (metrics 4.3).
- [ ] The record says that R1 holds four changes against metrics 4.4, and reads them apart as far as they go: the large world's server recall tests for tickets 10 and 11, the J metrics for ticket 12, `length` steps and no-text 503s for this ticket. What does not split is said so.
- [ ] A sample of R1's joined replies is read and counted as in R0a, for ticket 11's rule.

## Comments

### The bundle (2026-11-01)

The P05 owner decided to run one full evaluation after tickets 10, 11, 12 and this one, in place of R1, R2 and R3 and a run of its own: each full run takes about 66 minutes and USD 3.25, and the next ticket needs the code, not the run. So no run tells which ticket moved a metric. If R1 misses a floor or G1, that is looked into with `--case`, and a fix may need another full run.
