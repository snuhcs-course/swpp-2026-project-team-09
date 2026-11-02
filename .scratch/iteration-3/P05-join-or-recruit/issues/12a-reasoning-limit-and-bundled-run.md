# 12a: Reasoning leaves room for the answer, and the bundled run

**What to build:** A model call's reasoning no longer uses up its output limit, so that a run does not end with no answer. Then one full evaluation measures tickets 10, 11, 12 and this one together. Cause: `main-server/eval/p5/r0a.md`, "출력 한도에 잘린 실행".

**Blocked by:** 12

**Status:** ready-for-agent

- [x] Reasoning cannot use up the output limit, by a higher `maxOutputTokens` or a reasoning setting, whichever works on this model through OpenRouter. The ticket records which it chose and why.
- [x] Its effect is checked with `pnpm eval --world large-world-v1 --case` on the cases with a cut step in R0a: `large-v-01`, `large-v-02`, `large-v-04`, `large-v-05`, `large-l-03`, `large-t2-03`, `large-h-03`, `large-s-04`, `large-o-03`, `large-o-05`, `large-c-01`, `large-c-07`, `large-c-11`, `large-c-13`.
- [x] R1, the bundled run, is run in both worlds, with P19 three times on the same commit for G1, compared with R0a and recorded beside it with a failure analysis. Its cost and command are approved before it runs. A setting of the run's limits that changed is written as that run's condition (metrics 4.3).
- [x] The record says that R1 holds four changes against metrics 4.4, and reads them apart as far as they go: the large world's server recall tests for tickets 10 and 11, the J metrics for ticket 12, `length` steps and no-text 503s for this ticket. What does not split is said so.
- [x] A sample of R1's joined replies is read and counted as in R0a, for ticket 11's rule.

## Comments

### The bundle (2026-11-01)

The P05 owner decided to run one full evaluation after tickets 10, 11, 12 and this one, in place of R1, R2 and R3 and a run of its own: each full run takes about 66 minutes and USD 3.25, and the next ticket needs the code, not the run. So no run tells which ticket moved a metric. If R1 misses a floor or G1, that is looked into with `--case`, and a fix may need another full run.

### Decisions (2026-11-02)

- The output limit goes from 1,000 to 4,000 tokens: the default of `ASSISTANT_MAX_OUTPUT_TOKENS`. No reasoning setting is passed.
  - OpenRouter's reasoning guide (https://openrouter.ai/docs/use-cases/reasoning-tokens, read 2026-11-02) says that the limit covers reasoning and the visible output together, and gives raising the limit as a way out of a call cut with no answer.
  - `reasoning.max_tokens` has a minimum of 1,024 on Anthropic models and must stay under the limit, so it cannot be used at 1,000 by the guide. A lower `effort` or `none` would change the reasoning of every step, in a run that already holds four changes, and raising the limit leaves it as it was. Neither was run: this rests on the guide and on that reason.
  - 4,000 is the limit the Judgements already have (`JUDGEMENT_MAX_OUTPUT_TOKENS`). At R0a's pace, about 1,000 tokens in 5.5 s, one call of 4,000 takes about 22 s, within the 30 s of a message; R0a's longest turn was 11.5 s.
  - The limit is not a hard stop on reasoning: a call could still reach 4,000. The check below saw none near it, and R1's `length` steps measure it.
- The check, `pnpm eval --world large-world-v1 --budget 1 --yes --case <the 14 cases>` at commit `914c9f76`, 2026-11-02 12:01-12:07 KST, 42 runs, USD 0.29:

  | Same 14 cases, 42 runs | R0a (1,000) | This check (4,000) |
  | --- | --- | --- |
  | `length` steps | 22 | 0 |
  | 503s with no text | 9 | 0 |
  | Steps over 1,000 output tokens | cannot exceed | 7 of 128 |
  | Most output tokens in a step | 1,000 | 1,613 |
  | Longest turn | 11.5 s | 14.5 s |
  | Timeouts | 0 | 0 |

  This check holds tickets 10, 11 and 12 as well, so it does not show this change alone. Its token counts and cost are not this change's cost either: the same cases cost 1.24 times R0a's, and input tokens rose while output tokens fell.
- No deployment file sets `ASSISTANT_MAX_OUTPUT_TOKENS` (`compose.deploy.yaml`, `infra/deploy/snu-now.env.example`, `infra/production/k8s`), so the servers take the new default. A value in a running server's own `.env` was not checked.

### R1 (2026-11-02)

R1 ran at `e171a95c`, recorded in `main-server/eval/p5/r1.md`. G1 is 3 against a floor of 2, and J9 (2/21) and J10 (3/12) miss their floors too; no instruction was changed for them and the run was not repeated. Whether to look into these with `--case` or run again is the P05 owner's call.

The owner sent R1 to review as it is (2026-11-02): G1 stays 3 in the record, and what to do about the floors it missed is left to the owner.

### Agent usage (2026-11-02)

- Agent time: about 70 minutes (estimate), one session with no subagents, summed from the transcript with gaps capped at 5 minutes. That cap leaves out most of the time waiting on R1's 70 minutes and on people.
- Tokens: input 180, with 12,556,270 cache reads and 269,284 cache writes shown apart; output 101,501. Counted before this commit.
- Eval model calls, on the OpenRouter key: USD 4.58. R1 USD 4.29 and the 14-case check USD 0.29.
