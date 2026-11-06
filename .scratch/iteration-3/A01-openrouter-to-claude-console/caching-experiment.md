# A01 ticket 04: what each caching mode costs

Measured on 2026-11-06 (KST), on the Anthropic path, so that `MODEL_CACHE`'s default comes from what the modes cost.

## Finding

**`breakpoints` stays the default.** It is the cheapest mode for both callers, and no pass rate moved past noise.

- **Chat (P19):** a turn costs USD 0.00110 under `breakpoints`, against 0.00375 under `auto` and 0.00717 under `off`. That is 85% less than `off`, and 71% less than `auto`. 98.4% of the input is read from the cache. Under `auto` only 65.1% is: each message's first step writes the whole prompt again at 1.25x, because nothing marks the system prompt that every case shares.
- **Judgement (evaluation A):** a post costs USD 0.00052 under `breakpoints`, against 0.00061 under `off` and 0.00070 under `auto`. `auto` is a pure surcharge, as the spec expected: it wrote 99.8% of the input to the cache and read none of it. The breakpoint caches the constant instructions and schema (about 1,070 tokens), and 56.6% of the input is read from the cache. Output is about 80% of a post's cost, so the saving is only 15%.
- **Time** does not change: a P19 turn takes 4.5–4.8 s in every mode, and a post 3.8–4.1 s.
- **Repetitions** (`--repeat 3`) add nothing to the saving. A case after the first already reads the tools and the system prompt, so a repeated turn costs what any other turn costs (USD 0.00106 against 0.00110).

## Conditions

| Item | Value |
| --- | --- |
| Commit | `6f042872c29e224f9ae3bd3df86e3aad1e4ce9c7` (ticket 01, PR #210, `3.0/A01-01-anthropic-model-port`), in a fresh worktree. `git status --porcelain --untracked-files=all` was empty before every run. |
| Path | `--provider anthropic`, model `claude-haiku-5-5` (the response names the same id). Key: `ANTHROPIC_API_KEY` in `main-server/.env`, 안진영's Claude Console account. |
| Decoding | The provider's defaults (no temperature or top-p), effort `medium` sent by the port. |
| Chat limits | 8 steps, 30 s, 4,000 output tokens: today's defaults, not given as flags. |
| Judgement limits | Its own: 60 s, 4,000 output tokens, one call per post. |
| Changed condition (Judgement) | **A01 retries a call once on 429 or 529.** P05 ticket 09 ran "one call per post, with no retry". The run does not record whether a retry happened. The scorecards say "429·529에만 한 번 재시도". |
| Prices | `eval/cost.ts`'s Anthropic table: USD 0.10 in and 0.50 out per million tokens, cache read 0.1x, 5-minute cache write 1.25x. |
| Order | One run at a time: P19 `off`, `auto`, `breakpoints`, `breakpoints --repeat 3`; then Judgement `off`, `auto`, `breakpoints`, and `off` again (below). |
| Who ran it | An agent (Claude Opus 5.5), approved by 안진영 on 2026-11-06: about USD 1–2 for this ticket. |

**The first Judgement `off` run was interrupted.** 9 of its 42 calls failed with `APICallError: HTTP none from Anthropic`, a network error with no status. During that run the VM's clock jumped about 9 hours, which suggests the host slept. The 9 posts are ones that evaluation B reads, so evaluation A's score shows 0 failed calls, but the run read 16,519 fewer input tokens. It is kept as `…-cacheoff-6f042872-interrupted` and left out of the tables. `off` ran again after `breakpoints`. The cache cannot carry over into an `off` run, since `off` sends no `cache_control`.

## Commands

From `main-server/`, with `npx -y pnpm@12.6` as `pnpm`:

```sh
pnpm eval --provider anthropic --model claude-haiku-5-5 --cache off --repeat 1 --budget 1 --yes
pnpm eval --provider anthropic --model claude-haiku-5-5 --cache auto --repeat 1 --budget 1 --yes
pnpm eval --provider anthropic --model claude-haiku-5-5 --cache breakpoints --repeat 1 --budget 1 --yes
pnpm eval --provider anthropic --model claude-haiku-5-5 --cache breakpoints --repeat 3 --budget 1 --yes
pnpm eval:collection --run judgement --part development --provider anthropic --cache off --budget 0.3
pnpm eval:collection --run judgement --part development --provider anthropic --cache auto --budget 0.3
pnpm eval:collection --run judgement --part development --provider anthropic --cache breakpoints --budget 0.3
pnpm eval:collection --run judgement --part development --provider anthropic --cache off --budget 0.3   # again
```

The worktree's `.env` names no `ANTHROPIC_MODEL`, so `pnpm eval` got `--model`. The Judgement ran on the development part only, never held-out: this measures cost.

## Results directories

All in `main-server/eval/results/`, committed with `git add -f`, each `.json` with its `.md` scorecard:

- `2026-11-06-6f042872-anthropic-claude-haiku-5-5-s8-t30000-o4000-tempdefault-toppdefault-cacheoff`
- `…-cacheauto`
- `…-cachebreakpoints` (`--repeat 1`)
- `…-cachebreakpoints-2` (`--repeat 3`)
- `collection-development-judgement-anthropic-cacheoff-6f042872`
- `collection-development-judgement-anthropic-cacheauto-6f042872`
- `collection-development-judgement-anthropic-cachebreakpoints-6f042872`
- `collection-development-judgement-anthropic-cacheoff-6f042872-interrupted` (not counted)

## Chat: P19

62 cases. Under `--repeat 1`, 65 turns, since the live cases send 3 more. Under `--repeat 3`, 75 turns. The cases with a `repeat` of their own, the only ones `--repeat 3` reaches, are `finding-parties-no-condition`, `making-parties-lunch-with-friend`, `menus-today-lunch`, `ask-which-minsu` and `shuttle-where-now`. The cache hit rate is cache reads over all input tokens.

| Mode | Turns | Input | Cache read | Cache write | Uncached | Output | Hit rate | Cost | Per turn | Time per turn (mean / median) | Steps | Pass (known failures apart) | Known failures passed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `off` | 65 | 4,468,897 | 0 | 0 | 4,468,897 | 37,702 | 0.0% | USD 0.4657 | 0.00717 | 4.77 / 4.55 s | 2.63 | 48/54 (88.9%) | 2/8 |
| `auto` | 65 | 4,486,525 | 2,920,766 | 1,565,285 | 474 | 37,391 | 65.1% | USD 0.2436 | 0.00375 | 4.70 / 4.63 s | 2.65 | 45/54 (83.3%) | 2/8 |
| `breakpoints` | 65 | 4,485,200 | 4,415,378 | 69,348 | 474 | 37,071 | 98.4% | USD 0.0714 | 0.00110 | 4.72 / 4.59 s | 2.65 | 48/54 (88.9%) | 3/8 |
| `breakpoints`, `--repeat 3` | 75 | 5,103,598 | 5,032,826 | 70,230 | 542 | 40,485 | 98.6% | USD 0.0794 | 0.00106 | 4.53 / 4.23 s | 2.61 | 58/64 (90.6%), pass^3 5/5 | 2/8 |

A turn reads about 69k input tokens, as after P06-07 (`eval/p6/r1.md`). Under `breakpoints` the whole P19 run wrote only about 70k tokens. That is the tools and system prompt once (about 25k), plus each step's new tail.

### Pass rates against noise

Caching never changes outputs, so any difference here is sampling. The suite's noise comes from its OpenRouter records: three runs on one commit gave 54–59/64 (`871886a7`), 56–58/64 (`e171a95c`), 56–59/64 (`28c0ce1`) and 60–61/64 (`60fc2dae`). That is a spread of up to 5 cases of 64.

- `off` and `breakpoints` pass 48/54, and `auto` passes 45/54. A spread of 3 is inside the noise.
- `auto` fails three cases that `off` passes: `global-events-weekend-festival` and `live-which-minsu`, which each failed in 3 of the 16 saved OpenRouter P19 runs, and `out-of-scope-library-seats`, which failed in none. Its trace shows why: the model called `findLibrarySpace`, a P06 tool that the P19 label forbids. The tool answered that this app version cannot book, and the reply passed that on with an offer for 관정. That reading of the case appeared only after P06 added the library tools. One run does not tell it apart from sampling, but it is a label for P19 to look at, not a caching effect.
- `breakpoints` fails `ask-missing-time` (failed in 3 of 16 OpenRouter runs) and `follow-up-seven-oclock` (11 of 16), and passes `ask-which-festival-event`, `live-lunch-then-seven` and `menus-abbreviation-hakgwan`, which failed in 6, 9 and 12 of 16.

No metric moved past noise.

## Judgement: evaluation A, development part

42 calls: one per post of the development part, including the posts that evaluation B reads. Evaluation A scores 16 of them. Time is the run's test time (Vitest's monotonic clock) over its calls, the calls going one after another.

| Mode | Calls | Input | Cache read | Cache write | Uncached | Output | Hit rate | Cost | Per post | Time per post | C1 | C2 | C4 schema | C5 | C6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `off` | 42 | 77,715 | 0 | 0 | 77,715 | 35,982 | 0.0% | USD 0.0258 | 0.00061 | 3.8 s | 12/16 | 0/12 | 12/12 | 0 | 18/20 |
| `auto` | 42 | 77,715 | 0 | 77,547 | 168 | 38,947 | 0.0% | USD 0.0292 | 0.00070 | 4.1 s | 12/16 | 1/13 | 12/12 | 1 | 18/20 |
| `breakpoints` | 42 | 77,715 | 43,952 | 1,072 | 32,691 | 36,370 | 56.6% | USD 0.0220 | 0.00052 | 3.9 s | 12/16 | 1/13 | 12/12 | 1 | 18/20 |

The instructions and schema are 1,072 tokens: one write, then a read of 1,072 by each of the other 41 calls. A post's own text is not cached in any mode. Under `auto` it is written at 1.25x and never read, since no two posts share it.

### Pass rates against noise

The Judgement has no repeated runs of its own to measure noise by, so these runs are the first. C1, C4 and C6 are the same in all three. C2 and C5 differ by one post: under `auto` and `breakpoints`, `snu-176564` (`a-014`, not an event) was read as an event with 2 sessions and published, and under `off` it was not. Caching cannot cause that. Other posts vary the same way across runs: `snu-176558` was an event only under `auto`, and the number of sessions for `extra-PGM012002270` and `extra-PGM012002130` changed between runs. It is sampling, and it is not past noise.

It does matter outside this ticket, though. **1/13 is over C2's floor (≤ 3.33%).** On the development part, one wrong publish in two runs out of three shows that a Judgement run can cross C2's floor by sampling alone. Ticket 03's held-out run should be read with that in mind.

## Total cost of this ticket

| Run | USD |
| --- | --- |
| P19 `off` | 0.4657 |
| P19 `auto` | 0.2436 |
| P19 `breakpoints` | 0.0714 |
| P19 `breakpoints`, `--repeat 3` | 0.0794 |
| Judgement `off` (interrupted) | 0.0188 |
| Judgement `auto` | 0.0292 |
| Judgement `breakpoints` | 0.0220 |
| Judgement `off` | 0.0258 |
| **Total** | **0.9559** |

The estimate before the runs was about USD 1.1: `off` 0.48, `auto` 0.28, `breakpoints` 0.10, `--repeat 3` 0.11, three Judgement runs at most 0.12. It came from the last full-prompt OpenRouter runs (`869acde2`: 70.7k input and 600 output tokens a turn, 2.67 steps, 25.4k tokens in the first step). `breakpoints` came in lower than estimated, because the per-step tail it writes is smaller than assumed.

## What this changes

- `MODEL_CACHE`'s default stays `breakpoints` (`src/common/settings.ts`). No code or test changes.
- The spec's 2026-11-02 estimate ("about USD 1.5–2 for the chat suites with caching, against about USD 5.6 without") is replaced by these numbers.
- For ticket 03's estimate: a chat turn under `breakpoints` costs about USD 0.0011 at today's 69k input tokens, against 0.0072 without the cache. A Judgement call costs about USD 0.0005.
