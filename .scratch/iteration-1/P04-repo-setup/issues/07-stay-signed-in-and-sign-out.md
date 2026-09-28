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
- **Revocation**: rows are kept. `revoked_at` is set when a refresh uses a token up or a sign-out revokes it. `family_id` groups the tokens that descend from one sign-in: the database gives each sign-in's token a new one (`DEFAULT gen_random_uuid()`), and a refresh hands it on.
- **A used token that comes back**: 401, and every token of its family is revoked (RFC 9700, section 4.14.2). The User's other sign-ins and the Master Switch stay as they are. A token revoked by a sign-out that comes back only touches its own family, which is already revoked, so a later sign-in keeps working.
- **Expiry**: a refresh token handed out by a refresh is valid for 30 days from the refresh, as at sign-in.
- **Simultaneous refreshes with one token**: one succeeds. The others count as a second use and revoke the family, the winner's new token included. The app (P06) therefore sends one refresh at a time, for example by sharing one pending refresh among the requests that got 401. The README says so.
- **Master Switch**: `users.master_switch BOOLEAN NOT NULL DEFAULT false` (`masterSwitch` in Prisma). Sign-out sets it to false in the same transaction that revokes the tokens. Turning it on, and showing it in `GET /users/me`, belong to P06 and P08.
- **Indexes**: `refresh_tokens_user_id_idx` for sign-out and `refresh_tokens_family_id_idx` for revoking a family. The foreign key still has no cascade.
- `.oxlintrc.json` is unchanged.

### How a refresh stays atomic (2026-09-29)

`AuthService.refresh` reads the token by its hash and refuses it when it is unknown or expired. An unrevoked token is then revoked and replaced in one batch transaction, `$transaction([updateMany, create])`. Prisma sends the revocation as a single `UPDATE … WHERE id = $1 AND revoked_at IS NULL` (checked in its query log). Under PostgreSQL's default isolation, a second request that updates the same row waits for the first to commit and checks `revoked_at IS NULL` again, so it matches no row. That request, like a token that was already revoked when it was read, revokes the family, which also covers the replacement it stored itself.

An interactive transaction (`$transaction(async (tx) => …)`) was not used: `prefer-readonly-parameter-types` refuses its `tx` parameter, and allowing it would have meant changing `.oxlintrc.json`.

Access tokens are checked with the public key alone, so one issued before a sign-out or a revoked family stays valid until it expires, at most 1 hour later.

### Tests (2026-09-29)

The tests are in `test/refresh.e2e-spec.ts` and `test/sign-out.e2e-spec.ts`. They did not fit in `test/auth.e2e-spec.ts`: oxlint's `max-lines` (300) and `max-lines-per-function` (50) apply to test files too. `refresh()` sits beside `signIn()` in `test/sign-in.ts`. An expired token and a Master Switch that is on are set in the database, because no route sets them.

The first test of simultaneous refreshes sent two requests and passed even against an implementation that checks `revoked_at` first and then updates without the condition. Timing logs showed why: the pool opens database connections on demand, opening one took longer than a whole refresh, and so the requests reached the database one after another. The test now opens connections with ten simultaneous sign-ins, then sends ten refreshes at once. Against that implementation, 5 to 7 of the ten succeeded in each of 5 runs; the real implementation passed 10 of 10 runs.

Red before green. Each change below failed the matching tests and no others:

- The revocation without `revokedAt: null`: the simultaneous refreshes.
- No family revocation: a used token's replacement kept working, and the simultaneous refreshes.
- Revoking every token of the User instead of the family: the User's other sign-in stopped working.
- No expiry check: the expired token.
- The new token keeping the old expiry: 30 days from the refresh.
- Sign-out leaving the Master Switch: the Master Switch after sign-out.
- Sign-out revoking nothing: every token revoked after sign-out.

In about 110 runs of the refresh tests, "keeps the User's other sign-ins" failed twice with supertest's `socket hang up`, once against the real implementation and once against one of the changes above. Thirty further runs each of the refresh and the sign-in tests, and fifteen runs of the whole suite, did not reproduce it. The cause is not known.
