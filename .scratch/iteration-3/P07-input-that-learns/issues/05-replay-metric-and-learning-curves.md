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

### Live run (2026-10-29)

The five pieces run once on the real server and the real model, from `3.0/P07-05-replay-metric` at `fd516c7f`, on a fresh database (230 Places) in a Compose project of its own; the setup, the seed SQL and the scripts are in `../live-run/`. The clock is the real one: the run began at 06:07 in Korea on a Thursday, so `lunch_with_free_friend` (11:00 to 14:00) could not apply; the seeded timetables leave A and B free from 10:50 to 12:30 for a rerun in those hours. No unit or integration test was run.

**Stack (step 1).** `docker compose -p p07-live` with `compose.live.yaml` (PostgreSQL on 5433, Redis on 6380, a new volume), `pnpm db:migrate`, `pnpm db:seed`, the server from `dist/` with `.env`. Five accounts A to E, written by `seed-accounts.sql` with open sessions and onboarded 30 days before: A is Friends with B and C, sharing on at both ends; A and B each have a class that ended 10 minutes before the seed ran (04:57 to 05:57) and the next 50 minutes after it (06:57 to 08:12, at 제1공학관 and 제2공학관), then 10:00 to 10:50 and an afternoon class; C, D and E have no classes, D and E no Friends. One published Global Event (10-30 18:00 to 20:00 at 문화관). All five fall in the learning arm of both holdbacks. Tokens from `sign-tokens.mjs`.

**Grey suggestions (step 2).** Eight openings, each a row. The score is computed here from the rules; a row keeps only the order of `eligible`:

| # | Account, screen | Eligible | Score (weight × acceptance × fatigue) | Shown | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | A, main | `route_to_next_class` | 0.8 × 1/2 = 0.40 | route, propensity 1 | left open: ignored |
| 2 | D, main | none | | silent | |
| 3 | A, events, card open | `party_for_open_event` | 1.0 × 1/2 = 0.50 | party: Open, 3, 공연, at the event's start | accepted → `POST /quests` and `PATCH /quests/:id` as the form does → confirmed with the Quest's id, about a minute after shown |
| 4 | A, main | `route_to_next_class` | 0.8 × 1/3 = 0.27 | route | dismissed: a 2-hour cooldown |
| 5 | A, main | `route_to_next_class` | 0, cooldown (0.8 × 1/4 = 0.20 without it) | silent | |
| 6 | A, events, card open | `party_for_open_event` | 0, cooldown (1.0 × 2/3 = 0.67 without it) | silent | |
| 7 | B, main | `route_to_next_class` | 0.8 × 1/4 = 0.20, under 0.25 | silent | B dismissed nothing: ticket 04, "For the team to decide" |
| 8 | C, main | none | | silent | |

A settled outcome posted again answered 409 `SUGGESTION_OUTCOME_SETTLED`, another User's suggestion 404. `pnpm eval:suggestions --from 2026-10-29 --to 2026-10-29`, once the rows were 10 minutes old, matched the actions: openings 8, silent 5, silent then typed 0; week 2026-W44, learning arm, `party_for_open_event` shown 1, accepted 1/1, confirmed in 10 min 1/1; `route_to_next_class` shown 2, accepted 0/2, dismissed 1/2, ignored 1/2; false alarm 0/1 and 2/2, eligible-not-shown 1 and 2, missed need 0, recall 1/1 and —; weighted acceptance 100% and 0%. `repeat_last` and the lunch template were not exercised.

**Paid eval estimate (step 3).** `pnpm eval` without `--yes`: 62 cases, 75 turns (five cases run 3 times), about 20,000 input and 600 output tokens a turn (the first-run guess, with no saved run), USD 0.17 at OpenRouter's prices for Haiku 5.5. Without a key the command stops at "Set OPENROUTER_API_KEY". On one attempt the price lookup fell back to the fallback prices (USD 5 and 25 per million) after a transient fetch failure that `pricesOf` swallows, and the estimate read USD 8.63.

**Alias learning (step 4, the real model).** Words of the development gold that stage B gets wrong or misses: 수의대, 미대, 호암, 정문 (another Place first) and 경영대, 대운동장 (none). Probed as A: 미대, 호암 and 정문 answer `several` with the accepted Place among the chips; 수의대 answers the two Places whose names start with 수의대 (80동, 85-1동) and not 수의과대학 (85동), so the right Place cannot be tapped (ticket 01); 경영대 and 대운동장 answer `none`, so there is no chip and no alias at all: a word the rules miss has no path to be taught (ticket 03). Taught: 미대 → 예술관(미대)1, 호암 → 호암교수회관, 정문 → 서울대 정문, each by A, B and C in two turns (the words, then the chip), 18 turns. After the third account each became a `learned` row of `place_aliases` (supporters 3, score 3). D then typed each: `one` from everyone's alias, `resolvedBy` source `global`, no chip, 3 of 3. E's 아니에요 (`POST /assistant/aliases/reject`) on each: rejecters 1, score 2.0, not retired; D still gets `one`, and so does E, who had just rejected it (ticket 03). Personal alias: 집 cannot be taught, since the model answered "집은 캠퍼스 장소가 아니어서" without calling `resolvePlace`, so no event and no chip (ticket 02); A taught 공대 → 공학관1 from the curated group's chips instead, B typing 공대 still got the 10 chips, and A got `one` from `personal`. A correction typed for 수의대 ("수의과대학 말한 거야") resolved the official name and proposed, teaching nothing for 수의대. The model: in 18 of 18 teaching turns it asked for the head count, often the join policy too, before proposing, while in other turns it proposed with 4 and 바로 참여 unasked; one reply carried a stray syllable ("럼미대"); it never ignored a chip and never named an id outside `FoundIds`. Nine turns were sent with mangled words (such as "미대 예술관(미대)1") by a shell mistake; they left `answered` rows and taught nothing. The server logs no token usage outside the benchmark, so tokens a turn come from step 6 only; a turn took 3 to 9 seconds.

**Replay (step 5).** `pnpm eval:replay --development`, fingerprint 8222192a0686, 57 items, C learning 10 personal and 3 of everyone's aliases. C against B: resolution 63.2% [50.2, 74.5] 36/57 in both; top-1 92.1% [79.2, 97.3] 35/38 against 84.2% [69.6, 92.6] 32/38 (미대, 호암 and 정문 now `one`); recall@10 92.1% 35/38 in both; false none 5.3% [1.5, 17.3] 2/38 in both (경영대, 대운동장); precision of one 17/17 against 14/14; mean candidates 3.64 against 3.81; learned alias hits 3. `pnpm eval:learning-curve --from 2026-10-29 --to 2026-10-29 --step 1`: one point, learning arm 10 rows (the ten chips), ask 100% [72.2, 100.0] 10/10 in both arms, top-1 10.0% [1.8, 40.4] 1/10 in both (공대, whose first chip was taken), 0 aliases before T. A point learns from the rows before its day, so a day's own teaching cannot show on it, and the holdback arm has no account. One day of rows: no curve, and these numbers are a smoke test, not evidence.
