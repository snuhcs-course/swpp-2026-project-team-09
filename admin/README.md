# admin

The SNU Now admin site, built with Next.js 16, the App Router and Tailwind CSS. Administrators sign in with Google and
manage the Administrators. The site keeps no data of its own: every page and every change goes to the main server's
administrator routes (`/admin/...`, see the main server's README, section Administrators).

## Run it

You need Node.js 24. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The commands below
use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type `npx pnpm@12.6.0`
wherever this file says `pnpm`. In `admin/`:

```bash
cp .env.example .env   # then fill in the values, see Settings
pnpm install
pnpm dev
```

Open http://localhost:3100. The servers use ports 3000 to 3003, so the site uses 3100, in `pnpm dev` and `pnpm start`
alike. Sign in with Google and the Kakao map accept only registered addresses, so keep the port.

The main server must be running, with `GOOGLE_ADMIN_CLIENT_ID` set to the same client ID as the site's, and with your
Google account's address registered as an Administrator (`INITIAL_ADMINISTRATOR_EMAILS` registers the first ones on an
empty database).

## Settings

`.env.example` lists them; copy it to `.env`, which Git ignores.

| Variable                       | Read by          | What it is                                                                 |
| ------------------------------ | ---------------- | -------------------------------------------------------------------------- |
| `MAIN_SERVER_URL`              | the server only  | The main server's address, such as `http://localhost:3000`                 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the browser, too | The admin site's Google client, the main server's `GOOGLE_ADMIN_CLIENT_ID` |

A `NEXT_PUBLIC_` value is written into the browser's code when the site is built, so change it before `pnpm build`.

The admin site's Google client is a Web application client of its own. Its authorized JavaScript origins must include
both `http://localhost` and `http://localhost:3100` (`.scratch/research/external-sources.md`, section 8); the sign-in
button does not work on an address that is not among them.

## The session

- **Signing in**: the sign-in page shows Google's Sign in with Google button in popup mode. Automatic sign-in and One
  Tap stay off. The ID token Google hands back is posted to a Server Action, which sends it to
  `POST /admin/auth/google`. On 200 the action stores the access token in a cookie and returns to the page in `next`,
  if that is a path of this site, and to the home page otherwise. A 403 shows that the account is not a registered
  Administrator, a 401 that the sign-in failed. Over plain `http` the button needs the full referrer, so the sign-in
  page is sent with `Referrer-Policy: no-referrer-when-downgrade`.
- **The cookies**: `__Host-access-token` holds the access token, `HttpOnly; Secure; SameSite=Lax; Path=/`, without
  `Domain`, `Expires` or `Max-Age`, so it ends with the browser. The token is valid for 8 hours and has no refresh
  token. It stays on the server: no Client Component receives it, and no page or React Server Components payload holds
  it. `__Host-administrator-email`, with the same attributes, holds the signed-in address for the menu, read from the
  ID token the main server accepted, because the access token does not carry it.
- **A 401**: every page reads the cookie on the server and calls the main server with the token; every change is a
  Server Action that does the same. Without the cookie, or when the main server answers 401 (the token expired, the
  Administrator signed out in another browser or was removed), the person is sent to `/sign-in?next=<the page>` and
  comes back there after signing in. There is no Next.js proxy: each page checks for itself.
- **Signing out**: the button at the bottom of every page's menu posts to `POST /admin/auth/sign-out`, which ends every token of
  that Administrator in every browser, then deletes both cookies, also when the main server answers 401, and opens
  the sign-in page.
- Server Actions keep Next.js's check that a request comes from the site's own origin; `serverActions.allowedOrigins`
  stays unset.

On a laptop, use Chrome or Firefox: both accept a `Secure` cookie on `http://localhost`, so the session works without
HTTPS.

## Layout

Every page behind the session shares `src/app/(signed-in)/layout.tsx`: a menu on the left (`site-menu.tsx`) with the
site's sections, the current one marked, and the signed-in address and the sign-out button at the bottom; the page on
the right. Under Tailwind's `md` breakpoint (768px) the menu folds into a top bar with a Menu button.

To add a section, add a route under `src/app/(signed-in)/` and one entry to `SECTIONS` in `site-menu.tsx`.

The look is one neutral palette (zinc) with one accent (indigo), set in `src/app/globals.css` as `accent`,
`accent-strong` and `accent-soft`, and Pretendard where it is installed, else the system font. `globals.css` also holds
the shared classes `button`, `button-primary`, `button-danger`, `input`, `card` and `data-table`; use them for new
controls and tables so that every page looks alike.

## Pages

| Path              | What it does                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sign-in`        | Sign in with Google                                                                                                                                                                                     |
| `/`               | Opens `/administrators` for now                                                                                                                                                                         |
| `/administrators` | Lists the Administrators with whether each has signed in; registers an address; removes one, the signed-in one included, after a confirmation. The main server keeps the last one and the page says so. |

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `__tests__/`                 |

`pnpm lint` and `pnpm typecheck` first run `next typegen`, which writes the route types (`LayoutProps`, `PageProps`)
into `.next/types/`, so both checks also work on a fresh clone, before `pnpm dev` has run.

## Tests

`pnpm test` runs two Vitest projects:

- **pages** (`__tests__/*.test.tsx`): each test renders a page with React Testing Library in jsdom, as Next.js would
  on a request, and clicks through it. `vitest.setup.ts` replaces the parts of Next.js that need a request (`cookies()`,
  `redirect()`, `refresh()`) with `__tests__/support/browser.tsx`, which keeps the cookies and the page a redirect led
  to, and replaces the main server with the fake in `__tests__/support/fake-main-server.ts`. `__tests__/support/google.ts`
  stands in for Google's script on the sign-in page.
- **site** (`__tests__/site/*.test.ts`): builds the site once (`next build`, about 20 seconds) into `.next-test/`, with
  a test Google client ID, starts it with `next start` on a free port against a fake main server over HTTP, and checks
  what only the real server shows: the cookie's attributes, that the token is in no page, and that a Server Action
  posted from another origin is refused. The separate folder keeps the test build away from your own `.next/`.

## Folder layout

```text
src/app/sign-in/         the sign-in page, Google's button and the sign-in Server Action
src/app/(signed-in)/     the pages behind the session; layout.tsx and site-menu.tsx are the menu around them
src/app/globals.css      the palette, the font and the shared classes
src/main-server.ts       the only way the site calls the main server; server-only
src/session.ts           the cookie, and asAdministrator(), which sends the person to sign-in on a missing cookie or a 401
__tests__/               page tests, named *.test.tsx, and their support/
__tests__/site/          tests against the built site
```

Add a main server operation to `mainServer` in `src/main-server.ts`, and the same operation to the fake in
`__tests__/support/fake-main-server.ts`. A page calls it through `asAdministrator('<the page path>', (token) => ...)`.
