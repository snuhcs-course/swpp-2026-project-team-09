# 05: A baseline on both providers, and the docs

Parent: [A02 spec](../spec.md) ("Deployment and documentation", "Testing Decisions")
Status: ready-for-agent
Blocked by: 01, 02, 03, 04

## What to build

The eval suites run once on the merged code, so that later work is measured against the paths production may use. The ADR, the glossary and the READMEs describe the global settings and how the AI's key, and with it the provider, is chosen.

## Bring from A01

- ADR 0013 from `origin/3.0/A01-02-deployment-and-docs` (`docs/adr/0013-the-assistant-calls-claude-through-the-anthropic-api.md`), rewritten for A02, and the line that marks ADR 0005 superseded on the provider only.
- The README and `main-server/README.md` changes of the same branch, as a starting point.
- `.scratch/iteration-3/A01-openrouter-to-claude-console/caching-experiment.md` from `origin/3.0/A01-04-caching-modes`, as the record of why `breakpoints` is the mode.

## Acceptance criteria

- [x] **Person: cost approval.** Before any run, the ticket gives 안진영 an estimate per run (about USD 3.5 in all), and 안진영 approves it in writing in the PR or this file. No run starts before that.
- [ ] Runs on one commit of 4.0/Main after 01 to 04 are merged, from the local `.env` keys with `--provider`:
  - P19 (`pnpm eval`) and the P5 small world (`--world p5`) on OpenRouter and on Anthropic;
  - the P5 large world (`--world large-world-v1`), P6 (`--world p6`) and the collection evaluations A and B (`pnpm eval:collection`) on Anthropic only;
  - no P4.
- [x] A record beside the last OpenRouter run of each suite: pass rate, cost per turn, cache hit rate, time per turn, provider, caching mode and commit, and each comparison stated as a different condition (metrics 4.3).
- [x] ADR 0013: the Assistant, the Judgement and the same-event choice call Claude through the Anthropic API or OpenRouter, the key, and with it the provider, chosen by name on the admin site from the keys in Secret `secrets`; why (A01's three reasons, the switch without a Release); what was considered (A01's start-up setting, one key per provider, a Redis copy of the settings, keys managed on the admin site). ADR 0005 marked superseded on the provider only.
- [x] `GLOSSARY.md`: the Administrator entry says an Administrator also changes global settings, such as the AI's key.
- [x] Root README: the Assistant row of the stack table, the settings table, the AI-in-the-product paragraph and the external-services table (Anthropic beside OpenRouter).
- [x] `infra/production/README.md`: checked against ticket 03's sections, with a short walk-through of switching to an Anthropic key: put `llm-key-<name>`, release, and choose it on the Settings page.
- [x] Each changed source file has its AI-generated row (the Markdown files get none).

## Comments

### Estimate before the runs (2026-11-15)

안진영 (PM) approved up to USD 10 in total for these runs on 2026-11-15, through the session that started this ticket, to run without asking again while the estimate stays clearly under it (stop and report if it could pass USD 8; stop if the running total passes USD 9). This replaces the spec's "about USD 3.5, approved in the PR".

Each run's estimate is the last run of the suite on the same provider and caching mode, plus 30% for the prompt's growth since then. OpenRouter turns are priced from the last OpenRouter runs at `40cb60e5` (P12 after set, no cache). Anthropic turns are priced at A01's `breakpoints` cost (`../../../iteration-3/A01-openrouter-to-claude-console/caching-experiment.md`): input read from the cache at 0.1x, about 1.1k tokens a turn written at 1.25x (3k in the large world), output in full, at `eval/cost.ts`'s prices (USD 0.10 and 0.50 per million).

| Run | Provider | Turns or calls | Basis | Base | With 30% |
| --- | --- | --- | --- | --- | --- |
| P19 | OpenRouter | 75 | `40cb60e5` `-3`–`-5`: USD 1.6275 for 3 runs | 0.54 | 0.71 |
| P5 small world | OpenRouter | 300 | `40cb60e5`: USD 2.4994 | 2.50 | 3.25 |
| P19 | Anthropic | 75 | A01's run at `08e1fe50` (`74a6a710`): USD 0.085 | 0.09 | 0.11 |
| P5 small world | Anthropic | 300 | 79.5k in, 760 out a turn: USD 0.0013 | 0.40 | 0.52 |
| P5 large world | Anthropic | 240 | 89k in, 940 out, 3k written a turn: USD 0.0018 | 0.43 | 0.56 |
| P6 | Anthropic | 192 | `869acde2` `-3`: 54k in, 590 out a turn: USD 0.0010 | 0.19 | 0.25 |
| Collection A (`judgement`, held-out) | Anthropic | 141 calls | A01: USD 0.00052 a call | 0.07 | 0.10 |
| Collection B (`ai-choice`, held-out) | Anthropic | about 14 calls | `40cb60e5`: 14 calls, 3.1k in, 320 out | 0.01 | 0.01 |
| **OpenRouter** | | | | **3.04** | **3.96** |
| **Anthropic** | | | | **1.19** | **1.55** |
| **All** | | | | **4.23** | **5.51** |

The OpenRouter key had USD 54.25 of its USD 100 limit left before the runs.

### Runs (2026-11-15 and 16)

All on `edd356ae` (A02 01–04 on `4.0/Main`, before #298's squash); the record is `main-server/eval/a02-baseline.md`.

| Run | Provider | Estimate (with 30%) | Measured | Passed |
| --- | --- | --- | --- | --- |
| P19, first attempt (stopped before any call: disk full) | Anthropic | 0.11 | 0.0000 | – |
| Collection A `judgement`, run 1 | Anthropic | 0.10 | 0.0735 | C1 35/64, C2 7/42 |
| Collection B `ai-choice` | Anthropic | 0.01 | 0.0055 | D1 0, D3 10/32 |
| Collection A `judgement`, run 2 (added to read C2 and C3) | Anthropic | 0.10 | 0.0685 | C1 38/64, C2 0/38 |
| P19 | Anthropic | 0.11 | 0.0847 | 58/64 |
| P5 small world | Anthropic | 0.52 | 0.4543 | 243/300 |
| P5 large world | Anthropic | 0.56 | 0.5205 | 160/240 |
| P6 | Anthropic | 0.25 | 0.1863 | 134/192 |
| P19 | OpenRouter | 0.71 | 0.5519 | 58/64 |
| P5 small world (interrupted, not counted) | OpenRouter | 3.25 | 1.7601 | – |
| **Anthropic** | | 1.55 | **1.3933** | |
| **OpenRouter** | | 3.96 | **2.3120** | |
| **All** | | 5.51 | **3.7053** | |

**Not met: the P5 small world on OpenRouter.** Its run was interrupted: the machine slept for about nine hours in the middle, the seeded User's access token expired, and 98 turns failed (96 with the server's own 401, 2 with 503). It is kept as `…-cacheoff-interrupted` and left out of the tables. Its run once more was refused by the session's permission check and was not repeated, so whether the two providers agree on the P5 small world is not measured. The run criterion stays open until `pnpm eval --world p5 --provider openrouter --budget 4 --yes` runs at `edd356ae` (about USD 2.6). The record criterion is met for every run that completed.

The chat suites first waited for disk space: the evals' PostgreSQL container could not start on a full disk. `edd356ae` also carries a fix found before the first run: `src/common/settings.ts` imported `./llm-keys.js`, which plain Node cannot resolve, so `pnpm eval` stopped with `ERR_MODULE_NOT_FOUND`. 4.0/Main has the same fix now.

### Agent usage (2026-11-15)

- Agent time: about 2 hours 40 minutes over one session on 2026-11-15 and 16, of which about 2 hours were the model runs; the nine hours the machine slept are not counted (an estimate).
- Tokens (estimates): input about 13M, of which about 12.2M cache reads, about 700k cache writes and about 90k uncached; output about 100k. No subagents.
