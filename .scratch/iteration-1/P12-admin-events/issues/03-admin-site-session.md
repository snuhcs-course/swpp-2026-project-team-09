# 03: Admin site: signing in and out, and the Administrators screen

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

An Administrator opens the admin site, signs in with Sign in with Google and lands on the page they asked for. A person who is not a registered Administrator is told so and gets no session. Every page has a sign-out control, which ends every token of that Administrator on the main server, in every browser, and then forgets the token here. When the main server answers 401, because the token expired after 8 hours, the Administrator signed out in another browser or was removed, the person is sent to sign-in and then back to the same page.

The first screen built on the session is the Administrators screen: it lists the Administrators with each one's email address and whether they have signed in yet, registers an email address of any Google domain, and removes an Administrator, the signed-in one included. The main server keeps the last one, and the screen says so when it refuses.

The site has no data of its own. Pages fetch from the main server on the server side and forward the token from the cookie; every change is a Server Action, and no Route Handler changes data. The main server's routes used here exist already: `POST /admin/auth/google`, `POST /admin/auth/sign-out` and the Administrators routes (main server README: Administrators). This ticket sets up the server-only module through which the site calls the main server; tickets 04 and 05 add their operations to it and replace it with a fake in their page tests.

## Acceptance criteria

- [ ] The site reads the main server's address from a server-only setting and the admin site's Google client ID from a public one. `admin/.env.example` lists them, committed past the `.env*` rule of `admin/.gitignore`.
- [ ] The sign-in page shows Google's Sign in with Google button through Google Identity Services, in its popup mode, with automatic sign-in and One Tap off. The ID token it hands back goes to a Server Action that posts it to `POST /admin/auth/google`. Over plain `http` the page sends `Referrer-Policy: no-referrer-when-downgrade`, which Google's button needs there.
- [ ] On 200, the action stores the access token in one cookie named with the `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/`, without `Domain`, `Expires` or `Max-Age`, and redirects to the page the person came from. Only a path of the site is followed; anything else leads to the home page.
- [ ] On 403 the page says that the account is not a registered Administrator, and on 401 that the sign-in failed; neither sets a cookie.
- [ ] The token never reaches the browser: no Client Component receives it, and no page's HTML or React Server Components payload holds it.
- [ ] Every page reads the cookie on the server and asks the main server, which checks the Administrator. A page without the cookie, or one whose request the main server answers with 401, redirects to the sign-in page with the page's path, and a sign-in returns there. A Next.js proxy may redirect early, but no page relies on it.
- [ ] Every page has a sign-out control, a Server Action that posts to `POST /admin/auth/sign-out`, deletes the cookie whether the main server answered 204 or 401, and redirects to the sign-in page.
- [ ] The Administrators screen lists `{ email, signedIn }` from `GET /admin/administrators` in the main server's order, registers an address with `POST /admin/administrators`, and removes one with `DELETE /admin/administrators/:id` after the person confirms. An address that is not an email address is refused on the page before it is sent. A 409 for the last Administrator, and a 404 for one already removed, are shown as messages, and the list is read again.
- [ ] Server Actions keep Next.js's own check that a Server Action comes from the site's origin: `serverActions.allowedOrigins` is not set.
- [ ] Page-level tests with Vitest and React Testing Library against a fake of the main server: the Administrators screen's list, registering, a refused address, removing, the last Administrator refused; a 401 leading to the sign-in page with the page's path, and a sign-in returning there; sign-out calling the main server and deleting the cookie, also when the main server answers 401; the messages for 403 and 401 at sign-in.
- [ ] Tests against the built site started on a local port, with a fake main server: the `Set-Cookie` header of a sign-in carries every attribute above; the token is in no page's HTML or React Server Components payload; a Server Action posted with another `Origin`, such as the sign-out form's action read from a rendered page, is refused, and the fake main server receives nothing.
- [ ] `http://localhost` and `http://localhost:3100` are among the JavaScript origins of the admin site's Google client (`.scratch/research/external-sources.md` §8). Registering them is a step in the Google Cloud console for a person with access to the project; the ticket's comments record when it was done, and a sign-in on `http://localhost:3100` was tried by hand afterwards.
- [ ] The admin site's README records the settings, the session (the cookie, the 401 path, sign-out), how to sign in on a laptop (Chrome and Firefox accept a `Secure` cookie on `http://localhost`), the registered origins, the folder layout and how the tests run.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.
