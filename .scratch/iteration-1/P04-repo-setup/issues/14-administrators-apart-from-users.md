# 14: Administrators apart from Users

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 09 (Recognise an Administrator)

## What to build

An Administrator signs in to the admin site with a Google account and gets an Administrator's record and access token, separate from Users. The app and the admin site then never share a session, so a rule for the app's sessions never signs an Administrator out, and an Administrator never appears on the map or among Friends. A User's token never passes an administrative route, and an Administrator's token never passes a User's route or the socket server.

Administrators are registered in the main database, not in the settings. The settings list only the initial Administrators, which fill an empty database, and Administrators register and remove each other through administrative routes. The admin site's screens for this, and the routes for events, belong to P12.

## Acceptance criteria

Administrators

- [ ] The main database keeps Administrators in their own table: the email address they were registered with, the Google subject identifier bound at their first sign-in, who registered them and when, and the time before which their tokens are no longer valid.
- [ ] A setting lists the initial Administrators' email addresses. While no Administrator is registered, the server registers all of them when it starts, as registered by nobody. `ADMINISTRATOR_EMAILS` and its `@snu.ac.kr` rule are removed.
- [ ] An Administrator lists the Administrators, with each one's email address, whether they have signed in yet, and who registered them.
- [ ] An Administrator registers an email address of any Google domain. Case is ignored. Registering an address that is already registered changes nothing and answers as the first time did.
- [ ] An Administrator removes another Administrator, or themselves. Removing the last Administrator gets 409.

Sign-in and tokens

- [ ] The admin site signs in on its own route with a Google ID token issued to the admin site's client. Any Google domain is accepted, but the email address must be verified and registered; otherwise 403. After the first sign-in the Administrator is recognised by the Google subject identifier. An ID token issued to the app's client gets 401.
- [ ] The app's sign-in accepts ID tokens issued to the app's client only; one issued to the admin site's client gets 401. The settings name the two clients separately.
- [ ] An Administrator's access token is the main server's own, with an audience of its own, the Administrator's id and no email address. It is valid for 8 hours and comes without a refresh token.
- [ ] Administrative routes read the token from the `Authorization` header only. A User's token or a Google ID token gets 401 there, and an Administrator's token gets 401 on a User's route, on `GET /users/me` and on the socket server.
- [ ] Every administrative request checks the Administrator: an expired token, a removed Administrator, or a token issued before their last sign-out gets 401.
- [ ] An Administrator signs out on a route that ends every token issued to them so far; a new sign-in works afterwards.
- [ ] Signing in to the admin site creates no User and leaves the same person's User untouched.

Checks and docs

- [ ] Tests through the public API cover: the initial Administrators registered at start and one of them signed in, and no User created; an unregistered account and an unverified email address refused; each client's ID token refused on the other route; each kind of token refused where the other belongs, on the socket server too; register, the new Administrator signs in; register twice; remove, the removed one refused; the last Administrator kept; sign-out, the old token refused and a new sign-in accepted; a token past 8 hours refused.
- [ ] The docs say that an Administrator is not a User and how Administrators are registered: `CONTEXT.md` (done), the P04 spec's Administrator story and bullet, ticket 09's description, the main server README, `.env.example` and `compose.yaml`.
- [ ] The P12 spec's Admin site section states the admin site's side of the session (see Comments), its screen to register and remove Administrators, and its testing decisions without Administrators as Users.

## Comments

### Decisions (2026-09-29)

The session policy follows `.scratch/research/administrator-sessions.md` (OWASP Session Management Cheat Sheet, ASVS 5.0 V7 and V9, NIST SP 800-63B-4, Google Sign in with Google, Next.js 16 security guides).

- **8 hours, absolute, no refresh token**: a working day, the upper end of OWASP's range for full-day use and under NIST's limit at AAL2. When it expires, the admin site sends the person through Sign in with Google again.
- **No idle timeout**: signing in again takes one click while the person's Google session lasts, so an idle timeout would prove nobody's presence and would not limit a stolen token. ASVS asks for such a deviation to be written down; this is it.
- **Sign-out ends every browser**: a per-Administrator time before which tokens are refused, read with the check every administrative request already makes.
- **No second sign-in before registering an Administrator**: Google offers no way to force a fresh login, so it would add a click without assurance. Who registered whom, and when, is recorded instead.
- **Admin site side (P12)**: one cookie holds the token, named with the `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, without `Domain` or an expiry, and never passed to Client Components. Every change goes through a Server Action; no Route Handler changes data. A 401 sends the person to sign-in and back to the same page. Every page has a sign-out control. Google's automatic sign-in stays off.
- **Wrong kind of token**: 401 everywhere, because the request proves nobody is signed in as the right kind.
- **Initial Administrators**: a setting used only while no Administrator is registered, so that a fresh database, a new deployment and the tests all start the same way without a command run by hand. The team's four addresses go in each member's `.env` and in the deployment's settings, not in the repository, which is public; `.env.example` shows an example address.
