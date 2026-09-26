# Main API prototype

Status: ready-for-agent
Type: task
State: reviewed

Implement main-owned auth, events, relationships, parties, quests, location consent,
internal worker/match handoff and transactional outbox within the agreed contract.

## Implementation

NestJS public/admin runtime split; verified school Google auth and current allowlist;
PostgreSQL schema, constrained joins and durable match request consumption; Redis
latest-location/cache with relational privacy checks; authenticated campus proxy.
Source code and focused invariant tests live in `main-server/`.

## Comments

- 2026-09-27: Main API implemented in isolated `codex/prototype-main` worktree.
  Build and all eight tests pass, including live PostgreSQL/Redis capacity,
  idempotency, privacy and cache-ordering tests. Built HTTP smoke confirms absent
  public admin routes, internal-key enforcement and configuration-required states.
  Root coordinator reviews before squash merge.
- Unresolved friend-OFF/party-ON and conflicting multiple-party consent fail closed.
  Operational and privacy limits are documented in `main-server/README.md`.

- Follow-up review: lock/validate published event on joins and match finalization;
  matching validates the whole event against immutable timeStart/timeEnd. Member
  Party DTO now includes own sharingEnabled. Older location uploads are ignored
  without hints. Build and twelve unit/integration tests pass (no skips).

- Cross-service smoke (`tests/prototype-e2e.mjs`) passed against compiled integration
  apps with isolated temporary PostgreSQL databases, initially empty Redis indexes
  14/15 and test ports 13900–13904. Verified five runtime health checks; HTTP/socket
  authentication and admin separation; event mutation → cache invalidation → socket
  hint → fresh snapshot; party/friend/global location privacy; two actual matching
  requests forming one party and idempotent retries. Real feed response results:
  meals available; shuttle no_vehicles. No fabricated external response fixtures.
  Cleanup completed with exit 0; test-only databases/processes/index contents removed.
  Google sign-in with real credentials and physical-device behavior remain unverified.
