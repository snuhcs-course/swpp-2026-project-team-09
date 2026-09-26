# Party and quest API

Status: ready-for-agent
State: implementation reviewed; validation recorded below
Owner: main_api

Authoritative membership/count metadata; cancellation and stale-edit protection with membership authorization and tests.

## Verification

Reviewed implementation. All18 main tests passed with temporary PostgreSQL/Redis. HTTP/Socket E2E passed counts/privacy, quest update, stale409, cancellation and authorized refresh. Deployed revised main-public/main-admin locally; all9 containers healthy.
