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
