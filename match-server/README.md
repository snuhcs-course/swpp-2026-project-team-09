# Match server

Node 22; `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start`. Configure its own `DATABASE_URL`, cache Redis, shared JWT verification and main internal API. It never accesses main's tables. Startup runs the checked-in Prisma migrations before readiness. A nonempty database without Prisma migration history requires the verified adoption procedure below. `GET /health` returns 503 while required configuration/DB/Redis is unavailable. Missing optional AI configuration does not fail health.

All `/v1/matches` routes require a signed, expiring HS256 bearer token. POST requires explicit `autoJoinConsent:true`; GET/DELETE are owner-only. One searching/finalizing request is allowed per user. Each request records consent and consent time in PostgreSQL. Validated party size is 2–6. Every final group shares the exact event, normalized activity and group size, has distinct users, and overlaps across the whole group. Interests rank eligible candidates. Candidate selection is bounded to 500 indexed requests and is a greedy prototype, not a globally optimal allocation.

Optional `OPENAI_API_KEY` enables real embedding calls (`EMBEDDING_MODEL`, default `text-embedding-3-small`). Vectors are cached seven days by model/content hash and rank only otherwise eligible groups. Missing keys/provider failures explicitly report rules-only status. No AI-generated explanation, fake students or fabricated matches are used. Matching text is sent to that provider only when configured.

A transaction-scoped PostgreSQL advisory lock serializes batch formation across replicas. Requests become `finalizing` and persist their immutable batch and per-request IDs before the network call. Main receives `{requestId,requestIds,userIds,title,eventId,maxMembers,timeStart,timeEnd}` (the persisted whole-group overlap) and owns final idempotency/per-request consumption. Retried or lost responses reuse the same batch; an uncertain batch never becomes searchable again. Cancellation locks the request and is rejected after finalization starts. Pending batches recover every 10 seconds, with at least 30 seconds between retry attempts. Main checks that a published event fits entirely inside the immutable common interval. A per-batch transaction advisory lock (20-second transaction timeout, 10-second HTTP timeout) prevents simultaneous retry outcomes across replicas. Definitive main 400/404 validation rejection terminally cancels the requests with an explanation. A 409 also stops the batch and asks the user to check existing parties; the old requests are never requeued. Internal 401/403 reports operator configuration required while retaining the batch; network/5xx/invalid successful responses retain the exact batch for retry.

`pnpm test` verifies whole-group constraints and input validation. To run actual PostgreSQL/Redis transaction tests, supply `TEST_DATABASE_URL` and `TEST_REDIS_URL`: the test uses a temporary schema and isolated key prefix, then removes them. It verifies concurrent claims, uniqueness, cancellation rejection and unchanged retry IDs after a simulated lost response. A PostgreSQL-only legacy adoption regression restores the pre-Prisma startup schema, checks that unbaselined deployment is rejected with P3005, explicitly resolves the verified baseline, and verifies unchanged rows plus CHECK and partial-index enforcement.

Limitations: finalization does not reserve main event capacity before the main transaction. Redis hints can be missed; HTTP snapshots remain authoritative. Clients should show `finalizing` as pending, not as a successful party. Auth provider credentials and live embeddings were not available for end-to-end verification.

## Prisma migrations and existing data

Prisma ORM/client/pg adapter are pinned to 7.10.0. `pnpm build` generates the CommonJS client; generated source is ignored. Ordinary CRUD uses the service-owned Prisma models. PostgreSQL checks and the partial active-request unique index remain explicitly in `prisma/migrations/0001_baseline/migration.sql`; preserve these SQL invariants in future migrations. No Prisma cloud account is required.

For a fresh match-only database, set `DATABASE_URL` and run `pnpm prisma:deploy` (startup also does this before readiness). Never use `db push`, `migrate reset`, or automatically mark migrations applied to adopt an existing database.

For an existing legacy database, first stop matching writers, take and verify a database backup, and inspect schema/data against `0001_baseline/migration.sql`. Verify both tables, all column types/defaults/nullability, the status/party-size/consent/time checks, `one_active_request_per_user` predicate, and `requests_by_user` descending index. Verify counts, request IDs/statuses/consent, batch request/user IDs and persisted overlap timestamps before and after adoption. Legacy batch overlap columns may be null: retain these rows and repair missing availability explicitly from original request overlap where valid; do not silently invent availability or reset batches.

Only after those checks pass, from this application directory with the verified match `DATABASE_URL`, run:

```sh
pnpm exec prisma migrate resolve --applied 0001_baseline --config prisma.config.ts
pnpm prisma:deploy
pnpm exec prisma migrate status --config prisma.config.ts
```

`migrate resolve` records the already-existing baseline without recreating tables or modifying matching rows. If schema differs, stop and prepare a reviewed preservation migration rather than resolving blindly. Migration commands use the database owner connection; application readiness remains unavailable when migration fails. Official v7 setup: https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference.
