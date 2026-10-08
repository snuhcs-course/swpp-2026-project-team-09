# admin

The SNU Now admin site, built with Next.js 16, the App Router and Tailwind CSS. Administrators sign in with Google,
review, correct, create and publish Global Events, check the Places on a map, see whether each Source is collected, make
and end friendships between Users, and manage the Administrators. The site keeps no data of its own: every page
and every change goes to the main server's administrator routes (`/admin/...`, see the main server's README, sections
Administrators, Global Events, Places and Friends).

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

| Variable                           | Read by          | What it is                                                                 |
| ---------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| `MAIN_SERVER_URL`                  | the server only  | The main server's address, such as `http://localhost:3000`                 |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`     | the browser, too | The admin site's Google client, the main server's `GOOGLE_ADMIN_CLIENT_ID` |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | the browser, too | The JavaScript key of the team's Kakao app, for the maps                   |

A `NEXT_PUBLIC_` value is written into the browser's code when the site is built, so change it before `pnpm build`.

The admin site's Google client is a Web application client of its own. Its authorized JavaScript origins must include
both `http://localhost` and `http://localhost:3100` (`.scratch/research/external-sources.md`, section 8); the sign-in
button does not work on an address that is not among them.

The Kakao key works only on the addresses registered for it in the Kakao app, under JavaScript SDK domains;
`http://localhost:3100` is registered (`.scratch/research/external-sources.md`, section 7.3). `src/kakao-maps.ts` loads
Kakao's JavaScript SDK once, in the browser. Without the key the event form takes the position as two numbers instead
of on the map.

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

To add a section, add a route under `src/app/(signed-in)/` and one entry to `SECTIONS` in `site-menu.tsx`: its `href`,
and in `under` the path its other pages start with, so that the menu marks the section on them too (Events is `/`, its
events under `/events`).

The look is one neutral palette (zinc) with one accent (indigo), set in `src/app/globals.css` as `accent`,
`accent-strong` and `accent-soft`, and Pretendard where it is installed, else the system font. `globals.css` also holds
the shared classes `button`, `button-primary`, `button-danger`, `input`, `card` and `data-table`; use them for new
controls and tables so that every page looks alike.

## Pages

| Path              | What it does                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sign-in`        | Sign in with Google                                                                                                                                                                                     |
| `/`               | Events: the Drafts, each with what publishing it still needs, and below them the published events that have not ended, both in the main server's order. A title opens the event's page.                 |
| `/events/new`     | A new event entered by hand, with the event's form; creating it opens the new Draft's page.                                                                                                             |
| `/events/<id>`    | One Global Event: its state, its source link and post number, its text as stored, and the form that saves, publishes, discards or cancels it. An unknown id shows the not-found page.                   |
| `/places`         | Kakao's map of the campus with every Place's outlines, or a marker for a Place without one; a search and a click select a Place and show its record.                                                    |
| `/users`          | Lists the Users with their name, email, department, Friend ID and number of Friends, a User before onboarding marked; a search filters them. A User opens their page.                                   |
| `/users/<id>`     | A User's Friends, "친구 맺기" with another onboarded User who is not yet their Friend, and "친구 끊기" after a confirmation. An unknown id shows the not-found page.                                    |
| `/collection`     | Collection status: each Source with its last successful Collection and its last failure, a broken Source marked.                                                                                        |
| `/administrators` | Lists the Administrators with whether each has signed in; registers an address; removes one, the signed-in one included, after a confirmation. The main server keeps the last one and the page says so. |

## Global Events

The home page reads `GET /admin/global-events?state=draft` and `?state=published`, and links to the page for a new
event; the event's page reads
`GET /admin/global-events/:id` and the Places from `GET /admin/places`.

Times are shown and entered in Asia/Seoul, whatever the browser's time zone (`src/seoul-time.ts`). A start at 00:00 is
marked as possibly a day without its time, in the list and on the form, since a collection often stores a day read
without its time at 00:00.

The form holds the title, the description, the start and the end as a day and a time, the place name and the position.
Finding a Place by name or number and choosing it sets the place name and the position to the Place's; the place name
can then be edited, and the position can be cleared. The position is a marker on Kakao's map (`events/position-map.tsx`),
on the campus when there is none: pointing on the map moves the marker there and sets the position, kept to 6 decimals,
and leaves the place name as it is. A position outside the Campus Boundary is refused by the main server, and the form
shows its message. Before anything is sent the form says, beside the field, that a
title is needed, that a day needs its time and the other way round, and that the end must be after the start.

The page for a new event holds the same form (`events/event-fields.tsx`). Create the Draft sends
`POST /admin/global-events` through the Server Action `createEvent` in `src/app/(signed-in)/events/new/actions.ts`, with
an `Idempotency-Key` made when the button is pressed, and opens the new Draft's page. When the main server does not
answer, or answers 5xx, the form stays and says to try again: pressing the button again with the form unchanged sends
the same key, so the event is not created twice even if the first answer was lost; a change to the form makes a new key
at the next press.

Each change is the Server Action `changeEvent` in `src/app/(signed-in)/events/[id]/actions.ts`, sent with the version
the page loaded:

| Control          | Shown on         | Sends                                                                                                                                         |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Save             | Draft, published | `PATCH /admin/global-events/:id` with `{ version, title, description, startsAt, endsAt, place, latitude, longitude }`; empty fields as `null` |
| Publish          | Draft            | after a confirmation, the same `PATCH`, then `POST /admin/global-events/:id/publish` with the version it answered                             |
| Discard          | Draft            | `POST /admin/global-events/:id/discard` with `{ version }`, after a confirmation                                                              |
| Cancel the event | published        | `POST /admin/global-events/:id/cancel` with `{ version }`, after a confirmation that names Users and Holders                                  |

Publish stays disabled, saying what is missing, until the form has a title, a start and a position. A published event
says that Users see a saved change at once. A cancelled or a discarded event is shown without the form.

After a change goes through the page is read again. A refusal leaves what the person typed in the form and says why: a
400 with the main server's message, `GLOBAL_EVENT_INCOMPLETE` as what is missing, `GLOBAL_EVENT_STATE` as the event's
state now, and `GLOBAL_EVENT_CHANGED` as a warning that another Administrator changed the event. The last two offer
"Load the current version", which reads the page again and replaces the input.

## Places

The Places page reads `GET /admin/places`, where each Place carries its origin and its outlines as stored, and hands
the list to `places/places-map.tsx`, a Client Component that takes the Places and the selected one and reports a click
on a Place. The map draws each outline once, also when several Places share it, a marker for each Place without an
outline, and each Place's number, or its name when it has none, at its position. Kakao's map type control switches to
the sky view. The search finds Places as `GET /places/search` does, the first 10 shown. The selected Place is
highlighted and the map moves to it; its record shows its number, name, origin, position and outlines, and for an
outline that other Places share, those Places, each of which can be selected. The stored outlines do not say which file
they came from, so the record does not either. The page shows the attributions that OpenStreetMap's licence and the
national map's 공공누리 type 1 ask for. Without the Kakao key the page says so in place of the map.

## Users and friendships

The Users page reads `GET /admin/users`; its search keeps the Users whose name, email, department or Friend ID holds
the text. A User's page reads the same list and `GET /admin/users/:id/friends`. "친구 맺기" offers the onboarded Users
who are neither the User nor their Friends, searchable in the same way, and choosing one sends
`POST /admin/friendships`. "친구 끊기" asks first, saying that Location Sharing between the two stops and that their
proposed Meetups are withdrawn, then sends `DELETE /admin/friendships/:userAId/:userBId`. Both are the Server Action
`changeFriendship` in `src/app/(signed-in)/users/[id]/actions.ts`. After a change, and after a refusal, the page says
what happened and reads the lists again; the refusals `ALREADY_FRIENDS`, `USER_NOT_ONBOARDED`, `USER_NOT_FOUND` and
`FRIEND_NOT_FOUND` each have their message. Nothing else about a User is read or changed.

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
  to, and replaces the main server with the fake in `__tests__/support/fake-main-server.ts`. Kakao's map is replaced by
  `__tests__/support/fake-maps.tsx`, which shows where its marker is and lets a test point on it, and the Places' map by
  `__tests__/support/fake-places-map.tsx`, which lists the Places it was handed as buttons that select them. The tests run without
  a Kakao key; a test of the map sets one with `vi.stubEnv`. `__tests__/support/google.ts`
  stands in for Google's script on the sign-in page. `notFound()` is replaced too, and `browser.notFound` tells a test
  that the page would show the not-found page. The tests run in `America/Los_Angeles`, so that a time shown in the
  browser's zone instead of Seoul's fails.
- **site** (`__tests__/site/*.test.ts`): builds the site once (`next build`, about 20 seconds) into `.next-test/`, with
  a test Google client ID, starts it with `next start` on a free port against a fake main server over HTTP, and checks
  what only the real server shows: the cookie's attributes, that the token is in no page, and that a Server Action
  posted from another origin is refused. The separate folder keeps the test build away from your own `.next/`.

## Folder layout

```text
src/app/sign-in/         the sign-in page, Google's button and the sign-in Server Action
src/app/(signed-in)/     the pages behind the session; layout.tsx and site-menu.tsx are the menu around them
src/app/(signed-in)/events/       the form's fields shared by both event pages (event-fields.tsx, fields.ts) and the map
src/app/(signed-in)/events/[id]/  the event's page, its form (event-form.tsx) and its Server Action
src/app/(signed-in)/events/new/   the page for a new event and its Server Action
src/app/(signed-in)/places/       the Places page and its map
src/app/(signed-in)/users/        the Users page, and in [id]/ a User's page with their friendships
src/app/(signed-in)/collection/   the Collection status page
src/app/globals.css      the palette, the font and the shared classes
src/main-server.ts       the only way the site calls the main server; server-only
src/session.ts           the cookie, and asAdministrator(), which sends the person to sign-in on a missing cookie or a 401
src/seoul-time.ts        times in Asia/Seoul
src/kakao-maps.ts        loads Kakao's JavaScript SDK in the browser, and the types of the parts the site uses
__tests__/               page tests, named *.test.tsx, and their support/
__tests__/site/          tests against the built site
```

Add a main server operation to `mainServer` in `src/main-server.ts`, and the same operation to the fake in
`__tests__/support/fake-main-server.ts`. A page calls it through `asAdministrator('<the page path>', (token) => ...)`.
