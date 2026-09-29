# 07: Stay signed in and sign out

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

An SNU student stays signed in for weeks: when the access token expires, the app exchanges the refresh token for new tokens without the User doing anything. Signing out ends the User's session and turns off their Master Switch, so that their location is not shared after they leave.

A User has one session: the app signed in on one phone. Signing in on another phone ends the previous session within seconds, so the map only ever gets one phone's position for a User. Every access token names its session, so a request or a socket connection from an ended session is refused at once, whether the session ended by a sign-in elsewhere, a sign-out or a used refresh token coming back. The phone whose session was replaced is told why.

Turning the Master Switch on and what it controls belong to P06 and P08.

## Acceptance criteria

- [x] A valid refresh token returns a new access token and a new refresh token. The used refresh token is refused afterwards.
- [x] An expired, revoked or unknown refresh token is refused.
- [x] Signing out revokes every refresh token of that User. None of them can be exchanged afterwards.
- [x] The User has a Master Switch, off when the User is created.
- [x] Signing out turns the Master Switch off.
- [x] Tests through the public API cover: refresh replaces the token and the old one stops working; sign-out revokes; the stored Master Switch is off after sign-out.
- [x] A User has one session. Signing in revokes every refresh token of the User in the same transaction that stores the new one, under the User lock. The Master Switch stays as it is.
- [x] Each access token names its session (its refresh token family), and a refresh keeps it.
- [x] When a session ends, by a sign-in elsewhere, a sign-out or a used refresh token coming back, a User's route refuses its access tokens with 401 from the next request on. A session replaced by a sign-in elsewhere gets a code that says so; other refusals keep the plain 401.
- [x] Within a few seconds of a session ending, the socket server disconnects that session's connections, with the same reason, and refuses a new connection with its access token. It still checks tokens without calling the main server.
- [x] Tests through the public API cover: a second sign-in ends the first phone's session (its refresh refused; its access token refused with the code; its socket disconnected with the reason; a new connection refused) while the new phone works; a sign-in and a refresh on the other phone at the same moment leave only the sign-in's session; after a sign-out and after a used token comes back, the ended session's access token is refused at once.
- [x] The docs describe one session per User: `CONTEXT.md` (Session, done), the main server and socket server READMEs, the P04 spec, the P06 spec (the app stops background sharing and shows sign-in with the reason), the P08 spec (a replaced session's stored position is cleared), the P17 spec, ticket 11's note on open connections, and this ticket's own Comments.

## Comments

### One session per User (2026-09-29)

Location-first apps (Life360, Zenly) allow one signed-in phone and sign the old one out, and even apps with several devices share live location from one (`.scratch/research/multi-device-sign-in.md`).

- One session per User; no second phone or view-only tablet. Administrators sign in apart from Users (ticket 14), so this does not reach the admin site.
- The Master Switch stays as it is when a session is replaced.
- The replaced phone gets a code that says a sign-in elsewhere ended its session, on the HTTP 401 and on the socket disconnect, so that the app can say so. Other refusals stay the plain 401.
- An ended session is recorded in Redis for the access token's lifetime (1 hour), so that the main server's guard and the socket server both check it without a database query. It is recorded before the revocation commits, so that a failure leaves the session refused rather than open. A messaging event tells the socket server to disconnect the session's connections.

### Decisions (2026-09-29)

- **Routes**: `POST /auth/refresh` is `@Public()`, takes `{ refreshToken }` and answers 200 `{ accessToken, refreshToken }`, the same `TokensDto` as sign-in. Every refused token gets 401 `The refresh token is invalid, expired or revoked.`, so the answer does not tell which check failed; a body without `refreshToken` gets 400. `POST /auth/sign-out` takes the access token and no body, and answers 204. The access token of a session that has ended gets 401 there too, as on every User's route.
- **Revocation**: rows are kept. `revoked_at` is set when a refresh uses a token up, a used token of its family comes back, or a sign-in or a sign-out revokes it. `family_id` groups the tokens that descend from one sign-in: the database gives each sign-in's token a new one (`DEFAULT gen_random_uuid()`), and a refresh hands it on.
- **A used token that comes back**: 401, and every token of its family is revoked (RFC 9700, section 4.14.2), even when it has expired since, which ends its session. The Master Switch stays as it is. A token of a session that a sign-out or a later sign-in ended only touches its own family, which is already revoked, so the later sign-in keeps working.
- **Expiry**: a refresh token handed out by a refresh is valid for 30 days from the refresh, as at sign-in.
- **Simultaneous refreshes with one token**: one succeeds. The others count as a second use and revoke the family, the winner's new token included. The app (P06) therefore sends one refresh at a time, for example by sharing one pending refresh among the requests that got 401. The README says so.
- **Master Switch**: `users.master_switch BOOLEAN NOT NULL DEFAULT false` (`masterSwitch` in Prisma). Sign-out sets it to false in the same transaction that revokes the tokens. Turning it on, and showing it in `GET /users/me`, belong to P06 and P08.
- **Indexes**: `refresh_tokens_user_id_idx` for sign-out and `refresh_tokens_family_id_idx` for revoking a family. The foreign key still has no cascade.

### How a refresh stays atomic (2026-09-29)

`AuthService.refresh` reads the token by its hash and refuses it when it is unknown, or expired and not revoked. A revoked token goes on even when it has expired, so that a used token coming back after 30 days still revokes its family. An interactive transaction (`$transaction(async (tx) => …)`) then locks the User's row, revokes the token with `updateMany({ where: { id, revokedAt: null } })` and stores a replacement only when that revoked one row. When it revoked none, the token was used before: the same transaction revokes its family, and the request gets 401.

A sign-in and a sign-out lock the User's row too, then revoke the User's tokens in the same transaction; the sign-in stores its own token and the sign-out turns the Master Switch off. `UsersService.lock` takes the lock with `SELECT … FOR NO KEY UPDATE`, the lock an `UPDATE` of the row takes, so storing a row that refers to the User, such as a refresh token, does not wait for it. A sign-in, a refresh, a family revocation and a sign-out of one User therefore run one after another, and each sees the tokens stored before it. Without the lock, under PostgreSQL's default isolation, a statement sees only the rows committed when it started: a revocation that ran while a refresh stored its replacement waited for the used token, found it revoked, and missed the replacement.

Access tokens are checked with the public key and the ended sessions in Redis, so an access token of an ended session is refused from the next request on, and the session's socket connections are closed; see "Ended sessions" below.

### Repeated requests and lost answers (2026-09-29)

Sign-out is safe to repeat: a second call changes nothing and gets 401, because the first ended the session, so the app takes a 401 to sign-out as done. Refresh cannot use `@Idempotent()` from ticket 10, because it is `@Public()` and ticket 10 keeps keys apart by whoever is signed in. When the answer to a refresh is lost, the app still holds the used token. Its next refresh counts as a second use and revokes the family, so the User signs in again. This is left as is: it needs a lost answer, and accepting the used token again for a short time would weaken reuse detection. The README tells the app.

### Tests (2026-09-29)

The tests are in `test/refresh.e2e-spec.ts` and `test/sign-out.e2e-spec.ts`. They did not fit in `test/auth.e2e-spec.ts`: oxlint's `max-lines` (300) and `max-lines-per-function` (50) apply to test files too. `refresh()`, `postRefreshToken()`, `refreshTokenHash()` and `getMe()` sit beside `signIn()` in `test/sign-in.ts`, and a test that needs one User on two phones signs in twice with a subject from `googleSubject()` in `test/google.ts`; the second sign-in ends the first phone's session. An expired token and a Master Switch that is on are set in the database, because no route sets them.

The simultaneous-refresh test opens database connections with ten simultaneous sign-ins before it sends ten refreshes at once. The pool opens connections on demand, and timing logs showed that opening one takes longer than a whole refresh, so refreshes sent without them reach the database one after another: two of them passed even against an implementation that checks `revoked_at` first and then updates without the condition. With the sign-ins, 5 to 7 of the ten succeeded against that implementation in every run; the real implementation passed every run.

Two tests make requests overlap in the database with `overlap()` in `test/overlap.ts`. The test locks a stored refresh token with its own connection, sends the first request, sends the second once the first waits for that lock, and releases the lock once both wait; `pg_blocking_pids` tells it who waits. One test refreshes while the User signs out on the same phone, the other refreshes while a used token of the same family comes back. Against the implementation without the lock, the replacement kept working in both tests in every run.

Red before green. Each change below failed the matching tests and no others:

- The revocation without `revokedAt: null`: the used token was exchanged again, a returning token's replacement (also after it had expired) and a signed-out User's tokens kept working, the simultaneous refreshes, and both overlapping tests.
- No family revocation: a returning token's replacement kept working (also after it had expired), the simultaneous refreshes, and the used token that comes back during a refresh.
- Revoking every token of the User instead of the family: the session of a later sign-in stopped working, also in the sign-in during a refresh on the other phone, whose replaced phone brings back its revoked token.
- No expiry check: the expired token.
- Refusing every expired token before the reuse check: the replacement of a used token that came back after it had expired kept working.
- The new token keeping the old expiry: 30 days from the refresh.
- Sign-out leaving the Master Switch: the Master Switch after sign-out.
- Sign-out revoking nothing: every token revoked after sign-out, the session's access token refused afterwards, the socket server told of the sign-out, and the sign-out during a refresh.
- Sign-out without the lock: the sign-out during a refresh.
- The refresh without the lock: both overlapping tests.

`startApp` makes the app listen once, on a free port of `127.0.0.1`. An app that is only initialised does not listen, and supertest then starts the server on a free port for each group of requests and closes it afterwards. With such a server every run warned `MaxListenersExceededWarning`, one of twelve runs of the refresh and sign-out tests failed, one test failed twice in about 110 runs with supertest's `socket hang up`, and a sign-in answered 503 and another 404, each with an empty body, which the server never sends. With `startApp` listening, thirty runs of the auth, refresh and sign-out tests passed without the warning.

One run of the whole suite failed "Health checks with the database down", which starts and stops a PostgreSQL container of its own. It passed alone and in six further runs of the whole suite.

### Ended sessions (2026-09-29)

- **Session**: the refresh token family. The access token names it in `sid`, the claim OpenID Connect uses for a session, so a refresh keeps it. Both servers read the payload as `{ sub, sid }`.
- **Sign-in**: after finding or creating the User, one transaction locks the User's row, revokes every token of the User, records their sessions as replaced and stores the new token. The revocation (`updateManyAndReturn`) answers the families it revoked. A session whose tokens were all revoked already is not recorded again, so a used token of a replaced session that comes back keeps the record `replaced`.
- **Record**: `ended-session:<sid>` in the shared Redis, `replaced` after a sign-in and `ended` after a sign-out or a used refresh token, with `EX 3600`, the access token's lifetime from the same constant. It is written inside the revoking transaction, before the commit. A refresh signs its access token inside its transaction too, so that an end of the session, which waits for the User lock, is recorded after that token was issued and outlasts it.
- **Event**: after the records, the main server emits `session-ended` with `{ sessionId, end }` over NestJS messaging and waits until it is published. The socket server receives it in `UsersController` with `@EventPattern('session-ended')`.
- **HTTP**: `AccessTokenGuard` reads the record after verifying the token. `replaced` gets 401 `{ statusCode: 401, error: 'Unauthorized', code: 'SESSION_REPLACED', message: 'A sign-in on another phone ended this session.' }`, the shape of `@nestjs/idempotency`'s coded answers. Any other value gets the plain 401.
- **Socket**: the connection middleware reads the record after verifying the token. An ended session gets `connect_error` with the message `Unauthorized` and, as Socket.IO documents, `data`: `{ code: 'SESSION_REPLACED' }` after a sign-in and `{}` otherwise. An admitted connection joins the room `session:<sid>`. On the event, the gateway sends `session-ended` with the same `data` to the room and then calls `disconnectSockets(true)`, so the app gets `disconnect` with `io server disconnect` and Socket.IO does not reconnect by itself. The socket server still makes no call to the main server.
- **Redis down**: the check fails closed. A User's route answers 503 (`ServiceUnavailableException`), not 401, so that the app tries again instead of signing the User out, and a connection attempt gets `Service Unavailable`. Both Redis clients have `commandTimeout: 1000`, so the check fails within a second; with ioredis's defaults a command waits through 20 attempts to reconnect, over a minute. The main server's client also serves the idempotency store, which gets the same timeout. A sign-in, sign-out or returning used token that cannot write the record answers 500, and its transaction rolls back.
- **Master Switch**: it stays as it is when a session is replaced. Clearing the replaced phone's stored position belongs to P08.

Known limits:

- A connection that is opening at the moment its session ends can miss both: its middleware read Redis before the record, and the event was handled before it joined the room, because `disconnectSockets` reaches only connected sockets. It stays open until it drops. The window is the few milliseconds between the read and the join.
- A replaced phone that comes back after its access token expired only refreshes, and the refresh route keeps its one answer, so the app shows sign-in without the reason.
- Removing the lock from the sign-in fails no test. `UsersService.findOrCreate`, just before the transaction, updates the User's row and so waits for a refresh that holds the lock. The lock covers the moment between that update and the revocation, which no test can hold open.

### Tests of one session (2026-09-29)

- `test/session.e2e-spec.ts` covers a refresh keeping the session; a second sign-in: the first phone's refresh token refused, both of its access tokens refused with the code, the new phone working, the Master Switch kept; a sign-in during a refresh on the other phone; what the socket server is told; and a User's route with Redis down. `sessionOf()` in `test/sign-in.ts` reads the `sid` claim, and `test/auth.e2e-spec.ts` checks that it is the family of the stored refresh token.
- The sign-in during a refresh uses `overlap()`: the test holds the first phone's refresh token, the refresh waits for it while holding the User lock, and the sign-in waits behind the refresh. The refresh answers 200 and the sign-in revokes the token it stored.
- What the socket server is told: the test subscribes with ioredis to the channel `session-ended`, where NestJS messaging publishes `{ pattern, data }`, and reads the record and its time to live.
- The Redis-down tests start their own Redis and stop it once the server runs, as the health tests do.
- After a sign-out and after a used token comes back, `test/sign-out.e2e-spec.ts` and `test/refresh.e2e-spec.ts` check that the session's access tokens get the plain 401, a second sign-out included. Their tests of one User on two phones run on one phone: sign-out revokes a refreshed session's tokens, the sign-out during a refresh comes from the same phone, and a used token that comes back keeps the session of a later sign-in.
- The socket server's `test/users.e2e-spec.ts` ends sessions as the main server does, writing the record and emitting the event with a `ClientProxy` of its own. It covers a new connection refused with and without the code, open connections told and disconnected with and without the code, another session's connection left open, and a connection with Redis down. The other session's connection is checked with `fetchSockets()`, because its client can receive a disconnect after the ended session's client does.

### Red before green for one session (2026-09-29)

Each change below was made alone, and the whole suite of that server run. Only the matching tests failed:

- Access tokens without `sid`: the claims test, a refresh keeping the session, every refusal of an ended session's access token, the sign-in during a refresh, and both tests of what the socket server is told.
- A refresh with a new `sid`: a refresh keeping the session, the first phone's refreshed access token, the returning used token's access tokens, and the sign-in during a refresh.
- A sign-in that ends nothing: the first phone's refresh token and access tokens, the sign-in during a refresh, and the socket server told of the replacement. A sign-in that records `ended`: the code on the first phone's access tokens, the sign-in during a refresh, and the socket server told of the replacement.
- The guard not reading the record: every refusal of an ended session's access token, and the Redis-down test (200). The guard without the code: the two tests that expect it. The guard letting the Redis error through: the Redis-down test (500). No `commandTimeout`: the same test timed out.
- No event, or a record kept for a minute: both tests of what the socket server is told.
- A returning used token that revokes its family without recording it: its session's access tokens. A sign-out that revokes without recording: its access token, and the socket server told of the sign-out.
- Socket server: no record check fails both refusals; no code fails the refusal and the notice with the code; no room, no disconnect or the event handler on another pattern fails the three open-connection tests; no `session-ended` to the app fails the two notices; disconnecting every connection fails the other session's connection; `Unauthorized` or no `commandTimeout` with Redis down fails the Redis-down test.
- The sign-in without the lock failed no test (see Known limits).

Two runs also failed tests that these changes do not touch, once each: the main server's administrators and health files, which start containers of their own, in their hooks, and the socket server's startup test. They passed on the rerun.

### Agent usage (2026-09-29)

- Agent time: about 1 hour 40 minutes for the review and the fixes, an estimate. The reviewing session, in the worktree `admiring-dhawan-e58033`, was open from 11:39 to about 16:15 and worked about 86 minutes of it; the rest was waiting for answers. Its first two review subagents worked about 2 minutes each, at the same time, and the final review subagent about 8 minutes.
- Not included: the sessions that implemented the ticket and wrote `a2e269f`, which ran on another machine. Their time and tokens are to be added here.
- Tokens, for the reviewing session and its three subagents, counted when this section was written:
  - Input: 33,692,314 in total, of which 32,548,361 were cache reads, 1,143,609 cache writes and 344 uncached.
  - Output: 178,793. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 2,385, is a lower bound.
