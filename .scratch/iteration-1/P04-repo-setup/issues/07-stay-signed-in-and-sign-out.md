# 07: Stay signed in and sign out

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

An SNU student stays signed in for weeks: when the access token expires, the app exchanges the refresh token for new tokens without the User doing anything. Signing out ends the session, so that the phone no longer acts for the User or sends their location.

A User has one session: the app signed in on one phone. Signing in on another phone ends the previous session, so the map only ever gets one phone's position for a User. Every access token names its session, and the main server reads the session on every request, so a request from an ended session is refused at once, whether the session ended by a sign-in elsewhere, a sign-out or a used refresh token coming back. The session's socket connections are closed within seconds. The phone whose session was replaced is told why.

The Master Switch, which turns Location Sharing on and off, belongs to P06 and P08. Signing in and signing out leave it alone.

## Acceptance criteria

- [x] A valid refresh token returns a new access token and a new refresh token. The used refresh token is refused once 60 seconds have passed since its use.
- [x] An expired, revoked or unknown refresh token is refused.
- [x] Signing out revokes every refresh token of that User. None of them can be exchanged afterwards.
- [x] Tests through the public API cover: refresh replaces the token and the old one stops working; sign-out revokes.
- [x] A User has one session. Signing in ends the User's open session and revokes its refresh tokens in the same transaction that stores the new session, under the User lock.
- [x] Each access token names its session, and a refresh keeps it.
- [x] A used refresh token that comes back within 60 seconds of its use gets new tokens of the same session. Later, it ends its session.
- [x] When a session ends, by a sign-in elsewhere, a sign-out or a used refresh token coming back, a User's route refuses its access tokens with 401 from the next request on. A session replaced by a sign-in elsewhere gets a code that says so; other refusals keep the plain 401.
- [x] Within a few seconds of a session ending, the socket server disconnects that session's connections, with the same reason. Each connection closes when its access token expires. The socket server still checks tokens without calling the main server.
- [x] Tests through the public API cover: a second sign-in ends the first phone's session (its refresh refused; its access token refused with the code; the socket server told; its socket disconnected with the reason) while the new phone works; a sign-in and a refresh on the other phone at the same moment, and two sign-ins at the same moment, leave one session; after a sign-out and after a used token comes back, the ended session's access token is refused at once; a used refresh token within and after 60 seconds; a socket connection closed when its token expires.
- [x] The docs describe one session per User: `CONTEXT.md` (Session, done), the main server and socket server READMEs, the P04 spec, the P06 spec (the app stops background sharing and shows sign-in with the reason), the P08 spec (a replaced session's stored position is cleared), the P17 spec, ticket 11's note on open connections, and this ticket's own Comments.

## Comments

### One session per User (2026-09-29)

Location-first apps (Life360, Zenly) allow one signed-in phone and sign the old one out, and even apps with several devices share live location from one (`.scratch/research/multi-device-sign-in.md`).

- One session per User; no second phone or view-only tablet. Administrators sign in apart from Users (ticket 14), so this does not reach the admin site.
- The replaced phone gets a code that says a sign-in elsewhere ended its session, on the HTTP 401 and on the socket disconnect, so that the app can say so. Other refusals stay the plain 401.
- Sessions are rows in the main database, read on every User's request (see "Sessions" below).

### Decisions (2026-09-30)

- **Routes**: `POST /auth/refresh` is `@Public()`, takes `{ refreshToken }` and answers 200 `{ accessToken, refreshToken }`, the same `TokensDto` as sign-in. Every refused token gets 401 `The refresh token is invalid, expired or revoked.`, so the answer does not tell which check failed; a body without `refreshToken` gets 400. `POST /auth/sign-out` takes the access token and no body, and answers 204. The access token of a session that has ended gets 401 there too, as on every User's route.
- **Revocation**: rows are kept. Each refresh token belongs to a session (`session_id`). `revoked_at` is set when a refresh uses the token up or its session ends.
- **A used token that comes back**: within 60 seconds of its use, it gets new tokens of the same session. Later, it gets 401 and ends its session (RFC 9700, section 4.14.2), even when it has expired since. A token of a session that has ended already gets 401 and changes nothing, so the session of a later sign-in keeps working.
- **Expiry**: a refresh token handed out by a refresh is valid for 30 days from the refresh, as at sign-in.
- **Simultaneous refreshes with one token**: all succeed, with tokens of the same session, because they come within the 60 seconds.
- **Master Switch**: sessions leave it alone. The switch, where it is stored and what it controls belong to P06 and P08. Sign-out stops the phone from sending positions by ending its session, and P08 clears the stored position of a session that ends.
- **Indexes**: `refresh_tokens_session_id_idx`, and `sessions_user_id_key`, unique on `user_id` where `ended_at IS NULL`, which keeps one open session per User. Prisma writes the partial index with its `partialIndexes` preview feature. The foreign keys have no cascade.

### How sign-in, refresh and sign-out stay consistent (2026-09-30)

`AuthService.refresh` reads the token by its hash and refuses it when it is unknown, or expired and not used. A used token goes on even when it has expired, so that one coming back after 30 days still ends its session. An interactive transaction (`$transaction(async (tx) => …)`) then locks the User's row and reads the token and its session again. An ended session gets 401. An unused token is marked used and replaced; a used one is replaced too when its use was at most 60 seconds ago, and otherwise its session ends with `refresh_token_reused` and the request gets 401.

A sign-in and a sign-out lock the User's row too. The sign-in ends the User's open session with `replaced` and stores the new session with its refresh token. The sign-out ends its own session with `signed_out`, so a sign-out on a phone that a sign-in elsewhere has just replaced changes nothing. `SessionsService.end` sets `ended_at` and `end_reason` on the sessions still open and revokes their refresh tokens.

`UsersService.lock` takes `SELECT … FOR NO KEY UPDATE`, the lock an `UPDATE` of the row takes, so storing a row that refers to the User does not wait for it. Ending a session changes no key column either, so storing a refresh token of it does not wait. A sign-in, a refresh and a sign-out of one User therefore run one after another, and each sees what the one before it stored. Under PostgreSQL's default isolation a statement sees only the rows committed when it started, so without the lock:

- two sign-ins at the same moment both find the same open session, and the second fails the unique index with 500;
- a sign-out that runs while a refresh stores its replacement misses it. The token cannot be exchanged, because its session has ended, but it stays unrevoked.

`AccessTokenGuard` reads the session without the lock. A request that passed it just before its session ended finishes.

### Repeated requests and lost answers (2026-09-30)

Sign-out is safe to repeat: a second call changes nothing and gets 401, because the first ended the session, so the app takes a 401 to sign-out as done. Refresh cannot use `@Idempotent()` from ticket 10, because it is `@Public()` and ticket 10 keeps keys apart by whoever is signed in. When the answer to a refresh is lost, the app still holds the used token and sends it again. Within 60 seconds of its use it gets new tokens of the same session, as Okta (30 seconds by default) and Supabase (10 seconds) allow (`.scratch/research/session-storage.md`). Background sharing (P17) refreshes by itself, and a lost answer would otherwise sign the User out and stop sharing without their noticing. A stolen copy used within those 60 seconds is not detected.

### Sessions (2026-09-30)

- **Storage**: a row of `sessions` per sign-in: `user_id`, `created_at`, `ended_at` and `end_reason` (`replaced`, `signed_out`, `refresh_token_reused`). Most frameworks and auth platforms keep a server-side record per session, and Supabase keeps `auth.sessions` with a `session_id` claim, as here (`.scratch/research/session-storage.md`). Supabase's own single-session setting takes effect at the next refresh, which here would let a replaced phone report positions for up to an hour, so the session is read on every request instead.
- **Access token**: it names the session in `sid`, the claim OpenID Connect uses for a session, so a refresh keeps it. Both servers read the payload as `{ sub, sid }` and refuse a token without `sid`.
- **HTTP**: `AccessTokenGuard` reads the session by primary key after verifying the token. `replaced` gets 401 `{ statusCode: 401, error: 'Unauthorized', code: 'SESSION_REPLACED', message: 'A sign-in on another phone ended this session.' }`, the shape of `@nestjs/idempotency`'s coded answers. Any other ended session gets the plain 401. The guard puts `{ id, sessionId }` on the request, and sign-out ends that session.
- **Event**: once the transaction that ended sessions has committed, `SessionsService.announceEnd` emits `session-ended` with `{ sessionId, reason }` over NestJS messaging. The answer does not wait for it, and a failure is logged: the database already refuses the session.
- **Socket**: each connection joins the room `session:<sid>`. On the event, `UsersController` receives it with `@EventPattern('session-ended')`, and the gateway sends `session-ended` to the room, `{ code: 'SESSION_REPLACED' }` after a sign-in and `{}` otherwise, then calls `disconnectSockets(true)`. The app gets `disconnect` with `io server disconnect`, and Socket.IO does not reconnect by itself. A timer closes each connection at its token's `exp`; the app then refreshes and connects again, which an ended session cannot do. The socket server makes no call to the main server and keeps no data.
- **Redis down**: sign-in, the User's requests and sign-out work. The socket server is not told, and the session's connections close when their tokens expire.
- **Refresh tokens**: each belongs to a session through `session_id`, and `revoked_at` marks it used.
- **Stored position**: clearing the position of a phone whose session ended belongs to P08.

Known limits:

- A socket connection with the access token of an ended session is accepted until the token expires, because the socket server checks only the token. Socket.IO reconnects by itself after a network drop, so a phone that was offline when its session ended connects again. The app fetches the current state on every connect (P08), gets the 401 there and closes the connection; a modified client could stay connected for at most an hour.
- If the `session-ended` event is lost, the session's connections stay open until their tokens expire, at most an hour.
- A replaced phone that comes back after its access token expired only refreshes, and the refresh route keeps its one answer, so the app shows sign-in without the reason.

### Tests (2026-09-30)

The tests are in `test/refresh.e2e-spec.ts`, `test/sign-out.e2e-spec.ts` and `test/session.e2e-spec.ts`. They did not fit in `test/auth.e2e-spec.ts`: oxlint's `max-lines` (300) and `max-lines-per-function` (50) apply to test files too. `postSignIn()`, `refresh()`, `postRefreshToken()`, `refreshTokenHash()`, `useLongAgo()`, `postSignOut()`, `sessionOf()` and `getMe()` sit beside `signIn()` in `test/sign-in.ts`, and a test that needs one User on two phones signs in twice with a subject from `googleSubject()` in `test/google.ts`; the second sign-in ends the first phone's session. An expired token and a use more than 60 seconds ago (`useLongAgo()`) are set in the database, because no route sets them. `test/auth.e2e-spec.ts` checks that `sid` is the stored session, and both servers' tests refuse a token signed without `sid`.

The simultaneous-refresh test opens database connections with ten simultaneous sign-ins before it sends ten refreshes at once. The pool opens connections on demand, and opening one takes longer than a whole refresh, so refreshes sent without them reach the database one after another.

Five tests make requests overlap in the database with `overlap()` in `test/overlap.ts`. The test locks a stored refresh token with its own connection, sends the first request, sends the second once the first waits for that lock, and releases the lock once both wait; `pg_blocking_pids` tells it who waits. The first request waits for the token while holding the User lock, and the second waits behind it:

- a refresh, then a sign-out of the same session: the refresh's new token is refused and no token of the User is left unrevoked;
- a refresh, then a token of the same session used more than 60 seconds ago: the session ends, the refresh's new token included;
- a refresh on one phone, then a sign-in on the other: only the sign-in's session works;
- two sign-ins at the same moment: the later one's session works and the earlier one's gets the code;
- a sign-in on the new phone, then a sign-out on the replaced phone that passed the guard just before: the new phone's session stays.

What the socket server is told: the test subscribes with ioredis to the channel `session-ended`, where NestJS messaging publishes `{ pattern, data }`. The Redis-down test reaches Redis through a proxy and stops the proxy once the server runs, as the health tests do. The socket server's `test/users.e2e-spec.ts` emits the event with a `ClientProxy` of its own, as the main server does, and signs a token valid for 2 seconds for the expiry. The other session's connection is checked with `fetchSockets()`, because its client can receive a disconnect after the ended session's client does.

`startApp` makes the app listen once, on a free port of `127.0.0.1`. An app that is only initialised does not listen, and supertest then starts the server on a free port for each group of requests and closes it afterwards. With such a server every run warned `MaxListenersExceededWarning`, one of twelve runs of the refresh and sign-out tests failed, one test failed twice in about 110 runs with supertest's `socket hang up`, and a sign-in answered 503 and another 404, each with an empty body, which the server never sends. With `startApp` listening, thirty runs of the auth, refresh and sign-out tests passed without the warning.

### Red before green (2026-09-30)

Each change below was made alone on the final code. On the main server the auth, refresh, sign-out and session test files ran; on the socket server, `test/users.e2e-spec.ts`. Only the matching tests failed:

- Sign-in without the lock: the two sign-ins at the same moment (500). Refresh without the lock, and sign-out without it: the sign-out during a refresh (a token left unrevoked).
- No 60 seconds: the used token within 60 seconds and the ten simultaneous refreshes. No reuse detection: every test of a token used more than 60 seconds ago, and the socket server told of it.
- Refresh without the ended-session check: seven tests, among them the first phone's refresh token after a second sign-in, the sign-in during a refresh, and every token revoked after sign-out, because a token revoked by the end of its session got new tokens within 60 seconds.
- No expiry check: the expired token. Refusing every expired token before the reuse check: the used token that came back after it had expired.
- Sign-in ending nothing: nine tests. Sign-in ending the session as `signed_out`: the three tests that expect the code. No event on sign-in: the socket server told of the replacement.
- Sign-out ending nothing: five tests. Sign-out ending every session of the User: the sign-out on the replaced phone during a sign-in.
- An access token naming another session: 17 tests. The guard not reading the session: six tests, the Redis-down test included. The guard without the code: the four tests that expect it. Before the guard checked for `sid`, a token without it got 500.
- Socket server: no expiry timer fails the expiring connection; no room fails the three open-connection tests; no code fails the notice with the code; disconnecting every connection fails the other session's connection. Before the gateway checked for `sid`, a token without it opened a connection.

### Agent usage (2026-09-29)

- Agent time: about 1 hour 40 minutes for the review and the fixes, an estimate. The reviewing session, in the worktree `admiring-dhawan-e58033`, was open from 11:39 to about 16:15 and worked about 86 minutes of it; the rest was waiting for answers. Its first two review subagents worked about 2 minutes each, at the same time, and the final review subagent about 8 minutes.
- Not included: the sessions that implemented the ticket and wrote `a2e269f`, which ran on another machine. Their time and tokens are to be added here.
- Tokens, for the reviewing session and its three subagents, counted when this section was written:
  - Input: 33,692,314 in total, of which 32,548,361 were cache reads, 1,143,609 cache writes and 344 uncached.
  - Output: 178,793. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 2,385, is a lower bound.

### Agent usage (2026-09-30)

- Agent time: about 4 hours 30 minutes, an estimate, counted as the gaps under 5 minutes between transcript entries; subagents ran inside it.
  - The session that moved sessions into the database, added the 60 seconds and the socket expiry, left the Master Switch to P08, rewrote the pull request's description, and ran the research on session storage and the review: about 2 hours 35 minutes, between 2026-09-29 23:07 and 2026-09-30 16:45. Its seven subagents did the research and the two reviews.
  - The session in the worktree `admiring-dhawan-e58033`, after its count above: about 1 hour 54 minutes, for the one-session design with the record in Redis, the research on sockets and the hand-over.
- Tokens, for both sessions and their subagents, counted when this section was written:
  - Input: 306,623,216 in total, of which 299,919,590 were cache reads, 6,701,148 cache writes and 2,478 uncached.
  - Output: 635,489. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 108,326, is a lower bound.
