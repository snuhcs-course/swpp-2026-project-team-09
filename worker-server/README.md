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


## Local image extraction

The initial vision provider is native macOS Ollama with `qwen3-vl:2b-instruct-q4_K_M`. It runs on the developer Mac (Metal); it is not a cloud inference service or an additional application server. Install Ollama, start it bound to loopback, and pull the pinned model:

```sh
brew install ollama
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 ollama serve
# In another terminal:
ollama pull qwen3-vl:2b-instruct-q4_K_M
```

This development session uses ignored `artifacts/ollama-models` via `OLLAMA_MODELS`; keep the same value when restarting if reusing those weights. In `.env.prototype.local`, set `OLLAMA_BASE_URL=http://host.docker.internal:11434` for Docker Desktop on macOS and the pinned `OLLAMA_MODEL`, then recreate worker. A native worker can use `http://127.0.0.1:11434`. Host reachability was checked on this Mac; Colima/Linux networking must be verified separately. Never expose an unauthenticated Ollama listener to a public interface.

POST `/v1/internal/image-extractions` requires the existing internal key. Public phones use authenticated main POST `/v1/me/image-extractions`; model keys/URLs are not shipped to the app. Only the selected image is processed, in memory, without original-image DB/disk storage or a domain save. A response is an editable draft. One active extraction is admitted per worker; another receives429. Requests are bounded to2MiB decoded JPEG/PNG, reasonable dimensions,180s model time and bounded JSON output. Missing configuration/model, busy, timeout, invalid images and invalid output have distinct errors. There is no paid or fabricated fallback.

This first local flow is synchronous, does not resume after restart, and is not a horizontally coordinated inference queue. The photo import is limited to the local development API until deployment is agreed. Existing timetable/private-event save APIs remain the authority for ownership, version and schedule validation. No new database schema is required.

Opt-in real-model evaluation (Pillow is needed only for fixture generation, not worker runtime):

```sh
python3 tests/image-extraction-fixtures.py artifacts/image-extraction-evaluation
# Run worker-server build before the evaluation from repository root.
OLLAMA_BASE_URL=http://127.0.0.1:11434 node tests/image-extraction-evaluation.mjs artifacts/image-extraction-evaluation
```

The synthetic fixture generator uses a macOS Korean font. Raw evaluation images/results remain in ignored artifacts; the measured report distinguishes synthetic inputs from real public posters. Unit tests use controlled fake responses and do not establish model accuracy.
