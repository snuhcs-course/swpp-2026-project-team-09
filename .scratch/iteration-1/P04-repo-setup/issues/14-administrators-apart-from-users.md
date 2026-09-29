# 14: Administrators apart from Users

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 09 (Recognise an Administrator)

## What to build

An Administrator signs in to the admin site with a Google account and gets an Administrator's record and access token, separate from Users. The app and the admin site then never share a session, so a rule for the app's sessions never signs an Administrator out, and an Administrator never appears on the map or among Friends. A User's token never passes an administrative route, and an Administrator's token never passes a User's route or the socket server.

Administrators are registered in the main database, not in the settings. The settings list only the initial Administrators, which fill an empty database, and Administrators register and remove each other through administrative routes. The admin site's screens for this, and the routes for events, belong to P12.

## Acceptance criteria

Administrators

- [x] The main database keeps Administrators in their own table: the email address they were registered with, the Google subject identifier bound at their first sign-in, and the time before which their tokens are no longer valid.
- [x] A setting lists the initial Administrators' email addresses. While no Administrator is registered, the server registers all of them when it starts. `ADMINISTRATOR_EMAILS` and its `@snu.ac.kr` rule are removed.
- [x] An Administrator lists the Administrators, with each one's email address and whether they have signed in yet.
- [x] An Administrator registers an email address of any Google domain. Case is ignored. Registering an address that is already registered changes nothing and answers 201 with the existing record.
- [x] An Administrator removes another Administrator, or themselves. Removing the last Administrator gets 409.

Sign-in and tokens

- [x] The admin site signs in on its own route with a Google ID token issued to the admin site's client. Any Google domain is accepted, but the email address must be verified and registered; otherwise 403. After the first sign-in the Administrator is recognised by the Google subject identifier. An ID token issued to the app's client gets 401.
- [x] The app's sign-in accepts ID tokens issued to the app's client only; one issued to the admin site's client gets 401. The settings name the two clients separately.
- [x] An Administrator's access token is the main server's own, with an audience of its own, the Administrator's id and no email address. It is valid for 8 hours and comes without a refresh token.
- [x] Administrative routes read the token from the `Authorization` header only. A User's token or a Google ID token gets 401 there, and an Administrator's token gets 401 on a User's route, on `GET /users/me` and on the socket server.
- [x] Every administrative request checks the Administrator: an expired token, a removed Administrator, or a token issued before their last sign-out gets 401.
- [x] An Administrator signs out on a route that ends every token issued to them so far; a new sign-in works afterwards.
- [x] Signing in to the admin site creates no User and leaves the same person's User untouched.

Checks and docs

- [x] Tests through the public API cover: the initial Administrators registered at start and one of them signed in, and no User created; an unregistered account and an unverified email address refused; each client's ID token refused on the other route; each kind of token refused where the other belongs, on the socket server too; register, the new Administrator signs in; register twice; remove, the removed one refused; the last Administrator kept; sign-out, the old token refused and a new sign-in accepted; a token past 8 hours refused.
- [x] The docs say that an Administrator is not a User and how Administrators are registered: `CONTEXT.md` (done), the P04 spec's Administrator story and bullet, ticket 09's description, the main server README, `.env.example` and `compose.yaml`.
- [x] The P12 spec's Admin site section states the admin site's side of the session (see Comments), its screen to register and remove Administrators, and its testing decisions without Administrators as Users.

## Comments

### Decisions (2026-09-29)

The session policy follows `.scratch/research/administrator-sessions.md` (OWASP Session Management Cheat Sheet, ASVS 5.0 V7 and V9, NIST SP 800-63B-4, Google Sign in with Google, Next.js 16 security guides).

- **8 hours, absolute, no refresh token**: a working day, the upper end of OWASP's range for full-day use and under NIST's limit at AAL2. When it expires, the admin site sends the person through Sign in with Google again.
- **No idle timeout**: signing in again takes one click while the person's Google session lasts, so an idle timeout would prove nobody's presence and would not limit a stolen token. ASVS asks for such a deviation to be written down; this is it.
- **Sign-out ends every browser**: a per-Administrator time before which tokens are refused, read with the check every administrative request already makes.
- **No second sign-in before registering an Administrator**: Google offers no way to force a fresh login, so it would add a click without assurance. ASVS asks for it only at Level 3.
- **Admin site side (P12)**: one cookie holds the token, named with the `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, without `Domain` or an expiry, and never passed to Client Components. Every change goes through a Server Action; no Route Handler changes data. A 401 sends the person to sign-in and back to the same page. Every page has a sign-out control. Google's automatic sign-in stays off.
- **Wrong kind of token**: 401 everywhere, because the request proves nobody is signed in as the right kind.
- **Initial Administrators**: a setting used only while no Administrator is registered, so that a fresh database, a new deployment and the tests all start the same way without a command run by hand. The team's four addresses go in each member's `.env` and in the deployment's settings, not in the repository, which is public; `.env.example` shows an example address.

### Implementation decisions (2026-09-29)

- **Routes**, all under `/admin`: `POST /admin/auth/google` takes `{ idToken }` and answers 200 `{ accessToken }`. `POST /admin/auth/sign-out` answers 204. `GET /admin/administrators` answers `[{ id, email, signedIn }]`, in the order of the email addresses. `POST /admin/administrators` takes `{ email }` and answers 201 with the Administrator, the first time and every time after. `DELETE /admin/administrators/:id` answers 204, 404 for an unknown id, 409 `The last Administrator cannot be removed.` and 400 for an id that is not a UUID. Refusals at sign-in: 401 `The Google ID token is invalid or expired.`, 403 `The Google account's email address is not verified.` and 403 `Only a registered Administrator can sign in.`
- **Settings**: `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` hold one client each, and startup stops when they are the same, because either sign-in would then accept the other's ID token. `.env.example` gives the app the ID beginning `1021723676612-aria` and the admin site the one beginning `1021723676612-23lp`; nobody has checked this against Google Cloud Console yet. `INITIAL_ADMINISTRATOR_EMAILS` is required, holds addresses of any domain separated by commas, and is kept in lower case. The tests use `admin@example.com`.
- **Token audiences**: `snu-now-app` for a User's access token and `snu-now-admin` for an Administrator's, so that each is refused where the other belongs. Both are signed with the same ES256 key. An Administrator's token holds `{ sub, aud, iat, exp }` and no email address. `JwtModule` in `AuthModule` has the User's audience and 1 hour as defaults, and the Administrator's sign-in and guard pass `snu-now-admin` and 8 hours per call. A call that forgets them issues or expects a User's token, so the mistake fails closed. The socket server verifies `snu-now-app`.
- **Guard design**: `@Public()` and `@AdministratorOnly()` set one metadata key, `ROUTE_ACCESS` in `src/common/route-access.ts`, to `public` or `administrator`; an unmarked route is a User's. A marking on a handler replaces its controller's, so every route is exactly one of the three. `AccessTokenGuard` checks only a User's routes and `AdministratorGuard` only an Administrator's, so their order does not matter. Both read the token from the `Authorization` header alone (`bearerToken`). `AdministratorGuard` reads the Administrator by id on every request. It refuses one who is gone, and a token whose `iat` is not after `tokens_valid_after`. A handler reads the Administrator with `@CurrentAdministrator()`, which reads `request.administrator`, apart from `request.user`. Both markings on one handler leave the upper decorator in force; the README says to use one at most.
- **Module layout**: `src/administrators/` holds the records, the initial registration and the list, register and remove routes, as `src/users/` does for Users. `src/auth/` holds both sign-ins and both guards. The Administrator's sign-in has its own controller and service (`administrator-auth.*.ts`), so that ticket 07's changes to `AuthService` do not meet it. `AuthModule` imports `AdministratorsModule`.
- **Table** `administrators`: `id`, `email` (unique, lower case), `google_subject` (unique, null until the first sign-in) and `tokens_valid_after` (the last sign-out, null before the first). Removal deletes the row, so a re-registered address gets a new id and tokens issued under the old one stay refused.
- **Removal** runs in one transaction that first locks every Administrator row in id order (`SELECT id FROM administrators ORDER BY id FOR UPDATE`). Two removals at the same moment run one after the other, and the second sees what the first left: it keeps the last Administrator, and gets 404 for a row already removed. The fixed order keeps two removals from locking each other.
- **Google account**: sign-in first looks the Administrator up by the subject identifier. Otherwise it binds the identifier to the unbound row with the token's email address, then looks it up again, which also finds a row that a concurrent first sign-in bound. Another account with a bound address gets 403.
- **Initial registration** runs in `onApplicationBootstrap`, after `PrismaService` has checked the connection in `onModuleInit`, so that an unreachable database stops startup with the connection error. It runs only when the table is empty, and uses `createMany` with `skipDuplicates` for two servers starting together. The server therefore needs its schema before it starts, and the health test that starts its own PostgreSQL migrates it first.
- **Idempotency**: the scope is `request.user?.id ?? request.administrator?.id`. No route of this ticket uses `@Idempotent()`. Registering is keyed by the address, so a repeat answers 201 with the same record. Signing out twice does no harm. A repeated removal answers 404, which the admin site can read as done. P12 marks the hand-made Global Event with `@Idempotent({ required: true })`. The scope includes the Administrator because without it every Administrator would share one set of keys.
- **Left as they are**: the Google claim checks appear in both `AuthService` and `AdministratorAuthService`, kept apart so that this branch does not conflict with the open ticket 07 pull request, which rewrites `AuthService.signIn`.
- **Left as they are**: `GoogleIdTokenVerifier.verify` takes an `audiences` array and each sign-in passes one client, because the array is ticket 06's interface.

### Tests (2026-09-29)

- The seams are the main server's HTTP API and startup, and the socket server's connection. As P04 decided, only Google's verifier is replaced. Some checks use the test's own database connection: they read the Administrator's id and the User count, and one holds a row lock.
- `test/administrator-auth.e2e-spec.ts` covers sign-in, the token's claims, the Google account binding, the same person's User left untouched, the refusals, the route kinds, sign-out and a User's route. A token signed with the test private key, the audience `snu-now-app` and a registered Administrator's id is refused on an administrative route, which checks the audience itself. A test-only controller marked `@AdministratorOnly()` has a `@Public()` handler, which checks the override. The 8-hour case signs an expired token with the test private key. After signing out, the sign-out test waits for the next whole second before signing in again, because `iat` has whole seconds (see Known limits).
- `test/administrators.e2e-spec.ts` lists, registers and removes Administrators on the shared database. A second PostgreSQL container, migrated with `migrate()` from `test/containers.ts`, starts a server with no Administrator registered. Its cases run in order: every initial Administrator registered, with no User; a restart with another list registers nobody; the last Administrator stays; and two Administrators removing each other at the same moment leave one. The initial addresses are given out of alphabetical order, so that its list checks the order. Registering again the address of an Administrator who has signed in checks that they stay signed in and keep their token.
- The race test holds a lock on one Administrator's row in a transaction of its own. It sends the other's removal of that one and waits, with `pg_blocking_pids`, until the request waits for a lock. Then it sends the reverse removal and waits until that one waits or is answered, and releases the lock. It expects one 204, one 409 and one Administrator left.
- The test files run in parallel on one database, and the first server of the run registers `admin@example.com`. `signInAsAdministrator(app)` returns `{ accessToken }`, as `signIn` returns its tokens. It always signs in with the same Google subject (`ADMINISTRATOR` in `test/google.ts`), because the first sign-in binds it. `registerAdministrator` in `test/sign-in.ts` sends the registration. Tests that sign out or remove use `signInAsNewAdministrator(app)`, so that the initial Administrator keeps working for the other files.
- `test/idempotency.e2e-spec.ts` covers two Administrators sending one key. `test/auth.e2e-spec.ts` covers the admin site's ID token refused on the app's sign-in and the User's token audience. Its expired and forged tokens carry the User's audience, so that each fails for its own defect. `test/settings.e2e-spec.ts` covers the admin site's client ID set to the app's. `socket-server/test/users.e2e-spec.ts` covers an Administrator's token refused.
- `pnpm test` passes 109 tests in 9 files in the main server and 19 in 4 in the socket server. Lint, format and typecheck pass in both.

### Red before green (2026-09-29)

Each part was broken on its own and the full suite run. Only the matching tests failed:

- The app's sign-in also accepting the admin site's client: the app's refusal of an admin site's ID token. The reverse: the admin site's refusal of an app's ID token.
- `AccessTokenGuard` without the audience: an Administrator's token on `GET /users/me`. The socket server without it: the Administrator's token on a connection.
- `AdministratorGuard` accepting `snu-now-app` as well: the token with a User's audience that names an Administrator. Without the audience option the guard falls back to the User's default audience, so that test and every test with a real Administrator's token fail.
- An 8-hour token made 9 hours: the token claims test.
- The guard ignoring `tokens_valid_after`: the sign-out test. The guard accepting a removed Administrator: both removal tests.
- Sign-in by email alone: the two Google account tests and both lists (`signedIn`).
- The verified-email check dropped: the unverified refusal.
- Initial registration on every start: the restart test, and then the last-Administrator test, which runs after it on the same database and saw three.
- Registration keeping the case: the case test and the repeat test.
- Checked on `test/administrators.e2e-spec.ts` alone: a repeat that unbinds the Google account, or ends the tokens, fails the repeat for an Administrator who has signed in. The list without an order fails the fresh server's list and the two last-Administrator tests after it. The removal without the UUID check answers 404, not 400, to an id that is not a UUID.
- The removal as a count, a lookup and a delete without a transaction: the race test got 204 twice and left no Administrator. The locking query without `FOR UPDATE`: the race test. The last-Administrator check dropped: both last-Administrator tests.
- The controller's marking overriding the handler's: the `@Public()` override test.
- The idempotency scope without Administrators: the two-Administrators test.
- Any string as a client ID: the `GOOGLE_ADMIN_CLIENT_ID` test. The two client IDs allowed to be the same: the test with the app's ID as the admin site's. Any string as an initial address: the non-email and empty tests.

Several first runs also failed one or two unrelated tests: the health hook with its own PostgreSQL, the expired-token and server-error cases, a request without a token, a timed store contract case and the socket server's readiness check. They passed on the rerun and were not investigated here.

### Known limits (2026-09-29)

- `iat` has whole seconds, so every token issued in the second of a sign-out is refused, a new sign-in's included. A person cannot sign in again that fast. No test sets a sign-out on a whole second, so the `<=` that refuses a token from the sign-out's very millisecond has none.

### Agent usage (2026-09-29)

- Agent time: about 3 hours 35 minutes, an estimate, summed over the sessions below. Time spent waiting for answers is left out.
  - The planning session, in the worktree `admiring-dhawan-e58033`, worked about 50 minutes on this ticket: the decision, the ticket, the review and the pull request. That includes about 5 minutes waiting for its two review subagents.
  - Subagents: the session-policy research about 12 minutes, the implementation about 99 minutes (87 for the first pass, 12 for the review fixes), and the Standards and Spec reviews about 4 and 5 minutes, at the same time.
  - The review-feedback session, in the worktree `ticket-review-feedback-09cfc6`, worked about 45 minutes: the review fixes and the final review before merging. Its five review subagents (Standards and Spec twice, then a sweep of every document) took 3 to 5 minutes each, in parallel with the session.
- Tokens, for the planning session from the decision on and its four subagents, counted when this section was written:
  - Input: 79,413,099 in total, of which 77,123,515 were cache reads, 2,289,014 cache writes and 570 uncached.
  - Output: 114,278. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 36,731, is a lower bound.
- Tokens, for the review-feedback session and its five review subagents, counted when this section was written:
  - Input: 34,681,635 in total, of which 33,751,720 were cache reads, 929,481 cache writes and 434 uncached.
  - Output: 116,440, of which the subagents' 5,235 is a lower bound for the same reason.
- Not included: the research on signing in on a second device, which belongs to a later ticket.
