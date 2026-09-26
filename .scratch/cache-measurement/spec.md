# Event cache database-load measurement

Status: ready-for-human

## Scope and reproduction

Measure the existing public event-list cache on disposable infrastructure only. No application, schema, API, provider or deployment changes. The harness is opt-in, uses existing main-server dependencies, never reads `.env` files, and creates random isolated PostgreSQL/PostGIS and Redis containers plus two temporary main processes (public/admin pools). An explicitly labeled test-only student and 20 synthetic manual events are inserted only into the new database. No administrator test identity, real account, external feed, or live application database is used.

From a checkout with `main-server` dependencies installed and its Prisma client/generated build prepared:

```sh
cd main-server
pnpm install --frozen-lockfile
pnpm build
cd ..
node tests/event-cache-measurement.mjs --run --output /tmp/event-cache-report.json
```

`EVENT_CACHE_APP_ROOT=/absolute/path/to/built/checkout` can select an existing build. Without `--run`, the script prints usage and performs no measurement. Docker must be available; images are `postgis/postgis:17-3.5` and `redis:8-alpine`. The report records actual server versions; future tag updates can change those versions. Database startup explicitly enables and creates `pg_stat_statements`; unavailable instrumentation fails the run rather than substituting a proxy metric. Preparation may pull images and ordinarily takes a few minutes; the two 50-request phases are bounded and sequential. The harness owns cleanup of its app children and named containers on completion, failure, SIGINT, or SIGTERM. SIGKILL/host failure cannot run cleanup; any orphan has the unique `event-cache-<kind>-<run>` name. Optional output is the requested persistent report, not a disposable fixture file.

## Measurement design

After migrations and fixture insertion, one HTTP request establishes connections. The cold phase sends 50 authenticated requests, deleting only this run's `prototype:events` key before each request. The warm phase performs one excluded preparation request and then 50 sequential requests without eviction, inside the cache's 30-second TTL. No public/admin traffic other than this harness exists in the disposable stack.

Before/after `pg_stat_statements` snapshots count normalized SELECT calls from `public.events`, `public.event_revision`, and `public.users` separately. Database statements for background outbox polling, transaction control, readiness, and instrumentation are outside these three categories. Redis INFO keyspace hit/miss deltas independently verify the warm path. Every response must contain the same 20-event payload and revision; no response content, token, password, student ID, email or fixture rows are printed in the report. Normalized SQL contains placeholders and schema column names only.

Latency covers each HTTP request through response JSON parsing; key eviction, preparation, and measurement queries are outside the timing. Report p50/p95 uses nearest-rank values from one sample of 50 sequential requests per phase. These are descriptive local observations, not a production throughput/capacity result or a general speedup claim. Forced cold eviction is an intentional worst-case comparison, not an estimate of real cache miss rate.

## Results

See [report.md](report.md) and the exact machine-readable [report.json](report.json). Coordinator review/integration remains pending.
