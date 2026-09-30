# Storing and checking sessions on the server: benchmark and a design for SNU Now

All sources were accessed on 2026-09-30. `[X1]`-style links point to the Sources list at the end. "My judgement" marks conclusions that no source states directly.

## 1. Short answers

**Is it common to record a session id on the server?** Yes. Most sources keep one server-side record per session, with its own id:

- Framework defaults: Django, Laravel, Spring, Better Auth and Lucia keep a row or cache entry per session. Rails 8's generator does too. The two exceptions are Rails' default cookie store and Auth.js without a database.
- Auth platforms: Auth0, Okta, Clerk, Supabase and Keycloak keep one. Firebase and Cognito do not. They revoke per User (Firebase) or per refresh token (Cognito).
- Several platforms put the id in the token: `sid` in Clerk, Keycloak and Auth0 (ID tokens only), and `session_id` in Supabase.

**Is it common to check it on every request?** It depends on the token.

- **Session cookies: yes.** The store is read on every request, because that is how the cookie becomes a user. This holds for Django, Laravel, the Rails 8 generator, Spring concurrency control, Auth.js with a database, Better Auth without its cookie cache, and Lucia.
- **JWT access tokens: no.** All seven auth platforms trust a valid access token until it expires, and they document the delay.
  - A check is opt-in, and the platforms call it costly or reserve it for sensitive actions [FI1][SB1][OK2][CG2].
  - They cap the delay with short tokens instead: Clerk's are 60 s [CL1], and Cognito allows as little as 5 min [CG3].
  - My judgement: a platform serves many APIs that it does not run, so a central lookup on every request is expensive for it. SNU Now has one API server next to its own database, which is the frameworks' situation.

So a session id in PostgreSQL, checked on every request, is ordinary. SNU Now already does this for Administrators (`tokens_valid_after`).

## 2. Recommendation for SNU Now

**Take (b): a `sessions` table that the main server reads by primary key on every authenticated request.** (a) is an acceptable smaller variant. Drop (c). Do not rely on (d) for Users.

### 2.1 Design

- **Table.** `sessions`: `id` uuid, `user_id`, `created_at`, `ended_at`, `end_reason`. `end_reason` is one of `signed_out`, `replaced` or `refresh_token_reused`.
  - `refresh_tokens.session_id` references it.
  - The access token carries it as `sid`.
- **One session per User, in the database.** A partial unique index on `(user_id) WHERE ended_at IS NULL` enforces it. That this fits is my judgement.
- **Sign-in.** The transaction that already locks the User row does three things:
  - ends the open session with `replaced`;
  - revokes that session's refresh tokens;
  - inserts the new session.
    The new tokens are handed out after the commit.
- **Guard.** After the signature check, the guard reads the session row by `sid`. An ended session gets 401, and after `replaced` the body carries the code `SESSION_REPLACED`.
- **Refresh.** A refresh token of an ended session gets the plain 401, as every refused refresh token does (ticket 07).
- **Sign-out and reuse detection.** Both end the session with their own reason, in the transactions they already run.
- **Documentation.** ASVS 7.1.2 (Level 2) asks for a record of how many sessions an account may have and what happens at the limit [A7]. OWASP gives two choices when simultaneous logins are not allowed: end the previous session, or ask the user which one to keep [O1]. SNU Now ends the previous one; record that choice.

### 2.2 Why (b)

- **It is the common shape.** Supabase is the closest match:
  - sessions live in the PostgreSQL table `auth.sessions` [SB1][SB4];
  - every access token carries `session_id` [SB1];
  - refresh tokens belong to a session [SB1];
  - a "single session per user" setting exists [SB1].
    Rails 8, Laravel, Better Auth, Lucia and Keycloak 26 also keep one row per session. None of the sources documents a single "current session" column on the user.
- **Same per-request cost as (a):** one primary-key read.
- **The old phone learns the exact reason from a durable row.** Other products tell the old device too:
  - Supabase refuses the old session's refresh with an error saying a newer login revoked it [SB5];
  - Spring Security answers the expired session's next request with a message naming concurrent logins as the likely cause [SP1];
  - KakaoTalk and WhatsApp show the old phone a dedicated screen when it next opens [KK1][WA1].
- **Room to grow.** ASVS 7.5.2 (Level 2) asks that users can view and end their sessions [A7]. With (b), a list of a User's sessions or N sessions per User needs only a new query or a changed index.

Why the check must run on every request and not only at refresh:

- Supabase enforces its single-session setting only when a session refreshes. The docs say the effect shows at intervals of the JWT lifetime [SB1].
- In SNU Now, the app uploads positions to the main server over HTTP, and the P08 spec cites intervals of 2–10 s. With a check only at refresh, a replaced phone would go on reporting positions for up to an hour. That breaks "a User's location comes from exactly one phone".

### 2.3 Costs

- **Query load.** Every authenticated request gains one indexed primary-key read. Position uploads are the busiest route, and today they touch only Redis.
  - Example: 1,000 Users sharing at a 5 s interval make about 200 reads per second.
  - My judgement: this is small for one PostgreSQL instance. Measure it in a load test rather than add a cache now.
  - If a cache is ever needed, a short in-process one bounds the staleness. RFC 7662 describes the same trade-off for cached introspection [S3].
- **Durability.** PostgreSQL already holds the refresh tokens, so no second store has to stay in step. A Redis restart cannot bring an ended session back.
  - My judgement: there is no ordering race either. The sign-in commits the old session's end before the new phone receives tokens, so any later request reads the ended row.
- **Schema work.** A table, a migration, and `sid` in the access token.

### 2.4 The other options

- **(a) `users.current_session_id`.**
  - For: one column and no new table. The guard compares `sid` with the column.
  - Against: the reason must be inferred (null means signed out, any other value means replaced), and it is lost if the User later signs out on the new phone. There is no history, and N sessions would need a redesign.
  - Fine if the team wants the smallest change now (my judgement).
  - A time-based twin is a per-User "tokens valid after", as Firebase [FI1][FI3] and SNU Now's Administrators use. It cannot tell the reason either.
- **(c) Redis deny-list plus pub/sub.**
  - This is the OWASP JWT cheat sheet's pattern: deny `jti` and `iss` until `exp` [O2]. The same page notes that it makes sessions stateful anyway, and points to a plain session system instead [O2].
  - Its weak points:
    - Redis may lose the list on a restart.
    - Pub/sub delivers each message at most once [R1].
    - The deny entry must win a race with the new sign-in.
  - None of the benchmarks uses a deny-list for this.
- **(d) No per-request check.** This is every JWT platform's default [AU4][FI1][SB2][CG1][KC5].
  - Here the delay is the access token's lifetime, up to 1 h of positions from the replaced phone.
  - Clerk's answer is a 60 s token [CL1]. In SNU Now that would shift the load to refresh, which is a write transaction under a row lock (ticket 07).
  - My judgement: it does not fit.

### 2.5 The socket server's open connections

Positions arrive over HTTP, so the per-request check alone stops a replaced phone from reporting. The socket server only pushes to viewers. A connection left open on the old phone would keep receiving Friends' positions, and that is the gap to close.

1. **A room per session.** At connection, the socket server also joins the socket to `session:<sid>`. Disconnecting the User's room instead would also drop the new phone (my judgement).
2. **Fast path.** After the sign-in or sign-out transaction commits, the main server sends "session `<sid>` ended" over the existing Redis event path. The socket server then calls `io.in('session:<sid>').disconnectSockets(true)`, which also works across several Socket.IO servers that share an adapter [SI1].
3. **Backstop for a lost message.** Redis pub/sub and the Socket.IO Redis adapter keep no copy of a message [R1][SI2], and Socket.IO does not resend events that a disconnected client missed [SI4].
   - The socket server therefore closes each connection when its access token expires, using a timer set to `exp`.
   - A new connection needs a fresh token, which an ended session cannot get. The worst case is the access token's lifetime.
4. **The reason comes from the main server.** After `io server disconnect`, the Socket.IO client does not reconnect by itself [SI3]. The app then calls the main server (the fetch it makes on connecting) and gets 401 with `SESSION_REPLACED`. A lost socket message therefore loses nothing.
5. **Optional: a check at connection time.** Until its token expires, the old phone can still open a new connection: a modified client can, and so can the app after a restart with a stored token. The socket server checks only the signature.
   - The official app closes the socket when its first fetch gets the 401.
   - To close the gap fully, the socket server can ask the main server whether the session is live when a connection opens. This works like introspection [S3] and keeps the socket server free of data.
   - My judgement: this is worth adding with P08, because connections are rare compared with messages.

## 3. Evidence

### 3.1 Comparison

"Per-request check" means the default path for an API that receives the token or cookie.

| Source                        | Server-side store                                                                                                            | Session id claim                                          | Per-request check                                                                                           | Documented revocation delay                                                                       | One session per user                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Auth0                         | Session on the authorization server, store not documented [AU1]. Management API records hold device, IP and timestamps [AU2] | `sid` in ID and logout tokens, not in access tokens [AU2] | No. JWTs are validated locally [AU3]                                                                        | Access tokens stay valid until they expire [AU4]. Session deletes are eventually consistent [AU2] | No setting. Build it with the Management API [AU5]. An Action can revoke only the current session [AU6]                     |
| Okta                          | IdP session reached by cookie, store not documented [OK1]                                                                    | `sid` documented for Native SSO [OK5]                     | No. Introspection is opt-in and slower [OK2]                                                                | Until expiry unless introspected [OK2]                                                            | Support says it is not possible [OK4]                                                                                       |
| Firebase Auth                 | No session record. Per-user `tokensValidAfterTime` [FI1]                                                                     | None [FI2]                                                | No. `checkRevoked` is opt-in and costs a backend round trip [FI1][FI3]                                      | ID tokens may stay active up to their 1 h expiry [FI1]                                            | None. Revocation covers all of a user's devices [FI1]                                                                       |
| Supabase Auth                 | PostgreSQL `auth.sessions` [SB1][SB4]                                                                                        | `session_id` in every access token [SB1]                  | No. The docs keep the DB check for the most sensitive actions [SB1]. `getUser()` looks the session up [SB3] | Until `exp`, 1 h by default [SB2][SB1]                                                            | Paid "single session per user". Newest sign-in wins, enforced at the next refresh [SB1][SB5]                                |
| Clerk                         | Session records in Clerk's database. A client holds its sessions [CL1]                                                       | `sid` [CL2]                                               | No. Verification needs no network call [CL1]                                                                | Session token lifetime, 60 s [CL1]                                                                | None. "Multi-session" means several accounts in one browser, not several devices [CL3]                                      |
| AWS Cognito                   | No session object documented. State is per refresh token [CG1]                                                               | `origin_jti` and `jti`, no `sid` [CG3]                    | No. Locally verified tokens stay valid; Cognito's own APIs reject revoked ones [CG1][CG4]                   | Until expiry, 5 min to 1 day [CG1][CG3]                                                           | None documented [CG5]                                                                                                       |
| Keycloak 26                   | User and client sessions, persisted to the DB by default since 26.0 [KC1][KC2]                                               | `sid` (`session_state` removed from tokens in 25) [KC3]   | No. Local validation is recommended; introspection is opt-in [KC4] and checks the session (source) [KC8]    | Outstanding access tokens must expire naturally [KC5]                                             | "User Session Count Limiter": deny the new session or end the least recently used one [KC6][KC7]                            |
| Django                        | `django_session` table by default [DJ1]                                                                                      | Session key in cookie [DJ1]                               | Yes, including a password-hash check [DJ2]                                                                  | None, except signed-cookie sessions, which cannot be invalidated [DJ1]                            | None. A password change ends all sessions [DJ2]                                                                             |
| Laravel 13                    | `sessions` table (default driver `database`) with `user_id`, IP, user agent [LV1][LV3]                                       | Session id in cookie [LV1]                                | Yes [LV2]                                                                                                   | None                                                                                              | `logoutOtherDevices`, which needs the `AuthenticateSession` middleware [LV2]                                                |
| Rails 8                       | Default `CookieStore` keeps no server record [RL1]. The auth generator adds a `sessions` table [RL2]                         | Signed `session_id` cookie (generator) [RL2]              | Yes (generator) [RL2]                                                                                       | Cookie store: cookies cannot be invalidated [RL1]                                                 | None [RL2]                                                                                                                  |
| Spring Session + Security 7.1 | HttpSession, or JDBC/Redis via Spring Session with a `PRINCIPAL_NAME` column [SP2]                                           | `SESSION` cookie                                          | Yes, with concurrency control [SP1]                                                                         | None                                                                                              | `maximumSessions(1)`: the second login expires the first. `maxSessionsPreventsLogin(true)` refuses the second instead [SP1] |
| Auth.js                       | JWT cookie by default; `sessions` table with an adapter [AJ1]                                                                | `sessionToken` (database) [AJ1]                           | Database: yes. JWT: no [AJ1]                                                                                | A JWT cannot be expired early [AJ1]                                                               | None built in [AJ1]                                                                                                         |
| Better Auth 1.7               | `session` table, or secondary storage such as Redis [BA1]                                                                    | Session token cookie [BA1]                                | Yes. The cookie cache is opt-in [BA1]                                                                       | With the cookie cache, until its `maxAge` [BA1]                                                   | `revokeOtherSessions`, no per-user maximum. The multi-session plugin means several accounts per browser [BA1][BA2]          |
| Lucia (now a reference file)  | `auth_session` table [LU2]                                                                                                   | `<id>.<secret>` token [LU2]                               | Yes [LU2]                                                                                                   | None                                                                                              | None [LU2]                                                                                                                  |

### 3.2 Auth platforms

- **Checks are an extra step everywhere.**
  - Firebase calls `checkRevoked` an expensive extra round trip [FI1]. In the SDK source it reads the user and compares `auth_time` with `tokensValidAfterTime` [FI3].
  - Supabase suggests checking the `session_id` row only for the most sensitive actions [SB1]. Its advanced guide says an unexpired token survives a revoked session unless you call `getUser()` [SB3].
- **Supabase's single session per user.** It requires the Pro plan or higher, and the newest sign-in's session stays while the rest end [SB1].
  - In the source, a refresh locks the user's sessions and fails if a more recently refreshed session exists [SB5]. The old row is not deleted at sign-in, and the old device learns this only when its refresh fails.
- **Keycloak's limiter.** It is an authentication-flow step with a maximum per realm and per client, and either "Deny new session" or "Terminate oldest session" [KC6].
  - "Oldest" means the least recently refreshed session. Ending it triggers back-channel logout [KC7]. The old device hears of it only if its client registered a back-channel logout URL [KC6].
- **Refresh token rotation leeway.**
  - Auth0: a configurable overlap, off by default [AU7].
  - Okta: 30 s by default, settable from 0 to 60 s [OK3].
  - Supabase: a 10 s reuse interval [SB1].
  - SNU Now: 60 s (ticket 07).
- **Cognito disagrees with itself.** The RevokeToken API reference says revoked tokens cannot authorise access to a resource server. The developer guide says revoked tokens stay valid under any JWT library [CG1]. The developer guide matches how local verification works.

### 3.3 Frameworks

- **Spring Security is the closest built-in match to SNU Now's rule.** `maximumSessions(1)` expires the earlier session, and its next request gets an "expired" answer that the application can replace [SP1]. Across nodes it needs a shared session registry [SP1].
- **Laravel and Django end other devices through a password hash kept in the session.** The old device is signed out on its next request [LV2][DJ2]. Neither has a session limit.
- **Better Auth's optional cookie cache is the only documented delay.** Revoked sessions may stay active elsewhere until the cache expires [BA1].
- **Lucia is deprecated as a package.** Its site now points to one reference file. That file stores a hashed secret per session and reads the table on every validation [LU1][LU2]. Its archived guide said JWTs cannot be invalidated and suggested at most 5 min when they are used next to a DB session [LU3].

### 3.4 Consumer apps

**One phone per account.** This is SNU Now's rule, and three large messengers apply it.

| App       | Old phone after the account moves                                                                                                                 | Old phone told?                                                   | Companion devices                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| KakaoTalk | Verifying the number or logging in on another device forces re-verification on the old one. Chats deleted that way are hard to recover [KK1][KK2] | Re-verification screen on the next open [KK1]. No push documented | Tablet "use with another device" [KK3]; one PC/Mac active at a time [KK4] |
| WhatsApp  | Registering on a new phone logs the old one out. Chats stay until the user deletes them [WA1][WA2]                                                | "Logged out" screen on the next open [WA1]. No push documented    | Up to 4 linked devices, managed from the phone [WA3]                      |
| LINE      | Transferring the account makes it inaccessible on the old device [LN1][LN2]                                                                       | Exact screen not documented                                       | Sub devices need "Allow login" on the main device [LN1]                   |

**Session lists and remote sign-out.** Per-device lists with per-device sign-out appear in Telegram, GitHub, Google, Facebook/Instagram, Netflix, LINE and KakaoTalk [TG1][GH1][GO1][ME1][NF1][LN3][KK4]. My judgement: a per-device list implies a server-side record per session. Telegram's API confirms this, storing device, IP, created and last-active times per session [TG1].

**Delays.**

- Spotify says "sign out everywhere" can take up to an hour [SF1]. That suggests it waits for tokens to expire (my judgement).
- Facebook describes logging out of a session as immediate [ME1].
- Telegram refuses to end other sessions from a session less than 24 hours old [TG2].
- Discord's documented way to sign out everywhere is a password change [DC1].

### 3.5 Specs and guidance

- **`sid`.** OIDC defines it as the id of one user agent's or device's session for a logged-in user. It needs to be unique only per issuer [S1][S2].
  - On a logout token, the RP clears that session's state.
  - Refresh tokens without `offline_access` SHOULD be revoked [S1].
- **Introspection (RFC 7662).** It tells a resource server whether a token is still active. The RFC says caching the answer creates a window in which a revoked token still works [S3].
- **JWT access tokens (RFC 9068).** They are validated locally. The RFC registers `auth_time`, `acr` and `amr`, but not `sid` [S4]. `sid` in SNU Now's access token is therefore a private claim, as in Clerk and Keycloak.
- **OWASP Session Management Cheat Sheet** [O1]:
  - keep session state on the server;
  - invalidate it there on logout;
  - allowing simultaneous logons is a design decision. If they are not allowed, end the previous session or ask the user;
  - show active sessions and let users end them remotely.
- **OWASP JWT Cheat Sheet** [O2]:
  - a deny-list keyed by `jti` and `iss` until expiry, and not by the raw token or its hash;
  - a Token Status List for revocation by the issuer;
  - for sessions, it suggests a plain session system.
- **ASVS 5.0 V7** [A7]:
  - 7.4.1 (Level 1): an ended session must not be usable. For self-contained tokens the options are a list of ended tokens, a per-user "not before" time, or a per-user key.
  - 7.4.2 (Level 1): end all sessions when an account is disabled or deleted.
  - 7.1.2 (Level 2): document the number of concurrent sessions and the behaviour at the limit.
  - 7.5.2 (Level 2): users can view and end their sessions.

## 4. Could not verify

- **Store technology.** Which store Auth0, Okta and Cognito use for sessions or refresh tokens is not documented.
- **Clerk.**
  - The 60 s revocation delay is stated on Clerk's blog, not in the docs. The docs give the 60 s token lifetime [CL1].
  - What sets a session's status to `replaced` [CL5] is not documented.
- **Keycloak.**
  - The default access token lifespan is not stated in the admin guide.
  - That introspection checks the session comes from source code only [KC8].
- **Supabase's "most recent sign in".** The code compares the most recent refresh time [SB5]. A new sign-in counts as a refresh, so the outcome is normally the same.
- **Consumer apps.**
  - No messenger documents a push to the old phone.
  - LINE does not document what the old phone shows.
  - Discord has no help article on a device list.
  - Google, Meta and Netflix document no session limit.
- **Per-request cost.** The figure above is an estimate, not a measurement on SNU Now's server.

## 5. Sources (all accessed 2026-09-30)

- [S1] OpenID Connect Back-Channel Logout 1.0, final with errata 1 (2023-12-15), §2.1, §2.7.
- [S2] OpenID Connect Front-Channel Logout 1.0, final (2022-09-12), §3.
- [S3] RFC 7662, OAuth 2.0 Token Introspection, §2.2, §4.
- [S4] RFC 9068, JWT Profile for OAuth 2.0 Access Tokens, §2.2.1, §4.
- [O1] OWASP, Session Management Cheat Sheet.
- [O2] OWASP, JSON Web Token Cheat Sheet.
- [A7] OWASP ASVS 5.0.0, V7 Session Management.
- [AU1] Auth0 Docs, Session layers.
- [AU2] Auth0 Docs, Manage user sessions with the Management API.
- [AU3] Auth0 Docs, Access tokens.
- [AU4] Auth0 Support, Invalidate the API token after user logout (updated 2025-09-10).
- [AU5] Auth0 Support, How to prevent multiple active sessions for the same user (updated 2025-09-10).
- [AU6] Auth0 Docs, Manage sessions with Actions.
- [AU7] Auth0 Docs, Configure refresh token rotation.
- [OK1] Okta Management OpenAPI spec, Sessions (GitHub, pushed 2026-09-29).
- [OK2] Okta Developer, Validate access tokens.
- [OK3] Okta Developer, Refresh access tokens.
- [OK4] Okta Support, Is it possible to limit the number of concurrent sessions in Okta? (2023-12-11).
- [OK5] Okta Developer, Configure Native SSO.
- [FI1] Firebase, Manage user sessions (updated 2026-09-24).
- [FI2] Firebase, Verify ID tokens (updated 2026-09-24).
- [FI3] firebase-admin-node, `src/auth/base-auth.ts`.
- [SB1] Supabase Docs, User sessions.
- [SB2] Supabase Docs, Signing out.
- [SB3] Supabase Docs, Advanced server-side auth guide.
- [SB4] supabase/auth, `internal/models/sessions.go`.
- [SB5] supabase/auth, `internal/tokens/service.go` (last commit 2026-08-27).
- [CL1] Clerk Docs, How Clerk works.
- [CL2] Clerk Docs, Session tokens.
- [CL3] Clerk Docs, Session options.
- [CL5] Clerk Docs, SessionStatus type.
- [CG1] Amazon Cognito Developer Guide, Revoking tokens.
- [CG2] Amazon Cognito Developer Guide, Verifying a JSON Web Token.
- [CG3] Amazon Cognito Developer Guide, Understanding the access token.
- [CG4] Amazon Cognito API Reference, GlobalSignOut.
- [CG5] Amazon Cognito Developer Guide, Quotas.
- [KC1] Keycloak 26.0.0 release notes (2024-10-04).
- [KC2] Keycloak Server guide, Configuring distributed caches.
- [KC3] Keycloak upgrading notes, changes in 25.0.0.
- [KC4] Keycloak Securing apps, OIDC recommendations.
- [KC5] Keycloak Server Admin guide, Administering sessions.
- [KC6] Keycloak Server Admin guide, Authentication flows (User session limits).
- [KC7] Keycloak source, `UserSessionLimitsAuthenticator.java`.
- [KC8] Keycloak source, `AccessTokenIntrospectionProvider.java` (last commit 2026-09-15).
- [DJ1] Django 6.1 docs, How to use sessions.
- [DJ2] Django 6.1 docs, Using the Django authentication system.
- [LV1] Laravel 13.x, HTTP Session.
- [LV2] Laravel 13.x, Authentication.
- [LV3] laravel/laravel 13.x, `create_users_table` migration.
- [RL1] Rails Guides 8.1, Securing Rails Applications.
- [RL2] rails/rails, authentication generator templates.
- [SP1] Spring Security 7.1.1, Authentication Persistence and Session Management.
- [SP2] Spring Session 4.1, JDBC configuration.
- [AJ1] Auth.js, Session strategies.
- [BA1] Better Auth 1.7, Session management.
- [BA2] Better Auth, Multi-session plugin.
- [LU1] lucia-auth.com (updated July 2026).
- [LU2] lucia-auth/lucia, `code/auth_session.ts`.
- [LU3] lucia-auth/lucia, archived page `sessions/stateless-tokens.md` (July 2025).
- [KK1]–[KK4] Kakao Help Center: re-verification; logged out by another device; tablet with another device; one PC at a time.
- [WA1]–[WA3] WhatsApp Help Center: logged out; one number per account; linked devices.
- [LN1]–[LN3] LINE Help Center: main and sub devices; transfer by phone number; Devices list.
- [TG1] Telegram API, `authorization` constructor. [TG2] Telegram API, `auth.resetAuthorizations`.
- [GH1] GitHub Docs, Viewing and managing your sessions.
- [GO1] Google Account Help, See devices with account access.
- [ME1] Facebook Help Center, Where you're logged in.
- [NF1] Netflix Help Center, Manage access and devices.
- [SF1] Spotify Support, Hacked account help.
- [DC1] Discord Support, QR Code Login FAQ (edited 2024-04-16).
- [R1] Redis Docs, Pub/Sub, delivery semantics.
- [SI1] Socket.IO v4, Server API (`disconnectSockets`).
- [SI2] Socket.IO v4, Redis adapter (updated 2026-07-21).
- [SI3] Socket.IO v4, The Socket instance (client), disconnect reasons.
- [SI4] Socket.IO v4, Delivery guarantees.

[S1]: https://openid.net/specs/openid-connect-backchannel-1_0.html
[S2]: https://openid.net/specs/openid-connect-frontchannel-1_0.html
[S3]: https://www.rfc-editor.org/rfc/rfc7662.html
[S4]: https://www.rfc-editor.org/rfc/rfc9068.html
[O1]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
[O2]: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
[A7]: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x16-V7-Session-Management.md
[AU1]: https://auth0.com/docs/manage-users/sessions/session-layers
[AU2]: https://auth0.com/docs/manage-users/sessions/manage-user-sessions-with-auth0-management-api
[AU3]: https://auth0.com/docs/secure/tokens/access-tokens
[AU4]: https://support.auth0.com/center/s/article/Invalidate-the-API-token-after-user-logout
[AU5]: https://support.auth0.com/center/s/article/How-to-prevent-multiple-active-sessions-for-the-same-user
[AU6]: https://auth0.com/docs/manage-users/sessions/manage-sessions-actions
[AU7]: https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation
[OK1]: https://github.com/okta/okta-management-openapi-spec
[OK2]: https://developer.okta.com/docs/guides/validate-access-tokens/dotnet/main/
[OK3]: https://developer.okta.com/docs/guides/refresh-tokens/main/
[OK4]: https://support.okta.com/help/s/article/Is-it-possible-to-limit-the-number-of-concurrent-sessions-in-Okta
[OK5]: https://developer.okta.com/docs/guides/configure-native-sso/main/
[FI1]: https://firebase.google.com/docs/auth/admin/manage-sessions
[FI2]: https://firebase.google.com/docs/auth/admin/verify-id-tokens
[FI3]: https://github.com/firebase/firebase-admin-node/blob/main/src/auth/base-auth.ts
[SB1]: https://supabase.com/docs/guides/auth/sessions
[SB2]: https://supabase.com/docs/guides/auth/signout
[SB3]: https://supabase.com/docs/guides/auth/server-side/advanced-guide
[SB4]: https://github.com/supabase/auth/blob/master/internal/models/sessions.go
[SB5]: https://github.com/supabase/auth/blob/master/internal/tokens/service.go
[CL1]: https://clerk.com/docs/guides/how-clerk-works/overview
[CL2]: https://clerk.com/docs/guides/sessions/session-tokens
[CL3]: https://clerk.com/docs/guides/secure/session-options
[CL5]: https://clerk.com/docs/js-frontend/reference/types/session-status
[CG1]: https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html
[CG2]: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
[CG3]: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
[CG4]: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_GlobalSignOut.html
[CG5]: https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
[KC1]: https://www.keycloak.org/2024/10/keycloak-2600-released
[KC2]: https://www.keycloak.org/server/caching
[KC3]: https://github.com/keycloak/keycloak/blob/main/docs/documentation/upgrading/topics/changes/changes-25_0_0.adoc
[KC4]: https://github.com/keycloak/keycloak/blob/main/docs/guides/securing-apps/partials/oidc/recommendations.adoc
[KC5]: https://github.com/keycloak/keycloak/blob/main/docs/documentation/server_admin/topics/sessions/administering.adoc
[KC6]: https://github.com/keycloak/keycloak/blob/main/docs/documentation/server_admin/topics/authentication/flows.adoc
[KC7]: https://github.com/keycloak/keycloak/blob/main/services/src/main/java/org/keycloak/authentication/authenticators/sessionlimits/UserSessionLimitsAuthenticator.java
[KC8]: https://github.com/keycloak/keycloak/blob/main/services/src/main/java/org/keycloak/protocol/oidc/AccessTokenIntrospectionProvider.java
[DJ1]: https://docs.djangoproject.com/en/stable/topics/http/sessions/
[DJ2]: https://docs.djangoproject.com/en/stable/topics/auth/default/
[LV1]: https://laravel.com/docs/13.x/session
[LV2]: https://laravel.com/docs/13.x/authentication
[LV3]: https://github.com/laravel/laravel/blob/13.x/database/migrations/0001_01_01_000000_create_users_table.php
[RL1]: https://guides.rubyonrails.org/security.html
[RL2]: https://github.com/rails/rails/tree/main/railties/lib/rails/generators/rails/authentication
[SP1]: https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html
[SP2]: https://docs.spring.io/spring-session/reference/configuration/jdbc.html
[AJ1]: https://authjs.dev/concepts/session-strategies
[BA1]: https://www.better-auth.com/docs/concepts/session-management
[BA2]: https://www.better-auth.com/docs/plugins/multi-session
[LU1]: https://lucia-auth.com/
[LU2]: https://github.com/lucia-auth/lucia/blob/main/code/auth_session.ts
[LU3]: https://github.com/lucia-auth/lucia/blob/bcee386807d61f0088eca136ae4cc2a053c3f3a6/pages/sessions/stateless-tokens.md
[KK1]: https://cs.kakao.com/helps_html/1073209527?locale=ko
[KK2]: https://cs.kakao.com/helps_html/1073209525?locale=ko
[KK3]: https://cs.kakao.com/helps_html/1073209304?locale=ko
[KK4]: https://cs.kakao.com/helps_html/1073209664?locale=ko
[WA1]: https://faq.whatsapp.com/120604060995491/?locale=en_US
[WA2]: https://faq.whatsapp.com/1007324800132703/?locale=en_US
[WA3]: https://faq.whatsapp.com/378279804439436/?locale=en_US
[LN1]: https://help.line.me/line/smartphone/sp?contentId=20000132&lang=en
[LN2]: https://help.line.me/line/smartphone/sp?contentId=20011522&lang=en
[LN3]: https://help.line.me/line/smartphone/sp?contentId=20008468&lang=en
[TG1]: https://core.telegram.org/constructor/authorization
[TG2]: https://core.telegram.org/method/auth.resetAuthorizations
[GH1]: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/viewing-and-managing-your-sessions
[GO1]: https://support.google.com/accounts/answer/3067630?hl=en
[ME1]: https://www.facebook.com/help/211990645501187
[NF1]: https://help.netflix.com/en/node/128180
[SF1]: https://support.spotify.com/us/article/hacked-account-help/
[DC1]: https://support.discord.com/hc/en-us/articles/360039213771-QR-Code-Login-FAQ
[R1]: https://redis.io/docs/latest/develop/pubsub/
[SI1]: https://socket.io/docs/v4/server-api/
[SI2]: https://socket.io/docs/v4/redis-adapter/
[SI3]: https://socket.io/docs/v4/client-socket-instance/
[SI4]: https://socket.io/docs/v4/delivery-guarantees
