# 09: Recognise an Administrator

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

The main server recognises an Administrator by email address, so that an Administrator can manage Global Events without a separate account. An Administrator is a User whose email address is on a list in the main server's settings. A route can be marked as administrative, and only an Administrator passes it.

The administrative routes themselves belong to P12.

## Acceptance criteria

- [x] The Administrator email list is a setting, validated at startup and listed in the example settings file.
- [x] A route can be marked as administrative in one step, the same way on every route.
- [x] On an administrative route, an Administrator passes, another signed-in User gets 403, and a request without a valid access token gets 401.
- [x] Administrator status is not stored in the token. The list is checked on every administrative request.
- [x] Tests through the public API cover an Administrator recognised by the list and another User refused. Until P12 adds real routes, the tests may use a route marked administrative that exists only in the tests.

## Comments

### Decisions P12 builds on (2026-09-29)

Agreed with 김태현 before the implementation.

- **Marking**: `@AdministratorOnly()` in `src/common/administrator-only.decorator.ts` sets metadata, as `@Public()` does, on a handler or a whole controller. `AdministratorGuard` in `src/auth/administrator.guard.ts` reads it. It is a global guard, registered in `AuthModule` after `AccessTokenGuard`, so a feature module needs no import for the check, and marking P12's controller once covers every route in it.
- **Answers**: an Administrator passes. Another signed-in User gets 403 `Only an Administrator can use this route.` in Nest's default body `{ statusCode, message, error }`. A request without a valid access token gets 401 from `AccessTokenGuard` before the Administrator check runs.
- **Setting**: `ADMINISTRATOR_EMAILS` holds addresses separated by commas; spaces around them are ignored. Startup stops and names the setting when it is missing or empty, or when an entry is not an email address or not an `@snu.ac.kr` address. Only SNU accounts sign in, so another address could never match and is a mistake. `.env.example` holds the placeholder `your-id@snu.ac.kr`, not the team's addresses; each teammate writes their own in `.env`, which Compose passes to the server.
- **Comparison**: case is ignored. The settings schema lower-cases the list, and the guard lower-cases the User's email address.
- **Where the address comes from**: the access token stays `{ sub }` (ticket 06). On every administrative request the guard reads the User's email address from `users.email`, which each sign-in updates to the address Google sends. An address taken off the list is refused as soon as the server restarts with the new list, even with an access token issued before.
- **What an Administrator may do**: CONTEXT.md defines an Administrator as a team member who confirms, publishes and creates Global Events. 김태현 asked whether this means event organizers among the Users or the team that runs the app. It is the team: P12 leaves organizer accounts out of scope. The role grants only what P12's administrative API offers; it gives no access to the servers or the databases themselves.

### Tests (2026-09-29)

`test/administrators.e2e-spec.ts` passes `startApp` two controllers that exist only in the test: one marks a single route and has a second route marked `@Public()` as well, and the other is marked as a whole. A `max-classes-per-file` exception keeps both in the file. The server starts with the test settings. On the marked route, the tests cover an Administrator, another User (403), and no access token and an invalid one (401). The `@Public()` route answers 401 even to an Administrator. On the marked controller, they cover an Administrator and another User (403). Two tests start a second server with a list of their own. One lists `Second-Admin@SNU.ac.kr` and signs in as `SECOND-ADMIN@snu.ac.kr`, so case is ignored on both sides. The other leaves `admin@snu.ac.kr` off the list and sends it the access token the first server issued. `test/settings.e2e-spec.ts` covers the setting missing, empty, holding something other than email addresses (addresses separated by `;`) and holding an address outside SNU. The test settings in `global-setup.ts` list `admin@snu.ac.kr`, so `signIn(app, { email: 'admin@snu.ac.kr' })` signs in as an Administrator.

Breaking the implementation made the matching tests fail: refusing every User, registering `AdministratorGuard` before `AccessTokenGuard` (every case failed), keeping the case of the list or of the User's address, reading the marking from the handler alone, dropping either the email address check or the `@snu.ac.kr` check, and looking the User up on a route marked `@Public()` as well (500). `pnpm test` passes 84 tests in 8 files; lint, format and typecheck pass.

### Known limits (2026-09-29)

- A valid access token for a User who no longer exists gets 500 on an administrative route, as it does on `GET /users/me`: `findUniqueOrThrow` throws and no filter maps it. Users cannot be deleted yet.
- `@Public()` and `@AdministratorOnly()` on the same route contradict each other. `AccessTokenGuard` then puts no User on the request, so `AdministratorGuard` answers 401 to every request, even an Administrator's. Do not combine them.

### Agent usage (2026-09-29)

- Agent time: about 20 minutes, an estimate. One Claude Code session worked about 16 minutes, not counting about 6 minutes waiting for 김태현's answers to the design questions, and about 3 more for the push and the pull request. Two review subagents added about 3 minutes, running side by side.
- Tokens, the session and its two review subagents together, counted from their transcripts just before this commit (the push and the pull request add a little): input 10,121,992, of which 9,799,857 cache reads, 321,973 cache writes and 162 uncached; output 68,558.
- Review and fixes: a second Claude Code session reviewed the pull request with three review subagents and added the review commits, about 26 minutes, an estimate. Tokens, counted the same way just before this commit (the push adds a little): input 13,897,189, of which 13,438,922 cache reads, 458,019 cache writes and 248 uncached; output 66,250.
- Total: about 46 minutes; input 24,019,181, of which 23,238,779 cache reads, 779,992 cache writes and 410 uncached; output 134,808.
