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

The main server and the match server call each other with another shared secret. Generate it and put the same line in
`match-server/.env`:

```bash
echo "MATCH_SERVER_TOKEN=$(openssl rand -hex 32)" >> .env
```

`.env.example` already holds the team's Google client IDs in `GOOGLE_APP_CLIENT_ID` and `GOOGLE_ADMIN_CLIENT_ID` (see
[Sign-in](#sign-in)). Replace the example address in `INITIAL_ADMINISTRATOR_EMAILS` with your own (see
[Administrators](#administrators)). Fill in `KAKAO_REST_API_KEY` with the REST API key that the Owner of the team's
Kakao app shares with you (see [Walking route](#walking-route)); the server does not start without it.
`PUBLIC_URL` and `ANDROID_CERTIFICATE_FINGERPRINTS` work as they are for development (see
[Invite Links](#invite-links)).

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
  creates its User, with an empty name and department and a [Friend ID](#friends). `onboarding` tells the app where to
  go next (see [Onboarding and the lobby](#onboarding-and-the-lobby)).
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
  soon as its session ends. The main server then tells the socket server, which disconnects the session's connections,
  and clears the User's position (see [Location Sharing](#location-sharing)).

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
4. `POST /lobby`, with no body, answers `200 { "profile": { ... }, "masterSwitch": false }`, the profile as
   `GET /users/me/profile` gives it and whether the User's [Master Switch](#location-sharing) is on. Later features add
   what the app needs when it starts.

A sign-in on another phone during onboarding ends the first phone's session as any sign-in does: its next request, the
onboarding's included, gets 401 with `"code": "SESSION_REPLACED"`, and the other phone goes through onboarding.

A Google name that is not three parts separated by `/` is logged as a warning with the User's id. The form is confirmed
on an undergraduate's account only.

## Profile

A User reads and edits their own profile. The routes name no User, so they never reach another User's profile.

- `GET /users/me/profile` answers
  `{ "name": ..., "department": ..., "admissionYear": ..., "hashtags": [...], "friendId": "7KX2M9QD" }`. Like every User
  route but two, it needs the User to have finished onboarding. `friendId` is the User's [Friend ID](#friends).
- `PATCH /users/me/profile` with some of these fields changes only those and answers with the whole profile. `null`
  empties `admissionYear`, and `[]` empties `hashtags`. The name and the department cannot be emptied. The Friend ID
  cannot be changed: a `friendId` sent is ignored.
- A value outside these limits gets 400 with a message that starts with the field, and nothing changes. Spaces around
  text are dropped first. The limits are set in `src/users/dto/update-profile.dto.ts`, and onboarding follows the same
  ones.
  - `name`: 1 to 30 characters.
  - `department`: 1 to 50 characters. A double major is written out, such as `컴퓨터공학부, 경제학부`.
  - `admissionYear`: a whole number from 1946, when SNU was founded, to this year in Korea.
  - `hashtags`: at most 20. Each is kept without the `#` in front, in the case sent, and then has 1 to 30 characters
    without whitespace. None may appear twice, whatever the case.

## Friends

Every User has a Friend ID: 8 characters from capital letters and digits, without `0`, `O`, `1`, `I` and `L`, such as
`7KX2M9QD`. The server makes it at random when it creates the User (`src/users/friend-id.ts`) and draws another when
one is already held, the database keeps it unique, and it never changes. The User gives it to someone in any way they like, and that person sends a Friend
Request to it. The routes, all a User's:

- `GET /friend-ids/:friendId` answers the owner's `{ "name": ..., "department": ... }`.
- `POST /friend-requests` with `{ "friendId": "7KX2M9QD" }` sends a Friend Request to the owner and answers
  `201 { "status": "waiting" }`. When the owner's own request to the sender is waiting, the two become Friends at once,
  no request is left, and the answer is `201 { "status": "friends" }`. A repeat is refused as a request already sent,
  so it takes no `Idempotency-Key`.
- `GET /friend-requests` answers the waiting requests sent to the User and those the User sent, the newest first:
  `{ "received": [{ "id", "sender": { "name", "department" }, "sentAt" }], "sent": [{ "id", "receiver": { ... }, "sentAt" }] }`.
- `POST /friend-requests/:id/accept` makes the two Friends, and `POST /friend-requests/:id/decline` removes the request.
  Only its receiver answers it. `POST /friend-requests/:id/cancel` removes it, and only its sender cancels it. Each
  answers 204.
- `GET /friends` answers the User's Friends in the order of their names:
  `[{ "id", "name", "department", "sharing", "visible" }]`, where `id` is the Friend's User id, `sharing` the User's own
  switch for the friendship and `visible` whether the User can see the Friend on the map now, never why not (see
  [Location Sharing](#location-sharing)).
- `DELETE /friends/:userId` ends the friendship for both and answers 204. It withdraws the Meetups still proposed
  between the two; the Quests of accepted ones stay (see [Meetup](#meetup)).
- `PUT /friends/:userId/sharing` with `{ "on": false }` turns the User's switch for the friendship off, `{ "on": true }`
  on, and answers 204. It changes the User's own end only.

A Friend ID is read in capitals, so one typed in small letters is found too. The refusals each have a `code`:

| Refusal                                                                     | Status | `code`                        |
| --------------------------------------------------------------------------- | ------ | ----------------------------- |
| A Friend ID nobody holds, looked up or sent to                              | 404    | `FRIEND_ID_NOT_FOUND`         |
| A Friend Request to the sender's own Friend ID                              | 400    | `OWN_FRIEND_ID`               |
| A Friend Request to a Friend                                                | 409    | `ALREADY_FRIENDS`             |
| A Friend Request to a User the sender's request already waits for           | 409    | `FRIEND_REQUEST_ALREADY_SENT` |
| An answer to a request that is not waiting for it from this User            | 404    | `FRIEND_REQUEST_NOT_FOUND`    |
| Ending a friendship, or turning its switch, with a User who is not a Friend | 404    | `FRIEND_NOT_FOUND`            |

A request answered or cancelled already is not waiting, so a second answer gets `FRIEND_REQUEST_NOT_FOUND`.

How they are stored: the table `friendships` holds one row for two Users, a waiting Friend Request while `accepted_at`
is empty and a friendship once it is set. The row keeps the two Users in the order of their ids, `user_a_id` before
`user_b_id`, and `sender_id`, who sent the request. A unique index on the two Users therefore allows one friendship or
one waiting request between them, whichever sent it. Every change between two Users also locks both Users' rows in the
order of their ids first, so that two requests that cross, or two answers to one request, run one after the other: the
later sees what the earlier left and is refused or makes the two Friends. Another feature asks whether two Users are
Friends with `FriendsService.areFriends(userId, otherUserId, tx?)`, exported by `FriendsModule`.

After each change, `friends-changed` goes to both Users: when a request is sent, accepted, declined or cancelled, and
when a friendship ends. It carries nothing, and the app fetches `GET /friends` and `GET /friend-requests` again (see
[Signals](#signals)).

A friendship starts with both switches on, so accepting a Friend Request starts Location Sharing between the two. The
table keeps each User's switch at their own end, in `user_a_sharing` and `user_b_sharing`.

## Invite Links

A User creates an Invite Link and sends it through any messenger. Whoever opens it sees who sent it and, on accepting,
becomes the sender's Friend with no further step. A link works once and for 24 hours, and a User may hold several
unused ones. The routes, all a User's:

- `POST /invite-links`, with no body, answers `201 { "url": "https://…/invite/<token>", "expiresAt": "…" }`. The
  address is `PUBLIC_URL` followed by `/invite/` and a random token of 43 characters. A repeat creates one more link, so
  it takes no `Idempotency-Key`.
- `GET /invite-links/:token` answers `{ "sender": { "name", "department" }, "status": … }`, where `status` says whether
  the User asking can accept it: `usable`, `used`, `expired`, `own` (the User's own link) or `friend` (from a Friend).
- `POST /invite-links/:token/accept` makes the two Friends, turning a Friend Request waiting between them into the
  friendship, uses the link up and answers 204. `friends-changed` goes to both. Declining sends nothing: a link nobody
  accepted stays usable until it expires.

| Refusal                                    | Status | `code`                  |
| ------------------------------------------ | ------ | ----------------------- |
| A token nobody made, looked up or accepted | 404    | `INVITE_LINK_NOT_FOUND` |
| Accepting the User's own link              | 400    | `OWN_INVITE_LINK`       |
| Accepting a link that was used             | 409    | `INVITE_LINK_USED`      |
| Accepting a link past its 24 hours         | 410    | `INVITE_LINK_EXPIRED`   |
| Accepting a link from a Friend             | 409    | `ALREADY_FRIENDS`       |

The table `invite_links` keeps the SHA-256 of each token, not the token, with the sender, `expires_at` and `used_at`.
Accepting runs through `FriendsService.befriend(senderId, receiverId, alongside)`, which locks both Users as every
change between two Users does and runs `alongside`, here the link's use, in the same transaction. The link is used up
only while `used_at` is still empty, so of two Users who accept one link at the same moment one becomes the Friend and
the other gets `INVITE_LINK_USED`.

Android opens the app from the link through App Links. It asks for `GET /.well-known/assetlinks.json` on the link's
host, without a token and following no redirect, and the server answers the Digital Asset Links file: the app's package
name, `com.bonnieandclaude.snunow`, and the SHA-256 fingerprints of the certificates the app is signed with. Two
settings serve this:

- `PUBLIC_URL`: the address the apps reach this server at from outside, such as `https://snunow.example`, without a
  path. App Links need https; `http://localhost:3000` serves for development. A link made under one address stops
  working when the address changes.
- `ANDROID_CERTIFICATE_FINGERPRINTS`: the fingerprints separated by commas, so that a development build and the demo
  build both open the links. `.env.example` holds the one of the Expo template's debug key, which signs development
  builds.

A certificate's fingerprint is the `SHA256:` line that `keytool` prints for its keystore, for the debug key:

```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For a build signed on EAS, `eas credentials` shows the SHA-256 fingerprint of the Android keystore. An app the Play
Store signs needs the fingerprint of the app signing key from the Play Console as well.

## Location Sharing

A User's app uploads the phone's positions, and the User's Friends see the User's Avatar move on their map. The
numbers below are provisional until P17 has checked them on a phone.

- **The Master Switch** turns all of a User's Location Sharing on or off. It is kept on the User
  (`users.master_switch_on`), starts off, and signing in and signing out leave it as it is.
  `PUT /users/me/master-switch` with `{ "on": true }` or `{ "on": false }` answers 204, and the lobby returns it as
  `masterSwitch`. Turning it off clears the User's position.
- **The switch of a friendship** is each Friend's own, on their end of the friendship, and starts on (see
  [Friends](#friends)).
- **Who sees whom**: a viewer sees a subject when both Master Switches are on, the subject has a position, which is
  kept only inside the [Campus Boundary](#campus-boundary), and a relationship between the two has its switch on at
  both ends. A friendship is the one relationship so far. Sharing is mutual: the rule is the same both ways, and a User
  who turns a switch off also stops seeing the other. A Friend off campus, one with sharing off and one whose position
  has expired look the same: no position, and `visible` false.
- `POST /positions` with `{ "latitude": 37.4594, "longitude": 126.95199, "accuracy": 12, "measuredAt": "..." }`
  uploads a position, where `accuracy` is the radius in metres within which the phone places itself and `measuredAt`
  the time the phone measured it, in ISO 8601 with an offset. It answers `200 { "offCampus": false }` when the position
  was kept. A position outside the Campus Boundary is not kept and clears the one stored, and the answer is
  `200 { "offCampus": true }`: the app tells the User that they are not shared because they are off campus. The
  Boundary is checked in server code, without a database query. Each upload replaces the one before, so it takes no
  `Idempotency-Key`.
- `GET /positions` answers the positions the User may see now:
  `[{ "userId", "latitude", "longitude", "measuredAt" }]`. The app fetches it when it connects, reconnects and returns
  to the front.

An upload is refused, and nothing is stored, with these codes. The three numbers are `MAX_POSITION_AGE_MS`,
`MAX_POSITION_LEAD_MS` and `MAX_ACCURACY_METRES` in `src/location-sharing/location-sharing.service.ts`.

| Refusal                                                   | Status | `code`                    |
| --------------------------------------------------------- | ------ | ------------------------- |
| The User's Master Switch is off                           | 409    | `MASTER_SWITCH_OFF`       |
| Measured more than 60 seconds ago                         | 400    | `POSITION_TOO_OLD`        |
| Measured more than 10 seconds ahead of the server's clock | 400    | `POSITION_IN_THE_FUTURE`  |
| An accuracy radius over 100 metres                        | 400    | `POSITION_TOO_INACCURATE` |

What is stored: only each User's latest position, in Redis under `position:<userId>` as
`{ "latitude", "longitude", "measuredAt" }`, which expires 10 minutes after it was stored. Redis counts the 10
minutes. No position is written to the database or to a log, and no history is kept. The position is cleared when the
User turns the Master Switch off, uploads a position off campus, and when the User's session ends, by a sign-in on
another phone, a sign-out or a used refresh token, so that the phone's last position does not linger.

What is pushed, through the [socket server](../socket-server/README.md#signals):

- Each position kept goes as `position`, with `{ "userId", "latitude", "longitude", "measuredAt" }`, to the Users who
  may see the subject at that moment. Delivery is lossy on purpose: only the newest position matters.
- `position-removed`, with `{ "userId" }`, the subject, goes at once to each viewer who could see the subject before a
  change and cannot after it: when either turns the Master Switch or the friendship's switch off, when the friendship
  ends, when the subject leaves the Campus Boundary and when the subject's session ends.

`VisibilityService` in `src/location-sharing/visibility.service.ts`, exported by `LocationSharingModule`, is the one
place that decides who sees whom:

- `viewersOf(subjectId)`: who may see the subject now.
- `visibleTo(viewerId)`: whom the viewer may see now.
- `announceRemovals(userId, change)`: runs `change`, a change that may end what the User sees or who sees the User,
  and sends `position-removed` to each viewer who saw a subject before and does not after. It compares who sees whom
  among the pairs that include the User, before and after the change. Pass the User whose switch, relationship or
  position the change touches: every sight it can end includes that User, so a new cause, such as leaving a Party,
  only wraps its change in it. A change that touches several Users at once, as the end of a Party does, passes them
  all as a list, and each sight is announced once.

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
[Requests from the worker server](#requests-from-the-worker-server)). Users read the published ones, and Administrators
every one, through the routes below. P12 adds the Administrator's routes that edit, publish, cancel, discard and create
them.

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

An event has ended when its end has passed or, when it has no end, once the day of its start has passed in Asia/Seoul:
an event without an end that starts today is listed until midnight. The same rule decides both lists of published
events below.

`GET /global-events` with a User's access token answers the published Global Events that have not ended, ordered by
start, then by title. The app fetches it again on `global-events-changed`.

```json
[
  {
    "id": "5d0e…",
    "title": "[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내",
    "description": "안녕하세요.\n…",
    "startsAt": "2026-10-13T08:00:00.000Z",
    "endsAt": null,
    "place": "뉴미디어통신공동연구소 이충웅홀(132동 103호)",
    "latitude": 37.45487,
    "longitude": 126.95407,
    "sourceUrl": "https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525"
  }
]
```

- A Draft, a cancelled, a discarded and an ended event are never in it.
- `sourceUrl` is `null` for an event an Administrator created.
- An Administrator's access token gets 401, and a User before onboarding 403 `ONBOARDING_REQUIRED`, as on every User's
  route.

An Administrator reads them through `src/global-events/admin-global-events.controller.ts`, and the lists the admin site
needs beside them through a controller of their own feature. Each route needs an Administrator's access token (see
[Administrators](#administrators)):

- `GET /admin/global-events?state=draft` answers every Draft, and `GET /admin/global-events?state=published` the
  published events that have not ended. Both are ordered by start, the events without a start last, then by title. A
  missing or other `state` gets 400. Each entry is:

  ```json
  {
    "id": "8c2a…",
    "title": "[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내",
    "startsAt": null,
    "endsAt": null,
    "place": "뉴미디어통신공동연구소 이충웅홀(132동 103호)",
    "latitude": 37.45487,
    "longitude": 126.95407,
    "state": "draft",
    "version": 1,
    "postNumber": 176525,
    "sourceUrl": "https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525",
    "missing": ["startsAt"]
  }
  ```

- `missing` names what publishing a Draft still needs, `startsAt` and `position` in that order, so a Draft that could
  not be read fully shows it. It is `[]` for an event in any other state. An empty `missing` does not make a Draft
  right: its start may be the header's date (see below).
- `GET /admin/global-events/:id` answers one event in any state, as an entry of the lists with its `description`, the
  text to check against the post at `sourceUrl`. An unknown id gets 404 `GLOBAL_EVENT_NOT_FOUND`, and an id that is
  not a UUID 400.
- `GET /admin/places` answers every Place in the order and form of `GET /places` (see [Places](#places)), so that the
  admin site offers the list without a User's token. `src/places/admin-places.controller.ts` serves it.
- `GET /admin/collection-statuses` answers one entry for every Source, in the order of the `Source` enum:
  `{ "source": "snu_events", "lastSucceededAt": "…", "lastFailedAt": null, "lastFailureReason": null }`. All three are
  `null` for a Source never collected (see [Requests from the worker server](#requests-from-the-worker-server)).
  `src/collection/admin-collection.controller.ts` serves it.

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

A Collection that stores at least one event as published sends `global-events-changed` to every connected app once
the events are stored, and the app fetches the published events again (see [Signals](#signals)). It carries nothing. A
Collection that stores only Drafts, or no new post, sends none. `GlobalEventsService.signalChanged()` sends it, and P12
calls it once its change is committed when an Administrator publishes, edits or cancels a Global Event.

What the rules read from a post, and how, is in the worker server's README. In a test, `collectedEvent()`,
`eventsMessage()` and `postNumbersFrom()` in `test/global-events.ts` build what the worker sends, as
`test/global-events.e2e-spec.ts` does; it reads what a Collection stored, by post number, with a database connection
of its own. `test/global-event-lists.ts` reads the lists above. The test files share one database, so
`publishedAmong()` and `listedAmong()` keep only the events a test names, in the list's order.

## Quests

A Quest is what one or more Users set out to do and what Users gather around: a title, its Holders, a Leader, a
capacity, a Join Policy, an optional Global Event and one or more Sub Quests, which carry the times and places. A Quest
with two or more Holders is a Shared Quest; nothing else tells it apart. The plan is shared and progress is personal: a
Sub Quest is one record for all Holders, and whether it is done is kept for each Holder. A User gets a Quest by
attending a published Global Event or by making one of their own, and enters another's by joining it, by a request to
join that the Leader accepts or by the Leader's invitation; Meetups and Matching add the Quests with several Holders.
The routes, all a User's:

- `POST /quests` with `{ "globalEventId": "..." }` attends the Global Event and answers 201 with the User's Quest for
  it. The first time it creates the Quest, with the event's title, the User as its only Holder and the Sub Quest for
  attending. Attending again, also twice at the same moment, answers the same Quest and changes nothing, so it takes
  no `Idempotency-Key`.
- `POST /quests/own` makes a Quest of the User's own, without a Global Event, and answers 201 with it. It requires an
  `Idempotency-Key`, which is why it is a route apart from attending. The body:
  `{ "title": "저녁 같이 먹어요", "subQuest": { ... }, "joinPolicy": "open", "board": "meal", "description": "…" }`:
  the title has 1 to 50 characters, `subQuest` is the body of adding a Sub Quest below and becomes the Quest's first,
  and `capacity` (1 to 8), `joinPolicy` (`open`, `approval` or `closed`), `board` and `description` are optional in
  the schema. `board` is required for an `open` or `approval` Quest and refused for a Closed one, also when
  `joinPolicy` is left out (see the boards below).
- `GET /quests/recruiting` answers the list of recruiting Quests, `GET /quests/recruiting?globalEventId=...` the same
  for one Global Event and `GET /quests/recruiting?board=meal` for one board; the two combine (see below).
- `POST /quests/:questId/join` joins an Open Quest and answers 201 with it. A second join is refused, so it takes no
  `Idempotency-Key`.
- `GET /quests` answers the User's Quests in the order they were created, then today's Class Quests (below), leaving
  out each Quest whose Sub Quests have all ended for the User. `GET /quests/:questId` answers one, ended or not.
- `DELETE /quests/:questId` drops the Quest and answers 204. It removes the User as a Holder, with the User's progress.
  The other Holders keep the Quest. When the last Holder drops it, it is deleted with its Sub Quests.
- `POST /quests/:questId/sub-quests` adds a Sub Quest and answers 201 with it. It requires an `Idempotency-Key` (see
  [Making a handler safe to repeat](#making-a-handler-safe-to-repeat)). The body:
  `{ "title": "카페", "startsAt": "...", "endsAt": "...", "place": ... }`. The title has 1 to 50 characters, the times
  are optional and the end, when both are given, is after the start. `place` is optional and is a Place from the list,
  `{ "placeId": "..." }`, or a point on the map with the label the app showed, `{ "latitude", "longitude", "label" }`,
  the label 1 to 50 characters.
- `PUT /quests/:questId/sub-quests/:subQuestId` replaces what a Holder wrote with the same body and answers 200 with the
  Sub Quest. `DELETE /quests/:questId/sub-quests/:subQuestId` cancels it, which removes it, and answers 204.
- `POST /quests/:questId/sub-quests/:subQuestId/done` marks the Sub Quest done for the User alone and answers 204. A
  second mark changes nothing.

A Quest reads:

```json
{
  "id": "…",
  "title": "지능형통신 연합전공 설명회",
  "globalEvent": { "id": "…", "title": "지능형통신 연합전공 설명회" },
  "leader": { "id": "…", "name": "홍길동", "department": "컴퓨터공학부" },
  "capacity": 4,
  "joinPolicy": "closed",
  "board": null,
  "description": "",
  "createdAt": "2026-10-06T08:00:00.000Z",
  "holders": [{ "id": "…", "name": "홍길동", "department": "컴퓨터공학부" }],
  "subQuests": [
    {
      "id": "…",
      "attending": true,
      "title": "지능형통신 연합전공 설명회",
      "startsAt": "2026-10-13T08:00:00.000Z",
      "endsAt": null,
      "place": {
        "placeId": null,
        "label": "뉴미디어통신공동연구소 이충웅홀(132동 103호)",
        "latitude": 37.45487,
        "longitude": 126.95407
      },
      "completion": "by_hand",
      "cancelled": false,
      "done": false,
      "ended": false
    }
  ],
  "classQuest": false
}
```

- `globalEvent` is `null` for a Quest without one. The Holders are in the order they entered, and the Sub Quests start
  with the attending one, then in the order they were added.
- A Sub Quest's `place` is `null` when it has none. `placeId` is the Place's id for a Place from the list, whose name
  is then the `label`, and `null` for a point.
- `done` and `ended` are the reading User's. Overlapping times, within a Quest or across a User's Quests, are accepted.
- `board` is `null` for a Closed Quest, `description` is `""` when there is none, and `createdAt` is when the Quest was
  made.
- `classQuest` is `true` for a Class Quest and `false` for every stored Quest. `leader` and `createdAt` are `null` for
  a Class Quest only.

The refusals each have a `code`:

| Refusal                                                   | Status | `code`                   |
| --------------------------------------------------------- | ------ | ------------------------ |
| Attending a Global Event that is unknown or not published | 404    | `GLOBAL_EVENT_NOT_FOUND` |
| A Quest the User does not hold, or that does not exist    | 404    | `QUEST_NOT_FOUND`        |
| A Sub Quest the Quest does not have                       | 404    | `SUB_QUEST_NOT_FOUND`    |
| A `placeId` that is not a Place of the list               | 404    | `PLACE_NOT_FOUND`        |
| Editing or cancelling the attending Sub Quest             | 409    | `ATTENDING_SUB_QUEST`    |
| Cancelling the only Sub Quest of a Quest                  | 409    | `LAST_SUB_QUEST`         |
| Joining a Closed Quest, or one that does not exist        | 404    | `QUEST_NOT_FOUND`        |
| Joining an Approval Quest                                 | 409    | `QUEST_NOT_OPEN`         |
| Joining a Quest the User holds                            | 409    | `ALREADY_HOLDER`         |
| Joining a Quest without a Sub Quest ahead                 | 409    | `QUEST_ENDED`            |
| Joining a Quest whose Holders fill its capacity           | 409    | `QUEST_FULL`             |
| Joining while holding a Shared Quest for its Global Event | 409    | `SHARED_QUEST_HELD`      |
| A Class Quest of the User's, on a route that changes it   | 409    | `CLASS_QUEST`            |

A body that does not match gets 400 with a message naming the field, such as `endsAt: The end must be after the start`.

**The attending Sub Quest** stores no title, time or place. Each read takes the Global Event's title, `startsAt`,
`endsAt`, `place` as the label and its position, so a change to the event shows at once. Once the event is no longer
published, as when it is cancelled, the Sub Quest reads as `cancelled` and ended. No Holder edits or cancels it.

**How a Sub Quest ends.** Its `completion` is `by_time` when it has an end time and `by_hand` when it has none; for the
attending Sub Quest, when the Global Event has none. A Sub Quest is ended for a User when its end time has passed, for
every Holder alike, when the User marked it done, or when it is cancelled. This is computed when it is read and nothing
is written. The time it is computed at is `now()` of `CLOCK` (`src/quests/clock.ts`), which a test moves with
`vi.spyOn(app.get<Clock>(CLOCK), 'now')`, as `test/quest-progress.e2e-spec.ts` does.

**Class Quests.** A Class Quest stands for one of the User's classes on a day it is held. It is computed from the
[timetable](#timetable) each time `GET /quests` or `GET /quests/:questId` is read, and nothing is stored for it, so a
change to the timetable shows in the next read. `ClassQuestsService` (`src/quests/class-quests.service.ts`) builds it
from `TimetableService.classesOf`:

- There is one for each class with a time on today's weekday, by the date in Asia/Seoul at `now()` of `CLOCK`, every
  week. The list puts them after the stored Quests, in the order of their first start today.
- Its `id` is the class's and its `title` the course name. `globalEvent`, `leader`, `board` and `createdAt` are
  `null`, `description` is `""`, `capacity` is 1, `joinPolicy` is `closed` and the User is its only Holder.
- It has one Sub Quest for each of the class's times today, in the order of their starts. The Sub Quest's `id` is the
  time's, `attending` is `false`, its `title` is the course name, `startsAt` and `endsAt` are today's start and end as
  instants (the `HH:MM` at +09:00), `completion` is `by_time`, and `cancelled` and `done` are `false`. Its `place` is
  the time's Place, labelled `<Place name> <room>`, or the Place's name alone for a time without a room; a time without
  a Place gives `null`, and its room is not shown.
- It ends by time and leaves the list once all its Sub Quests have ended, as any Quest. `GET /quests/:questId` answers
  it, ended or not, on a day its class has a time, and `QUEST_NOT_FOUND` on another day.

It takes no part in what Users do with stored Quests. For the identifier of any of the User's classes, held today or
not, these routes refuse with 409 `CLASS_QUEST` and change nothing: dropping it; adding a Sub Quest, and editing,
cancelling and marking one done; joining; asking to join; the Leader's controls, ending it included; listing,
accepting and declining its requests to join; and inviting, listing its invitations and cancelling one. Another User's
class is no Quest of the User, and each of these routes answers it as a Quest the User does not hold:
`QUEST_NOT_FOUND`. The check is asked only when no stored Quest answers the identifier,
where each route first looks its Quest up, so stored Quests are served as before: `QuestsService.inQuest` for dropping
and the Sub Quest routes, `LeaderService.ledBy` for the Leader's controls, the requests and the invitations,
`RecruitingService.enter` for joining and `JoinRequestsService.ask` for asking. A Class Quest is no stored Quest, so it
is never in the list of recruiting Quests, and opening a [Party](#party) for it gets `QUEST_NOT_FOUND`.

**One Quest for a Global Event.** A User holds at most one Quest for a Global Event, which the database enforces: the
row of each Holder, in `quest_holders`, repeats the Quest's Global Event, and a unique index on the User and the Global
Event allows one such row. A Quest without a Global Event leaves the column empty, so a User holds any number of those.
Attending locks the User's row first, so that two attempts at the same moment run one after the other and the later
finds the Quest of the earlier.

**Leader, capacity and Join Policy.** The Leader is one of the Holders. The capacity, from 1 to 8, is the most Holders
the Quest takes. The Join Policy says how others enter: `open`, whoever can see the Quest joins at once; `approval`,
they ask and the Leader decides; `closed`, only by the Leader's invitation. A Quest starts by how it came to be:

- from attending a Global Event: led by the User, `closed`, capacity 4. The Leader opens it to others by changing the
  Join Policy.
- made by a User: led by the User, with the capacity and the Join Policy given, 4 and `closed` when left out.
- from an accepted Meetup: led by the proposer, `closed`, capacity 4 (see [Meetup](#meetup)).

When the Leader drops the Quest, the Holder who entered earliest leads it. `quest_holders.joined_at` keeps when each
Holder entered. The Leader changes the settings, hands the role over and removes Holders (see below).

**Boards and the description.** An `open` or `approval` Quest is posted on a board, where the list of recruiting Quests
shows it: `meal` (식사), `career` (진로), `hobby` (취미) or `show` (공연). A `closed` Quest is on none. Every Quest,
under any Join Policy, carries a `description` of 0 to 200 characters, its recruiting post, empty by default. A Quest
from attending, from a Meetup or from a match starts Closed, on no board and with an empty description. The Leader sets
both when making the Quest (`POST /quests/own`, which refuses with 400 naming `board` a recruiting Quest without one
and a Closed Quest with one, and naming `description` one over 200 characters) and changes them with
`PATCH /quests/:questId` (below), also for a Quest with a Global Event. The migration checks both rules, so no way of
storing a Quest breaks them.

**The list of recruiting Quests** holds the `open` and `approval` Quests that the reader does not hold and that have a
Sub Quest ahead, the newest first, by `createdAt`; `?board=` narrows it to one board, and a board outside the four is
refused with 400. A Sub Quest is ahead while it is not cancelled and its end time has not passed; a Holder's mark of
done does not count. A `closed` Quest is in no list. Each entry reads:

```json
{
  "id": "…",
  "title": "저녁 같이 먹어요",
  "globalEvent": null,
  "leader": { "id": "…", "name": "홍길동", "department": "컴퓨터공학부" },
  "holderCount": 2,
  "capacity": 4,
  "joinPolicy": "open",
  "board": "meal",
  "description": "학관에서 저녁 먹을 사람",
  "createdAt": "2026-10-06T08:00:00.000Z",
  "nextSubQuest": {
    "id": "…",
    "attending": false,
    "title": "저녁",
    "startsAt": "2026-10-13T09:00:00.000Z",
    "endsAt": null,
    "place": { "placeId": null, "label": "132동 앞", "latitude": 37.45487, "longitude": 126.95407 }
  }
}
```

`nextSubQuest` is the first Sub Quest ahead, in the Quest's order.

**Joining** makes the User a Holder of an `open` Quest at once. Every way into a Quest, joining and those of later
features, ends in `RecruitingService.enter`, which:

- locks the User, then the Quest and the Quest the User holds for its Global Event, in the order of their ids;
- refuses a User who holds the Quest, a Quest without a Sub Quest ahead and a full Quest. The capacity is counted after
  the lock, so two Users taking the last free place at the same moment leave one of them a Holder;
- keeps the one-Quest rule for a Quest with a Global Event: a Quest the User held alone for that event is deleted, with
  its Sub Quests and the User's progress; a User who holds a Shared Quest for it is refused and keeps it until they
  drop it. A Quest without a Global Event has no such rule;
- ends the User's request to join the Quest and invitation into it.

Joining changes no Party.

**Requests to join and invitations.** A User asks to join an `approval` Quest, and the Leader accepts or declines. The
Leader invites a Friend into the Quest whatever its Join Policy, and the Friend accepts or declines. Accepting either
goes through `RecruitingService.enter`, so it is refused as joining is: `QUEST_ENDED`, `QUEST_FULL` and
`SHARED_QUEST_HELD`, while a Quest the User holds alone for the Global Event is replaced. A refused acceptance leaves
the request or the invitation waiting. Both wait until they are answered, or the Leader cancels the invitation, and end
with the Quest and when their User enters that Quest in any way; entering another Quest leaves them. A request stays the
Leader's to accept or decline after the Leader changes the Join Policy, since accepting it is the Leader's own decision,
as an invitation is. The routes:

- `POST /quest-join-requests` with `{ "questId": "..." }` asks to join and answers 201 with the request. A second
  request is refused, so it takes no `Idempotency-Key`. `GET /quest-join-requests` answers the User's waiting requests,
  and `POST /quest-join-requests/:id/withdraw` withdraws one and answers 204.
- `GET /quests/:questId/join-requests` answers the Leader the Quest's requests with who asked,
  `{ "id", "user": { "id", "name", "department" }, "sentAt" }`. `POST /quests/:questId/join-requests/:id/accept` makes
  the User a Holder and `.../decline` ends the request; both answer 204.
- `POST /quests/:questId/invitations` with `{ "userId": "..." }` invites a Friend of the Leader and answers 204.
  `GET /quest-invitations` answers the User's invitations, `POST /quest-invitations/:id/accept` makes the User a Holder
  and answers 201 with the Quest, and `.../decline` ends the invitation and answers 204.
- `GET /quests/:questId/invitations` answers the Leader the Quest's waiting invitations with who was invited,
  `{ "id", "user": { "id", "name", "department" }, "sentAt" }`, as the list of requests reads.
  `DELETE /quests/:questId/invitations/:id` cancels a waiting invitation and answers 204. An invitation that is not
  waiting in this Quest, a repeat included, is refused, so it takes no `Idempotency-Key`. Accepting checks once the
  Quest is locked that the invitation still waits, so an acceptance and a cancel at the same moment leave either a
  Holder or a cancelled invitation.

A request as its User lists it, and an invitation, read `{ "id", "quest": { "id", "title", "globalEvent", "leader",
"holderCount", "capacity", "joinPolicy", "board", "description", "createdAt" }, "sentAt" }`, the Quest as it is now;
the lists are the newest first.

**The Leader's controls**, each refused with `NOT_QUEST_LEADER` for another Holder:

- `PATCH /quests/:questId` with any of `{ "title", "capacity", "joinPolicy", "board", "description" }` changes the
  settings and answers 200 with the Quest. What is left out stays, and the Quest the change leads to is checked: an
  `open` or `approval` Quest without a board, from the body or stored, is refused with `BOARD_REQUIRED`; a `board` in
  a body that leaves the Quest Closed with `BOARD_FOR_CLOSED_QUEST`; a change to `closed` without a board clears the
  stored one, and a `description` of `""` clears it. A Quest with a Global Event keeps the event's title. Making a
  Quest from attending `open` or `approval`, on a board, is how it starts gathering people.
- `PUT /quests/:questId/leader` with `{ "userId": "..." }` hands the role to another Holder and answers 204.
- `DELETE /quests/:questId/holders/:userId` removes a Holder and answers 204. The Holder goes as one who dropped the
  Quest, with their progress, and may enter it again.
- `POST /quests/:questId/end` ends the Quest for every Holder and answers 204: it is deleted with its Sub Quests, the
  Holders' progress, its requests to join and its invitations, as when its last Holder drops it, and a running Party
  for it goes on with `quest: null`. A repeat is refused as a Quest the User does not hold, so it takes no
  `Idempotency-Key`. An entry, an answer or another control at the same moment runs after it and is refused as for a
  Quest that is gone. `DELETE /quests/:questId` stays one Holder's drop.

Accepting a request and removing a Holder lock that User before the Quest, as entering does, and every control checks
the Leader once the Quest is locked, so that a control and a change of Leader at the same moment run one after the
other.

| Refusal                                                               | Status | `code`                            |
| --------------------------------------------------------------------- | ------ | --------------------------------- |
| Asking to join a Closed Quest, or one that does not exist             | 404    | `QUEST_NOT_FOUND`                 |
| Asking to join an Open Quest                                          | 409    | `QUEST_NOT_APPROVAL`              |
| Asking to join a Quest the User holds, or inviting one of its Holders | 409    | `ALREADY_HOLDER`                  |
| Asking to join while holding a Shared Quest for its Global Event      | 409    | `SHARED_QUEST_HELD`               |
| A second request to the same Quest                                    | 409    | `QUEST_JOIN_REQUEST_ALREADY_SENT` |
| A request that is not waiting, or not the User's or the Quest's       | 404    | `QUEST_JOIN_REQUEST_NOT_FOUND`    |
| Inviting a User who is not the Leader's Friend                        | 404    | `FRIEND_NOT_FOUND`                |
| A second invitation of the same User into the Quest                   | 409    | `QUEST_INVITATION_ALREADY_SENT`   |
| An invitation that is not waiting for the User, or in the Quest       | 404    | `QUEST_INVITATION_NOT_FOUND`      |
| A Leader's action by another Holder                                   | 403    | `NOT_QUEST_LEADER`                |
| A Leader's action by a User who does not hold the Quest               | 404    | `QUEST_NOT_FOUND`                 |
| A capacity below the number of Holders                                | 409    | `CAPACITY_BELOW_HOLDERS`          |
| A title for a Quest with a Global Event                               | 409    | `QUEST_TITLE_FROM_GLOBAL_EVENT`   |
| An `open` or `approval` Quest without a board                         | 409    | `BOARD_REQUIRED`                  |
| A `board` for a Quest that stays or becomes Closed                    | 409    | `BOARD_FOR_CLOSED_QUEST`          |
| Handing the role to, or removing, a User who does not hold the Quest  | 404    | `NOT_QUEST_HOLDER`                |

How they are stored: `quests` holds the title, the Global Event, which never changes, `leader_id`, `capacity`, which the
migration checks to be from 1 to 8, `join_policy`, `board` of the type `quest_board`, which a check keeps set exactly
when the Join Policy is not `closed`, and `description`, which a check keeps to 200 characters; `quest_holders` one row
for each Holder, unique for the Quest and the User, with the time the Holder entered; `sub_quests` the Sub Quests,
`attending` marking the one for the Global Event, of which a Quest has at most one; and `sub_quest_progress` one row for
each Sub Quest a Holder marked done, which goes with the Holder's row; `quest_join_requests` and `quest_invitations` one
row for each waiting request and invitation, unique for the Quest and the User, deleted with the Quest. Checks in the
migration keep the attending Sub Quest without title, time and place, the end after the start, and the place a Place, a
point with its label, or neither.

Another feature changes Quests in its own transaction with `QuestsService`, exported by `QuestsModule`. Every change to
one Quest locks it first, so that changes run one after another:

- `lock(questId, tx)` locks the Quest's row until the transaction ends.
- `heldFor(userId, globalEventId, tx)` answers the id of the Quest the User holds for the Global Event, or `null`.
- `createForGlobalEvent(globalEvent, holderIds, tx, settings?)` creates a Quest for the Global Event with these
  Holders and the attending Sub Quest, and answers its id. A Holder who already holds a Quest for the event makes the
  unique index refuse it, so ask `freeForSharedQuest` first. `settings.matchId` names the match server's match the
  Quest is created for (see [Matching](#matching)).
- `createWithSubQuest(subQuest, holderIds, tx, settings?)` creates a Quest without a Global Event with these Holders
  and one Sub Quest, titled as the Sub Quest unless `settings.title` is given, and answers its id.
- Both take `settings` as `{ leaderId?, capacity?, joinPolicy? }`, by default the first Holder, 4 and `closed`. The
  Holders enter in the order given.
- `removeHolder(questId, userId, tx)` removes the Holder with the Holder's progress, passes the Leader's role to the
  Holder who entered earliest when the Leader goes, and deletes the Quest when nobody holds it any more.
- `holderIds(questId, tx)` answers the Holders' User ids in the order they entered.
- `freeForSharedQuest(userId, globalEventId, tx)` answers whether the User may become a Holder of a Shared Quest for
  the Global Event: true when the User holds no Quest for it, or held one alone, which it deletes with its Sub Quests
  and the User's progress; false when the User holds a Shared Quest for it, which stays.
- `holdsSharedQuestFor(userId, globalEventId, tx)` answers whether the User holds a Shared Quest for the Global Event,
  without a lock; entering checks it again.
- `withSubQuestsAhead(questIds, tx?)` answers those of the Quests that have a Sub Quest ahead.
- `columnsOf(content, tx)` turns the body of a Sub Quest into the columns it is stored in, and refuses a `placeId` that
  is not a Place of the list.

What only [Matching](#matching) reads of the Quests is in `MatchingQuestsService`
(`src/quests/matching-quests.service.ts`), which `QuestsModule` exports too:

- `matchingRefusals(requests, tx?)` answers, for each `{ userId, globalEventId }` in order, why that request for
  Matching cannot stand now, as the refusal's code, or `null` when it stands.
- `eligibleQuests(pools)` answers, for `{ globalEventId, size }` pools, the Open Quests of the Global Event whose
  capacity is the size and that have a free place and a Sub Quest ahead, the earliest made first.
- `forMatch(matchId, tx)` answers the id of the Quest created for the match server's match, or `null`.

`RecruitingService`, also exported, has `enter(questId, userId, tx, admits?)`, described above. `admits(quest)` is the
way in's own check, such as the Join Policy, made once the Quest is locked; it throws, or rejects, to refuse. It answers
the Holders to send `quests-changed` to, the User included, once the transaction commits.

`quests-changed` goes to every Holder, the one who acted included, when a Quest is created by attending, made or for a
match, when a Sub Quest is added, edited or cancelled, when a User enters or is placed by Matching, when a Holder drops
the Quest, which may pass on the Leader's role, and when the Leader changes the settings, hands the role over or removes
a Holder, the removed one included. When the Leader ends the Quest, it goes to every Holder and to every User whose
request or invitation was waiting, all read before the Quest is deleted. It goes to the Leader when a request arrives or
is withdrawn and when an invitation is declined, to a User whose request the Leader declines or who declines an
invitation, and to an invited User when invited and when the Leader cancels the invitation. A mark of done is the
Holder's own and sends nothing. The signal carries nothing, and the app fetches `GET /quests`, the requests to join and
the invitations again (see [Signals](#signals)).

In a test, `test/quests.ts` stores a published Global Event with a connection of its own, since no route creates one
yet, and calls the routes above; `test/quest-recruiting.ts` calls those of requests, invitations and the Leader's
controls. `storeSharedQuest()` stores a Quest with
several Holders the same way, led by the first.

## Matching

A User asks for Matching on a Global Event with a group size and goes on using the app while the request waits. The
match server keeps the requests in its own database, and the app never calls it: this server decides whether a request
can be made and passes it on, and passes on withdrawals and reads. The routes, all a User's:

- `POST /matching-requests` with `{ "globalEventId": "...", "size": 3 }` asks and answers 201 with the request, which
  waits. It passes the User, the Global Event, the size and the User's interest hashtags, the profile's `hashtags`, on
  to the match server. A repeat is refused while the first request waits, so it takes no `Idempotency-Key`.
- `GET /matching-requests` answers the User's open requests, those that wait, oldest first.
- `GET /matching-requests/:globalEventId` answers the User's latest request for the Global Event, in whatever state.
- `POST /matching-requests/:globalEventId/withdraw` withdraws the waiting request and answers 204.

A request reads:

```json
{ "globalEventId": "…", "size": 3, "state": "matched", "arrivedAt": "2026-10-04T08:00:00.000Z", "questId": "…" }
```

- `state` is `waiting`, `matched`, `withdrawn` or `expired`. Only a waiting request can be withdrawn. The match server
  matches requests and expires those that no longer stand in its rounds (see below).
- `arrivedAt` is when the match server stored it.
- `questId` is the Quest of a matched request: the Open Quest it was placed into, or its match's Shared Quest, `null`
  until this server has created that. It is `null` for a request in any other state.
- Once a request no longer waits, the User may ask again, and the new request is the one read.

A request can be made for a published Global Event that has not started, with a size from 2 to 4, by a User who holds
no Shared Quest for the event. A User who holds a Quest for it alone can ask, and so can a member of a Party. An event
has started once its start is at or before `now()` of `CLOCK` (see [Quests](#quests)). A published Global Event without
a start time counts as not started. The refusals each have a `code`:

| Refusal                                                        | Status | `code`                         |
| -------------------------------------------------------------- | ------ | ------------------------------ |
| A size outside 2 to 4                                          | 400    | `MATCHING_SIZE_OUT_OF_RANGE`   |
| A Global Event that is unknown or not published                | 404    | `GLOBAL_EVENT_NOT_FOUND`       |
| A Global Event that has started                                | 409    | `GLOBAL_EVENT_STARTED`         |
| A User who holds a Shared Quest for the Global Event           | 409    | `SHARED_QUEST_HELD`            |
| A request while the User's request for the event waits         | 409    | `MATCHING_REQUEST_WAITING`     |
| Reading or withdrawing when the User never asked for the event | 404    | `MATCHING_REQUEST_NOT_FOUND`   |
| Withdrawing a request that is not waiting                      | 409    | `MATCHING_REQUEST_NOT_WAITING` |

The last three are the match server's refusals, passed on as it gives them. A size that is not a whole number gets 400
with a message naming the field, as any body that does not match.

When the match server cannot be reached, answers anything else, or has not answered within 5 seconds, the app gets 502
`{ "statusCode": 502, "error": "Bad Gateway", "message": "The match server did not answer." }`, without a `code`, so
that it tells the failure apart from a refusal. The server logs a warning with the call and the reason, such as
`The match server did not answer POST /users/…/matching-requests: TimeoutError: …`. This server stores nothing for a
request. When only the answer was lost, the match server has stored the request, and the app sees it when it reads the
request again.

`MatchServer` in `src/matching/match-server.ts` makes the calls: HTTP requests to `MATCH_SERVER_URL`, each of which
reaches one match server however many run, with `Authorization: Bearer <MATCH_SERVER_TOKEN>`. That secret, of at least
32 characters, is in both servers' settings, and the match server's calls to this server carry it too. The match
server's README describes its routes. Whether requests still stand is one question, which the rounds ask again:
`MatchingQuestsService.matchingRefusals()` (see [Quests](#quests)).

**The match server's rounds.** Every minute the match server asks which of its waiting requests still stand, places
some into Open Quests that are gathering, groups the rest and asks this server for one Shared Quest for each group, a
match; its README describes the rounds. It calls four routes, marked `@MatchServerOnly()` from
`src/common/match-server-only.decorator.ts`. `MatchServerGuard` in `src/auth/match-server.guard.ts` answers 401 to any call without `Authorization: Bearer <MATCH_SERVER_TOKEN>`, a
User's, an Administrator's and the worker's included. The bodies are checked as every body is.

- `POST /matching-requests/standing` with `{ "requests": [{ "userId": "…", "globalEventId": "…" }] }` answers 200 with
  `{ "standing": [...] }`, the requests that still stand in the order given: their Global Event is published and has
  not started, and their User holds no Shared Quest for it. It is `MatchingQuestsService.matchingRefusals()`, which
  also decides whether a User may ask, and it stores nothing.
- `POST /matching-requests/eligible-quests` with `{ "pools": [{ "globalEventId": "…", "size": 3 }] }`, sizes 2 to 4,
  answers 200 with `{ "quests": [{ "id", "globalEventId", "capacity", "freePlaces", "holderIds", "createdAt" }] }`,
  the earliest made first: the Open Quests of each pool's Global Event whose capacity is the size, that have a free
  place and a Sub Quest ahead. `holderIds` are in the order the Holders entered, so that the match server never places
  a User into a Quest the User holds. An Approval or a Closed Quest is never answered. It is
  `MatchingQuestsService.eligibleQuests()`, and it stores nothing.
- `POST /matching-requests/placements` with `{ "questId": "…", "userId": "…", "size": 3 }` places the User into the
  Quest and answers 201 with `{ "questId": "…", "holderIds": [...] }`, the Holders the User included (see below).
- `POST /matches/:matchId/quest` with `{ "globalEventId": "…", "userIds": ["…", "…"] }`, two to four Users, creates
  the match's Shared Quest and answers 201 with `{ "questId": "…", "holderIds": [...] }`. The match server repeats the
  request until it is answered, so the match identifier is stored with the Quest, `quests.match_id`, unique in the
  database, and a repeat answers the Quest created the first time, also after its Global Event has started.

Creating the Quest locks the matched Users in id order first, as attending locks one, so that an attend or another
match at the same moment runs before or after it. A matched User who holds a Quest for the Global Event alone becomes a
Holder of the new one, and the Quest held alone is deleted with its Sub Quests and the User's progress. A matched User
who holds a Shared Quest for it keeps that one and is left out, so `holderIds` names the Users who hold the new Quest.
`matching-changed` and `quests-changed` go to them once the Quest is stored, and to nobody on a repeat. The match server
expires the request of a User left out.

The match server names the Users in the order their requests arrived, and the Holders enter in that order, so the free
User whose request arrived earliest leads the Quest. It is `closed`, and its capacity is the match's size, the number
of Users named, those left out included.

Each refusal ends the match, and the match server asks no more:

| Refusal                                                  | Status | `code`                   |
| -------------------------------------------------------- | ------ | ------------------------ |
| The Global Event is unknown or no longer published       | 404    | `GLOBAL_EVENT_NOT_FOUND` |
| The Global Event has started                             | 409    | `GLOBAL_EVENT_STARTED`   |
| Fewer than two matched Users are free for a Shared Quest | 409    | `MATCH_TOO_SMALL`        |

A refused request changes nothing: a Quest held alone is deleted only with the Shared Quest that replaces it.

A placement is a way into a Quest like joining, and goes through `RecruitingService.enter()` (see [Quests](#quests)):
the User is locked first, the capacity is checked inside the transaction that adds the Holder, a Quest the User held
alone for the Global Event is deleted with its Sub Quests and the User's progress, and the Holder enters last.
`matching-changed` goes to the User and `quests-changed` to the Holders, the User included, once the Holder is stored.
A User who already holds the Quest, such as one who joined it after the match server read the eligible Quests, is
answered as entered with the Holders as they are, and no signal goes out. The match server then names the Quest in the
request. Each refusal leaves the request waiting in the match server, which decides it again in its next round:

| Refusal                                                    | Status | `code`                   |
| ---------------------------------------------------------- | ------ | ------------------------ |
| The Quest is unknown                                       | 404    | `QUEST_NOT_FOUND`        |
| The Quest is no longer Open                                | 409    | `QUEST_NOT_OPEN`         |
| The Quest's capacity is no longer the size                 | 409    | `QUEST_CAPACITY_DIFFERS` |
| The Quest has no Sub Quest ahead                           | 409    | `QUEST_ENDED`            |
| The Quest is full                                          | 409    | `QUEST_FULL`             |
| The User holds a Shared Quest for the Global Event by then | 409    | `SHARED_QUEST_HELD`      |

In a test, give `startApp` a `MatchServerStub` from `test/match-server.ts` in place of the HTTP call to the match
server, and give the stub the answer to send back:

```ts
const matchServer = new MatchServerStub();
const app = await startApp(inject('settings'), [], refuseKakao, matchServer.fetch);
matchServer.answers('GET', `/users/${user.id}/matching-requests`, 200, []);
matchServer.refuses('POST', `/users/${user.id}/matching-requests`, 409, 'MATCHING_REQUEST_WAITING');
```

The stub keeps each call in `calls`, with its method, path, body and `Authorization` header. A call it was given no
answer for fails, as one to a match server that is down, and `hangs()` never answers. A route for the match server is
called with its token by `postAsMatchServer(app, path, body)`, as `test/matching-quests.e2e-spec.ts` does.

## Meetup

A Meetup is a proposal from one Friend to another to meet. Accepting it gives both a Shared Quest. The routes, all a
User's:

- `POST /meetups` proposes a Meetup and answers 201 with it. It requires an `Idempotency-Key` (see
  [Making a handler safe to repeat](#making-a-handler-safe-to-repeat)). The body:
  `{ "receiverId": "...", "title": "점심", "startsAt": "...", "endsAt": "...", "place": ... }`. `receiverId` is the
  Friend's User id, as `GET /friends` gives it. The title, the times and the place are those of a Sub Quest (see
  [Quests](#quests)), except that the start and the place are required and the start must be in the future. `endsAt`
  is optional.
- `GET /meetups` answers the Meetups proposed to the User and those the User proposed, the newest first:
  `{ "received": [...], "sent": [...] }`, every state included.
- `POST /meetups/:id/accept` and `POST /meetups/:id/decline` answer a Meetup proposed to the User, and
  `POST /meetups/:id/withdraw` withdraws one the User proposed. Each answers 204 and takes a Meetup only while it is
  proposed.

No route edits a Meetup: the proposer withdraws it and proposes another. A Meetup reads:

```json
{
  "id": "…",
  "title": "점심",
  "startsAt": "2026-10-13T03:00:00.000Z",
  "endsAt": "2026-10-13T04:00:00.000Z",
  "place": { "placeId": null, "label": "자하연 앞", "latitude": 37.4601, "longitude": 126.9512 },
  "state": "proposed",
  "proposer": { "id": "…", "name": "홍길동", "department": "컴퓨터공학부" },
  "receiver": { "id": "…", "name": "김철수", "department": "경제학부" }
}
```

`place` reads as a Sub Quest's does. `state` is one of:

| State       | When                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| `proposed`  | Proposed, and its start has not passed                                  |
| `accepted`  | The receiver accepted it                                                |
| `declined`  | The receiver declined it                                                |
| `withdrawn` | The proposer withdrew it, or the friendship ended while it was proposed |
| `expired`   | Proposed, and its start has passed                                      |

**Expiry** is computed when a Meetup is read, at `now()` of `CLOCK` (see [Quests](#quests)), and nothing is written:
the stored state stays `proposed`.

**Accepting** creates one Quest held by both Friends, without a Global Event and without a Party, titled as the Meetup,
with one Sub Quest that has the Meetup's title, start, end and place. The proposer leads it, and it is `closed` with
capacity 4. From then on it is a Quest like any other: either Holder adds, edits or cancels Sub Quests, marks them done
for themselves alone, and drops it. The Meetup only records that it was accepted.

The refusals each have a `code`:

| Refusal                                                                                                 | Status | `code`                |
| ------------------------------------------------------------------------------------------------------- | ------ | --------------------- |
| Proposing to a User who is not a Friend, or to oneself                                                  | 404    | `FRIEND_NOT_FOUND`    |
| Proposing with a start that has passed                                                                  | 400    | `MEETUP_START_PASSED` |
| A `placeId` that is not a Place of the list                                                             | 404    | `PLACE_NOT_FOUND`     |
| An answer to a Meetup that is not proposed to the User, or a withdrawal of one the User did not propose | 404    | `MEETUP_NOT_FOUND`    |
| An answer or a withdrawal once the Meetup is no longer proposed, expired included                       | 409    | `MEETUP_NOT_PROPOSED` |

How they are stored: `meetups` holds one row for each Meetup, with the proposer, the receiver, its content and one of
the four states that are stored. A check in the migration keeps the place a Place or a point with its label. Every
change locks both Users' rows in the order of their ids first, as a change to a friendship does, and a Meetup leaves
`proposed` only once, so two accepts at the same moment create one Quest, and no Meetup stays proposed between two
Users who are no longer Friends.

`meetups-changed` goes to both Friends when a Meetup is proposed, accepted, declined or withdrawn, and when ending the
friendship withdraws one. On accepting, `quests-changed` goes to both too. The signals carry nothing, and the app
fetches `GET /meetups` again (see [Signals](#signals)).

## Party

A Party is the group of Users who are together now: a title, a capacity from 1 to 8, a Join Policy, a Leader, its
members and, when it was opened for one, its Quest. A User is in at most one Party. A Party is opened by hand: a Holder
opens the Party of one of their Quests when the time comes, or a User opens one tied to no Quest to be with Friends.
The opener is its Leader and first member. When the Leader leaves, the member who entered earliest becomes Leader, and
the Party ends when its last member leaves or when the Leader ends it. It never ends by itself. The routes, all a User's:

- `POST /parties` with `{ "title": "설명회 같이", "capacity": 4, "joinPolicy": "open", "questId": "..." }` opens a
  Party and answers 201 with it. The title has 1 to 50 characters; `capacity` is 4 and `joinPolicy` (`open`,
  `approval` or `closed`) is `closed` when left out; `questId`, the Party's Quest, is optional and names a Quest the
  opener holds whose Sub Quests are not all passed. The Party's Quest never changes. A repeat is refused as a User in
  a Party, so it takes no `Idempotency-Key`.
- `GET /parties` answers the Parties the User can see and is not in, the newest first (see below).
- `POST /parties/:partyId/join` makes the User a member and answers 201 with the Party.
- `GET /parties/mine` answers the User's Party.
- `POST /parties/mine/leave` takes the User out of their Party and answers 204.
- `PUT /parties/mine/sharing` with `{ "on": false }` turns the User's switch for the Party off, `{ "on": true }` on, and
  answers 204.

The User's Party reads:

```json
{
  "id": "…",
  "title": "설명회 같이",
  "capacity": 4,
  "joinPolicy": "open",
  "quest": {
    "id": "…",
    "title": "지능형통신 연합전공 설명회",
    "globalEvent": { "id": "…", "title": "지능형통신 연합전공 설명회" }
  },
  "sharing": true,
  "members": [
    { "id": "…", "name": "홍길동", "department": "컴퓨터공학부", "leader": true, "visible": true },
    { "id": "…", "name": "김철수", "department": "경영학과", "leader": false, "visible": false }
  ]
}
```

- `quest` is `null` for a Party tied to no Quest, and becomes `null` when the last Holder drops the Quest or its Leader
  ends it; the Party goes on. Its `globalEvent` is `null` for a Quest without one.
- `sharing` is the reading User's own switch for the Party. The members are in the order they entered, the reading
  User among them, and `visible` says whether the reading User can see each on the map now, never why not (see
  [Location Sharing](#location-sharing)).

**Who can see a Party.** There is no public list of Parties and none for a Global Event. A User sees the running Party
of each Quest they hold and the Parties their Friends are in, whatever their Join Policy. `GET /parties` answers them,
without the User's own:

```json
[
  {
    "id": "…",
    "title": "설명회 같이",
    "memberCount": 2,
    "capacity": 4,
    "joinPolicy": "approval",
    "quest": { "id": "…", "title": "지능형통신 연합전공 설명회", "globalEvent": { "id": "…", "title": "…" } },
    "leader": { "id": "…", "name": "홍길동" },
    "holdsQuest": false,
    "friends": [{ "id": "…", "name": "김철수", "department": "경영학과" }]
  }
]
```

`leader` is the Party's Leader now, its opener until the role passes. `holdsQuest` says whether the reading User holds
the Party's Quest, and `friends` are the reading User's Friends among the members, in the order they entered. No
position is in the list.

**Who enters.**

- A Holder of the Party's Quest enters at once with `POST /parties/:partyId/join`, whatever the Join Policy.
- A Friend of any member enters an `open` Party at once with `POST /parties/:partyId/join`, asks to enter an
  `approval` Party, which the Leader accepts or declines, and enters a `closed` Party only by invitation.
- The Leader invites a Friend of theirs or a Holder of the Party's Quest, whatever the Join Policy, and the invited
  User enters on accepting.
- Anyone else is answered as for an unknown Party, so that a Party stays hidden from those who cannot see it.

Every entry holds only within the capacity, counted in the transaction that adds the member after the Party is locked.

**Requests to enter** an Approval Party, the asking User's routes:

- `POST /party-join-requests` with `{ "partyId": "..." }` asks to enter and answers 201 with the request as
  `GET /party-join-requests` lists it. Whoever can see the Party may ask, a Holder of its Quest too, though they can
  enter at once instead. A User in another Party may ask, and must have left it by the time the Leader accepts. A
  repeat is refused as a request already sent, so it takes no `Idempotency-Key`.
- `GET /party-join-requests` answers the User's waiting requests, the newest first, each with the Party as
  `GET /parties` shows it: `[{ "id", "party": { "id", "title", "memberCount", … }, "sentAt" }]`.
- `POST /party-join-requests/:id/withdraw` ends the request and answers 204.

And the Leader's:

- `GET /parties/mine/join-requests` answers the requests to the Leader's Party, the newest first:
  `[{ "id", "user": { "id", "name", "department" }, "sentAt" }]`.
- `POST /parties/mine/join-requests/:id/accept` adds the User who asked and answers 204, and
  `POST /parties/mine/join-requests/:id/decline` ends the request and answers 204. A request stays when the Leader
  changes the Join Policy, and the Leader may still accept or decline it: accepting is the Leader's own decision, as
  an invitation is.

**Invitations.** The Leader invites into the Party, whatever its Join Policy:

- `POST /parties/mine/invitations` with `{ "userId": "..." }` invites a Friend of the Leader, by the User id
  `GET /friends` gives, or a Holder of the Party's Quest, and answers 204. A User in another Party may be invited, and
  must have left it by the time they accept. A repeat is refused as an invitation already sent, so it takes no
  `Idempotency-Key`.
- `GET /party-invitations` answers the invitations of the User, the newest first, each with the Party as
  `GET /parties` shows it and its Leader now:
  `[{ "id", "party": { "id", "title", "memberCount", … }, "leader": { "id", "name", "department" }, "sentAt" }]`.
- `POST /party-invitations/:id/accept` makes the User a member and answers 201 with the Party, and
  `POST /party-invitations/:id/decline` ends the invitation and answers 204.

A request and an invitation wait until they are answered. They end when the Party ends and when their User enters any
Party, by any way in or by opening one. Ending this way sends no signal of its own.

**Entering a Party changes no Quest.** A User who enters, by any way, without holding the Party's Quest does not
become its Holder, and a Quest the User holds for the same Global Event stays. Joining the plan goes through the Quest
([Quests](#quests)). Leaving, a removal and the Party's end leave every Quest as it is, and dropping or ending the
Party's Quest leaves the membership as it is.

**The Leader's controls**, each refused for another member:

- `PATCH /parties/mine` with any of `{ "title", "capacity", "joinPolicy" }` changes those and answers 200 with the
  Party. A field left out stays as it is, and the Party's Quest never changes. A capacity below the number of members
  is refused.
- `PUT /parties/mine/leader` with `{ "userId": "..." }` hands the role to that member and answers 204.
- `DELETE /parties/mine/members/:userId` removes that member and answers 204. A removed member may enter again.
- `POST /parties/mine/end` ends the Party for every member and answers 204: every member is taken out, and the Party is
  deleted with its requests and invitations, as when its last member leaves. A repeat is refused as a User in no Party,
  so it takes no `Idempotency-Key`. It locks every member, in the order of their ids, and then the Party, so a User
  entering or leaving at the same moment runs before or after it; after it, entering gets `PARTY_NOT_FOUND` and
  leaving `NOT_IN_PARTY`.

The refusals each have a `code`:

| Refusal                                                                   | Status | `code`                          |
| ------------------------------------------------------------------------- | ------ | ------------------------------- |
| Opening or entering while in a Party, also the same one                   | 409    | `ALREADY_IN_PARTY`              |
| A Quest that is no stored Quest the opener holds                          | 404    | `QUEST_NOT_FOUND`               |
| A Quest whose Sub Quests have all passed                                  | 409    | `QUEST_ENDED`                   |
| A Quest that a running Party has; `partyId` in the body names the Party   | 409    | `PARTY_EXISTS_FOR_QUEST`        |
| Entering, or asking to enter, a Party not running or hidden from the User | 404    | `PARTY_NOT_FOUND`               |
| A Friend of a member entering an `approval` or `closed` Party             | 409    | `PARTY_NOT_OPEN`                |
| Entering, or accepting a request or invitation into, a full Party         | 409    | `PARTY_FULL`                    |
| Reading, leaving, switching or an action of the Leader while in no Party  | 404    | `NOT_IN_PARTY`                  |
| Asking to enter an `open` or `closed` Party                               | 409    | `PARTY_NOT_APPROVAL`            |
| Asking to enter, or inviting into, a Party the User is a member of        | 409    | `ALREADY_MEMBER`                |
| Asking to enter a Party the User's request already waits for              | 409    | `JOIN_REQUEST_ALREADY_SENT`     |
| An answer to a request that is not waiting for it from this User          | 404    | `JOIN_REQUEST_NOT_FOUND`        |
| Inviting a User neither the Leader's Friend nor a Holder of the Quest     | 404    | `INVITEE_NOT_FOUND`             |
| Inviting a User whose invitation into the Party already waits             | 409    | `PARTY_INVITATION_ALREADY_SENT` |
| An answer to an invitation that is not waiting for this User              | 404    | `PARTY_INVITATION_NOT_FOUND`    |
| An action of the Leader by another member                                 | 403    | `NOT_PARTY_LEADER`              |
| A capacity below the number of members                                    | 409    | `CAPACITY_BELOW_MEMBERS`        |
| Handing the role to, or removing, a User who is not a member              | 404    | `NOT_PARTY_MEMBER`              |

A Class Quest is computed and never stored, so giving it as the Party's Quest gets `QUEST_NOT_FOUND`. A body that does
not match gets 400 with a message naming the field.

**Two rules the database enforces.** `party_members` is unique on the User, so a User is in one Party at most, and
`parties` is unique on its Quest, `quest_id`, so one running Party has a Quest. An ended Party's row is deleted with its
members, its requests and its invitations, so a new Party can be opened for the Quest. Besides, every change to a
membership locks the row of the User who enters or goes and then the Party's, also when the Leader accepts a request or
removes a member, whose role is checked once the Party is locked; and opening the Party of a Quest locks the Quest. So
two Users taking the last free place, by any way in, one User entering two Parties and two Holders opening a Party for
one Quest run one after the other: the later is refused with its code.

**Which Sub Quests are ahead.** For the Quest given at opening, a Sub Quest is ahead while it is not cancelled and its
end time has not passed at `now()` of `CLOCK`, the same for every Holder. A mark of done is one Holder's own, so it does
not stop the opening.

**Location Sharing.** A common Party is a relationship of [Location Sharing](#location-sharing): two members see each
other while both have the Party's switch on, which starts on with each membership. Holding the Party's Quest is no
relationship: a Holder shares nothing with the Party until they enter it. Leaving, a removal and the switch are wrapped
in `VisibilityService.announceRemovals`, so `position-removed` goes at once to and about the member; the Party's end
wraps its change around all the members, so it goes for every sight the end takes away.

How they are stored: `parties` holds the title, the capacity, which a check keeps from 1 to 8, the Join Policy, the
shared `join_policy` type of Quests, the Leader and the Quest, which becomes empty when its Quest is deleted;
`party_members` one row for each member, with the time they entered and their switch; `party_join_requests` and
`party_invitations` one row for each waiting request and invitation, each unique on the Party and the User and deleted
with the Party.

`party-changed` carries nothing, and the app fetches `GET /parties/mine`, `GET /parties`, the requests and the
invitations again (see [Signals](#signals)). It goes:

- to the members, the Holders of the Party's Quest and the Friends of its members when a Party opens, when a User
  enters by any way, when a member leaves or is removed, the one who went and their Friends included, when the Leader
  changes the settings and when the Party ends, also by the Leader's end, to the audience it had before;
- to the members when the Leader hands the role over;
- to the Leader when a request arrives or is withdrawn;
- to the User who asked when the Leader declines, and to the invited User when invited and when they decline.

`PartiesService`, in `src/parties/`, is where every way in and out goes:

- `admit(party, userId, tx)` adds a member within the capacity, refuses a User in a Party and a full Party, and ends
  the User's requests and invitations. Every way into a Party ends here, after the User's row and then the Party's are
  locked; opening ends them too.
- `removeMember(party, userId, tx)` takes a member out, hands the Leader's role on and ends the Party with its last
  member. Every way out ends here, after the same locks and inside `VisibilityService.announceRemovals` for the User.
- `audienceOf(party, tx)` answers who hears of a change to the Party: its members, the Holders of its Quest and the
  Friends of its members. `admit` answers it after the change and `removeMember` before; send `party-changed` to it
  once the transaction commits.
- `canSee(party, userId, tx)` says whether the User is a Holder of the Party's Quest or a Friend of a member.

`LeaderService.ledBy(userId)` answers the Party the User leads, read without a lock, and `lockLed(partyId, userId, tx)`
locks it and refuses unless the User still leads it.

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
  Korean order of their names. `id` is the same in every database and never changes, so a class's time or a Meetup
  can point at it (`docs/adr/0002-place-ids-computed-from-the-source.md`).

- An Administrator reads the same list at `GET /admin/places` (see [Global Events](#global-events)).
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

The app asks the same lookup for a point a User picks on the map, so that a Meetup or a Sub Quest shows a name instead
of coordinates:

- `GET /places/at?latitude=37.45016&longitude=126.95259` with a User's access token answers the Place at the position,
  in the form of the list, and its `relation`, `inside` or `near` as above:

  ```json
  {
    "place": { "id": "1b7e…", "number": "301", "name": "제1공학관", "latitude": 37.45016, "longitude": 126.95259 },
    "relation": "inside"
  }
  ```

  A position farther than 20 m from every Place is answered `{ "place": null, "relation": "none" }`. The answer comes
  from the lookup's memory, without a database query.

- A coordinate that is missing, is not a decimal number, or lies outside -90 to 90 for a latitude or -180 to 180 for a
  longitude gets 400 with a message that starts with the field.

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

## Timetable

A User's timetable is the User's classes, and nothing else is stored for it. A User keeps one timetable from semester
to semester and resets it when a semester ends. A class is a course name and one or more times, so a course held on
Monday in one room and on Wednesday in another is one class with two times. The routes name no User, so they never
reach another User's classes:

- `GET /timetable/classes` answers the classes. A User without classes reads `[]`.

  ```json
  [
    {
      "id": "8c1d…",
      "courseName": "컴파일러",
      "times": [
        {
          "id": "51e0…",
          "weekday": "monday",
          "startTime": "10:00",
          "endTime": "11:15",
          "placeId": "4f6c…",
          "room": "101호"
        },
        {
          "id": "c93a…",
          "weekday": "wednesday",
          "startTime": "13:00",
          "endTime": "14:15",
          "placeId": null,
          "room": null
        }
      ],
      "overlaps": [{ "id": "2b7e…", "courseName": "데이터베이스" }]
    }
  ]
  ```

  The classes are in the order of their first time in the week, and a class's times in the order of the week, Monday
  first, then by start.

- `POST /timetable/classes` with `courseName` and `times`, without the identifiers and `overlaps`, adds a class and
  answers 201 with it. It requires an `Idempotency-Key` (see
  [Making a handler safe to repeat](#making-a-handler-safe-to-repeat)), because nothing stops a User from having two
  classes with the same fields.
- `PUT /timetable/classes/:classId` with the whole class replaces it and answers 200 with it. The class keeps its
  identifier, and its times get new ones.
- `DELETE /timetable/classes/:classId` deletes a class with its times and answers 204.
- `DELETE /timetable/classes` resets the timetable: it deletes every class of the User and answers 204, also when there
  were none. It needs no key, since a repeat changes nothing.

A class's fields and their limits, set in `src/timetable/dto/save-class.dto.ts`. A value outside them gets 400 with a
message that starts with the field, such as `times.1.endTime: `, as the [profile's](#profile) do, and nothing changes:

- `courseName`: 1 to 30 characters, with the spaces around dropped.
- `times`: 1 to 10 times. Two times that share a weekday and cross each other are refused, and the message names the
  later one, `times.2: Invalid time: crosses times.1 on the same weekday`. Times that touch do not cross.
- `weekday` of a time: one of `monday` to `sunday`.
- `startTime` and `endTime`: times of day in Asia/Seoul as `HH:MM`, from `00:00` to `23:59`. The end is after the
  start.
- `placeId`: the `id` of a Place of the [list](#places), or `null` or left out for a time without a Place.
- `room`: up to 20 characters, with the spaces around dropped, or `null`. A room left out, empty or only spaces is
  stored as `null`.

A User holds at most 15 classes, however many times they have. An add counts them and inserts the class in one
transaction that locks the User's row (`UsersService.lock`), so adds at the same moment are counted one after another
and stop at the limit.

Two classes overlap when a time of one and a time of the other share a weekday and each starts before the other ends;
times that touch do not overlap. An overlap is allowed. `overlaps` names each other class a class overlaps, in the
order of the timetable, in the answer to an add or a replacement and for every class of `GET /timetable/classes`.

The refusals each have a `code`:

| Refusal                                              | Status | `code`            |
| ---------------------------------------------------- | ------ | ----------------- |
| A `placeId` that is not a Place of the list          | 404    | `PLACE_NOT_FOUND` |
| An add when the User has 15 classes                  | 409    | `TIMETABLE_FULL`  |
| Replacing or deleting a class the User does not have | 404    | `CLASS_NOT_FOUND` |

Another User's class is answered as an unknown one is, before the body's Places are checked, so a replacement naming a
Place not in the list is not found too. The body's shape is checked before the handler runs, for any class, so a body
that does not match gets 400 whoever's the class is.

How they are stored: `timetable_classes` holds one row for each class, with its User and course name, and
`class_times` one row for each time, deleted with its class. A time's `weekday` is the enum `weekday`, which sorts in
the order of the week.

Other modules read the classes through `TimetableService` (`src/timetable/timetable.service.ts`): `classesOf(userId)`
answers the User's classes, each with its times in the order of the week and each time's Place, and
`isClassOf(userId, classId, db?)` whether an identifier is one of the User's classes. The Quest list shows each class
held today as a Class Quest, computed from these and never stored (see [Quests](#quests), Class Quests).

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
│   ├── signals.module.ts            makes SignalsService available to every feature
│   ├── signals.service.ts           sends a signal to the apps of the Users named, through the socket servers
│   ├── redis.module.ts              makes a Redis client available to every feature
│   ├── redis-idempotency.store.ts   keeps the results of requests safe to repeat in Redis
│   ├── route-access.ts              who may call a route: anyone, a User, an Administrator, the worker or the match
│   │                                server
│   ├── public.decorator.ts          @Public(): opens a route to requests without an access token
│   ├── allow-before-onboarding.decorator.ts  @AllowBeforeOnboarding(): opens a User's route before onboarding
│   ├── administrator-only.decorator.ts  @AdministratorOnly(): gives a route to Administrators
│   ├── worker-only.decorator.ts     @WorkerOnly(): gives a route to the worker server
│   ├── match-server-only.decorator.ts  @MatchServerOnly(): gives a route to the match server
│   ├── current-user.decorator.ts    @CurrentUser(): the signed-in User in a handler
│   └── current-administrator.decorator.ts  @CurrentAdministrator(): the signed-in Administrator
├── generated/                       Prisma Client, generated by `pnpm install` (not committed)
├── health/                          a feature: the liveness and readiness checks
├── auth/                            a feature: app and admin site sign-in, refresh, sign-out, the access token checks
├── users/                           a feature: the signed-in User, their profile, Friend ID and onboarding
├── friends/                         a feature: Friend IDs looked up, Friend Requests and Friends
├── invite-links/                    a feature: Invite Links, and the Digital Asset Links file that opens them in the app
├── location-sharing/                a feature: the Master Switch, the positions uploaded, kept and pushed, and who
│                                    sees whom
├── lobby/                           a feature: what the app needs when it starts
├── administrators/                  a feature: the Administrators, who register and remove each other
├── collection/                      a feature: each Source's Collection status, and the worker's reports of failure
├── global-events/                   a feature: the Global Events, and the events the worker collects
├── parties/                         a feature: Parties, who sees, enters and leaves them, the Leader's controls and the switches
├── quests/                          a feature: Quests, their Holders, Sub Quests, each Holder's progress and joining
├── meetups/                         a feature: Meetups between Friends, and the Shared Quest an accepted one gives
├── matching/                        a feature: requests for Matching, checked and passed on to the match server, and
│                                    the Shared Quests of its matches
├── menus/                           a feature: the menus the worker collects, stored and served by day
├── walking-route/                   a feature: a walking route between two points, asked of Kakao on each request
├── places/                          a feature: the Places of the seed, listed and searched, and the Place at a
│                                    position
├── shuttle/                         a feature: the shuttle's stops and line of the seed, the route page's places and
│                                    hours, and the vehicles the worker collects, served and sent to the socket server
└── timetable/                       a feature: a User's timetable, the classes and their times
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

## Signals

When one User changes something another User's app shows, the main server sends a signal, and the socket server
passes it to that User's app. A feature sends one with `SignalsService` from `src/common/signals.service.ts`, which
every module can inject:

```ts
this.signals.send([userId, friendUserId], 'friends-changed');
this.signals.send('everyone', 'global-events-changed');
```

- `send(to, name, payload?)` names the Users the signal is for, or `'everyone'` for every connected app, the signal's
  name and what it carries, if anything. An empty list of Users sends nothing.
- Call it once what the signal announces is stored, after the transaction has committed. It does not wait: a lost
  signal is logged as a warning, and the app catches up when it connects, reconnects or returns to the front.
- It goes over messaging as one event, `signal`, with `{ "userIds": [...], "name": "...", "payload": ... }`, without
  `userIds` for every connected app and without `payload` when it carries nothing. Every socket server receives it and
  sends it under `name` to the connections of those Users. The socket server knows no signal by name, so a new signal
  needs no change there; the [socket server's README](../socket-server/README.md#signals) lists each signal with what
  the app does on it.
- In a test, `SignalWatcher` from `test/signals.ts` collects the signals put on Redis, as
  `test/friend-signals.e2e-spec.ts` does.

`session-ended` and `shuttle-vehicles-updated` are events of their own, not signals, which the socket server handles by
name (see [Sign-in](#sign-in) and [Shuttle](#shuttle)).

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
  times tell whether the Source has worked since. `GET /admin/collection-statuses` serves it to Administrators (see
  [Global Events](#global-events)).
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
