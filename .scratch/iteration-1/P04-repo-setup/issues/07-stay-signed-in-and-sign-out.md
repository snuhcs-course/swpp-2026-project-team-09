# 07: Stay signed in and sign out

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

An SNU student stays signed in for weeks: when the access token expires, the app exchanges the refresh token for new tokens without the User doing anything. Signing out ends every session of that User and turns off their Master Switch, so that their location is not shared after they leave.

Turning the Master Switch on and what it controls belong to P06 and P08.

## Acceptance criteria

- [x] A valid refresh token returns a new access token and a new refresh token. The used refresh token is refused afterwards.
- [x] An expired, revoked or unknown refresh token is refused.
- [x] Signing out revokes every refresh token of that User. None of them can be exchanged afterwards.
- [x] The User has a Master Switch, off when the User is created.
- [x] Signing out turns the Master Switch off.
- [x] Tests through the public API cover: refresh replaces the token and the old one stops working; sign-out revokes; the stored Master Switch is off after sign-out.

## Comments

### Decisions (2026-09-29)

Agreed with 김태현 before the implementation.

- **Routes**: `POST /auth/refresh` is `@Public()`, takes `{ refreshToken }` and answers 200 `{ accessToken, refreshToken }`, the same `TokensDto` as sign-in. Every refused token gets 401 `The refresh token is invalid, expired or revoked.`, so the answer does not tell which check failed; a body without `refreshToken` gets 400. `POST /auth/sign-out` takes the access token and no body, and answers 204, also when the User has already signed out.
- **Revocation**: rows are kept. `revoked_at` is set when a refresh uses a token up, a used token of its family comes back, or a sign-out revokes it. `family_id` groups the tokens that descend from one sign-in: the database gives each sign-in's token a new one (`DEFAULT gen_random_uuid()`), and a refresh hands it on.
- **A used token that comes back**: 401, and every token of its family is revoked (RFC 9700, section 4.14.2), even when it has expired since. The User's other sign-ins and the Master Switch stay as they are. A token revoked by a sign-out that comes back only touches its own family, which is already revoked, so a later sign-in keeps working.
- **Expiry**: a refresh token handed out by a refresh is valid for 30 days from the refresh, as at sign-in.
- **Simultaneous refreshes with one token**: one succeeds. The others count as a second use and revoke the family, the winner's new token included. The app (P06) therefore sends one refresh at a time, for example by sharing one pending refresh among the requests that got 401. The README says so.
- **Master Switch**: `users.master_switch BOOLEAN NOT NULL DEFAULT false` (`masterSwitch` in Prisma). Sign-out sets it to false in the same transaction that revokes the tokens. Turning it on, and showing it in `GET /users/me`, belong to P06 and P08.
- **Indexes**: `refresh_tokens_user_id_idx` for sign-out and `refresh_tokens_family_id_idx` for revoking a family. The foreign key still has no cascade.

### How a refresh stays atomic (2026-09-29)

`AuthService.refresh` reads the token by its hash and refuses it when it is unknown, or expired and not revoked. A revoked token goes on even when it has expired, so that a used token coming back after 30 days still revokes its family. An interactive transaction (`$transaction(async (tx) => …)`) then locks the User's row, revokes the token with `updateMany({ where: { id, revokedAt: null } })` and stores a replacement only when that revoked one row. When it revoked none, the token was used before: the same transaction revokes its family, and the request gets 401.

Sign-out locks the User's row too, then revokes the User's tokens and turns the Master Switch off in the same transaction. `UsersService.lock` takes the lock with `SELECT … FOR NO KEY UPDATE`, the lock an `UPDATE` of the row takes, so storing a row that refers to the User, such as a sign-in's refresh token, does not wait for it. A refresh, a family revocation and a sign-out of one User therefore run one after another, and each sees the tokens stored before it. Without the lock, under PostgreSQL's default isolation, a statement sees only the rows committed when it started: a sign-out or a family revocation that ran while a refresh stored its replacement waited for the used token, found it revoked, and missed the replacement.

Access tokens are checked with the public key alone, so one issued before a sign-out or a revoked family stays valid until it expires, at most 1 hour later. A socket connection opened before a sign-out stays open, because the socket server checks the token only when a connection opens; ticket 11's Comments record that the P08 ticket adding the User's room disconnects it on sign-out.

### Repeated requests and lost answers (2026-09-29)

Sign-out is safe to repeat by itself: a second call answers 204. Refresh cannot use `@Idempotent()` from ticket 10, because it is `@Public()` and ticket 10 keeps keys apart by the signed-in User. When the answer to a refresh is lost, the app still holds the used token. Its next refresh counts as a second use and revokes the family, so the User signs in again. This is left as is: it needs a lost answer, and accepting the used token again for a short time would weaken reuse detection. The README tells the app.

### Tests (2026-09-29)

The tests are in `test/refresh.e2e-spec.ts` and `test/sign-out.e2e-spec.ts`. They did not fit in `test/auth.e2e-spec.ts`: oxlint's `max-lines` (300) and `max-lines-per-function` (50) apply to test files too. `refresh()`, `postRefreshToken()`, `refreshTokenHash()` and `getMe()` sit beside `signIn()` in `test/sign-in.ts`, and a test that needs one User on two phones signs in twice with a subject from `newGoogleSubject()` in `test/google.ts`. An expired token and a Master Switch that is on are set in the database, because no route sets them.

The simultaneous-refresh test opens database connections with ten simultaneous sign-ins before it sends ten refreshes at once. The pool opens connections on demand, and timing logs showed that opening one takes longer than a whole refresh, so refreshes sent without them reach the database one after another: two of them passed even against an implementation that checks `revoked_at` first and then updates without the condition. With the sign-ins, 5 to 7 of the ten succeeded against that implementation in every run; the real implementation passed every run.

Two tests make requests overlap in the database with `overlap()` in `test/overlap.ts`. The test locks a stored refresh token with its own connection, sends the first request, sends the second once the first waits for that lock, and releases the lock once both wait; `pg_blocking_pids` tells it who waits. One test refreshes on one phone while another phone signs out, the other refreshes while a used token of the same family comes back. Against the implementation without the lock, the replacement kept working in both tests in every run.

Red before green. Each change below failed the matching tests and no others:

- The revocation without `revokedAt: null`: the used token was exchanged again, a returning token's replacement (also after it had expired) and a signed-out User's tokens kept working, the simultaneous refreshes, and both overlapping tests.
- No family revocation: a returning token's replacement kept working (also after it had expired), the simultaneous refreshes, and the used token that comes back during a refresh.
- Revoking every token of the User instead of the family: the User's other sign-in stopped working.
- No expiry check: the expired token.
- Refusing every expired token before the reuse check: the replacement of a used token that came back after it had expired kept working.
- The new token keeping the old expiry: 30 days from the refresh.
- Sign-out leaving the Master Switch: the Master Switch after sign-out.
- Sign-out revoking nothing: every token revoked after sign-out, and the sign-out during a refresh.
- Sign-out without the lock: the sign-out during a refresh.
- The refresh without the lock: both overlapping tests.

`startApp` makes the app listen once, on a free port of `127.0.0.1`. An app that is only initialised does not listen, and supertest then starts the server on a free port for each group of requests and closes it afterwards. With such a server every run warned `MaxListenersExceededWarning`, one of twelve runs of the refresh and sign-out tests failed, "keeps the User's other sign-ins" failed twice in about 110 runs with supertest's `socket hang up`, and a sign-in answered 503 and another 404, each with an empty body, which the server never sends. With `startApp` listening, thirty runs of the auth, refresh and sign-out tests passed without the warning.

One run of the whole suite failed "Health checks with the database down", which starts and stops a PostgreSQL container of its own. It passed alone and in six further runs of the whole suite.

### Agent usage (2026-09-29)

- Agent time: about 1 hour 40 minutes for the review and the fixes, an estimate. The reviewing session, in the worktree `admiring-dhawan-e58033`, was open from 11:39 to about 16:15 and worked about 86 minutes of it; the rest was waiting for answers. Its first two review subagents worked about 2 minutes each, at the same time, and the final review subagent about 8 minutes.
- Not included: the sessions that implemented the ticket and wrote `a2e269f`, which ran on TaeHyun79's machine. Their time and tokens are to be added here.
- Tokens, for the reviewing session and its three subagents, counted when this section was written:
  - Input: 33,692,314 in total, of which 32,548,361 were cache reads, 1,143,609 cache writes and 344 uncached.
  - Output: 178,793. The subagents' transcripts record only a few output tokens for most of their steps, so their share, 2,385, is a lower bound.
