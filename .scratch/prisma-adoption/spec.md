# Prisma ORM 적용

Status: ready-for-agent
State: implemented; integration and existing-data migration verified

2026-09-27 사용자가 Prisma ORM 사용을 명시했다. PostgreSQL/PostGIS, main/match의 데이터 소유권, Redis/큐 및 서비스 분리는 유지한다. Prisma 7.10.0 안정 패키지와 PostgreSQL adapter를 두 서비스에 동일하게 고정한다.

- 일반 CRUD는 Prisma model query로 전환한다. SQL이 필요한 행/자문 잠금과 공간 연산은 바인딩된 Prisma raw query를 사용한다.
- 서비스마다 schema와 Prisma Migrate SQL을 소유한다. CHECK, partial/functional index, PostGIS extension 등 Prisma schema만으로 표현되지 않는 제약도 SQL baseline에 보존한다.
- 현재 DB를 reset하지 않는다. 빈 DB의 migrate deploy, 검증된 기존 DB의 명시적 baseline resolve, 이후 deploy를 각각 확인한다. 임의 기존 스키마를 자동으로 applied 처리하지 않는다.
- API 응답의 날짜/ID, 정원·중복 매칭·CAS 버전·outbox 원자성·위치 철회·일반/관리 runtime 경계와 장애 복구를 회귀 검증한다.
- 사용자 DB는 Git 제외 artifacts/db-backups에 제한된 권한으로 백업했다. main/match 백업의 임시 DB 복원 시험도 성공했고 임시 DB는 제거했다.
- 구현 worktree: prototype-main의 codex/prisma-main, prototype-services의 codex/prisma-match. root가 리뷰/통합 후 0.0/Main에 squash merge한다. 원격 push하지 않는다.

## 완료 증거

- main-server: Prisma 7.10.0 CRUD, `prisma/schema.prisma`, `0_init` migration; full 27 regression tests passed. Fresh concurrent startup and explicit legacy baseline also preserve SQL CHECK, functional/partial indexes, PostGIS and owner-managed records.
- match-server: same pinned Prisma version, `0001_baseline`; five existing rule/concurrency/retry tests passed with PostgreSQL/Redis, additional PostgreSQL baseline test rejects unbaselined legacy schema (P3005), preserves full request/batch fixtures and enforces CHECK/partial uniqueness.
- Root reviewed lock order, profile/timetable CAS, transactional outbox and immutable match retries. Parameterized raw SQL remains only where needed. No ORM speedup is claimed.
- Prisma-based cross-service E2E passed: public/admin boundary, socket auth, private profiles/timetables, event cache/outbox/hints, quest conflict/cancel, sharing revocation, two-request single-party matching and DB connection recovery. Isolated resources cleaned.
- Both Docker images built and started healthy as non-root against fresh disposable DBs. Fixed missing migration-engine packaging by permitting only @prisma/engines build script.
- Actual local main/match schema matched baseline across 12 application tables: columns, defaults, all constraints and indexes. After final owner-only backups, applied explicit baseline resolve and deploy using each service role. Compared every application row before/after: unchanged. No reset or db push.
- Final pre-migration backups: `artifacts/db-backups/*-20260927-074846-prisma-final-backup.dump` (Git ignored, mode 600). Earlier main/match backups were restored successfully into disposable DBs.
- Root integrated worktrees into `codex/prisma-integration`; final delivery is a squash merge to `0.0/Main`, no push. Full MVP remains in progress under the separate completion spec.
