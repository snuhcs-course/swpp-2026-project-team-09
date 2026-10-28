# P07 live run, 2026-10-29

The five pieces of P07 run once on the real server and the real model (ticket 05, Comments, "Live run (2026-10-29)"
has the numbers). Everything here is for a developer's laptop: made-up accounts, a database of its own, the real
clock. No unit or integration test runs.

| File                | What it is                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `compose.live.yaml` | Compose override: PostgreSQL on 5433 and Redis on 6380, so a developer's own stores stay untouched |
| `seed-accounts.sql` | Five accounts A to E with sessions, friendships, timetables and one published Global Event         |
| `sign-tokens.mjs`   | Access tokens for the five sessions, signed as the server signs them                               |

From the repository root, with `main-server/.env` in place (`DATABASE_URL=postgresql://main:main@localhost:5433/main`,
`REDIS_PORT=6380`, `ASSISTANT_MODEL` and, for the paid steps, `OPENROUTER_API_KEY`):

```bash
docker compose -p p07-live -f compose.yaml -f .scratch/iteration-3/P07-input-that-learns/live-run/compose.live.yaml up -d postgres redis
```

```bash
cd main-server && pnpm db:migrate && pnpm db:seed && pnpm start:prod
```

```bash
docker compose -p p07-live exec -T postgres psql -U main -d main -v ON_ERROR_STOP=1 -f - < .scratch/iteration-3/P07-input-that-learns/live-run/seed-accounts.sql
```

```bash
node --env-file=main-server/.env .scratch/iteration-3/P07-input-that-learns/live-run/sign-tokens.mjs
```

The seed sets the two timetables from the moment it runs: a class that ended 10 minutes before and the next 50 minutes
after, so `route_to_next_class` applies at once on the main screen, and a free hour from 10:50 so that
`lunch_with_free_friend` applies on a rerun between 11:00 and 14:00 in Korea. The event card is
`openCard=globalEvent:66666666-6666-4666-8666-666666666666` on the events screen.

What was then done by hand with curl and small Node scripts against `http://localhost:3000`: `GET /assistant/suggestion`
as A, B, C and D with the outcomes posted as the app posts them (the Proposal made with `POST /quests` and
`PATCH /quests/:id`, as the party form does), `POST /assistant/messages` for the alias flows (the words, then the chip
as `chosen`), `POST /assistant/aliases/reject`, and the three replay commands and `pnpm eval --yes --budget 5` from
`main-server/`. The replay and eval reports land in `main-server/eval/results/`, which git ignores.

To start again: `docker compose -p p07-live down -v` deletes this run's database only.
