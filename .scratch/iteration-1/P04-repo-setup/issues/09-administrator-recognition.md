# 09: Recognise an Administrator

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

The main server recognises an Administrator, so that an Administrator can manage Global Events without a separate password. A route can be marked as administrative, and only an Administrator's access token passes it. An Administrator is not a User: Administrators have their own records, sign-in and access tokens.

The routes that register and remove Administrators belong to ticket 14, and the routes for Global Events to P12.

## Acceptance criteria

- [x] A route, or a whole controller, can be marked as administrative in one step, the same way on every route.
- [x] On an administrative route, only an Administrator's access token passes. A request without one, or with a User's access token, gets 401.
- [x] Administrator status is not stored in the token. It is checked on every administrative request.
- [x] Tests through the public API cover an Administrator let through and a User's access token refused. Until P12 adds its routes, the tests may use a route marked administrative that exists only in the tests.

## Comments

### Decisions P12 builds on (2026-09-29)

- **Marking**: `@AdministratorOnly()` in `src/common/administrator-only.decorator.ts` marks a handler or a whole controller with the same route-access metadata that `@Public()` sets (`src/common/route-access.ts`). `AdministratorGuard` in `src/auth/administrator.guard.ts` reads it. It is a global guard registered in `AuthModule`, so a feature module needs no import for the check, and marking P12's controller once covers every route in it.
- **Answers**: an Administrator's access token passes. A request without one, or with a User's access token, gets 401 in Nest's default body `{ statusCode, message, error }`.
- **Checked on every request**: the access token names the Administrator and carries no status. On every administrative request the guard reads the Administrator, so a removed Administrator is refused at once, even with an access token issued before.
- **What an Administrator may do**: CONTEXT.md defines an Administrator as a team member who confirms, publishes and creates Global Events. It means the team that runs the app, not event organizers among the Users: P12 leaves organizer accounts out of scope. The role grants only what the administrative API offers, registering and removing Administrators (ticket 14) and managing Global Events (P12); it gives no access to the servers or the databases themselves.

### Tests (2026-09-29)

`test/administrator-auth.e2e-spec.ts` covers the marking. On `GET /admin/administrators`, an Administrator passes, and a request without an access token, with a User's access token or with a Google ID token gets 401. On a controller that exists only in the test and is marked as a whole, an Administrator passes, a User's access token gets 401, and a handler marked `@Public()` is open to anyone.

### Known limits (2026-09-29)

- A valid access token for a User who no longer exists gets 500 on `GET /users/me`: `findUniqueOrThrow` throws and no filter maps it. Users cannot be deleted yet.

### Agent usage (2026-09-29)

- Agent time: about 20 minutes, an estimate. One Claude Code session worked about 16 minutes, not counting about 6 minutes waiting for answers to the design questions, and about 3 more for the push and the pull request. Two review subagents added about 3 minutes, running side by side.
- Tokens, the session and its two review subagents together, counted from their transcripts just before this commit (the push and the pull request add a little): input 10,121,992, of which 9,799,857 cache reads, 321,973 cache writes and 162 uncached; output 68,558.
- Review and fixes: a second Claude Code session reviewed the pull request with three review subagents and added the review commits, about 26 minutes, an estimate. Tokens, counted the same way just before this commit (the push adds a little): input 13,897,189, of which 13,438,922 cache reads, 458,019 cache writes and 248 uncached; output 66,250.
- Total: about 46 minutes; input 24,019,181, of which 23,238,779 cache reads, 779,992 cache writes and 410 uncached; output 134,808.
