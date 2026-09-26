# Prisma ORM 적용

Status: ready-for-agent
State: implementation and migration validation in progress

2026-09-27 사용자가 Prisma ORM 사용을 명시했다. PostgreSQL/PostGIS, main/match의 데이터 소유권, Redis/큐 및 서비스 분리는 유지한다. Prisma 7.10.0 안정 패키지와 PostgreSQL adapter를 두 서비스에 동일하게 고정한다.

- 일반 CRUD는 Prisma model query로 전환한다. SQL이 필요한 행/자문 잠금과 공간 연산은 바인딩된 Prisma raw query를 사용한다.
- 서비스마다 schema와 Prisma Migrate SQL을 소유한다. CHECK, partial/functional index, PostGIS extension 등 Prisma schema만으로 표현되지 않는 제약도 SQL baseline에 보존한다.
- 현재 DB를 reset하지 않는다. 빈 DB의 migrate deploy, 검증된 기존 DB의 명시적 baseline resolve, 이후 deploy를 각각 확인한다. 임의 기존 스키마를 자동으로 applied 처리하지 않는다.
- API 응답의 날짜/ID, 정원·중복 매칭·CAS 버전·outbox 원자성·위치 철회·일반/관리 runtime 경계와 장애 복구를 회귀 검증한다.
- 사용자 DB는 Git 제외 artifacts/db-backups에 제한된 권한으로 백업했다. main/match 백업의 임시 DB 복원 시험도 성공했고 임시 DB는 제거했다.
- 구현 worktree: prototype-main의 codex/prisma-main, prototype-services의 codex/prisma-match. root가 리뷰/통합 후 0.0/Main에 squash merge한다. 원격 push하지 않는다.

## 완료 증거

아직 진행 중. 패키지 생성·빌드·테스트·빈 DB migration·기존 데이터 baseline·Docker 실행·통합 E2E 결과를 최종 반영한다.
