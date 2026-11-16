# A02 baseline: every suite on the paths production may use (2026-11-15–16)

A02 ticket 05 (`.scratch/iteration-4/A02-llm-provider-and-key-switch/issues/05-baseline-and-docs.md`). After A02 an Administrator chooses the AI's key, and with it the provider, on the admin site. This record runs the eval suites on both providers, so that later work is measured against either path. Each run sits beside the last OpenRouter run of its suite **as a different condition** (metrics 4.3): the provider, the caching mode and the code all differ from that run.

**Status: all but one run.** Every suite ran on `edd356ae`, except the P5 small world on OpenRouter: its run was interrupted when the machine slept, and the run once more was not started ("The interrupted run" below). The chat suites waited until disk space was freed: the evals' PostgreSQL container could not start on a full disk.

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
| Who ran it        | An agent (Claude Opus 5.5), within a USD 10 budget approved on 2026-11-15.                                                                                                                                                                          |

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

## Chat suites

Run on 2026-11-15 and 16 (KST) with the commit `edd356ae` checked out detached in the same worktree, the tree clean before each run. Beside `40cb60e5` (P12 after set, OpenRouter, `eval/p5/p12.md`) for P19 and P5, and `869acde2` (P6 R1, OpenRouter, `eval/p6/r1.md`) for P6. Time per turn is the scorecard's average latency. Pass counts leave out known failures.

| Run                              | Provider   | Turns                            | Input      | Cache read | Cache write | Output  | Hit rate | Cost            | Per turn      | Time per turn | Steps     | Passed        | pass^3    |
| -------------------------------- | ---------- | -------------------------------- | ---------- | ---------- | ----------- | ------- | -------- | --------------- | ------------- | ------------- | --------- | ------------- | --------- |
| P19, `40cb60e5` `-3`, `-4`, `-5` | OpenRouter | 75 each                          | 5.14–5.26M | 0          | 0           | 41–43k  | 0%       | USD 0.535–0.547 | 0.0071–0.0073 | 4.8–4.9 s     | 2.60–2.65 | 57, 59, 56/64 | 5, 5, 4/5 |
| P19                              | OpenRouter | 75                               | 5,310,183  | 0          | 0           | 41,728  | 0%       | USD 0.5519      | 0.00736       | 4.4 s         | 2.63      | 58/64         | 5/5       |
| P19                              | Anthropic  | 75                               | 5,246,892  | 5,142,504  | 103,848     | 40,474  | 98.0%    | USD 0.0847      | 0.00113       | 4.4 s         | 2.60      | 58/64         | 5/5       |
| P5 small world, `40cb60e5`       | OpenRouter | 300                              | 23,856,199 | 0          | 0           | 227,629 | 0%       | USD 2.4994      | 0.00833       | 5.9 s         | 2.92      | 246/300       | 75/100    |
| P5 small world                   | OpenRouter | not counted: interrupted (below) |            |            |             |         |          |                 |               |               |           |               |           |
| P5 small world                   | Anthropic  | 300                              | 24,751,446 | 23,941,999 | 807,069     | 227,529 | 96.7%    | USD 0.4543      | 0.00151       | 5.7 s         | 2.96      | 243/300       | 75/100    |
| P5 large world, `40cb60e5` `-2`  | OpenRouter | 240                              | 21,330,094 | 0          | 0           | 221,588 | 0%       | USD 2.2438      | 0.00935       | 6.7 s         | 2.98      | 162/240       | 49/80     |
| P5 large world                   | Anthropic  | 240                              | 21,869,529 | 20,239,840 | 1,627,773   | 228,883 | 92.5%    | USD 0.5205      | 0.00217       | 6.7 s         | 2.99      | 160/240       | 47/80     |
| P6, `869acde2` `-3`              | OpenRouter | 192                              | 10,409,554 | 0          | 0           | 112,642 | 0%       | USD 1.0973      | 0.00571       | 3.9 s         | 2.08      | 140/192       | 43/64     |
| P6                               | Anthropic  | 192                              | 10,734,814 | 10,539,360 | 194,272     | 113,087 | 98.2%    | USD 0.1863      | 0.00097       | 4.0 s         | 2.08      | 134/192       | 41/64     |

On every suite a turn costs 77–86% less on the Anthropic path, and takes the same time. Steps and input per turn are the same on both paths.

### P19: the two providers agree

Both passed 58/64 on `edd356ae`, inside the 56–59/64 of the three OpenRouter runs of `40cb60e5`, with all five repeated cases passing every run. **The two providers agree within noise.**

### P5 small world (Anthropic)

243/300 against 246/300, and 75/100 cases passing all three runs on both. The thresholds give the same floor verdicts as `40cb60e5`. Three targets change verdict, each by one or a few runs: J3b 12/12 → 11/12 (FAIL), E5 18/18 → 17/18 (FAIL), E7 243/282 → 255/282 (now PASS). J10 stays under its floor (3/12) as before. Within noise.

### P5 large world (Anthropic): E4 moved, from one case

160/240 against 162/240, pass^3 47/80 against 49/80, and every other metric within a few runs (E1 88.3% against 86.2%, E3 122/129 on both, E7 325/432 against 321/432, E9 67/141 against 65/141, E8 0). **E4, the recall of the volume subset V, fell from 149/177 to 122/177 (84.2% to 68.9%) and missed its 0.8 target.** Almost all of it is `large-v-02` ("오늘 저녁 8시 이후 파티 찾아줘", about 17 parties): in 2 of 3 runs the model showed the 3 earliest and asked what kind to narrow to, where the label wants every party shown; on `40cb60e5` it showed all of them in 3 of 3. The searches were the same. It is one case's choice between listing and narrowing, which E4 counts card by card, so one case moves it by over 10 points. One run each cannot tell the provider from sampling; a second Anthropic run of the large world would.

### P6 (Anthropic): group rooms moved, by wording

134/192 against 140/192, pass^3 41/64 against 43/64. Five categories are within a run or three of R1; refusals are 24/30 against 27/30 (one run each in three cases). **Group rooms fell from 11/21 to 6/21.** `p6-group-rooms-g201` went from 3/3 to 0/3 and `p6-group-rooms-below-min` from 2/3 to 0/3. In both, the model called the right tools and refused correctly, as the label wants, but its reply did not repeat the number the label checks for ("8명" for the app's party limit, "1명" more needed): it explained the refusal in other words. The comparison run is `869acde2`, two weeks and P13 older, so the code differs as well as the provider. This is a wording difference, not a wrong booking; it is read as a candidate for the label's `text.mentions`, not for the code.

### The interrupted run

The first OpenRouter run of the P5 small world (`…-cacheoff-interrupted`) is left out. The machine slept for about nine hours during it (test time 1,173 s, wall time 00:42 to 10:08 KST). The seeded User's access token expired over the gap, so 96 turns got the server's own `401 Unauthorized`, and 2 got 503. It reads 165/300 with 98 ERROR. The OpenRouter key itself was fine (checked afterwards, USD 51.52 left). It cost USD 1.7601.

**It was not repeated:** the session's permission check refused the command for the run once more, and no new paid run was started after that, so the P5 small world has no OpenRouter row on `edd356ae` yet, and whether the two providers agree on it is not measured. The command is `pnpm eval --world p5 --provider openrouter --budget 4 --yes` at `edd356ae`; its estimate is USD 2.6 (the interrupted run's 202 answered turns cost USD 1.76).

## Commands

From `main-server/`, with `npx -y pnpm@12.6` as `pnpm` and Node 24.14.0:

```sh
pnpm eval:collection --run judgement --part held-out --provider anthropic --cache breakpoints --budget 1   # run 1
pnpm eval:collection --run ai-choice --part held-out --from eval/results/collection-held-out-judgement-anthropic-cachebreakpoints-edd356ae.json --provider anthropic --cache breakpoints --budget 1
pnpm eval:collection --run judgement --part held-out --provider anthropic --cache breakpoints --budget 1   # run 2, renamed -2
pnpm eval --provider anthropic --cache breakpoints --budget 1 --yes
pnpm eval --provider openrouter --budget 1.5 --yes
pnpm eval --world p5 --provider anthropic --cache breakpoints --budget 1.5 --yes
pnpm eval --world large-world-v1 --provider anthropic --cache breakpoints --budget 2 --yes
pnpm eval --world p6 --provider anthropic --cache breakpoints --budget 1 --yes
pnpm eval --world p5 --provider openrouter --budget 5 --yes   # interrupted
```

Run 2 writes the same file name as run 1; it was renamed `…-edd356ae-2` and run 1's files put back.

## Results

In `eval/results/`, each `.json` with its `.md` scorecard, committed with `git add -f`:

- `collection-held-out-judgement-anthropic-cachebreakpoints-edd356ae` (A, run 1)
- `collection-held-out-judgement-anthropic-cachebreakpoints-edd356ae-2` (A, run 2)
- `collection-held-out-ai-choice-anthropic-cachebreakpoints-edd356ae` (B, from run 1)
- `2026-11-15-edd356ae-anthropic-claude-haiku-5-5-s8-t30000-o4000-tempdefault-toppdefault-cachebreakpoints` (P19) and `…-2` (P5 small world)
- `2026-11-15-edd356ae-openrouter-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-cacheoff` (P19)
- `2026-11-16-edd356ae-anthropic-claude-haiku-5-5-s8-t30000-o4000-tempdefault-toppdefault-cachebreakpoints` (P5 large world) and `…-2` (P6)
- `2026-11-16-edd356ae-openrouter-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault-cacheoff-interrupted` (P5 small world, not counted)

## Cost

| Run                                            | Provider   | Estimate | Measured   |
| ---------------------------------------------- | ---------- | -------- | ---------- |
| P19 (first attempt, stopped before any call)   | Anthropic  | 0.11     | 0.0000     |
| A `judgement`, run 1                           | Anthropic  | 0.10     | 0.0735     |
| B `ai-choice`                                  | Anthropic  | 0.01     | 0.0055     |
| A `judgement`, run 2 (added to read C2 and C3) | Anthropic  | 0.10     | 0.0685     |
| P19                                            | Anthropic  | 0.11     | 0.0847     |
| P5 small world                                 | Anthropic  | 0.52     | 0.4543     |
| P5 large world                                 | Anthropic  | 0.56     | 0.5205     |
| P6                                             | Anthropic  | 0.25     | 0.1863     |
| P19                                            | OpenRouter | 0.71     | 0.5519     |
| P5 small world (interrupted)                   | OpenRouter | 3.25     | 1.7601     |
| **Anthropic**                                  |            | 1.55     | **1.3933** |
| **OpenRouter**                                 |            | 3.96     | **2.3120** |
| **All**                                        |            | 5.51     | **3.7053** |
