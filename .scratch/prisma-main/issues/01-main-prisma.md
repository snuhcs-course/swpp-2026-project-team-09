# Convert main-server persistence to Prisma
Status: ready-for-agent
Type: task

## Comments

2026-09-27: Implementation complete, pending coordinating review. Ordinary persistence
uses generated Prisma delegates; tagged SQL retains required row/advisory locks and
consent join. Main baseline migration is `0_init`; no auto-baselining of unknown data.
Build and 27 tests passed including fresh migration races and explicit legacy baseline.
Docker build succeeded; runtime verification and final checks recorded below.

Final verification: pinned Prisma 7.10.0 schema validation and CommonJS generation
passed; full suite passed 27/27 with no skips on disposable PostGIS 17/Redis 8.
Expanded migration tests then passed 3/3, adding concurrent source import and
transactional event/revision/outbox rollback. Docker image `prisma-main-verify:local`
built and served healthy as non-root against disposable services after provisioning
the migration engine at build time. `git diff --check` passed. Live services/data
were not modified; coordinator owns reviewed live baseline and integrated E2E.
