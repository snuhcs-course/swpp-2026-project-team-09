# Administrator sessions on the admin site: policy and evidence

All sources were accessed on 2026-09-29. `[X1]`-style links point to the Sources list at the end. "My judgement" marks conclusions that no source states directly.

## 1. Recommendation

The proposal holds, with two additions: a sign-out that the main server enforces, and an Administrator-only token audience.

- **Token: the main server's own ES256 token with an Administrator-only audience, never the Google ID token.** Google leaves session management to the site [G1]. ASVS reserves authorization for access tokens and requires distinct audiences when one key signs several kinds of token [A9].
- **Lifetime: 8 h absolute.** This is the top of OWASP's 4–8 h range for full-day use [O1], under NIST's 24 h at AAL2 [N1], and AWS IAM Identity Center's default [AW1].
- **No refresh token.** On expiry the person signs in with Google again, which NIST [N6][N7] and Google [G1] treat as the normal way to restart a session.
- **No idle timeout. Record the reason.** Signing in again takes one click while Google's session lasts, so an idle timeout neither proves presence nor limits a stolen token. ASVS wants deviations from NIST written down [A7 7.1.1].
- **Cookie: `__Host-` name, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, no `Domain`, no `Max-Age`/`Expires`.** It is set only in Server Actions and never passed to Client Components [N3][N4][O1][X1].
- **CSRF: every change goes through a Server Action, and no Route Handler changes state.** Server Actions check Origin against Host; Route Handlers have no built-in protection [X2][X5].
- **Sign-out: revoke on the main server, then delete the cookie.** A per-Administrator "tokens valid after" time, read with the existing registration lookup, meets ASVS 7.4.1 [A7].
- **No re-authentication before registering an Administrator.** Google documents no way to force a fresh login [G3], so it adds a click but no assurance. ASVS makes this Level 3 [A7 7.5.3].

## 2. Evidence

### Q1. Lifetime and refresh

- **NIST SP 800-63B-4** (final, July 2025 [N0]) sets these limits [N1][N2]:

  | Level | Overall timeout  | Inactivity timeout |
  | ----- | ---------------- | ------------------ |
  | AAL2  | SHOULD be ≤ 24 h | SHOULD be ≤ 1 h    |
  | AAL3  | SHALL be ≤ 12 h  | SHOULD be ≤ 15 min |

  The limits also depend on the environment and the endpoint, and must be documented [N6]. Targeting AAL2 is my judgement: the site cannot see a Google sign-in's AAL.

- **OWASP:** idle timeouts are 2–5 min for high-value apps and 15–30 min for low-risk ones. The absolute timeout is 4–8 h for a full workday. Timeouts must be enforced server-side [O1].
- **Benchmarks:** none of these describes an idle timeout.
  - The Google Admin console signs admins out after a fixed 1 h [W1].
  - Google Cloud re-authentication is fixed at 1–24 h and does not depend on inactivity [W2].
  - AWS IAM Identity Center defaults to 8 h [AW1].
- **Refresh tokens:** NIST notes that access and refresh tokens can outlive the session, and that holding one does not show the person is present [N5]. When the RP session ends, the IdP may issue a new assertion without prompting, and the RP decides whether that is enough [N6][N7].

### Q2. Storage and CSRF

- **Next.js:** it sets the session cookie server-side with `HttpOnly`, `Secure`, `SameSite`, `Path` and an expiry [X1]. Cookies can be set only in Server Functions or Route Handlers, not while a component renders [X3]. `proxy.ts` can also set them [X4].
- **NIST:** it says `Secure` SHALL be set, and `HttpOnly`, `__Host-` with `Path=/` and `SameSite` Lax or Strict SHOULD be. The cookie SHALL NOT carry cleartext personal data, so the token holds the Administrator id, not the email. Cookie expiry SHALL NOT enforce timeouts [N4].
- **Persistence:** bearer secrets SHOULD NOT persist across restarts or sit in localStorage [N3]. OWASP prefers non-persistent cookies and `SameSite=Strict` [O1]. Browser session restore can revive session cookies [M1].
- **`SameSite`:** it is only defence in depth, and Strict costs usability [O1][M2]. Lax lets admin links opened from chat arrive signed in (my judgement).
- **Server Actions:** they accept only POST and abort when Origin does not match Host or `X-Forwarded-Host`. Behind a proxy, set `serverActions.allowedOrigins` [X2]. They use no CSRF tokens [X5].
- **Deviation from NIST:** NIST asks for a verified session identifier in POST bodies [N3]. The Origin check replaces it, which ASVS accepts [A3 3.5.1]; record this.

### Q3. Google ID token as session?

- **Google:** Sign in with Google "doesn't provide any features for the session management" of your site. You validate the credential and create your own session [G1][G3]. ASVS limits ID tokens to proving authentication [A9 9.2.2].
- **Identify by `sub`, not email:** emails can change. Google is authoritative for an address only when it is `@gmail.com`, or when `email_verified` is true and `hd` is set [G2]. Because Administrators are registered by email address, binding `sub` at first sign-in is a sensible follow-up.
- **Replay:** a `nonce` is optional [A10 10.5.1][G5].

### Q4. Sign-out

- **NIST:** the client erases or invalidates the secret, and logout is easy to reach [N3].
- **OWASP:** the session is also invalidated server-side [O1].
- **ASVS 7.4.1 (Level 1):** an ended session must not be reusable. For self-contained tokens ASVS lists a denylist, a per-user "not before" time, or a per-user key [A7].
- **Why the per-user time:** the main server already loads the Administrator row on every request, so it costs little. It signs out all of that Administrator's browsers; document this [A7 7.1.2].
- **Google:** it is unaffected by the app's sign-out. `disableAutoSelect()` only pauses auto sign-in [G4]. Keeping `auto_select` off fits ASVS 7.6.2, which requires an explicit action to create a session [A7].

### Q5. Re-authentication for sensitive actions

- **ASVS:** re-authentication before changing your own authentication details is Level 2; extra authentication for highly sensitive operations is Level 3 [A7 7.5.1, 7.5.3].
- **Benchmark:** GitHub's sudo mode re-prompts for such actions and lasts two hours [GH1].
- **What Google offers:** Google's `prompt` values are `none`, `consent` and `select_account`, and no `max_age` is listed [G3]. `auth_time` can be requested, but needs "settings" enabled [G3][G5]. So the site could see how old a login is but not force a fresh one.
- **Verdict:** overkill here.

### Q6. Idle timeout

- **Limits:** a live Google session re-issues assertions without prompting [N6]. Idle timeouts do not stop a hijacker who keeps the session busy [O1], and cookie expiry cannot enforce them [N4].
- **Cheapest option if wanted:** an encrypted admin-site cookie carrying `lastSeen` [X1], checked and re-set in `proxy.ts` [X4]. Proxy also runs on prefetches, so a prefetch counts as activity [X1].
- **Verdict:** not worth it now (my judgement). On shared PCs, signing out of Google helps more.

## 3. Acceptance criteria

**Main server**

- Admin endpoints reject a Google ID token and a User token with 401. User endpoints reject an Administrator token.
- The Administrator token has `exp` 8 h after `iat` and its own audience. It carries the Administrator id and no email.
- The token is read only from `Authorization: Bearer`; cookies are ignored.
- Each admin request returns 401 if the token is expired, if the Administrator is unregistered, or if the token was issued before that Administrator's last sign-out.
- After sign-out the old token gets 401, and a token from a new sign-in works.
- No refresh token is issued.

**Admin site**

- One cookie holds the token: `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, with no `Domain` and no expiry.
- The token is absent from `document.cookie`, HTML and RSC payloads.
- Changes go only through Server Actions. A cross-origin action POST is rejected.
- On a 401 the person goes to sign-in and then returns to the same page.
- A sign-out control on every page revokes the token, deletes the cookie and shows sign-in.
- `auto_select` stays off.
- A decision record states: 8 h absolute, no idle timeout (with the reason), and sign-out ends every browser.

## 4. Unverified

- Google ID token lifetime: the pages consulted do not state it.
- Which "settings" enable `auth_time`, and whether it works with the Sign in with Google button.
- The AAL that a given Google sign-in reaches.

## 5. Sources (all accessed 2026-09-29)

- [O1] OWASP, Session Management Cheat Sheet (source last changed 2026-08-13).
- [A3] [A7] [A9] [A10] OWASP ASVS 5.0.0 (May 2025, latest release): V3 Web Frontend Security, V7 Session Management, V9 Self-contained Tokens, V10 OAuth and OIDC.
- [N0] NIST CSRC, SP 800-63B-4 final (published July 2025; supersedes 800-63B of 2020).
- [N1]–[N6] NIST SP 800-63B-4, web edition: §2.2.3 AAL2 reauthentication, §2.3.3 AAL3 reauthentication, §5.1 Session Bindings, §5.1.1 Browser Cookies, §5.1.2 Access Tokens, §5.2 Reauthentication.
- [N7] NIST SP 800-63C-4 §4.7, Reauthentication and Session Requirements in Federated Environments.
- [G1] Google, Sign in with Google for Web: Integration considerations (updated 2025-05-19).
- [G2] Google, Verify the Google ID token on your server side (updated 2025-12-22).
- [G3] Google, OpenID Connect (updated 2026-06-15).
- [G4] Google, Automatic sign-in and sign-out (updated 2025-05-23).
- [G5] Google, Sign in with Google JavaScript API reference (updated 2026-09-01).
- [W1] Google Workspace Admin Help, Set session length for Google services (updated 2026-09-24).
- [W2] Google Workspace Admin Help, Set session length for Google Cloud services (updated 2026-09-24).
- [AW1] AWS IAM Identity Center User Guide, User interactive sessions.
- [GH1] GitHub Docs, Sudo mode.
- [X1] Next.js 16.3 docs, Authentication guide (updated 2026-08-25).
- [X2] Next.js docs, Data security guide (updated 2026-08-25).
- [X3] Next.js docs, `cookies` API reference (updated 2026-06-09).
- [X4] Next.js docs, `proxy.js` reference (updated 2026-09-07).
- [X5] Next.js blog, How to Think About Security in Next.js (2023-10-23).
- [M1] MDN, Set-Cookie header.
- [M2] MDN, Cross-site request forgery (CSRF).

[O1]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
[A3]: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x12-V3-Web-Frontend-Security.md
[A7]: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x16-V7-Session-Management.md
[A9]: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x18-V9-Self-contained-Tokens.md
[A10]: https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/en/0x19-V10-OAuth-and-OIDC.md
[N0]: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
[N1]: https://pages.nist.gov/800-63-4/sp800-63b.html#aal2reauth
[N2]: https://pages.nist.gov/800-63-4/sp800-63b.html#aal3reauth
[N3]: https://pages.nist.gov/800-63-4/sp800-63b.html#bindings
[N4]: https://pages.nist.gov/800-63-4/sp800-63b.html#sesscookies
[N5]: https://pages.nist.gov/800-63-4/sp800-63b.html#access-tokens
[N6]: https://pages.nist.gov/800-63-4/sp800-63b.html#sessionreauthn
[N7]: https://pages.nist.gov/800-63-4/sp800-63c.html#federation-session
[G1]: https://developers.google.com/identity/gsi/web/guides/integrate
[G2]: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
[G3]: https://developers.google.com/identity/openid-connect/openid-connect
[G4]: https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out
[G5]: https://developers.google.com/identity/gsi/web/reference/js-reference
[W1]: https://knowledge.workspace.google.com/admin/security/set-session-length-for-google-services
[W2]: https://knowledge.workspace.google.com/admin/security/set-session-length-for-google-cloud-services
[AW1]: https://docs.aws.amazon.com/singlesignon/latest/userguide/user-interactive-sessions.html
[GH1]: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/sudo-mode
[X1]: https://nextjs.org/docs/app/guides/authentication
[X2]: https://nextjs.org/docs/app/guides/data-security
[X3]: https://nextjs.org/docs/app/api-reference/functions/cookies
[X4]: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
[X5]: https://nextjs.org/blog/security-nextjs-server-components-actions
[M1]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
[M2]: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF
