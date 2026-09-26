# Independent runtime services

Status: ready-for-human
Type: task

Implemented in `codex/prototype-services` isolated worktree for lead review before squash merge.

- Socket.IO JWT handshake, server-controlled rooms, expiry disconnect, strict public/private hint policy and Redis subscription readiness.
- Worker actual SNUCO/Busin/official SNU reads, source validation, Redis cache/coalescing, BullMQ queue separation, source status/refresh and changed-content hints.
- Independent match PostgreSQL consent/request/batch ownership, Redis candidate index, whole-group exact constraints, optional real cached embeddings and immutable idempotent main finalization retries.

## Verification

- All three TypeScript builds pass.
- Socket: 2 policy tests pass.
- Worker: 3 actual-source parser tests pass, including blank meals, real empty shuttle and complete event interval.
- Match: 4 tests pass, including real PostgreSQL/Redis concurrency, active-request uniqueness, cancellation rejection and immutable retries after a simulated lost main response. Temporary schema and prefixed cache keys were removed.
- All three compiled servers start and return HTTP503 when required config is absent. Worker campus endpoint rejects missing internal key with HTTP401.

## Comments

2026-09-27: Coordinated main finalization `requestIds` parallel to `userIds`; main enforces unique consumed request IDs. Worker status endpoint and source IDs are shared with main/admin. Actual first-page event 176192 has explicit time/location; incomplete announcements are skipped, not invented. Services' READMEs state operational limits and unverified integrations. No pushes or main-branch merge performed by implementation agent.

Review follow-up: Persist the whole-group availability interval in each immutable batch and send it to main for authoritative full-event interval validation. Main 400/404 now cancel definitively; 409 stops with an existing-party warning; 401/403 and uncertain outcomes retain the same batch. Per-batch session locks prevent conflicting concurrent retries. Regression coverage checks outcome classification, operator explanation, terminal persistence and no terminal replay.
