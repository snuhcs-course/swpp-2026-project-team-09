# Event cache measurement — 2026-09-27 KST

The warmed event cache eliminated the event-list SELECTs in this isolated sample: **50 cold → 0 warm**. Revision reads also fell **50 → 0**. Authentication remained **50 → 50** user SELECTs, so this is not elimination of database work for the endpoint.

Measured at `2026-09-26T23:05:27.313Z` against the existing built main application at checkout revision `709aba81e8575c7cb776ab7baf71a941d8bded75`. Host: macOS arm64, Node v22.23.1. Disposable servers: PostgreSQL 17.5, PostGIS 3.5.2, Redis 8.10.2. Both main public/admin runtime pools were started; only the public pool served measurement requests. There were 20 explicitly labeled synthetic events and one test-only student identity. These fixtures do not demonstrate a real external feed or Google sign-in.

| Observed metric | Forced cold (50 requests) | Warm (50 requests) |
| --- | ---: | ---: |
| Event-list SELECT calls | 50 | 0 |
| Event-revision SELECT calls | 50 | 0 |
| Authentication user SELECT calls | 50 | 50 |
| Redis keyspace hits | 0 | 50 |
| Redis keyspace misses | 100 | 0 |
| HTTP latency p50, ms | 8.201 | 3.753 |
| HTTP latency p95, ms | 11.262 | 5.372 |

Cold Redis misses include both the event-cache lookup and the Lua revision-floor lookup; the latter key is absent in this fixture with no event mutations. Warm requests return the cached snapshot and avoid the Lua fill. All measured responses matched exactly, including revision, without publishing raw event or identity content in the report.

The query counts come from actual normalized `pg_stat_statements` SELECT calls, not inferred cache behavior. Redis hit deltas provide a second observation of the cache path. [Exact output and normalized statements](report.json) are retained. [The specification](spec.md) documents reproduction and counting boundaries.

This is one sequential local sample with deliberate eviction before every cold request. The latency percentiles are descriptive only: no concurrency/load sweep, production capacity estimate, cold-start comparison, or general speedup claim is supported. Auth reads, background outbox polling, and other database work remain; the reduction claim applies specifically to event-list SELECTs in this sample. No writes occurred in live databases. The harness removed its two temporary app processes and disposable containers after the run; no temporary fixture files were created.
