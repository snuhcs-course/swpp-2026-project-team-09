# main-server

The main SNU Now server. The other servers copy its layout, settings and checks.

## Run it

You need Node.js 24 and Docker. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The
commands below use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type
`npx pnpm@12.6.0` wherever this file says `pnpm`: npm fetches it into its cache without a global install.

First create your settings file in `main-server/`. The second command appends a new access token key pair of your own
to it; `.env` is never committed, so the private key stays on your laptop:

```bash
pnpm install
cp .env.example .env
pnpm keys:generate >> .env
```

`.env.example` already holds the team's Google client IDs in `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` (see
[Sign-in](#sign-in)). Replace the example address in `INITIAL_ADMINISTRATOR_EMAILS` with your own (see
[Administrators](#administrators)). Fill in `KAKAO_REST_API_KEY` with the REST API key that the Owner of the team's
Kakao app shares with you (see [Walking route](#walking-route)); the server does not start without it.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis and every server. The main server takes its settings from `main-server/.env`, brings its
database up to the current schema and loads the [seed](#seed-data) before it starts. `docker compose down` removes the
containers and keeps the database; `docker compose down -v` deletes it too.

While you work on the main server, start only the data stores in the repository root and run the server yourself in
`main-server/`:

```bash
docker compose up -d postgres redis
```

```bash
pnpm db:migrate
pnpm build
pnpm db:seed
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3000/health/live`: liveness, the process is up.
- `GET http://localhost:3000/health/ready`: readiness, the database and Redis can be reached. It answers 503 and names
  the store when one cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server also stops at startup when it cannot reach the database or Redis, and its log names the address it tried,
for example `Can't reach database server at localhost:5432`. It waits at most 5 seconds for the database to answer.
Start them first with `docker compose up -d postgres redis`.
Once the server is running, a store that goes down makes readiness answer 503 instead.

## Sign-in

The app signs in with Google and sends the ID token it gets to the main server:

- `POST /auth/google` with `{ "idToken": "..." }` answers
  `200 { "accessToken": "...", "refreshToken": "...", "onboarding": { ... } }`. The first sign-in of a Google account
  creates its User, with an empty name and department. `onboarding` tells the app where to go next (see
  [Onboarding and the lobby](#onboarding-and-the-lobby)).
- Only SNU accounts get in: the token's hosted domain claim must be `snu.ac.kr` and its email address verified. Another
  account gets 403. An invalid or expired ID token, or one issued to another client than the app's
  (`GOOGLE_APP_CLIENT_ID`), the admin site's included, gets 401.
- The access token is valid for 1 hour, and its audience is `snu-now-app`. It names the User (`sub`) and the session
  (`sid`). Send it as `Authorization: Bearer <accessToken>`. `GET /users/me` answers the signed-in User once they have finished onboarding. The refresh
  token is valid for 30 days, and only its hash is stored.
- A User has one session: the app signed in on one phone. A sign-in ends the session before it, on whatever phone. The
  ended session's refresh token gets 401, and its access tokens get 401 from the next request on, with
  `"code": "SESSION_REPLACED"` in the body, so that the app can tell the User that a sign-in on another phone signed
  them out.
- Once the access token has expired, `POST /auth/refresh` with `{ "refreshToken": "..." }` and no access token answers
  with new tokens of the same session, in the same form. The refresh token is used up: the answer holds a new one,
  valid for 30 days from the refresh. An unknown, expired or revoked refresh token gets 401.
- A used refresh token that comes back within 60 seconds of its use gets new tokens of the same session, so a refresh
  whose answer was lost, or two refreshes sent at the same moment, keep the User signed in. Later the server takes it
  for a stolen copy: it ends the session, and the app has to sign in again.
- `POST /auth/sign-out` with the access token answers 204. It ends the session and revokes its refresh tokens. The
  session's access tokens then get the plain 401, a second sign-out included, so the app takes a 401 to sign-out as
  done.
- Sessions are kept in the database, and every User's request reads its session, so an access token stops working as
  soon as its session ends. The main server then tells the socket server, which disconnects the session's connections.

`GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` are the OAuth client IDs of the app and the admin site; startup
stops when they are the same. They are not secrets. Access tokens are signed with ES256 and
`ACCESS_TOKEN_PRIVATE_KEY`. Another server that checks them is given only `ACCESS_TOKEN_PUBLIC_KEY`, never the private
key; the socket server is the first, in ticket 11. It accepts a User's access token only, disconnects the connections
of a session that ends, and closes each connection when its access token expires.

## Onboarding and the lobby

A new User's name and department start empty, and the app's onboarding screen asks for them. The app enters the
lobby, which gives it what it needs to run, after a sign-in or a start with stored tokens, and right after onboarding.

1. The sign-in's `onboarding` is `{ "completed": true }` once the User has finished onboarding. Until then it is
   `{ "completed": false, "suggestion": { "name": ..., "department": ... } }`, read from the Google account's name, which
   for an SNU account reads `홍길동 / 학생 / 컴퓨터공학부`. A part that cannot be read, or that the
   [profile's limits](#profile) refuse, is `null`. The onboarding screen starts from the suggestion.
2. Until then, every User route but two answers
   `403 { "code": "ONBOARDING_REQUIRED", "message": "Complete onboarding first.", "onboarding": { ... } }`, with the
   sign-in's `onboarding` read from the Google name of the last sign-in. So an app that restarts halfway gets onboarding
   back from its first request, the lobby's. `AccessTokenGuard` checks it on every request, in the query that reads the
   session. The two routes open before onboarding are marked `@AllowBeforeOnboarding()`: `POST /users/me/onboarding`
   and `POST /auth/sign-out`.
3. `POST /users/me/onboarding` with `{ "name": "...", "department": "...", "admissionYear": ..., "hashtags": [...] }`
   saves the profile and completes onboarding, and answers 204. The name and the department are required, and the
   profile's limits apply. The app sends it again when the answer was lost: a repeat saves the profile again.
4. `POST /lobby`, with no body, answers `200 { "profile": { ... } }`, the profile as `GET /users/me/profile` gives it.
   Later features add what the app needs when it starts.

A sign-in on another phone during onboarding ends the first phone's session as any sign-in does: its next request, the
onboarding's included, gets 401 with `"code": "SESSION_REPLACED"`, and the other phone goes through onboarding.

A Google name that is not three parts separated by `/` is logged as a warning with the User's id. The form is confirmed
on an undergraduate's account only.

## Profile

A User reads and edits their own profile. The routes name no User, so they never reach another User's profile.

- `GET /users/me/profile` answers `{ "name": ..., "department": ..., "admissionYear": ..., "hashtags": [...] }`. Like
  every User route but two, it needs the User to have finished onboarding.
- `PATCH /users/me/profile` with some of these fields changes only those and answers with the whole profile. `null`
  empties `admissionYear`, and `[]` empties `hashtags`. The name and the department cannot be emptied.
- A value outside these limits gets 400 with a message that starts with the field, and nothing changes. Spaces around
  text are dropped first. The limits are set in `src/users/dto/update-profile.dto.ts`, and onboarding follows the same
  ones.
  - `name`: 1 to 30 characters.
  - `department`: 1 to 50 characters. A double major is written out, such as `컴퓨터공학부, 경제학부`.
  - `admissionYear`: a whole number from 1946, when SNU was founded, to this year in Korea.
  - `hashtags`: at most 20. Each is kept without the `#` in front, in the case sent, and then has 1 to 30 characters
    without whitespace. None may appear twice, whatever the case.

## Administrators

An Administrator is not a User, even when the same person also uses the app. Administrators sign in to the admin site,
are kept in their own table and get access tokens of their own. They never appear among Users, and a User's access
token and an Administrator's are each refused where the other belongs.

Signing in and out:

- `POST /admin/auth/google` with `{ "idToken": "..." }` answers `200 { "accessToken": "..." }`. The ID token must be
  issued to the admin site's client (`GOOGLE_ADMIN_CLIENT_ID`); one issued to the app's gets 401. Any Google domain is
  accepted, but the email address must be verified and registered; otherwise 403. Signing in creates no User.
- The first sign-in binds the Google account to the registered address. After it the Administrator is recognised by the
  account, and another account with the same address gets 403.
- The access token has the audience `snu-now-admin`, the Administrator's id and no email address. It is valid for 8
  hours and comes without a refresh token: when it expires, the admin site sends the person through Sign in with Google
  again. There is no idle timeout; ticket 14 says why.
- `POST /admin/auth/sign-out` answers 204 and ends every access token issued to that Administrator so far, in every
  browser. A new sign-in works afterwards.

Registering and removing:

- When the server starts with no Administrator registered, as on a new database, it registers the addresses in
  `INITIAL_ADMINISTRATOR_EMAILS`. After that the setting registers nobody, but it must still hold valid addresses.
- `GET /admin/administrators` lists the Administrators as `{ id, email, signedIn }`, ordered by email address.
- `POST /admin/administrators` with `{ "email": "..." }` registers an address of any Google domain and answers 201 with
  the Administrator. Case is ignored. Registering an address that is already registered changes nothing and answers 201
  with the existing record.
- `DELETE /admin/administrators/:id` removes an Administrator, the caller included, and answers 204. An unknown id gets
  404 and an id that is not a UUID 400. Removing the last one gets 409, also when two Administrators remove each other
  at the same moment.

Mark an administrative route, or a whole controller, with `@AdministratorOnly()` from
`src/common/administrator-only.decorator.ts`, and put its path under `/admin`:

```ts
@AdministratorOnly()
@Controller('admin/events')
export class AdminEventsController {
```

- It needs an Administrator's access token in `Authorization: Bearer <accessToken>`. A request without one, or with a
  User's access token or a Google ID token, gets 401.
- Every request reads the Administrator, so a removed Administrator, or a token issued before their last sign-out, gets
  401 at once.
- A handler reads the signed-in Administrator with `@CurrentAdministrator() administrator: SignedInAdministrator`, as
  `src/auth/administrator-auth.controller.ts` does.
- In a test, `signInAsAdministrator(app)` from `test/sign-in.ts` signs in as `admin@example.com`, the initial
  Administrator of the test settings, and `signInAsNewAdministrator(app)` registers a new one and signs in as them. The
  test files share one database, so sign out or remove only a new one.

## Menus

The worker server collects the menus of three Sources, the Co-op's, the dormitory's and the veterinary college's page,
for today and the six days after, and sends them as `menus-collected` (see
[Messages from the worker server](#messages-from-the-worker-server)). The app reads them:

- `GET /menus?date=2026-10-01` with a User's access token answers the menus of that day, a calendar day in
  Asia/Seoul, as a list of restaurants in the Korean order of their names:

  ```json
  [
    {
      "name": "두레미담",
      "collectedAt": "2026-09-30T20:00:00.000Z",
      "meals": [
        {
          "meal": "lunch",
          "lines": [
            { "text": "<셀프코너> 7,000원", "kind": "heading", "name": null, "price": 7000 },
            { "text": "잡곡밥", "kind": null, "name": null, "price": null },
            { "text": "고등어 소금구이  : 14,000원", "kind": "dish", "name": "고등어 소금구이", "price": 14000 },
            { "text": "※운영시간 : 11:00~14:00", "kind": "note", "name": null, "price": null }
          ]
        }
      ]
    }
  ]
  ```

- A meal is the lines of its cell on the page, in the page's order
  ([ADR 0001](../docs/adr/0001-menus-kept-as-lines.md)). `meals` holds the meals that have lines, in the order
  breakfast, lunch, dinner, and a restaurant the page lists with empty cells is served with `meals: []`. `collectedAt`
  is the time of the Collection that stored the restaurant's menus for the day.
- `text` is the line as the page wrote it, prices and markers such as `(#)` (no meat) included. The worker sets the
  rest only when it is sure, and leaves it `null` otherwise:
  - `kind`: `heading` for a corner or section, `dish`, or `note` for hours, notices and closures such as
    `개천절 휴무`. There is no operating hours field: hours are note lines of the meal.
  - `name`: a dish's text without its price, when the line ends with that price.
  - `price`: in won, when the line gives exactly one price. `9,900원 / 12,400원`, or a price with a typo, stays in
    `text` alone.
- The app shows a line that has a `name` and a `price` as a row with both, and every other line as its `text`, styled
  by `kind` where there is one. A line the worker could not read is still shown.
- A day with nothing stored answers `[]`. A `date` that is not a calendar day gets 400.

For each day a `menus-collected` message carries, it replaces everything its Source had stored for that day. So the
same message twice leaves one set of records, and a restaurant the page dropped or renamed does not linger. The
Source's other days and the other Sources' restaurants stay as they are. A failed Collection changes no menu, so the app
keeps getting the last menus collected.

- A collector therefore sends every restaurant its page lists for a day, one listed with empty cells with `lines: []`,
  and a day on which the page lists none with `restaurants: []`.
- A restaurant is known by its name. The same name sent by two Sources for one day is served twice, so each
  restaurant is collected from one Source.

The worker server's README says how each line is read and how to run a Collection by hand. What the collectors sent
on the real pages is recorded in `.scratch/iteration-1/P07-campus-feeds/issues/01-menus-first-collection.md`.

## Walking route

The app asks for a walking route between two points and draws its line. The main server asks Kakao's walking route API
(`.scratch/research/external-sources.md` §7.4) for it:

- `GET /walking-route?startLatitude=37.4664&startLongitude=126.9486&endLatitude=37.4592&endLongitude=126.9524` with a
  User's access token answers Kakao's walk from the start to the end:

  ```json
  {
    "status": "OK",
    "route": {
      "line": [
        { "latitude": 37.46632762, "longitude": 126.94829436 },
        { "latitude": 37.46608837, "longitude": 126.94838354 }
      ],
      "distance": 1105,
      "duration": 1216
    }
  }
  ```

  `line` holds the points of Kakao's line in order, `distance` is in metres and `duration` in seconds. Kakao begins and
  ends the line on the path nearest to each point: in the walk above, both ends lie about 30 m from the points asked
  for.

- When Kakao finds no route, the answer is still 200, with Kakao's status and no route, so that the app says so instead
  of drawing a wrong line:

  ```json
  { "status": "SAME_POINT", "route": null }
  ```

  Kakao's statuses for no route are `SAME_POINT`, `START_LINK_NOT_FOUND`, `END_LINK_NOT_FOUND`,
  `TOO_MANY_SEARCH_LINK`, `TOO_FAR_AWAY` and `ROUTE_RESULT_NOT_FOUND`.

- Any other answer, such as a quota or key error, or no answer at all, gets 502
  `{ "statusCode": 502, "error": "Bad Gateway", "message": "Kakao's walking route API failed" }`. The server logs what
  Kakao answered as a warning.
- A coordinate that is missing, is not a decimal number, or lies outside -90 to 90 for a latitude or -180 to 180 for a
  longitude gets 400 with a message that starts with the field, and Kakao is not asked.

A route is never stored or cached, because Kakao's operating policy does not allow it. Every request asks Kakao once,
and the answer carries `Cache-Control: no-store`, so that no HTTP cache, the app's included, keeps it. Nothing else
calls Kakao. The team's Kakao app has a free quota of 1,000 routes a day, and a call beyond it fails (§7.5), so the app
asks for a route when the User does, never on every position.

The REST API key is `KAKAO_REST_API_KEY`, a secret that stays on the main server: it goes to Kakao in the
`Authorization` header and nowhere else. Should an error of Kakao's quote it, the log shows the setting's name in its
place. The server stops at startup and names the setting when it is missing or empty.

In a test, give `startApp` a `KakaoStub` from `test/walking-route.ts` in place of the HTTP call to Kakao, and give the
stub the answer to send back:

```ts
const kakao = new KakaoStub();
const app = await startApp(inject('settings'), [], kakao.fetch);
kakao.answers(savedAnswer('kakao-walk-main-gate-to-central-library-2026-10-02'));
```

Without a stub, every call to Kakao fails. `test/answers/` holds Kakao's answers to two real calls, each made once on
2026-10-02, from the main gate to the central library and from the main gate to itself. What they answered is recorded
in `.scratch/iteration-1/P07-campus-feeds/issues/05-walking-route-through-kakao.md`.

## Buildings

The campus buildings and places are [seed data](#seed-data), not collected. A User's app lists and searches them, so
that the User picks a place without typing coordinates:

- `GET /buildings` with a User's access token answers every building and place inside the
  [Campus Boundary](#campus-boundary), 225 of them:

  ```json
  [
    { "id": "4f6c…", "number": "1", "name": "인문관1", "latitude": 37.46027, "longitude": 126.95234 },
    { "id": "9a01…", "number": null, "name": "자하연", "latitude": 37.4607006780578, "longitude": 126.952103365166 }
  ]
  ```

  The numbered buildings come first, by number (`25`, `25-1`, `26`), then the places without one, such as `자하연`, in
  the Korean order of their names. `id` is the building's own identifier. It never changes, so a timetable entry or a
  Meetup can point at it.

- `GET /buildings/search?q=공학관` answers, in the same order and form, the buildings whose name holds `q`, whatever
  the case of its Latin letters, and the building whose number is `q`, written with or without `동` (`302`, `302동`).
  A search that finds nothing answers `[]`, and `q` without text gets 400.
- A name is the campus map's, except a name the map wraps, such as `관악 223동[우석경제관]`, which is stored as
  `우석경제관`. Several buildings share a name, such as the seven `(관악사)학부 생활관`.

## Campus Boundary

The Campus Boundary is a file of the main server, `seed/campus-boundary.geojson`: OpenStreetMap's relation 11917142
as one polygon. The server reads it once, when it starts, and never stores it in the database. A feature injects
`CampusBoundary` from `src/common/campus-boundary.ts`, which `CampusBoundaryModule` gives to every feature, and checks
a position without a database query:

```ts
constructor(private readonly campusBoundary: CampusBoundary) {}

if (!this.campusBoundary.contains({ latitude, longitude })) {
  // Off campus.
}
```

`outline` holds the polygon's positions. The outline leaves out a wedge in the north-east, with the faculty housing,
the president's residence and the dormitory buildings 915 to 917, and four facilities on the hillside in the south: a
position there is outside.

## Seed data

Seed data comes from outside the project once, rather than by Collection: a file in `seed/` that one command loads
into the database.

| File                           | What it holds                                                                    | Exported from                                                |
| ------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `campus-boundary.geojson`      | The Campus Boundary, read by the server and not loaded                           | An Overpass query for relation 11917142                      |
| `campus-map-buildings.json`    | The campus map's 250 rows, as it serves them                                     | `https://map.snu.ac.kr/api/building.action?page=1&rows=1000` |
| `openstreetmap-buildings.json` | 71-1동 and 901동, which the campus map does not list, with OpenStreetMap's names | An Overpass query for the two names                          |

- **Origin**: each file keeps the address or Overpass query it came from (`exportedFrom`, `query`) and the day of the
  export (`exportedOn`), in `properties` in the GeoJSON file. All three were exported on 2026-10-02.
- **Exporting**: `pnpm seed:export campus-map-buildings` repeats the export of the files it names and overwrites them.
  Each export is one request, sent with the worker's User-Agent, which names the project as OpenStreetMap asks.
  Overpass asks for one query at a time; when it answers 504, it is busy, so wait some minutes before trying again.
  - The boundary's four outer ways are joined into one ring. The two OpenStreetMap buildings are placed at the centre
    of their outline's bounding box, as Overpass gives it, and carry the numbers their names give, from a table in
    `scripts/export-seed.ts`.
- **Loading**: `pnpm db:seed` loads the files into the database at `DATABASE_URL`. It runs the built code, so run
  `pnpm build` first. In Compose the main server runs it before it starts.
  - Loaded are the entries of both building files that lie inside the Campus Boundary, except the map's `Test` row:
    215 numbered buildings and 8 places of the map, and the 2 from OpenStreetMap. To list a building outside the
    Boundary, the Boundary is widened first.
  - Each entry keeps its source's identifier, the map's `inst_seq` or OpenStreetMap's `way/…`, and the source:
    `campus_map` or `openstreetmap`. Loading again updates each entry in place by that identifier, so its `id` and
    whatever points at it stay, and running the command twice leaves one set of records. An entry that has left the
    files stays in the database.
- **Correcting**: change the entry in its file, such as a name in `inst_kor_nm`, and load again. The next export
  overwrites the correction.
- **Coordinates** come from the campus map and OpenStreetMap only, never from Kakao, Naver or Google maps, whose terms
  forbid storing their data. The campus map is drawn on a Kakao map, but its buildings' coordinates are the
  university's own.
- **Licences**: OpenStreetMap's data is under the ODbL, and the two files made from it carry its notice
  (`copyright`). The app shows OpenStreetMap's attribution (P15); `.scratch/research/external-sources.md` §6.1 says
  where the attribution guidelines ask for it. The campus map publishes no terms of use and no licence (§6.2).
- **In a test**: the global setup loads the seed into the test database, so every test file has the buildings. A test
  that changes the seed loads it into a database of its own, with `loadSeed(prisma, directory)` from
  `src/load-seed.ts`, as `test/seed.e2e-spec.ts` does.
- **A new seed** adds its export to `scripts/export-seed.ts` when a request gives the file, its model with the source's
  identifier as a unique key, and its loading to `loadSeed()`.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

`pnpm test` needs Docker running. It starts its own PostgreSQL and Redis containers and removes them afterwards. The
test files run in parallel, except `test/redis-idempotency-store.e2e-spec.ts`: it waits for Redis to expire records in
real time, so it runs alone after the others.

## Folder layout

```text
prisma/
├── schema.prisma                    database schema
└── migrations/                      every schema change, applied in order
seed/                                the seed files, each with where it came from
src/
├── main.ts                          starts the server and connects it to messaging
├── seed.ts                          the command that loads the seed files, `pnpm db:seed`
├── load-seed.ts                     loads every seed file; the command and the tests call it
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── seed-directory.ts            where the seed files are
│   ├── campus-boundary.ts           the Campus Boundary, read from its seed file
│   ├── campus-boundary.module.ts    makes the Campus Boundary available to every feature
│   ├── prisma.module.ts             makes PrismaService available to every feature
│   ├── prisma.service.ts            the main database
│   ├── messaging.module.ts          makes the messaging client available to every feature
│   ├── messaging.ts                 options for NestJS messaging over Redis
│   ├── redis.module.ts              makes a Redis client available to every feature
│   ├── redis-idempotency.store.ts   keeps the results of requests safe to repeat in Redis
│   ├── worker-message.decorator.ts  @WorkerMessage(): checks a message from the worker server against its schema
│   ├── route-access.ts              who may call a route: anyone, a User or an Administrator
│   ├── public.decorator.ts          @Public(): opens a route to requests without an access token
│   ├── allow-before-onboarding.decorator.ts  @AllowBeforeOnboarding(): opens a User's route before onboarding
│   ├── administrator-only.decorator.ts  @AdministratorOnly(): gives a route to Administrators
│   ├── current-user.decorator.ts    @CurrentUser(): the signed-in User in a handler
│   └── current-administrator.decorator.ts  @CurrentAdministrator(): the signed-in Administrator
├── generated/                       Prisma Client, generated by `pnpm install` (not committed)
├── health/                          a feature: the liveness and readiness checks
├── auth/                            a feature: app and admin site sign-in, refresh, sign-out, the access token checks
├── users/                           a feature: the signed-in User, their profile and onboarding
├── lobby/                           a feature: what the app needs when it starts
├── administrators/                  a feature: the Administrators, who register and remove each other
├── collection/                      a feature: each Source's Collection status, and the worker's failure messages
├── menus/                           a feature: the menus the worker collects, stored and served by day
├── walking-route/                   a feature: a walking route between two points, asked of Kakao on each request
└── buildings/                       a feature: the campus buildings and places of the seed, listed and searched
scripts/                             commands run by hand, such as `pnpm keys:generate` and `pnpm seed:export`
test/                                tests, run against PostgreSQL and Redis in containers
```

## Database

The main server keeps its records in its own database, `main`, under its own role, `main`. That role cannot reach the
match server's database.

To change the schema, with the data stores running and `.env` in place:

1. Edit `prisma/schema.prisma`.
2. Record the change as a migration and apply it to your database. Name it after what it does:

   ```bash
   pnpm exec prisma migrate dev --name add-parties
   ```

3. Regenerate Prisma Client, so that the code sees the new schema:

   ```bash
   pnpm exec prisma generate
   ```

4. Commit `schema.prisma` and the new folder in `prisma/migrations/` together.

`pnpm db:migrate` brings any database up to the current schema by applying the migrations it has not seen yet.

Prisma is pinned at 7.10.0. Ignore the message that suggests updating to Prisma 8.

## Adding a feature module

The steps add a feature named `party`. Use a short lowercase name, with dashes between words (`global-event`).

1. Create the module. It lands in `src/party/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module party
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `PartyModule`. `--no-spec` skips unit test files, because this project tests through HTTP (step 8):

   ```bash
   pnpm exec nest g controller party --no-spec
   pnpm exec nest g service party --no-spec
   ```

3. Every route is exactly one of three kinds. Unmarked, it is a User's: it needs a User's access token, and a request
   without one gets 401. Mark a route, or a whole controller, with `@Public()` to open it to anyone, or with
   `@AdministratorOnly()` to give it to [Administrators](#administrators). A marking on a handler replaces its
   controller's, so mark a handler with one of them at most. A User's route also needs the User to have finished
   [onboarding](#onboarding-and-the-lobby); mark it `@AllowBeforeOnboarding()` only when onboarding itself needs it.
   A handler reads the signed-in User with `@CurrentUser() user: SignedInUser`, as `src/users/users.controller.ts`
   does.
4. Put request and response shapes in `src/party/dto/`. Describe a request body as a zod schema and give it to the
   decorator, as `src/auth/dto/sign-in.dto.ts` and `AuthController` do: `@Body({ schema: signInSchema })`. A body that
   does not match gets 400 with a message naming the field. A stored record is a model in `prisma/schema.prisma`
   (step 5), and the code uses the type that Prisma Client generates for it:
   `import { Party } from '../generated/prisma/client.js'`. That type exists only at compile time, so add a class to
   `src/party/entities/` only when a record is needed as a class, for example to put decorators on its fields:
   `class PartyEntity implements Party`. Everything else that belongs to the feature stays inside `src/party/`.
5. If the feature stores records, add its models to `prisma/schema.prisma` and record a migration (see
   [Database](#database)). Read and write them by injecting `PrismaService`. Every record is identified by a UUID v4
   generated by the database:

   ```prisma
   id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   ```

6. If another feature needs `PartyService`, add it to `exports` in `PartyModule` and add `PartyModule` to the
   other module's `imports`. Code shared by two or more features goes in `src/common/`.
7. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env` and to the settings in `test/global-setup.ts`. Compose passes `.env` to the server. Add the setting to the
   `main-server` service's `environment` in `compose.yaml` only when it needs another value inside Compose, as the
   database and Redis addresses do. Read it by injecting `ConfigService<Settings, true>` and calling
   `get('NAME', { infer: true })`.
8. Write `test/party.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes
   with `supertest`, as `test/health.e2e-spec.ts` does. `signIn` from `test/sign-in.ts` signs in a new User,
   completes onboarding and returns the tokens, `signInBeforeOnboarding` stops before onboarding, and
   `signInAsAdministrator` signs in an Administrator. oxlint's `max-lines` (300) and
   `max-lines-per-function` (50) apply to tests too: split a long file by route, as `test/refresh.e2e-spec.ts` and
   `test/sign-out.e2e-spec.ts` split the auth tests, and a long `describe` into several.
9. Run `pnpm format`, then the four checks.

Import classes with a plain `import { PartyService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it. An interface in a handler's parameters is the exception: TypeScript requires
`import { CurrentUser, type SignedInUser } from ...`.

## Making a handler safe to repeat

A phone sends a request again when the response was lost. Mark a handler that creates something a User would notice
twice with `@Idempotent()` from `@nestjs/idempotency`
([documentation](https://docs.nestjs.com/reliability/idempotency)):

```ts
@Post()
@Idempotent({ required: true })
create(@Body({ schema: createPartySchema }) body: CreatePartyDto, @CurrentUser() user: SignedInUser) {
```

- The app creates a key, such as a UUID, when the User acts, and sends it in the `Idempotency-Key` header with every
  retry of that action. With `required: true`, a request without one gets 400 `IDEMPOTENCY_KEY_REQUIRED`.
- The handler runs once for each key and each User or Administrator. For 24 hours, a repeat gets the stored status and
  body with `Idempotent-Replayed: true`. A repeat while the first request is still running gets 409
  `IDEMPOTENCY_KEY_IN_USE` with `Retry-After`, and the same key with another body or address gets 422
  `IDEMPOTENCY_KEY_REUSED`.
- A server error (5xx) is not stored, so the same key can be tried again. A 4xx answer is stored like a success.
- Keys are kept apart by the signed-in User or Administrator, so do not mark a `@Public()` route: without one, every
  caller would share one set of keys.
- The key removes repeats of one attempt. Keep the feature's own rules, such as one Party for each User: two taps
  send two keys.
- Register a global interceptor (`APP_INTERCEPTOR`) in the feature's module, which `AppModule` imports after
  `IdempotencyModule`, never in `AppModule`'s providers, so that the idempotency interceptor runs outside it.
- In a test, send the key with `.set('Idempotency-Key', randomUUID())`, as `test/idempotency.e2e-spec.ts` does.

The results are kept in Redis by `src/common/redis-idempotency.store.ts`.

## Messages from the worker server

The worker server only collects. It hands what a Collection read to the main server over messaging
(`src/common/messaging.ts`), and the main server checks it, stores it and answers. Every message from the worker
follows these rules.

- **Name and shape**: a request-and-response message, handled with `@MessagePattern()` in the feature's controller. It
  is named in kebab case after what happened: `menus-collected` for what a Collection of a menu Source read, and
  `collection-failed`. The payload is a JSON object. It names its `source`, a value of `Source` in
  `prisma/schema.prisma`, and the time of the Collection in ISO 8601 with an offset (`collectedAt`, `failedAt`). A day
  is `YYYY-MM-DD`, a calendar day in Asia/Seoul. A field without a value is `null`, not left out.
- **Validation**: the handler takes the payload with `@WorkerMessage(schema)` from `src/common/worker-message.decorator.ts`,
  and
  the schema is zod in the feature's `dto/`, such as `src/menus/dto/menus-collected.dto.ts`. Use `z.strictObject`, so
  that a misspelt field is refused instead of dropped. `main.ts` connects messaging without `inheritAppConfig`, so no
  global guard, pipe or interceptor reaches a message handler: it needs no access token, and `@WorkerMessage` checks
  the payload in place of the global pipe.
- **Answers**: a handled message answers `{ "status": "ok" }` (`HANDLED`). A message that does not match its schema is
  refused before the handler runs, and nothing from it is stored, the Collection status included. The answer names each
  problem as the HTTP routes do, separated by `; `:

  ```json
  {
    "status": "error",
    "message": "days.0.restaurants.1.lines.0.kind: Invalid option: expected one of \"heading\"|\"dish\"|\"note\"; days.0.restaurants.1: Unrecognized key: \"hours\""
  }
  ```

  An error inside a handler is logged and answers Nest's `{ "status": "error", "message": "Internal server error" }`.
  The worker's `send()` fails with the answer in both cases, and the worker reports either as a failed Collection.

- **Repeats and order**: the same message sent twice leaves the records one would. Each feature states how, as
  [Menus](#menus) does. A Source's messages are stored in the order they arrive, not by their times.
- **Collection status**: `collection_statuses` keeps, for each Source, the time of its last successful Collection
  (`lastSucceededAt`) and, apart from it, its last failure (`lastFailedAt`, `lastFailureReason`). A handler that stores
  what a Collection read calls `CollectionService.recordSuccess(tx, source, collectedAt)` in the same transaction. A
  Collection that fails sends `collection-failed` with `{ "source", "failedAt", "reason" }`, where `reason` says what
  went wrong. It records the failure and leaves every stored record as it is. A success leaves the last failure in
  place, so the two times tell whether the Source has worked since. No route serves the status yet; P12 shows it.
- **A new Source** adds its value to `Source` with a migration. `menusCollectedSchema` lists the Sources that send
  menus, so a Source of another kind is refused there.

In a test, `startWithWorker()` from `test/worker.ts` starts the server with a client that sends as the worker does, as
`test/menus.e2e-spec.ts` does:

```ts
const harness = await startWithWorker();
await sendAsWorker(harness.worker, 'menus-collected', message); // resolves with the answer
expect(await refusal(harness.worker, 'menus-collected', invalid)).toContain('days.0.date: ');
await harness.close(); // in afterAll
```

- `startWithWorker()` starts a Redis of its own for the file. Every test file's server listens on the shared test Redis,
  and each of them would store and answer a message.
- The database is the shared one, so each test stores data of its own. The menus tests take their days from `daysOf()`
  in `test/menus.ts`, a month for each file and a day for each test. A Source's Collection status is one row, so only
  one file checks the status of a Source: `test/collection.e2e-spec.ts` the dormitory's, `test/menus.e2e-spec.ts` the
  Co-op's.
