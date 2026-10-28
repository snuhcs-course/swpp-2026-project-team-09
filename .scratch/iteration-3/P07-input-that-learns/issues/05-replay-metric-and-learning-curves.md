# 05: The metric: A/B/C replay, learning curves, suggestion curves

Parent: [P07 spec](../spec.md), "Ticket 05: the metric"
Status: ready-for-agent
Blocked by: 03, 04

## What to build

The model-free proof of "it gets smarter from use": three commands under `main-server/eval/replay/` that read a database and write JSON and a Markdown table, and the first gold file. Nothing here calls the model or runs in CI against Production; the unit tests run the metrics on hand-made rows and a seeded database.

- `pnpm eval:replay --gold <file> --as-of <date> [--development]`: stages A (today's substring and number matcher, kept as a function in the harness), B (`PlaceIndex` with `CuratedGroups`) and C (B with personal and global aliases rebuilt from `resolution_events` before `--as-of`, through ticket 03's promotion rules), each with resolution rate, precision of `one`, recall@10, top-1, none rate, false-none rate, mean candidates, the answering tier, n and 95% Wilson intervals; curated and learned alias hits apart.
- `pnpm eval:learning-curve --from --to --step 7`: ask rate and top-1 per week on the `answered` Place rows after each T, with aliases learned only from rows before T, holdback apart.
- `pnpm eval:suggestions --from --to`: per week and template, acceptance, confirmed within 10 minutes, dismissal and ignore rates with Wilson intervals, holdback apart, and inverse-propensity-weighted acceptance.
- `eval/gold/places.yaml` with the development set from research note 08's examples and the group words, `set: development`; the format takes acceptable targets by seed name or Place number, the collected date and the set.

## Acceptance criteria

- [ ] The three commands run from `main-server` against `DATABASE_URL` and write `eval/results/replay-*.json` and a Markdown table beside it; the README's Assistant section says how to run them and what each number means.
- [ ] Stage A answers exactly what `PlacesService.search` answers (test on the seed).
- [ ] Stage C learns only from rows dated before `--as-of`; a test seeds rows on both sides of the date and checks that the later ones change nothing.
- [ ] The gold file loads through a zod schema; items name targets by seed name or number; `--development` is needed to score the development set.
- [ ] Wilson intervals checked on known n and k; recall@k and top-1 on hand-made answers.
- [ ] The learning curve never learns from the labels it scores (the label of a row is excluded from the aliases applied to it).
- [ ] `pnpm lint`, `pnpm typecheck` and the harness's tests pass; the paid eval is not run.

## Comments

### Built (2026-10-28)

On branch `3.0/P07-05-replay-metric`, from `3.0/P07-04-grey-suggestions` at `89f8adc8`.

- `main-server/eval/replay/`: `pnpm eval:replay` (`replay.ts`), `pnpm eval:learning-curve` (`learning-curve.ts`) and `pnpm eval:suggestions` (`suggestions.ts`), each started by its `*-cli.ts` with `node --env-file-if-exists=.env`. Node's type stripping cannot run `src/`'s decorators, parameter properties or `.js` imports, so `launch.ts` runs the command's module through Vitest's module runner (`createVitest` with no config, then `vitest.import`); no test runs, and a command starts in about a second. Each writes `eval/results/replay-<stages|learning-curve|suggestions>-<UTC time>.json` and `.md`, and prints both paths.
- The pieces: `stages.ts` (A as `substringMatch`, B, C), `learned-aliases.ts` (stage C's builder), `replay-metrics.ts`, `curve-metrics.ts`, `suggestion-metrics.ts`, `wilson.ts`, `gold.ts`, `flags.ts`, `report.ts`, `database.ts`.
- Stage C's builder, all in memory as `PlaceAliases` sources, nothing written: personal aliases replayed from the label rows in order (a choice or an edit adds its Place for the words, a rejection removes it, an edit with no words teaches nothing); everyone's alias per words from the server's own count (`standingsOf`) bounded to the rows before the time, then `topOf`, `scoreOf` at that time and `qualifies`. The decay's last use is the latest choice or edit of that Place for the words, or `answered` row of alias source `global` naming it, as `GlobalAliases` and `recount` reset `last_used_at`.
- `src/`: `aliases/alias-standings.ts` holds the standings query moved out of `AliasesService` unchanged, with an optional window `{ before, excluding }` that only the replay passes; `recount` calls it. The bound is cast through `timestamptz AT TIME ZONE 'UTC'`, as `created_at` holds UTC without a zone. Nothing else in `src/` changed.
- `eval/gold/places.yaml`: 57 development items collected 2026-10-28: 25 short forms (note 08's examples, 초성, a mixed form, a typo, bracket names, clippings, 경영대, 대운동장), 7 group words, 7 official names and numbers, 18 words that name no Place (후문 among them: the back gate and its guard post lie outside the catalog's boundary).
- README § Assistant: a "Replay" subsection with a paragraph per command; the folder layout and the aliases paragraph name the new files.

Decisions where the spec left room:

- Dates are days in Korea from their first moment. `--as-of` left out is the run's start. `--from` and `--to` are required. The learning curve's points run from `--from` to `--to` inclusive, each scoring the `--step` days from it; the suggestions cover `--from` to the end of `--to`.
- Gold: a target names every Place of that exact name, else every Place of that number; all unknown targets are listed in one error. A YAML number is a Place number. `--development` scores the development set instead of the test set, never both; with no test items yet, the default run says to pass `--development`.
- Gold items are asked as an account that taught nothing and is never held back, so personal aliases count only in the learning curve.
- Mean candidates counts at most 10 per answer, what a resolver gives, over the answers that are not none. A `one` for a none-item is a wrong `one`.
- Learning-curve labels: a label belongs to its User's latest `answered` row of the same words before it; the row's truth is its last choice or edit; a row with only rejections counts in the ask rate, not in top-1. Each point reports the rules-only matcher (B) beside the learned one (C), and the arms apart. The held-back arm uses `src/common/holdback.ts` and `ASSISTANT_ALIAS_HOLDBACK_PERCENT` from the environment (10 when unset). `ASSISTANT_GLOBAL_ALIASES` is not read: the replay measures the rules, not the switch.
- As the aliases come from rows before T and the scored rows lie after it, the scored labels could not teach anyway; they are still passed as `excluding`, and the integration test checks the outcome.
- Suggestions: impressions shown in the 10 minutes before the run are left out. Ignored is still `shown`, or an outcome more than 10 minutes after `shown_at`, so a late acceptance counts as accepted and as ignored. The weighted acceptance is self-normalised, per template and arm over the whole range.

Left out:

- An alias a User deleted from 내가 가르친 말 leaves no event, so the replay still counts it.
- No interval for the weighted acceptance, no doubly robust estimate and no replay on the 10% random slice (research note 06's later steps); the curve gives the rebuilt alias counts per point but not the number of distinct Users.

Measured with `pnpm eval:replay --development` on a fresh migrated and seeded database (230 Places within the boundary), no events, so C equals B. Development numbers, picked by the team: no evidence.

| | A: substring | B: rules and groups |
|---|---|---|
| Resolution | 45.6% [33.4, 58.4] 26/57 | 63.2% [50.2, 74.5] 36/57 |
| Precision of one | 11/11 | 14/14 |
| Recall@10 | 57.9% [42.2, 72.1] 22/38 | 92.1% [79.2, 97.3] 35/38 |
| Top-1 | 55.3% [39.7, 69.9] 21/38 | 84.2% [69.6, 92.6] 32/38 |
| False none | 34.2% [21.2, 50.1] 13/38 | 5.3% [1.5, 17.3] 2/38 |
| Mean candidates shown | 2.73 | 3.81 |

B's tiers: generated 20, curated alias 8, exact 7, distance 1, none 21. B finds nothing for 경영대 and 대운동장, and puts another Place first for 수의대, 미대, 호암 and 정문. A answers 학관 with 30 substring matches without 학생회관 and links 집 to the 어린이집; B answers every none-item none. `eval:learning-curve` and `eval:suggestions` were run against the same database (empty tables, empty tables in the output).

Tests: `test/eval-replay-metrics.unit.test.ts` (Wilson at 0/10, 5/10, 95/100 and 10/10, the cell, a stage's numbers on six hand-made answers, the flags), `test/eval-replay-curves.unit.test.ts` (labels and truth, a point's rates, the ISO week in Korea, the weekly suggestion rates, the weighted acceptance), `test/eval-replay-gold.unit.test.ts` (the file, its sets, numbers, refusals, targets) and `test/eval-replay.integration.test.ts` on a seeded database of its own (stage A equals `PlacesService.search` on the gold words and seven more; the gold file's Places on the seed; stage C at `--as-of` learns 학관 → 학생회관 from three earlier accounts and ignores the later rows, which at a later date retire it and make 중도 → 관정관; the curve's first point asks and misses with its own label unlearned and the next answers `one` from it, a 100% holdback moving both rows to the holdback arm; the suggestion curves read only settled impressions of the days asked). Also run: the unit project, `global-aliases`, `personal-aliases`, `alias-endpoints` and `eval-options` integration tests. The paid eval harness was not run.

### Changed (2026-10-28), after research note 10

Research note 10 (`.scratch/iteration-3/research/10-recent-papers-2024-2026.md`, scenario-4 plan §9) asks four things of the metric. All four are on the branch; the paid eval was not run.

- **Tokens and cost beside accuracy** (AI Agents That Matter, arXiv 2024-07). The scorecard's usage section gains a per-turn table (tokens in, cache read, cache write, tokens out, estimated cost of one request, `eval/per-turn.ts`), and `pnpm eval:compare` gains three per-turn measures and a "Cost and accuracy" table with the two runs as points: model, pass rate, pass^k, cost and tokens per turn. That table is the place for the one comparison with a larger model (`pnpm eval --model <larger>`, once), so that "a small model is enough" is measured.
- **A final slice that tunes nothing** (same paper). `pnpm eval:learning-curve` and `pnpm eval:suggestions` take `--final-from <day>`: the points and rows from that day are the `final` slice, the rest `tuning`, every table saying which; without the flag every row is `all`. k, s, the thresholds and the other constants are tuned on the tuning slice, and the numbers reported afterwards come from the final slice alone.
- **A frozen test set** (same paper). `pnpm eval:replay` heads its report with the set's fingerprint (`fingerprintOf`: the first 12 hex digits of the SHA-256 of the items' words, targets, days and windows in a fixed order, the same whatever the file's order and notes). The rule, in the README and the gold file: the test set is frozen before any rule, group table or constant is tuned on it, and its fingerprint is written here on that day; a run with another fingerprint has scored another set. The development set stays the tuning set; `PLACE_GROUPS` was written before any test item exists.
- **Missed needs beside acceptance** (ProactiveBench, ICLR 2025). With ticket 04 now writing a row for every opening and marking `typed_template`, `pnpm eval:suggestions` reports the openings per slice (all, silent, silent then a covered request typed), and per template and arm the missed needs and false alarms: shown, accepted, false alarm (shown and not accepted, over the shown), eligible-not-shown, missed need (of those, the ones the User then asked the chat for its Proposal), recall (accepted over accepted and missed), and typed-what-was-shown. The weekly table and the weighted acceptance read the shown rows only.
- **Knowledge updates in the replay** (LongMemEval, ICLR 2025). A gold item takes `from` and `until`, days in Korea: two items of the same words, one until a day and one from it, say that the Places the words mean changed that day, and `pnpm eval:replay --as-of` at several days shows when stage C follows. The report counts such items; `eval-replay.integration.test.ts` plays one through: three accounts teach a nickname for one Place, reject it on the day of the change while three others choose the new Place, and thirteen more choose it a week on. Everyone's alias of the old Place is retired the moment its three supporters reject it (score 3 − 3 under 0.5), the words fall back to the rules until the new Place holds 0.8 of all who ever chose for them, and then the new alias answers. The gold file has no real knowledge update yet: its header shows the format with placeholder names in a comment, and the first real one is collected with the test set.
- Tests: `eval-replay-curves.unit` (needs, openings, slices), `eval-replay-metrics.unit` (`--final-from`), `eval-replay-gold.unit` (windows, the fingerprint), `eval-replay.integration` (silent and typed rows in the curves, the knowledge update), `eval-scorecard.integration` (per turn, the cost-accuracy table).

### For the team to decide

- **Following a change of meaning.** The share rule counts every account that ever chose for the words, so after a change the new Place needs four times the old supporters' number before everyone's alias follows (0.8 of all), and meanwhile the words fall back to the rules. Downvotes retire the old alias at once; promotion of the new one is what lags. Options: count the share over a window (the 30-day half-life, or 90 days), or weight each chooser by the same decay as the score. The replay with a real knowledge update decides; until then the rule stands.
- **When the test set is frozen**, and by whom: before the group table or any constant is revisited, with the fingerprint written here. The first `--final-from` day of the first measurement goes with it.
- **The one larger-model run**: which model, and on which day, since it is paid. The comparison table is ready for it.

### Agent usage (2026-10-28)

- Agent time: about 28 minutes (estimate), one Opus 5.5 session in its worktree, plus about 21 minutes of the orchestrating Fable 5.1 session, which wrote the spec and tickets, reviewed, merged and tested the stack, split evenly over tickets 02 to 05.
- Tokens (estimate): the building sessions about 24.3M input, of which about 24.0M cache reads, 317k cache writes and 210 uncached, and about 143k output; the orchestrating share about 10.1M input (9.9M cache reads, 132k cache writes) and 33k output. With cache reads excluded, about 625k in all.
- After research note 10, the same day: about 20 minutes more of the Fable 5.1 session (estimate; the 40 minutes of that pass split evenly over tickets 04 and 05), about 14.7M input, of which 14.0M cache reads and 707k cache writes, and about 200k output. With cache reads excluded, about 0.9M.
