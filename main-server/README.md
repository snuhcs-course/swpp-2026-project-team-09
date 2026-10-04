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

The worker server sends what it collects with a secret that the two servers share. Generate one and put the same
line in `worker-server/.env`:

```bash
echo "WORKER_TOKEN=$(openssl rand -hex 32)" >> .env
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

## Global Events

A Global Event is an Event published to every User. The worker server collects them from the university's events list
and posts them to `/global-events/collected` (see
[Requests from the worker server](#requests-from-the-worker-server)). P12 adds the Administrator's routes, which edit,
publish, cancel, discard and create them, and the User's list of published events. Until then no route serves them.

A Global Event, model `GlobalEvent` in `prisma/schema.prisma`, holds:

- `title` and `description`. A collected event's description is the post's body as text, one line of the page per
  line.
- `startsAt` and `endsAt`, both optional, because a Draft may have neither. A day read without a time of day is stored
  at 00:00 Asia/Seoul.
- `place`, the place as text, and its position, `latitude` and `longitude`. All three are optional.
- `state`, one of four:
  - `draft`: not shown to Users. A collected event that could not be read fully, or one an Administrator is writing. An
    Administrator publishes it or discards it.
  - `published`: shown to Users. A published event has a title, a start and a position.
  - `cancelled`: an event an Administrator called off after it was published.
  - `discarded`: an event that should not be shown, such as a post that is not an event. It stays stored, so that the
    next Collection does not bring its post back.
- `version`, which starts at 1, for P12's edit check, which refuses an edit made from an older version.
- For a collected event, `postNumber`, the post's `bbsidx`, which identifies the post, and `sourceUrl`, the post's
  address. An event an Administrator creates has neither.

The worker sends each post of the events list as one event, all those of a Collection in one message:

```json
{
  "source": "snu_events",
  "collectedAt": "2026-10-02T06:00:00+09:00",
  "failureReason": null,
  "events": [
    {
      "postNumber": 176525,
      "sourceUrl": "https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525",
      "title": "[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내",
      "description": "안녕하세요.\n…\n- 일시: 2026. 10. 13.(화) 17:00\n- 장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)\n…",
      "start": "2026-10-13T17:00:00+09:00",
      "end": null,
      "readFrom": "body",
      "place": "뉴미디어통신공동연구소 이충웅홀(132동 103호)"
    }
  ]
}
```

- `events` holds the posts the main server did not store when the worker asked, and is `[]` when there are none.
- `failureReason` says why the Collection stopped early: at a page it could not fetch, at the firewall's block page,
  at the third post in a row whose page was not the post, or with no post read. It is `null` when the Collection went
  through the whole list. A Collection that stopped hands over the posts it read all the same, and the main server stores them and
  records the reason as the Collection's failure in the same transaction, so that `lastSucceededAt` stays the time of
  the last Collection that went through the whole list.
- `start` and `end` are each a time with its offset, or a day when no time of day was read. `readFrom` says where they
  were read: `body` for the body's time line, `header` for the header's date. All three are `null` when no day was
  read.
- `place` is the body's place line as the post writes it, or `null`.
- A post whose page the worker could not read as the post comes with its title from the list, an empty `description`
  and no time or place, so it is stored as a Draft. An Administrator reads it at its `sourceUrl`.

The rules read one start and one end per post, so a post that describes several sessions, such as a lecture series, is
one event, which an Administrator splits.

A collected event is published, with no person involved, when the rules read both its time and its place:

- its start comes from the body's time line (`readFrom` is `body`) and has a time of day. A start read from the header's
  date does not count, because that date is often the application period;
- its place names exactly one Place of the [list](#places). Its position is that Place's coordinates.

Any other collected event is stored as a Draft with whatever was read: an event online or off campus, one whose place
names no Place or several, and a post that is not an event, which mostly writes no such time and place. A rule that
is not sure makes a Draft.

A Draft may already hold a start and a position, so P12's check before an Administrator publishes one cannot rest on
those fields being filled:

- its start may be the header's date, which is often the application period, and a day read without a time of day is
  stored at 00:00;
- its position is set whenever its place named exactly one Place, even when its time was not read.

A place names a Place, in `src/global-events/named-place.ts`, only when all that it writes is that Place. A wrong
position is published to every User, while a Draft only waits for an Administrator, so whatever the rules cannot
account for makes a Draft:

- A Place is written by number, as in `302동 105호`, `학생회관(63동)` or `71-1동`, but not a number inside a word, as
  in the address `역삼1동`. Or by name, as a whole word, with or without the name's own spaces or a `·` between its
  words, and whatever the case of its Latin letters: `국립중앙박물관` does not name 박물관, nor `행정관리팀` 행정관. A
  name inside a longer one that the place also names does not count, so `서울대 유전공학연구소 신관` is 105-2동 and not also
  105동. A name without a letter, such as OpenStreetMap's `901`, is matched by number only. The university's name
  written onto a name, as in `서울대학교미술관`, is taken apart.
- Neither a number nor a name alone shows that the place is on this campus: another university has its 체육관, and a
  government complex its 1동. A number counts when the place also writes `서울대`, `관악캠퍼스`, `SNU` or
  `Seoul National University`, or a name of that Place beside it, as in `뉴미디어통신공동연구소 이충웅홀(132동 103호)`. A name counts only with the
  university's.
- A number decides the Place, and a name beside it has to agree: one of the Places the name names, its series
  included, has the same number before the hyphen. `(관악사)학부 생활관 919동` is 919동 only, `국제대학원(140-2동)`
  140-2동, and `302동 학생회관` names none.
- A name that another Place's name continues with a number names that whole series: `국제대학원` alone is 140동 or
  국제대학원2, 140-1동, so it names none.
- The place is cut where it lists several or writes a route, at `,` `，` `、` `/` `&` `·` `ㆍ` `;` `및` `또는` `→` `⇒`
  `->`, but not inside a name, as in `데이터사이언스대학원 및 공과대학 강의동 1`. Every part has to name the same Place, apart from a part that is online
  (`Zoom`, `온라인`, `비대면` and the like) or only a room or a floor. So `서울대학교 103동 444호 & Zoom` is 103동, while
  `종합운동장, 보조운동장`, `301동 및 302동` and `302동 및 999동` name none.
- A place elsewhere names none: on another of the university's campuses, at its hospitals or at its schools (`연건`,
  `시흥`, `평창`, `수원`, `의과대학`, `간호대학`, `서울대학교병원`, `부설` and the like), at the stations named after it, at
  another university, at an address in another district or region, or in a flat. The list is Gwanak's.

No Collection changes a stored event, whatever its state. A post is stored once, by its post number, and a later
message carrying it again leaves it exactly as it is. So an Administrator's edits stay, and a discarded post does not
come back. The worker asks which posts are stored before it reads any (`/global-events/stored-posts`), so it does not read a
stored post again: an edit or a deletion at the Source after that is not seen.

What the rules read from a post, and how, is in the worker server's README. In a test, `collectedEvent()`,
`eventsMessage()` and `postNumbersFrom()` in `test/global-events.ts` build what the worker sends, as
`test/global-events.e2e-spec.ts` does. No route serves Global Events yet, so the tests read them with a database
connection of their own.

## Menus

The worker server collects the menus of three Sources, the Co-op's, the dormitory's and the veterinary college's page,
for today and the six days after, and posts them to `/menus/collected` (see
[Requests from the worker server](#requests-from-the-worker-server)). The app reads them:

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

For each day a message to `/menus/collected` carries, it replaces everything its Source had stored for that day. So the
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

- Any other answer, such as a quota or key error, or no answer within 5 seconds, gets 502
  `{ "statusCode": 502, "error": "Bad Gateway", "message": "Kakao's walking route API failed." }`. The server logs a
  warning with Kakao's HTTP status and Kakao's own `status` or error `code`, such as
  `Kakao's walking route API failed: HTTP 429 {"code":-10}`, or why Kakao gave no answer. The log never holds a route
  or the points asked for.
- A coordinate that is missing, is not a decimal number, or lies outside -90 to 90 for a latitude or -180 to 180 for a
  longitude gets 400 with a message that starts with the field, and Kakao is not asked.

A route is never stored or cached, because Kakao's operating policy does not allow it. Every request asks Kakao once,
and the answer carries `Cache-Control: no-store`, so that no HTTP cache, the app's included, keeps it. Nothing else
calls Kakao. The team's Kakao app has a free quota of 1,000 routes a day, and a call beyond it fails (§7.5), so the app
asks for a route when the User does, never on every position.

The REST API key is `KAKAO_REST_API_KEY`, a secret that stays on the main server: it goes to Kakao in the
`Authorization` header and nowhere else. The server stops at startup and names the setting when it is missing or empty.

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

## Places

A Place is a building of the campus or a spot without a number, such as `종합운동장`. The Places are
[seed data](#seed-data), not collected. A User's app lists and searches them, so that the User picks a place without
typing coordinates:

- `GET /places` with a User's access token answers every Place inside the [Campus Boundary](#campus-boundary):

  ```json
  [
    { "id": "4f6c…", "number": "1", "name": "인문관1", "latitude": 37.46027, "longitude": 126.95234 },
    { "id": "9a01…", "number": null, "name": "자하연", "latitude": 37.4607006780578, "longitude": 126.952103365166 }
  ]
  ```

  The Places with a number come first, by number (`25`, `25-1`, `26`), then those without one, such as `자하연`, in the
  Korean order of their names. `id` is the same in every database and never changes, so a timetable entry or a Meetup
  can point at it (`docs/adr/0002-place-ids-computed-from-the-source.md`).

- `GET /places/search?q=공학관` answers, in the same order and form, the Places whose name holds `q`, whatever the
  case of its Latin letters, and the Place whose number is `q`, written with or without `동` (`302`, `302동`). A search
  that finds nothing answers `[]`, and `q` without text gets 400.
- A name is the campus map's, except a name the map wraps, such as `관악 223동[우석경제관]`, which is stored as
  `우석경제관`. Several Places share a name.

A Place also keeps its outlines, the drawings of its walls or of the edge of a field (see [Seed data](#seed-data)).
The routes above do not serve them. They let the server say which Place a position is in, without a database query: a
feature injects `PlaceLookup` from `src/places/place-lookup.ts`, which `PlacesModule` exports, and asks it for a
position.

```ts
constructor(private readonly placeLookup: PlaceLookup) {}

const found = this.placeLookup.at({ latitude, longitude });
// { place: { id, number: '301', name: '제1공학관', latitude, longitude }, relation: 'inside' }, or null
```

- The answer is the nearest Place. A Place is as far as the edge of its nearest outline, and at no distance when an
  outline holds the position; a Place without an outline is as far as its own position.
- `relation` is `inside` when an outline holds the position or its edge is within 5 m, since a phone inside a building
  is often placed just outside its walls, and `near` up to 20 m. Farther than 20 m from everything, the answer is
  `null`. A Place without an outline can only be `near`.
- Where the outlines of two Places hold the position, the earlier of the list is the answer: in the stand of
  `종합운동장` that is `종합운동장본부석` (149동).
- It does not check the [Campus Boundary](#campus-boundary): a feature that hides a User outside it checks that first.
- The Places are read once, when the server starts, after the seed was loaded.

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

A position up to 10 m outside the polygon counts as inside, because a phone reports its position some metres off; the
file itself is OpenStreetMap's outline, unchanged. Every check goes through `contains()`, so the one rule holds for a
User's position and for the list of Places alike.

`outline` holds the polygon's positions. The outline leaves out a wedge in the north-east, with the faculty housing,
the president's residence and the dormitory buildings 915 to 917, and four facilities on the hillside in the south: a
position there is outside.

## Shuttle

The circular shuttle, the operator's route 41946, runs anticlockwise around the campus. Its stops and its line are
[seed data](#seed-data). The worker server collects the operator's route page once a day and its vehicle positions
every 15 seconds while the shuttle runs (`.scratch/research/external-sources.md` §5), and sends them as
`POST /shuttle/stops/collected` and `POST /shuttle/vehicles/collected`. The app reads them with a User's access token:

- `GET /shuttle` answers the route:

  ```json
  {
    "serviceHours": "· 운행시간 안내(주말,공휴일,개교기념일 미운행)\n-  학기 8:00~21:00 / 계절학기, 방학 8:00~18:00\n※ 학기 8:00~19:00 (5~7분), 19:00~21:00 (20분 간격)\n※ 계절학기 5~7분 간격 / 방학 10분 간격",
    "stops": [
      { "id": "1b2c…", "name": "정문", "latitude": 37.4656884925184, "longitude": 126.948449058974 },
      { "id": "7d8e…", "name": "법과대", "latitude": 37.4627402015981, "longitude": 126.949069941419 }
    ],
    "line": [
      { "latitude": 37.4656903, "longitude": 126.9484557 },
      { "latitude": 37.4655684, "longitude": 126.9485078 }
    ]
  }
  ```

  `stops` holds the operator's 14 stops in loop order from 정문, under the operator's names, at the coordinates of the
  campus map's stops they are paired with. `line` runs along OpenStreetMap's roads from 정문 around the loop back to
  정문. `serviceHours` is the route page's text, a line for each line of the page: the seed's until the route page is
  first collected, then as the last Collection read it. The app shows it to say that the shuttle is not in service.

- `GET /shuttle/vehicles` answers the vehicles in service, in the loop order of their stops:

  ```json
  [
    {
      "carId": "4522",
      "stop": { "id": "1b2c…", "name": "정문", "latitude": 37.4656884925184, "longitude": 126.948449058974 },
      "receivedAt": "2026-10-02T06:40:07.000Z"
    }
  ]
  ```

  `stop` is the stop the operator reports the vehicle at, as `GET /shuttle` gives it. `receivedAt` is when the worker
  received the operator's answer, which carries no time of its own. A set is served for a minute after the server
  stored it, so that the vehicles disappear by themselves when the service ends or the worker stops. Outside service
  hours, or when the operator reports none, the answer is `[]`. No field says that a position is estimated.

How a vehicle is stored:

- The operator reports a vehicle as a position on its drawing of the route, in pixels, and every position seen in
  service fell on a stop. The server stores the vehicle at the stop nearest to that position on the drawing. A vehicle
  at a stop comes 5 px below the stop's `top`, which never changes the nearest: the stops lie at least 50 px apart. No
  place between two stops is computed; the app moves a vehicle from one stop to the next (P15).
- The stops' places on the drawing are the route page's: the seed gives those P05 recorded, and each
  message to `/shuttle/stops/collected` stores the page's.
- Each message to `/shuttle/vehicles/collected` replaces the vehicles as a whole, as the operator's page redraws them on each
  answer: a vehicle the operator no longer reports is gone at once, and a set without vehicles empties the list.
  Vehicles are told apart by the operator's `carid`.
- The vehicles are in Redis, not in a table: they are the present state of something outside, replaced every 15
  seconds, of which no history is kept. The latest set is the one key `shuttle:vehicles`, in the form
  `GET /shuttle/vehicles` answers, and the key expires a minute after the set was stored, which is how a position is no
  longer served. Redis counts the minute, so it does not depend on the worker's clock. The Collection status of `shuttle_vehicles` is recorded in the database, as every Source's is.
- Each set stored goes to the socket server as the event `shuttle-vehicles-updated`, in the form `GET /shuttle/vehicles`
  answers, and the socket server sends it to every connected app (see the
  [socket server](../socket-server/README.md#shuttle-vehicles)). The event does not wait for an answer: an app that
  missed one gets the next set 15 seconds later.
- A message from the worker reaches one main server, however many run, so each set is stored and sent once. Every
  main server reads the vehicles from the same key.

The worker's two routes, which follow [Requests from the worker server](#requests-from-the-worker-server):

- `POST /shuttle/stops/collected`: `{ "source": "shuttle_stops", "collectedAt", "stops": [{ "name", "left", "top" }],
"serviceHours" }`, the stops in the page's order with their places on the drawing as the page writes them. The stops
  must be the seed's, by name and in loop order. A name the seed does not know is refused with
  `stops: the seed does not know 법학관`, and any other difference with
  `stops: not the seed's stops in its loop order, 정문, 법과대, …`. Nothing is stored, and the worker reports the refusal
  as a failed Collection: the page has changed, and a person corrects the seed.
- `POST /shuttle/vehicles/collected`: `{ "source": "shuttle_vehicles", "collectedAt", "vehicles": [{ "carId", "x", "y" }] }`,
  where `collectedAt` is when the operator's answer arrived and `x`, `y` the position on the drawing. A `carId` listed
  twice is refused.

## Seed data

Seed data comes from outside the project once, rather than by Collection: a file in `seed/` that one command loads
into the database.

| File                             | What it holds                                                                                           | Comes from                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `campus-boundary.geojson`        | The Campus Boundary, read by the server and not loaded                                                  | OpenStreetMap, through Overpass                      |
| `campus-map-places.json`         | The campus map's Places, as it serves them                                                              | The campus map, `map.snu.ac.kr`                      |
| `openstreetmap-places.json`      | Two Places that the campus map does not list                                                            | OpenStreetMap, through Overpass                      |
| `national-map-places.json`       | More Places that the campus map does not list, each by its polygon                                      | Written by hand                                      |
| `national-map-outlines.geojson`  | The polygons of the campus's buildings, each with its label                                             | A file that a person downloads from VWorld           |
| `openstreetmap-outlines.geojson` | The outlines that `place-outlines.json` takes from OpenStreetMap                                        | OpenStreetMap, through Overpass                      |
| `place-outlines.json`            | The outlines that a person gives a Place, each entry with its reason                                    | Written by hand                                      |
| `campus-map-shuttle-stops.json`  | The campus map's 15 stops of its loop, route 61, as it serves them                                      | The campus map, `map.snu.ac.kr`                      |
| `shuttle-stops.json`             | The operator's 14 stops in loop order, their places on the drawing and the pairs, and the service hours | The operator's route page; the pairs written by hand |
| `shuttle-route.geojson`          | The shuttle's line, traced along OpenStreetMap's roads                                                  | OpenStreetMap, through Overpass                      |

Each exported file keeps, at its top, where it came from and the day of the export.

- **Exporting**: `pnpm seed:export <name>…` repeats the export of the files it names and overwrites them; run without
  a name, it lists the names. An export over the network is one request, sent with a User-Agent that names the
  project, as OpenStreetMap asks. When Overpass answers 504 it is busy: wait some minutes before trying again.
- **Exporting the national map's outlines** starts from a file that a person downloads, because the download needs a
  login. The national map is 국토지리정보원's 연속수치지형도, and the file is its building layer.
  1. Log in at VWorld and open 연속수치지형도 건물 under 공간정보 다운로드,
     `https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30162`. The layer comes as ten files that are not named by
     region. The campus is in `(연속수치지형도)건물_001.zip`.
  2. Run `pnpm seed:export national-map-outlines <path>` with the path of the ZIP or of its unzipped `.shp`. The
     downloaded file stays outside the repository.
  - The export keeps the polygons in the campus extent that the layer classes as buildings. A file without any is
    refused with the message that the campus is in another of the layer's files, which is how a renewed layer shows
    that the campus has moved to another file.
- **Loading**: `pnpm db:seed` builds the server and loads the files into the database at `DATABASE_URL`. It can be
  repeated: a Place is updated in place and keeps its `id`, which is computed from its origin and not generated by the
  database. In Compose the image loads the seed before the server starts.
  - Only what lies inside the Campus Boundary is loaded. To list a Place farther out, the Boundary is widened first.
  - A Place takes the national map's polygons whose label names its number and, without such a label, the polygon at
    its position. `place-outlines.json` then gives the Places it names their outlines. A Place still without one,
    which the file does not name, takes the nearest polygon within 10 m that no Place has.
    `src/places/place-outlines.ts` has the rule.
  - The shuttle's 14 stops, in the order of `shuttle-stops.json`. Each stop has a `key` there, a number given once and
    never reused, since neither the operator, which names its stops only, nor the campus map, whose stop only lends
    the coordinates, gives one that outlasts a correction. Loading again updates a stop in place by its key, so that it
    keeps its `id` whatever a correction changes: its name, its pair or its place in the loop. A stop that has left the
    file is removed, since nothing that lasts points at a stop. A stop's place on the drawing
    is the file's only when the stop is first loaded; after that it is the one the route page's Collection last
    stored. The line replaces the route's line. The service hours
    are the file's `serviceHours` when the route is first loaded, so that a new database has them without waiting for
    a Collection; after that they are the ones the route page's Collection last stored.
- **Correcting a Place**: change it in its file, such as a name in `inst_kor_nm`, and load again. The next export
  overwrites the correction.
- **Giving a Place its outlines by hand**: add an entry to `place-outlines.json`.
  `{ "number": "100", "outlines": ["way/193893586"], "why": … }` gives the Place those outlines, of either outline
  file, in place of what its label or its position gave it, and `"outlines": []` takes its outlines away. `"name"` in
  place of `"number"` names a Place by its name, which must be one Place's alone. An outline of OpenStreetMap named
  there is fetched by `pnpm seed:export openstreetmap-outlines`.
- **Adding a Place that the campus map does not list**: add an entry to `national-map-places.json`.
  `{ "outline": "B0010000000SIJSPM", "number": "303", "name": "해동첨단공학관", "why": … }` makes a Place at the middle
  of that polygon of the national map; `"number": null` makes one without a number.
- **The shuttle's stops and line**, `shuttle-stops.json` and `shuttle-route.geojson`, are not written by
  `pnpm seed:export`; each keeps at its top the address or query its data was read from, as `exportedFrom`. The stops' names and places on the drawing are the route page's, as P05 read
  it; `campusMapStop`, written by hand, pairs each with a stop of the campus map, which gives the coordinates. The
  line follows the roads that the Overpass query in its file gave, as the shortest way a vehicle may take from each of
  the campus map's 15 stops to the next. A person checked the pairs and the line on a map.
- **Correcting the shuttle**: a stop's pair is `campusMapStop` in `shuttle-stops.json`, and a new stop takes the next
  unused `key`. The line is the list of coordinates in `shuttle-route.geojson`, longitude first, which GitHub and
  geojson.io draw on a map. Load again afterwards.
- **Coordinates** come from the campus map, OpenStreetMap and the national map only, never from Kakao, Naver or Google
  maps, whose terms forbid storing their data.
- **Licences**: OpenStreetMap's data is under the ODbL and the national map's layer under 공공누리 type 1. Both ask
  that the source is shown: the files carry their notices, and the app shows both attributions (P15). The campus map
  publishes no terms. `.scratch/research/external-sources.md` §6 and `.scratch/research/public-building-outlines.md`
  §8 have the terms.
- **In a test**: the global setup loads the seed into the test database, so every test file has the Places and the
  shuttle's stops and line. A test that changes the seed loads it into a database of its own, made by
  `createDatabase()` from `test/containers.ts`, with `loadSeed(prisma, directory)` from `src/load-seed.ts`, as
  `test/seed.e2e-spec.ts` and `test/shuttle-seed.e2e-spec.ts` do.
- **A new seed** adds its export to `scripts/export-seed.ts` when the file is exported, its model with a unique key
  that outlasts a reload, and its loading to `loadSeed()`. The key is the identifier the origin gives or, where no
  origin gives one, as for a shuttle stop, a key of the seed's own. `readSeedFile()` beside `SEED_DIRECTORY` reads a
  file and checks it against a schema.

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
├── main.ts                          starts the server
├── seed.ts                          the command that loads the seed files, `pnpm db:seed`
├── load-seed.ts                     loads every seed file; the command and the tests call it
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   ├── seed-directory.ts            where the seed files are, and how one is read
│   ├── geometry.ts                  a position, and whether a ring holds it or how far it is from it
│   ├── campus-boundary.ts           the Campus Boundary, read from its seed file
│   ├── campus-boundary.module.ts    makes the Campus Boundary available to every feature
│   ├── prisma.module.ts             makes PrismaService available to every feature
│   ├── prisma.service.ts            the main database
│   ├── messaging.module.ts          makes the client that sends events to the socket server available to every feature
│   ├── messaging.ts                 options for NestJS messaging over Redis
│   ├── redis.module.ts              makes a Redis client available to every feature
│   ├── redis-idempotency.store.ts   keeps the results of requests safe to repeat in Redis
│   ├── route-access.ts              who may call a route: anyone, a User, an Administrator or the worker server
│   ├── public.decorator.ts          @Public(): opens a route to requests without an access token
│   ├── allow-before-onboarding.decorator.ts  @AllowBeforeOnboarding(): opens a User's route before onboarding
│   ├── administrator-only.decorator.ts  @AdministratorOnly(): gives a route to Administrators
│   ├── worker-only.decorator.ts     @WorkerOnly(): gives a route to the worker server
│   ├── current-user.decorator.ts    @CurrentUser(): the signed-in User in a handler
│   └── current-administrator.decorator.ts  @CurrentAdministrator(): the signed-in Administrator
├── generated/                       Prisma Client, generated by `pnpm install` (not committed)
├── health/                          a feature: the liveness and readiness checks
├── auth/                            a feature: app and admin site sign-in, refresh, sign-out, the access token checks
├── users/                           a feature: the signed-in User, their profile and onboarding
├── lobby/                           a feature: what the app needs when it starts
├── administrators/                  a feature: the Administrators, who register and remove each other
├── collection/                      a feature: each Source's Collection status, and the worker's reports of failure
├── global-events/                   a feature: the Global Events, and the events the worker collects
├── menus/                           a feature: the menus the worker collects, stored and served by day
├── walking-route/                   a feature: a walking route between two points, asked of Kakao on each request
├── places/                          a feature: the Places of the seed, listed and searched, and the Place at a
│                                    position
└── shuttle/                         a feature: the shuttle's stops and line of the seed, the route page's places and
                                     hours, and the vehicles the worker collects, served and sent to the socket server
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

The steps add a feature named `party`. Use a short lowercase name, with dashes between words (`global-events`).

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

3. Every route is exactly one of four kinds. Unmarked, it is a User's: it needs a User's access token, and a request
   without one gets 401. Mark a route, or a whole controller, with `@Public()` to open it to anyone, with
   `@AdministratorOnly()` to give it to [Administrators](#administrators), or with `@WorkerOnly()` to give it to the
   worker server ([Requests from the worker server](#requests-from-the-worker-server)). A marking on a handler replaces
   its controller's, so mark a handler with one of them at most. A User's route also needs the User to have finished
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

   A Place is the exception: its `id` is computed when the seed is loaded (see [Seed data](#seed-data)).

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

## Requests from the worker server

The worker server only collects. It hands what a Collection read to the main server as an HTTP request, and the main
server checks it, stores it and answers. A request reaches one main server, however many run behind the load balancer,
so a message is stored once. Every route for the worker follows these rules.

- **Route and shape**: a message is a `POST` in the feature's controller, marked `@WorkerOnly()` from
  `src/common/worker-only.decorator.ts` and `@HttpCode(HttpStatus.NO_CONTENT)`. Its path says what happened:
  `/menus/collected` for what a Collection of a menu Source read, `/global-events/collected` for the events list's, and
  `/collections/failed`. The body is a JSON object. It names its `source`, a value of `Source` in
  `prisma/schema.prisma`, and the time of the Collection in ISO 8601 with an offset (`collectedAt`, `failedAt`). A day
  is `YYYY-MM-DD`, a calendar day in Asia/Seoul. A field without a value is `null`, not left out.
- **Questions**: a Collection that needs to know what the main server holds asks it, since the worker keeps nothing. A
  question is a `POST` too, marked `@WorkerOnly()` and `@HttpCode(HttpStatus.OK)`, since what it asks about is a list.
  Its path names what it asks for, its body carries only what it asks about, and it answers 200 with what it asks for
  and stores nothing: the events list is one Source and a post number identifies a post, so
  `/global-events/stored-posts` carries no `source` and no time. `/global-events/stored-posts` with
  `{ "postNumbers": [176558, 176525] }` asks which of these posts are stored, and `{ "postNumbers": [176558] }` answers
  that 176558 is, in whatever state. The worker asks with `MainServer.ask()`.
- **Who may call it**: the worker alone. The request carries `Authorization: Bearer <WORKER_TOKEN>`, the secret that
  the two servers' settings share, and `WorkerGuard` in `src/auth/worker.guard.ts` answers 401 to any other request,
  a User's and an Administrator's access token included. The token is no signed token: the worker is no User.
- **Validation**: the handler takes the body with `@Body({ schema })`, as every route does, and the schema is zod in
  the feature's `dto/`, such as `src/menus/dto/menus-collected.dto.ts`. Use `z.strictObject`, so that a misspelt field
  is refused instead of dropped.
- **Size**: a body may be up to 1 MB (`src/common/json-body-limit.ts`). Express takes 100 kB unless told otherwise, and
  a week of the Co-op's menus comes to about that. A larger body is refused with 413.
- **Answers**: a message that was taken answers 204, and a question 200 with its answer. One that does not match its
  schema is refused with 400 before the handler runs, and nothing from it is stored, the Collection status included.
  The answer names each problem:

  ```json
  {
    "statusCode": 400,
    "message": [
      "days.0.restaurants.1.lines.0.kind: Invalid option: expected one of \"heading\"|\"dish\"|\"note\"",
      "days.0.restaurants.1: Unrecognized key: \"hours\""
    ],
    "error": "Bad Request"
  }
  ```

  A handler refuses a message that matches its schema but not what is stored, such as a shuttle stop the seed does not
  know, by throwing `ConflictException` with the problem before it stores anything; the answer is 409 with the problem
  as its `message`. Any other error inside a handler is logged and answers 500. The worker takes any answer outside 2xx
  as a failure, and reports it as a failed Collection with the problem as the reason.

- **Repeats and order**: the same message sent twice leaves the records one would. Each feature states how, as
  [Menus](#menus) and [Global Events](#global-events) do. A Source's messages are stored in the order they arrive, not
  by their times.
- **Collection status**: `collection_statuses` keeps, for each Source, the time of its last successful Collection
  (`lastSucceededAt`) and, apart from it, its last failure (`lastFailedAt`, `lastFailureReason`). A handler that stores
  what a Collection read calls `CollectionService.recordSuccess(tx, source, collectedAt)` in the same transaction; the
  shuttle's vehicles are stored in Redis, so their handler records the success once the set is stored. A message that
  says its Collection stopped early, as `failureReason` does in [Global Events](#global-events), has its handler call
  `recordFailure()` with the transaction in place of the success, even when it carries no event. Any other Collection
  that fails posts `{ "source", "failedAt", "reason" }` to `/collections/failed`, where `reason` says what went wrong.
  It records the failure and leaves every stored record as it is. A success leaves the last failure in place, so the two
  times tell whether the Source has worked since. No route serves the status yet; P12 shows it.
- **A new Source** adds its value to `Source` with a migration. `menusCollectedSchema` lists the Sources that send
  menus, the shuttle's two schemas the one that sends each, and `eventsCollectedSchema` the one that sends events, so a
  Source of another kind is refused there.

In a test, `sendAsWorker()` from `test/worker.ts` sends a request as the worker does, with its token, as
`test/menus.e2e-spec.ts` does:

```ts
const app = await startApp(inject('settings'));
await sendAsWorker(app, '/menus/collected', message); // resolves when the server took it
expect(await refusal(app, '/menus/collected', invalid)).toContain('days.0.date: ');
await app.close(); // in afterAll
```

- The database is the shared one, so each test stores data of its own. The menus tests take their days from `daysOf()`
  in `test/menus.ts`, a month for each file and a day for each test, and the events tests their post numbers from
  `postNumbersFrom()` in `test/global-events.ts`, a range for each file. A Source's Collection status is one row, so
  only one file checks the status of a Source: `test/collection.e2e-spec.ts` the dormitory's, `test/menus.e2e-spec.ts`
  the Co-op's, `test/shuttle.e2e-spec.ts` the shuttle's two, whose stops and line are one set of records and whose
  vehicles one key in Redis besides, and `test/global-events.e2e-spec.ts` the events list's.
  `test/stored-event-posts.e2e-spec.ts` therefore stores its posts with a database connection instead, and asks its
  question with `askAsWorker()` from `test/worker.ts`, which resolves with the answer.
