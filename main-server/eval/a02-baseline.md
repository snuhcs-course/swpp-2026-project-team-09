# A02 baseline: every suite on the paths production may use (2026-11-15)

A02 ticket 05 (`.scratch/iteration-4/A02-llm-provider-and-key-switch/issues/05-baseline-and-docs.md`). After A02 an Administrator chooses the AI's key, and with it the provider, on the admin site. This record runs the eval suites on both providers, so that later work is measured against either path. Each run sits beside the last OpenRouter run of its suite **as a different condition** (metrics 4.3): the provider, the caching mode and the code all differ from that run.

**Status: partly run.** The collection evaluations ran. The chat suites (P19, the P5 small and large worlds, P6) did not: the disk of the machine that runs them was full, and the evals' PostgreSQL container could not start (`initdb: could not create directory "/var/lib/postgresql/18/docker/pg_wal": No space left on device`). They run on the same commit once space is freed, and their rows are added here.

## Conditions

| Item              | Value                                                                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit            | `edd356ae3ce028354203302f5f4e2d5c2415b6e7` (branch `4.0/A02-05-baseline-and-docs`): A02 tickets 01–04 on `4.0/Main`, the import fix below, and this ticket's estimate. `git status --porcelain --untracked-files=all` was empty before every run.   |
| Import fix        | `src/common/settings.ts` imported `./llm-keys.js`, which plain Node cannot resolve, so `pnpm eval` stopped with `ERR_MODULE_NOT_FOUND` before asking. The commit before `edd356ae` imports `./llm-keys.ts`; the built server is the same.           |
| Path              | `--provider anthropic`, model `claude-haiku-5-5`, `--cache breakpoints`; or `--provider openrouter`, model `anthropic/claude-haiku-5.5`, nothing cached. Keys: `ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY` in `main-server/.env`, never `llm.key`. |
| Decoding          | The provider's defaults. On Anthropic the port sends effort `medium`.                                                                                                                                                                               |
| Limits            | Chat: 8 steps, 30 s, 4,000 output tokens, today's defaults. Judgement and same-event choice: their own, 60 s and 4,000 output tokens, one call per post.                                                                                            |
| Changed condition | **A01's retry**: a call that fails with 429 or 529 is sent once more. The last OpenRouter collection runs had none. The scorecards say "429·529에만 한 번 재시도".                                                                                  |
| Prices            | `eval/cost.ts`: USD 0.10 in and 0.50 out per million tokens on both; on Anthropic a cache read is 0.1x and a write 1.25x.                                                                                                                           |
| Order             | One eval at a time, under the shared lock `/tmp/claude-0/itest.lock`.                                                                                                                                                                               |
| Who ran it        | An agent (Claude Opus 5.5) for 안진영, who approved up to USD 10 for the baseline on 2026-11-15.                                                                                                                                                    |

## Collection evaluations (A and B), Anthropic only

Beside `40cb60e5` (P12 after set, 2026-11-06, OpenRouter, `eval/p5/p12.md`). Time per call is the run's test time over its calls, which go one after another. The cache hit rate is cache reads over all input tokens.

| Run                         | Provider   | Calls | Input   | Cache read | Cache write | Output  | Hit rate | Cost       | Per call | Time per call |
| --------------------------- | ---------- | ----- | ------- | ---------- | ----------- | ------- | -------- | ---------- | -------- | ------------- |
| A `judgement`, `40cb60e5`   | OpenRouter | 141   | 279,979 | 0          | 0           | 110,785 | 0.0%     | USD 0.0834 | 0.00059  | 4.0 s         |
| A `judgement`, run 1        | Anthropic  | 141   | 280,402 | 150,080    | 1,072       | 117,841 | 53.5%    | USD 0.0735 | 0.00052  | 4.1 s         |
| A `judgement`, run 2        | Anthropic  | 141   | 280,402 | 151,152    | 0           | 108,204 | 53.9%    | USD 0.0685 | 0.00049  | 3.8 s         |
| B `ai-choice`, `40cb60e5`   | OpenRouter | 14    | 42,978  | 0          | 0           | 4,507   | 0.0%     | USD 0.0066 | 0.00047  | 41 s in all   |
| B `ai-choice`, from A run 1 | Anthropic  | 14    | 42,988  | 9,334      | 718         | 4,058   | 21.7%    | USD 0.0055 | 0.00039  | 43 s in all   |

Run 2 wrote nothing to the cache: run 1's entry, written a minute before, was still alive. The input counts are the same on both paths, so the two providers count the prompt alike.

### Evaluation A

| Metric             | Floor / target   | OpenRouter `40cb60e5`    | Anthropic run 1       | Anthropic run 2 |
| ------------------ | ---------------- | ------------------------ | --------------------- | --------------- |
| C1                 | >= 0.25 / >= 0.6 | 40/64                    | 35/64                 | 38/64           |
| C2                 | <= 1/30 / = 0    | 1/41                     | **7/42, floor FAIL**  | 0/38            |
| C3                 | = 0 / = 0        | 1 (a-021, a label error) | **7**                 | 0               |
| C4 schema valid    | = 1              | 60/60                    | 59/60                 | 60/60           |
| C4 start precision | >= 0.9 / >= 0.95 | 60/64                    | **59/70, floor FAIL** | 60/64           |
| C5                 | = 0              | 0                        | 0                     | 0               |
| C6                 | >= 0.8 / >= 0.95 | 61/85                    | 63/85                 | 62/85           |
| C7                 | = 0              | 0                        | 0                     | 0               |

**C2 and C3 moved past noise in run 1, and all seven come from one post.** a-071 (`extra-PGM012001974`, one lecture of a graduate lecture series, on 11-06 at 61동) was read as all eight lectures of the series, from the schedule in its body: 09-04 to 11-13, seven at 61동 320호 and one at 43-1동 201호. The server's checks passed each of them, so seven sessions the gold does not have were published. The same seven starts put C4's start precision (59/70) under its floor. Both independent OpenRouter readings (`fed4a2e0`, and `40cb60e5`) and Anthropic run 2 read the one session. So that one post was read wrongly in 1 of 2 Anthropic runs and 0 of 2 OpenRouter runs: too few to tell the provider apart from sampling. A01 already saw one-post swings on the development part (`caching-experiment.md`). What it shows is that **one misread post with many sessions crosses C2's and C3's floors at once.** `AUTOMATIC_JUDGEMENT` is off in Production; before it is turned on with an Anthropic key, evaluation A should run again on that path.

**The code did not move it.** The OpenRouter answers of `40cb60e5`, replayed on `edd356ae` with no model (`pnpm eval:collection --run judgement --part held-out --from eval/results/collection-held-out-judgement-40cb60e5.json --no-model`), score exactly as they did on `40cb60e5`: C1 40/64, C2 1/41, C3 1, C4 schema 60/60, C6 61/85. That replay is not committed.

C1 (35 and 38 against 40 of 64) and C6 (63 and 62 against 61 of 85) are within what earlier runs of one code show. Run 1's one schema failure is a-005 (`AI_NoObjectGeneratedError`); OpenRouter had one too before P12 (b-082's post, 59/60).

### Evaluation B

| Metric                   | OpenRouter `40cb60e5`                  | Anthropic                              |
| ------------------------ | -------------------------------------- | -------------------------------------- |
| D1 (floor = 0)           | 0                                      | 0                                      |
| D2 TP / FP / FN          | 1 / 0 / 31                             | 1 / 0 / 31                             |
| D2 recall with the queue | 9/32                                   | 10/32                                  |
| D3                       | 10/32                                  | 10/32                                  |
| D4                       | 15/83                                  | 16/83                                  |
| D4 reasons               | link 8, AI unsure 5, place unchecked 2 | link 8, AI unsure 6, place unchecked 2 |
| D5                       | 0/5                                    | 0/5                                    |
| D6                       | 1/32                                   | 1/32                                   |

**The two providers agree within noise on evaluation B.** One AI answer moved from a choice to "unsure", which the queue recall counts and D4 adds.

## Chat suites: not run yet

| Suite          | Providers | Beside                                            | Command (from `main-server/`)                                                                                               |
| -------------- | --------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| P19            | both      | `40cb60e5` `-3`–`-5`, 56–59/64 (`eval/p5/p12.md`) | `pnpm eval --provider openrouter --budget 1.5 --yes`; `pnpm eval --provider anthropic --cache breakpoints --budget 1 --yes` |
| P5 small world | both      | `40cb60e5`, 246/300 (`eval/p5/p12.md`)            | `pnpm eval --world p5 --provider <p> [--cache breakpoints] --budget 5 --yes`                                                |
| P5 large world | Anthropic | `40cb60e5` `-2`, 162/240 (`eval/p5/p12.md`)       | `pnpm eval --world large-world-v1 --provider anthropic --cache breakpoints --budget 2 --yes`                                |
| P6             | Anthropic | `869acde2` `-3`, 140/192 (`eval/p6/r1.md`)        | `pnpm eval --world p6 --provider anthropic --cache breakpoints --budget 1 --yes`                                            |

The first attempt, P19 on Anthropic, stopped before any model call, so it cost nothing. The runs go in a detached worktree at `edd356ae`, so that they measure the same commit as the collection runs.

## Commands

From `main-server/`, with `npx -y pnpm@12.6` as `pnpm` and Node 24.14.0:

```sh
pnpm eval:collection --run judgement --part held-out --provider anthropic --cache breakpoints --budget 1   # run 1
pnpm eval:collection --run ai-choice --part held-out --from eval/results/collection-held-out-judgement-anthropic-cachebreakpoints-edd356ae.json --provider anthropic --cache breakpoints --budget 1
pnpm eval:collection --run judgement --part held-out --provider anthropic --cache breakpoints --budget 1   # run 2, renamed -2
```

Run 2 writes the same file name as run 1; it was renamed `…-edd356ae-2` and run 1's files put back.

## Results

In `eval/results/`, each `.json` with its `.md` scorecard, committed with `git add -f`:

- `collection-held-out-judgement-anthropic-cachebreakpoints-edd356ae` (A, run 1)
- `collection-held-out-judgement-anthropic-cachebreakpoints-edd356ae-2` (A, run 2)
- `collection-held-out-ai-choice-anthropic-cachebreakpoints-edd356ae` (B, from run 1)

## Cost

| Run                                            | Provider  | Estimate | Measured   |
| ---------------------------------------------- | --------- | -------- | ---------- |
| P19 (first attempt, stopped before any call)   | Anthropic | 0.11     | 0.0000     |
| A `judgement`, run 1                           | Anthropic | 0.10     | 0.0735     |
| B `ai-choice`                                  | Anthropic | 0.01     | 0.0055     |
| A `judgement`, run 2 (added to read C2 and C3) | Anthropic | 0.10     | 0.0685     |
| **Anthropic**                                  |           |          | **0.1475** |
| **OpenRouter**                                 |           |          | **0.0000** |
| **All so far**                                 |           |          | **0.1475** |
