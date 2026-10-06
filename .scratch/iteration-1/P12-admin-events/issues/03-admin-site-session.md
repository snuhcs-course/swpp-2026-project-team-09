# 03: Admin site: signing in and out, and the Administrators screen

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

An Administrator opens the admin site, signs in with Sign in with Google and lands on the page they asked for. A person who is not a registered Administrator is told so and gets no session. Every page has a sign-out control, which ends every token of that Administrator on the main server, in every browser, and then forgets the token here. When the main server answers 401, because the token expired after 8 hours, the Administrator signed out in another browser or was removed, the person is sent to sign-in and then back to the same page.

The first screen built on the session is the Administrators screen: it lists the Administrators with each one's email address and whether they have signed in yet, registers an email address of any Google domain, and removes an Administrator, the signed-in one included. The main server keeps the last one, and the screen says so when it refuses.

The site has no data of its own. Pages fetch from the main server on the server side and forward the token from the cookie; every change is a Server Action, and no Route Handler changes data. The main server's routes used here exist already: `POST /admin/auth/google`, `POST /admin/auth/sign-out` and the Administrators routes (main server README: Administrators). This ticket sets up the server-only module through which the site calls the main server; tickets 04 and 05 add their operations to it and replace it with a fake in their page tests.

## Acceptance criteria

- [x] The site reads the main server's address from a server-only setting and the admin site's Google client ID from a public one. `admin/.env.example` lists them, committed past the `.env*` rule of `admin/.gitignore`.
- [x] The sign-in page shows Google's Sign in with Google button through Google Identity Services, in its popup mode, with automatic sign-in and One Tap off. The ID token it hands back goes to a Server Action that posts it to `POST /admin/auth/google`. Over plain `http` the page sends `Referrer-Policy: no-referrer-when-downgrade`, which Google's button needs there.
- [x] On 200, the action stores the access token in one cookie named with the `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/`, without `Domain`, `Expires` or `Max-Age`, and redirects to the page the person came from. Only a path of the site is followed; anything else leads to the home page.
- [x] On 403 the page says that the account is not a registered Administrator, and on 401 that the sign-in failed; neither sets a cookie.
- [x] The token never reaches the browser: no Client Component receives it, and no page's HTML or React Server Components payload holds it.
- [x] Every page reads the cookie on the server and asks the main server, which checks the Administrator. A page without the cookie, or one whose request the main server answers with 401, redirects to the sign-in page with the page's path, and a sign-in returns there. A Next.js proxy may redirect early, but no page relies on it.
- [x] Every page has a sign-out control, a Server Action that posts to `POST /admin/auth/sign-out`, deletes the cookie whether the main server answered 204 or 401, and redirects to the sign-in page.
- [x] The Administrators screen lists `{ email, signedIn }` from `GET /admin/administrators` in the main server's order, registers an address with `POST /admin/administrators`, and removes one with `DELETE /admin/administrators/:id` after the person confirms. An address that is not an email address is refused on the page before it is sent. A 409 for the last Administrator, and a 404 for one already removed, are shown as messages, and the list is read again.
- [x] Server Actions keep Next.js's own check that a Server Action comes from the site's origin: `serverActions.allowedOrigins` is not set.
- [x] Page-level tests with Vitest and React Testing Library against a fake of the main server: the Administrators screen's list, registering, a refused address, removing, the last Administrator refused; a 401 leading to the sign-in page with the page's path, and a sign-in returning there; sign-out calling the main server and deleting the cookie, also when the main server answers 401; the messages for 403 and 401 at sign-in.
- [x] Tests against the built site started on a local port, with a fake main server: the `Set-Cookie` header of a sign-in carries every attribute above; the token is in no page's HTML or React Server Components payload; a Server Action posted with another `Origin`, such as the sign-out form's action read from a rendered page, is refused, and the fake main server receives nothing.
- [ ] `http://localhost` and `http://localhost:3100` are among the JavaScript origins of the admin site's Google client (`.scratch/research/external-sources.md` §8). Registering them is a step in the Google Cloud console for a person with access to the project; the ticket's comments record when it was done, and a sign-in on `http://localhost:3100` was tried by hand afterwards.
  - Not done yet: it needs a person with access to the Google Cloud project (see For a person below).
- [x] The admin site's README records the settings, the session (the cookie, the 401 path, sign-out), how to sign in on a laptop (Chrome and Firefox accept a `Secure` cookie on `http://localhost`), the registered origins, the folder layout and how the tests run.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.

## Comments

### Decisions (2026-10-06)

- **Where things are** (`admin/`): `src/main-server.ts` is the only way to the main server, `server-only`, an object
  `mainServer` with one function per route (`signIn`, `signOut`, `listAdministrators`, `registerAdministrator`,
  `removeAdministrator`), each throwing `MainServerError(status)` on an answer that is not 2xx. Tickets 04 and 05 add
  their routes there and to the fake. `src/session.ts` holds the cookies and `asAdministrator(path, call)`, which every
  page and every Server Action uses: no cookie, or a 401 from the main server, redirects to `/sign-in?next=<path>`.
  Pages behind the session live in the route group `src/app/(signed-in)/`; the sign-in page and its Server Action in
  `src/app/sign-in/`. The home page `/` redirects to `/administrators` until ticket 04 puts the Global Events there.
- **The cookies**: the token is in `__Host-access-token`, `HttpOnly; Secure; SameSite=Lax; Path=/`, without `Domain`,
  `Expires` or `Max-Age`. A second cookie with the same attributes, `__Host-administrator-email`, holds the signed-in
  address for the menu: the main server's token carries only the Administrator's id and no route answers "who am I",
  so the sign-in action reads the `email` claim of the Google ID token the main server has just accepted (without
  checking it again; it is only shown). Sign-out deletes both, with the same attributes, so that browsers accept the
  deletion of a `__Host-` cookie. A route such as `GET /admin/auth/me` on the main server would make the second cookie
  unnecessary.
- **Sign-in**: Google Identity Services is loaded by a script tag from the client component
  `src/app/sign-in/google-sign-in.tsx`, initialised with `ux_mode: 'popup'` and `auto_select: false`;
  `google.accounts.id.prompt()` (One Tap) is never called. The callback puts the ID token in a hidden field and submits
  a form bound to the Server Action through `useActionState`, so the action also works as a plain form post. `next` is
  followed only when it resolves to a path of the site; anything else leads to `/`. `Referrer-Policy:
  no-referrer-when-downgrade` is sent on `/sign-in` always (`next.config.ts` headers), over https too, since the site
  cannot tell the scheme behind a proxy.
- **Proxy**: none. Every page checks for itself through `asAdministrator`; the 401 path covers the missing cookie.
- **How pages fetch**: async Server Components call `mainServer` with the token from the cookie (`cache: 'no-store'`);
  changes are Server Actions (`useActionState` for their messages) that call `refresh()` from `next/cache` so that the
  list is read again, also after a 404 or 409. A sign-out on the main server that fails with anything other than 204 or
  401 keeps the cookie and shows Next.js's error page, so that the person can try again.
- **Layout**: every page behind the session shares `(signed-in)/layout.tsx`: a vertical menu on the left
  (`site-menu.tsx`, a client component for the current section via `usePathname` and the narrow-screen toggle) with the
  sections, the signed-in address and the sign-out button at the bottom, and the page on the right. Under Tailwind's
  `md` (768px) it folds into a top bar with a Menu button. Only sections whose pages exist are listed (Administrators);
  a later ticket adds its route and one entry to `SECTIONS`. Users are not listed: managing Users is out of the spec's
  scope. The look is zinc with one indigo accent (`accent`, `accent-strong`, `accent-soft` in `globals.css`), Pretendard
  where installed, else the system font, and a few shared classes in `globals.css` (`button`, `button-primary`,
  `button-danger`, `input`, `card`, `data-table`). The site is in English, as the placeholder was; dark mode was
  dropped.
- **Messages**: 403 at sign-in "This Google account is not a registered Administrator.", 401 "Signing in failed. Try
  again.", an address that fails the browser's email check "Enter an email address, such as name@example.com." (nothing
  is sent), 409 "The last Administrator cannot be removed.", 404 "This Administrator had already been removed.", and a
  400 on registering names the address the main server refused.
- **How tests run**: `pnpm test` runs two Vitest projects. `pages` (jsdom, `admin/__tests__/*.test.tsx`) renders the
  async pages by calling them as Next.js would and clicks through them; `vitest.setup.ts` replaces `next/headers`
  `cookies()`, `next/navigation` `redirect()`, `next/cache` `refresh()` and `@/main-server` with
  `__tests__/support/browser.tsx` (cookies, the location a redirect led to, re-rendering on `refresh()`) and the
  in-memory fake `__tests__/support/fake-main-server.ts`; `__tests__/support/google.ts` stands in for Google's script.
  `site` (`__tests__/site/`) runs `next build` once in a global setup into `.next-test/` (`NEXT_DIST_DIR`, so a test
  build never replaces `.next/`; `tsconfig.json` includes its types because `next build` adds them), starts
  `next start` on a free port against a fake main server over HTTP, posts the sign-in form and the sign-out form as a
  browser without JavaScript would, and checks the `Set-Cookie` headers, the token's absence from the HTML and the RSC
  payload (`RSC: 1`), and that a sign-out posted with another `Origin` is refused (Next.js answers 500) while the same
  form from the site's origin reaches the main server. The whole run takes about 30 seconds, most of it the build. No
  workflow change is needed.
- **Dependencies**: none added. `server-only` is handled by Next.js itself; Vitest maps it to Next.js's empty module.
- Checked by hand in the desktop browser against the built site and a fake main server: a sign-in by the form,
  the `Secure` cookies accepted on `http://127.0.0.1` and not readable from JavaScript, registering, the refused
  address, removing, sign-out deleting both cookies, the menu on a wide and a narrow window.

### For a person

- Add `http://localhost` and `http://localhost:3100` to the authorized JavaScript origins of the admin site's Google
  client in the Google Cloud console, then record the date here.
- Fill in `admin/.env` from `admin/.env.example`: `MAIN_SERVER_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (the same value
  as the main server's `GOOGLE_ADMIN_CLIENT_ID`).
- Then sign in on `http://localhost:3100` with Chrome or Firefox and an account in `INITIAL_ADMINISTRATOR_EMAILS`, and
  record it here.

### Agent usage (2026-10-06)

- Agent time: about 40 minutes, an estimate: one implementing agent, including a layout change asked for during the
  work. The session that ran it is not counted here.
- Tokens, counted from the agent's transcript when this section was written:
  - Input: 21,945,446, of which 21,693,098 were cache reads, 252,124 cache writes and 224 uncached.
  - Output: 7,097, a lower bound, since the transcript records only part of the output of most steps.
