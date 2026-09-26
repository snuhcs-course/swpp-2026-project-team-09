# Compose, review and integrated verification

Status: ready-for-agent
State: reviewed
Assignee: root

## Scope

Implement the assigned part of [the contract](../../../docs/prototype-api.md) in an isolated worktree; coordinate contract changes and report build/tests and limitations. Root reviews before squash integration.

## Comments

- 2026-09-27 implementation started.

## Verification

- Coordinator reviewed service ownership, role boundaries, event/cache outbox ordering,
  matching idempotency and failure recovery, and location consent/stale response handling.
- All app builds, 24 focused server/mobile checks, and isolated HTTP/Socket E2E passed.
- All nine Compose containers healthy. Main public/admin use the same image.
- Real feeds: meals available; shuttle no_vehicles; 1 official event imported, 4 incomplete skipped.
- Warm shuttle snapshot: 20 requests, 20 cache hits, 0 extra upstream requests; no throughput claim.
- Google/provider credentials, real-device background operation and Colima runtime remain unverified.
- Colima instructions preserve the same Compose topology; no Docker context or engine migration performed.
- Android debug and standalone ARM64 release-variant APK builds passed; release bundle contains JS. Uses development signing and no provider keys.
- Android emulator install/cold launch passed; process-specific Android/JS error logs empty.
- Main checkout runtime handoff exposed missing idle PostgreSQL pool error handling; added recovery; actual connection-termination E2E and complete cross-service regression passed.
