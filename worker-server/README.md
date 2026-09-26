# Worker server

Node 22; `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start`. `pnpm test` uses actual, source-linked HTML/JSON excerpts in `test/fixtures/`; fixtures never become runtime data.

Worker alone collects actual SNUCO meals, Busin routes 41946/41914 and a conservative subset of official SNU events. All source calls use normal TLS and a ten-second timeout. Invalid source envelopes or changed selectors return unavailable, never fabricated data. Meals verify the source date; blank meal cells remain blank. Shuttle x/y and stop positions are original schematic pixels, never GPS or ETA. `observedAt` is null because the provider does not supply it.

BullMQ uses `REDIS_QUEUE_URL`, separately from snapshots, locks and cache in `REDIS_CACHE_URL`. Schedules: shuttle every 60 seconds, today's Seoul meal every 30 minutes, first five official events every six hours. The cache and source-key Redis locks coalesce multiple phones/replicas. Unavailable responses have at most a 60-second TTL. Locks have bounded leases; requests take bounded time. Counters expose cache hits, actual source reads and in-process coalescing; no speedup is claimed without measurement.

Only official details with an explicit same-day start/end time and location are imported to main through its authenticated API. Ambiguous notices are skipped with source-linked reasons. No images are rehosted. A main import timeout is safe to retry because main keys imports by external ID.

All routes except `/health` require `x-internal-key` and reject an unset server key:

- GET `/v1/campus/meals?date=YYYY-MM-DD`
- GET `/v1/campus/shuttle?routeId=41946`
- GET `/v1/internal/integrations`: `{items:[{source,status,...}],metrics}`
- POST `/v1/internal/integrations/:source/refresh`, source `meals`, `shuttle`, `events`. Administrative force refresh still respects a one-minute source cooldown.

Snapshots publish only `campus.changed` hints when content changes. `GET /health` returns 503 when required Redis connections or internal authentication configuration are unavailable. Source unavailability is separately visible in integration status.

Limitations: provider terms/polling allowances need operational confirmation; upstream markup is not a versioned API. Live vehicles were not observed in the initial overnight fetch (real empty response). The current event parser intentionally omits complex/multi-day/date-incomplete announcements. Full timezone/date-language extraction is not claimed.
