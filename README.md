# SNU Now

SNU Now is a social map for Seoul National University's Gwanak campus. A student signs in with an SNU Google account
and sees, on Kakao's map of the campus, the Global Events of the university, their Friends and the members of their
Party moving as Avatars, today's menus and the shuttle. Around an event or a plan of their own, a User makes a Quest
and finds companions for it: by recruiting on a Board, by asking for Matching or by proposing a Meetup to a Friend.
When the time comes, they open a Party and see each other on the map until they meet. The words used here are
defined in [GLOSSARY.md](GLOSSARY.md); the app's screens are in Korean.

The system is an Android app, four servers (main, socket, worker and match) with PostgreSQL and Redis, and an admin
site for Administrators.

## What the demo demonstrates

### Goal of Iteration 1

A runnable Android prototype in which a student joins a Party for a campus event and locates its members on the map.
The prototype was meant to validate that:

- the campus's existing data can be collected without anyone's help: the university's events list, three restaurants'
  menu pages and the shuttle operator's vehicle positions;
- live positions travel from one phone through the servers to another within seconds, only between Users who agreed
  to share, and only on campus;
- Kakao's map can be shown in a React Native app through a native module of our own, with Avatars that glide;
- strangers interested in the same event can be grouped by Matching into a Shared Quest, and then into a Party;
- the four servers work together: the three demo flows below run end to end against the built servers in CI
  (`flow-tests`).

### Features of Iteration 1

- **Sign-in and Onboarding**: Sign in with Google, for SNU accounts only; Onboarding with a name and department
  suggested from the Google account; one Session per User, so a sign-in on another phone signs the first one out.
- **The map**: Kakao's map of the campus with the User's Avatar, Friends, Party members, Global Events, the Places'
  outlines, a card for whatever is pressed, and a walking route to a place on request.
- **Friends**: Friend Requests by Friend ID, Invite Links sent through any messenger, a sharing switch per Friend,
  and ending a friendship.
- **Location Sharing**: the Master Switch on 내 정보, the position sent every 5 seconds while the app is open and,
  on Android, every 30 seconds in the background under a notification; Avatars dimmed after 2 minutes without a
  position and removed after 10; nobody shown outside the Campus Boundary.
- **Quests and Matching**: Quests for a Global Event or a plan of the User's own, with Sub Quests; recruiting on the
  식사, 진로, 취미 and 공연 Boards with a Join Policy; join requests and invitations; Matching for a Global Event in
  groups of 2 to 4, run in rounds every minute; Meetups between Friends that become Shared Quests.
- **Parties**: a Party opened for a Quest, entered by its Holders, with its plan, its members on the map and the
  Leader's controls.
- **Timetable**: classes entered with their times and Places; today's classes appear as Class Quests.
- **Global Events and the admin site**: events collected four times a day from the university's events list and
  published when their time and place are read; on the admin site, Administrators review Drafts, correct and publish
  them, create and cancel events, see the Places on a map, see each Source's Collection status, and make or end
  friendships between Users for demo accounts.
- **Dining and shuttle**: a dining layer with today's menus of the Co-op's restaurants, the dormitory and the
  veterinary college, a menu panel for the next seven days, and a shuttle layer with the loop's 14 stops, its line and
  the vehicles moving from stop to stop.
- **Demo data**: a Compose profile that fills the system with demo Users, events, Quests, a Party, menus and moving
  Avatars, so that every screen has something to show with a single phone.

### The three demo flows

Each flow is what a User does with the app on campus, on two phones, or on one phone with the demo data.

1. **Event**: two Users sign in. An Administrator publishes a Global Event on the admin site. Both Users choose the
   event and ask for Matching in a group of two. Within a minute both see the same Shared Quest. One opens the Quest's
   Party and the other enters it. Each sees the other's Avatar move on the map. One taps the Quest and sees the
   walking route to the event.
2. **Friend**: one User sends an Invite Link through a messenger. The other opens it and accepts. Both see each
   other's Avatar. One proposes a Meetup and the other accepts it. Both see the Shared Quest it made.
3. **Campus services**: a User turns on the dining layer and reads today's menus. The User turns on the shuttle layer
   and watches a vehicle move along the route (weekdays from 08:00 to 21:00, or at any time with the demo data).

To run the demo yourself: [Setup](#setup), [Running the servers](#running-the-servers) with the
[demo data](#demo-data), [Running the admin site](#running-the-admin-site) to publish an event, and
[Running the app](#running-the-app) on a phone on campus.

## Demo video

_The link to the demo video is added here once it is recorded._

## Known limitations and todos

What the demo cannot show, and what is known not to work yet:

- **Android only.** The demo is an Android APK. The app also builds for iOS (see [mobile/README.md](mobile/README.md),
  "Build the app for iOS"), but iOS sends no position in the background and was not part of the demo.
- **ARM only.** Kakao's map SDK ships ARM libraries only, so the app is built for `arm64-v8a` alone. It runs on an
  ARM phone or an arm64 emulator (an Apple Silicon Mac), not on the x86_64 emulator of an Intel Mac or most Windows PCs:
  use a physical Android phone there.
- **Expo Go shows no map.** In Expo Go and on the web the map is a plain ground, the sign-in is a mock and every answer
  is the app's sample data. Kakao's map, Google sign-in and the servers need a development build.
- **Background sharing stops when the app is swiped away.** It runs on Android only, in a build of the app (not Expo
  Go), while the app is open or in the background. A User who swipes the app away stops it, and the app says so when
  opened again. On Android 13 and later the app does not ask for the notification permission, so the service's
  notification may not show, although the sharing runs.
- **Shuttle positions are computed.** The operator reports each vehicle as a point on its own drawing of the route,
  always at a stop. The main server places the vehicle at the nearest stop, and the app moves it along the line to
  the next stop; between stops the position is an estimate. There are no arrival times, and vehicles are shown only
  in the operator's service hours, weekdays from 08:00 to 21:00 in term time.
- **Collected events wait for an Administrator** unless the rules read both their time and their place: a start
  with a time of day from the post's body, and a place that names exactly one Place. Every other collected event is a
  Draft until an Administrator publishes it on the admin site. A post is read once, so a later edit at the source is
  not seen, and a post that describes several sessions is one event.
- **Users outside the Campus Boundary are hidden** from everyone, by design: a demo must be run on campus. The app's
  development settings can replace the phone's position with a walk on campus ([mobile/README.md](mobile/README.md),
  "Development settings").
- **No dashed lines on the native map.** Neither the Android nor the iOS map module draws dashes, so the walking
  route and the shuttle's line are solid in a build.
- **Some checks by hand on phones are not done yet.** The Party room and its members on the map and the shuttle
  layer in a native build were checked on an iPhone 14 Pro and a Galaxy S22, and Google sign-in on the Galaxy. Two
  still wait for a person with phones: Invite Links opened from a messenger, and background sharing (the list of
  P17). The P20 walk-through records them.
- **Registrations a person makes at Google and Kakao.** A build signed with any key other than the shared debug key
  needs that key registered: its SHA-1 in an Android OAuth client of the Google Cloud project, with the package name
  `com.bonnieandclaude.snunow`; its key hash at Kakao under the app's Android platform; and its SHA-256 in the main
  server's `ANDROID_CERTIFICATE_FINGERPRINTS` for Invite Links. Without the first, sign-in fails; without the second,
  the map stays blank. The admin site works only on `http://localhost:3100`, the origin registered for its Google
  client and its Kakao key.
- **Invite Links need a fixed https address.** Links are built from the main server's public address. If the tunnel's
  address changes on restart, links made before stop working. A build without the link host opens links only through
  `snunow://`.
- **The walking route has a quota** of 1,000 routes a day for the team's Kakao app; a route is asked only when the
  User asks for one.
- **Sample data in a build.** Friends' statuses (such as 공강), who announced a Global Event and "오늘의 발자국" are the
  app's own sample data even against the servers: no server serves them yet.
- **Not built in Iteration 1** and planned for later iterations: Private Zones; chat inside a Party; a Party for no
  Quest, entering a Friend's Party, and requests and invitations into a Party; reading event posts with AI; a profile
  photo, interests on events and notification settings; terms (semesters) in the timetable, whose Class Quests are
  today's only; cafés and other restaurants in the dining layer; arrival estimates for the shuttle; deployment to a
  cloud environment.
- **Slow tests under load.** A few Jest tests of the app can exceed their 60 seconds on a busy machine; they pass when
  their file is run alone.

## Development and execution environment

What the project was built and run with:

| Part                   | Used                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Development machine    | macOS on Apple Silicon                                                                             |
| Node.js and pnpm       | Node.js 24 (24.21.0), pnpm 12.6.0                                                                  |
| Containers             | Docker Desktop (Docker 29, Compose 5), `compose.yaml` at the repository root                       |
| Servers                | NestJS 12 on Node.js 24 in containers; Prisma 7; Socket.IO 4                                       |
| Data stores            | PostgreSQL 18 with PostGIS 3, Redis 8                                                              |
| Admin site             | Next.js 16 with React 19, in a desktop browser                                                     |
| App                    | Expo SDK 57, React Native 0.86, Expo Router; a local Expo module around Kakao Maps SDK             |
| Android build          | JDK 17 (Temurin), Android SDK Platform and Build-Tools 36, Gradle 9.3.1 through the wrapper        |
| Android devices        | Emulator: Android 16 (API 36), Google Play, `arm64-v8a`; ARM Android phones                        |
| iOS build (not demo)   | Xcode 27 with the iOS 27 simulator, CocoaPods 1.17                                                 |
| Continuous integration | GitHub Actions on `ubuntu-latest`: the four checks of every project and `flow-tests`, on each push |

## Requirements

- Node.js 24. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root.
- pnpm 12.6.0, the version each `package.json` declares. If `pnpm -v` prints another version, type `npx pnpm@12.6.0`
  wherever this guide says `pnpm`.
- Docker with Docker Compose 2.24 or later, running.
- `git` and `openssl`, which macOS and Linux have.
- For the app's build: JDK 17, Android Studio with Android SDK Platform and Build-Tools 36, Platform-Tools and the
  Emulator ([mobile/README.md](mobile/README.md), "Build the app for Android", "Tools").
- An ARM Android phone, or an arm64 emulator with Google Play, with a Google account signed in.
- The team's Kakao keys (REST API, JavaScript and native app keys), which the Owner of the team's Kakao app shares
  privately, and an SNU Google account to sign in to the app.
- About 30 GB of free disk space. On one Mac the Android build's Gradle cache took about 10 GB, Docker's images and
  build cache about 15 to 20 GB, and an iOS build's Xcode cache about 3 GB. When the disk fills, Docker stops with
  input/output errors.

## Setup

From a clean clone, in this order. The project READMEs explain each step. On a Mac whose Desktop and Documents are
synced to iCloud Drive, clone elsewhere, such as `~/Developer`: a checkout under them cannot be built for iOS
([mobile/README.md](mobile/README.md), "Keep the checkout out of iCloud Drive").

```bash
git clone https://github.com/snuhcs-course/swpp-2026-project-team-09.git
cd swpp-2026-project-team-09
nvm install
nvm use
```

The main server's settings, with an access token key pair and the two shared secrets of your own:

```bash
cd main-server
pnpm install
cp .env.example .env
pnpm keys:generate >> .env
echo "WORKER_TOKEN=$(openssl rand -hex 32)" >> .env
echo "MATCH_SERVER_TOKEN=$(openssl rand -hex 32)" >> .env
cd ..
```

Then open `main-server/.env`, fill in `KAKAO_REST_API_KEY`, and replace the example address in
`INITIAL_ADMINISTRATOR_EMAILS` with your Google account's address, so that you can sign in to the admin site. The
main server reads it only when it starts on a database that holds no Administrator: once the servers have run with
the example address, a new address is not taken until the data is deleted with `docker compose down -v`.

The other servers take the same public key and secrets from it:

```bash
cd socket-server
pnpm install
cp .env.example .env
grep '^ACCESS_TOKEN_PUBLIC_KEY=' ../main-server/.env >> .env
cd ../worker-server
pnpm install
cp .env.example .env
grep '^WORKER_TOKEN=' ../main-server/.env >> .env
cd ../match-server
pnpm install
cp .env.example .env
grep '^MATCH_SERVER_TOKEN=' ../main-server/.env >> .env
cd ..
```

The admin site and the app:

```bash
cd admin
pnpm install
cp .env.example .env
cd ../mobile
pnpm install
cp .env.example .env
cd ..
```

Fill in `admin/.env` and `mobile/.env` as [Settings](#settings) says. `pnpm install` in a server is needed only to
generate keys, run the server outside Docker or run its tests; Docker builds the images with their own.

## Settings

Each project reads its own `.env`, copied from its `.env.example`, which Git ignores. Every setting is listed here by
name; the values are in the `.env.example` files, the project READMEs or with the Owner of the team's Kakao app. Under
`docker compose`, the addresses, ports and database URLs of the servers are set in `compose.yaml` and override the
file's.

### main-server

| Setting                            | What it is                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PORT`                             | The port the HTTP server listens on.                                                               |
| `DATABASE_URL`                     | The main database, reached with the main server's own role.                                        |
| `REDIS_HOST`                       | Redis's host, which carries messaging between the servers.                                         |
| `REDIS_PORT`                       | Redis's port.                                                                                      |
| `ACCESS_TOKEN_PRIVATE_KEY`         | The private key that signs access tokens; written by `pnpm keys:generate`, never shared.           |
| `ACCESS_TOKEN_PUBLIC_KEY`          | The public key of the same pair, which the socket server is given; written by the same command.    |
| `GOOGLE_APP_CLIENT_ID`             | The app's Google OAuth client; already in `.env.example`.                                          |
| `GOOGLE_ADMIN_CLIENT_ID`           | The admin site's Google OAuth client, which must differ from the app's; already in `.env.example`. |
| `INITIAL_ADMINISTRATOR_EMAILS`     | The Administrators registered when the database holds none; your own address.                      |
| `KAKAO_REST_API_KEY`               | The REST API key of the team's Kakao app, for walking routes; a secret the Owner shares.           |
| `WORKER_TOKEN`                     | The secret the worker server sends with what it collects; generated in [Setup](#setup).            |
| `PUBLIC_URL`                       | The address the apps reach this server at from outside, from which Invite Links are built.         |
| `ANDROID_CERTIFICATE_FINGERPRINTS` | The SHA-256 fingerprints of the app's signing certificates, for Invite Links' App Links.           |
| `MATCH_SERVER_URL`                 | Where the match server is reached.                                                                 |
| `MATCH_SERVER_TOKEN`               | The secret the main and match servers send each other; generated in [Setup](#setup).               |
| `DEMO_ACCOUNT_EMAILS`              | Read by the demo profile only: real SNU addresses that get demo Friends, requests and a Meetup.    |

### socket-server

| Setting                   | What it is                                                                     |
| ------------------------- | ------------------------------------------------------------------------------ |
| `PORT`                    | The port of the HTTP server and the Socket.IO connections.                     |
| `REDIS_HOST`              | Redis's host.                                                                  |
| `REDIS_PORT`              | Redis's port.                                                                  |
| `ACCESS_TOKEN_PUBLIC_KEY` | The main server's public key, copied from `main-server/.env`, to check tokens. |

### worker-server

| Setting           | What it is                                                        |
| ----------------- | ----------------------------------------------------------------- |
| `PORT`            | The port the HTTP server listens on.                              |
| `MAIN_SERVER_URL` | Where the main server is reached, to hand over what is collected. |
| `WORKER_TOKEN`    | The same line as in `main-server/.env`.                           |

### match-server

| Setting                  | What it is                                                    |
| ------------------------ | ------------------------------------------------------------- |
| `PORT`                   | The port the HTTP server listens on.                          |
| `DATABASE_URL`           | The match database, reached with the match server's own role. |
| `MATCH_SERVER_TOKEN`     | The same line as in `main-server/.env`.                       |
| `MAIN_SERVER_URL`        | Where the main server is reached.                             |
| `ROUND_INTERVAL_SECONDS` | The seconds from one round of Matching to the next.           |

### admin

| Setting                            | What it is                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `MAIN_SERVER_URL`                  | The main server's address, read on the site's server only.                     |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`     | The admin site's Google client: the main server's `GOOGLE_ADMIN_CLIENT_ID`.    |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | The JavaScript key of the team's Kakao app, for the maps; the Owner shares it. |

### mobile

| Setting                            | What it is                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The Google client of type "Web application" the ID token is issued for: the main server's `GOOGLE_APP_CLIENT_ID`. Without it the sign-in stays the mock. |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | The Google client of type "iOS"; the iOS build only.                                                                                                     |
| `GOOGLE_IOS_URL_SCHEME`            | The iOS client's ID reversed; the iOS build only.                                                                                                        |
| `EXPO_PUBLIC_MAIN_SERVER_URL`      | The main server's address as the phone reaches it. Without it the app keeps its sample data.                                                             |
| `EXPO_PUBLIC_SOCKET_SERVER_URL`    | The socket server's address as the phone reaches it.                                                                                                     |
| `INVITE_LINK_HOST`                 | The host of the main server's `PUBLIC_URL`, for Invite Links' App Links; read when the build is made.                                                    |
| `KAKAO_NATIVE_APP_KEY`             | The native app key of the team's Kakao app, for the map; the Owner shares it; read when the build is made.                                               |

The app also takes development settings when it is started, such as answers that fail on purpose; they are in
[mobile/README.md](mobile/README.md), "Development settings".

## Running the servers

In the repository root, with Docker running:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis and the four servers. The main server brings its database up to date and loads the seed
(the Places, the Campus Boundary and the shuttle's stops and line) before it starts. The main server answers on port
3000 and the socket server on 3001, on the network too, so that a phone can reach them; the worker (3002), the match
server (3003), PostgreSQL and Redis only on the loopback address. Anyone on the same network can reach the two ports
over plain http, so on a public Wi-Fi run the servers only while you use them. `http://localhost:3000/health/ready`
answers 200 once the main server can reach its stores.

- `docker compose down` removes the containers and keeps the data; `docker compose down -v` deletes the data too,
  with the collected Global Events, what Administrators did with them and the Administrators themselves.
- A setting that is missing or wrong stops its server with the setting's name in the log, for example when
  `KAKAO_REST_API_KEY` is empty.
- To fill the menus without waiting for the next Collection, at 05:00 or 10:00:
  `docker compose exec worker-server node dist/collect coop_menus dormitory_menus veterinary_menus`.
- To fill the Global Events without waiting for the next Collection, at 00:00, 06:00, 12:00 or 18:00:
  `docker compose exec worker-server node dist/collect snu_events`. Until then the admin site shows the Source as
  never collected.
- To run one server outside Docker while you work on it, see its README, "Run it".

### Demo data

To try every feature at once, start the system with the demo profile:

```bash
docker compose --profile demo up --build
```

It adds 8 demo Users and their friendships, 6 published Global Events today and this week, recruiting Quests on every
Board, a running Party, this week's menus and, outside the shuttle's hours, two shuttle vehicles, and keeps the demo
Users' Avatars walking along the shuttle's line on campus. List your own SNU address in `DEMO_ACCOUNT_EMAILS` of
`main-server/.env` before starting: once you have finished Onboarding, you receive demo Friends (the Party's members
among them), two Friend Requests, a Quest invitation and a Meetup within 5 seconds. A `main-server/.env` made before
the setting existed has no such line: add it, as in `.env.example`.
`docker compose --profile demo restart demo-seed` brings the times up to date, and
`docker compose --profile demo down -v` removes it all. The details are in
[main-server/README.md](main-server/README.md#demo-data).

## Running the admin site

With the servers running and `admin/.env` filled in:

```bash
cd admin
pnpm dev
```

Open http://localhost:3100 and sign in with Google, with an account whose address is registered as an Administrator:
on a new database, the addresses of `INITIAL_ADMINISTRATOR_EMAILS`. The port must stay 3100, the one registered with
Google and Kakao. See [admin/README.md](admin/README.md).

## Running the app

### In Expo Go, without a build

```bash
cd mobile
pnpm start
```

Press `a` for a running Android emulator, or scan the QR code with Expo Go on a phone. Every screen runs against the
app's sample data, with a mock sign-in and no map (a plain ground): enough for the screens, not for the demo flows.

### A development build on an emulator

The build holds the native map module and Google sign-in, and talks to the servers. In `mobile/.env`, fill in
`KAKAO_NATIVE_APP_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and give `EXPO_PUBLIC_MAIN_SERVER_URL` and
`EXPO_PUBLIC_SOCKET_SERVER_URL` the addresses the emulator reaches your computer at, `http://10.0.2.2:3000` and
`http://10.0.2.2:3001`. Create and start an emulator with the system image Android 16.0 (API 36), Google Play,
arm64-v8a, sign in to a Google account on it, then:

```bash
cd mobile
pnpm android
```

It generates `android/`, builds and installs the app and starts the development server. The first build takes 15 to
30 minutes. After a change to `KAKAO_NATIVE_APP_KEY` or `INVITE_LINK_HOST`, generate the project again with
`pnpm expo prebuild --platform android`. The two server addresses are read when the development server starts: after
a change to them, such as when the computer's address on the network changes, restart it and reload the app, with no
new build. When the map stays blank, [mobile/README.md](mobile/README.md), "When the map does not appear", reads the
log.

### On a phone

Turn on Developer options and USB debugging, connect the phone, check that `adb devices` lists it, and run
`pnpm android --device` to choose it.

The phone must reach the main and socket servers:

- A development build allows plain http, so on the same network as the computer the two addresses can be the
  computer's address on that network, with ports 3000 and 3001. For an Invite Link to open on another phone there,
  set the main server's `PUBLIC_URL` to `http://<that address>:3000` and restart the main server: a link built from
  the default `http://localhost:3000` opens nothing on a phone.
- Otherwise, and for any build that is not a debug build, such as the demo APK, Android refuses plain connections:
  put the computer's ports 3000 and 3001 behind an https tunnel and use its two https addresses in `mobile/.env`. Set
  the main server's `PUBLIC_URL` to the tunnel's address for the main server and `INVITE_LINK_HOST` to its host, so
  that Invite Links open the app.

A debug build loads its JavaScript from the development server on the computer (port 8081), which `pnpm android`
starts: keep its terminal open, and keep the phone on the cable or on the same network as the computer. Without it the
app shows an error screen, on iOS "No script URL provided".

Positions are shared only inside the Campus Boundary, so the flows are run on campus.

### Keys registered with the signing key

Google and Kakao accept the app only when they know the key that signed it:

- A development build is signed with the Expo template's debug key, which every checkout shares. Its key hash is
  registered at Kakao, and its SHA-256 is already in the main server's `ANDROID_CERTIFICATE_FINGERPRINTS`. Google
  sign-in needs an Android OAuth client in the Google Cloud project with the package name
  `com.bonnieandclaude.snunow` and the key's SHA-1.
- A build signed with another key, such as the demo APK's or one signed on EAS, needs the same three registrations
  for its key: the SHA-1 at Google, the key hash at Kakao and the SHA-256 in `ANDROID_CERTIFICATE_FINGERPRINTS`.
  `.scratch/research/external-sources.md`, sections 7.2 and 8, has the commands that read them.

### The demo APK

_The link to the demo APK, and the server address built into it, are added here when the demo build is made._

## Running the tests

Each project has the same four checks, which CI runs on every push. Run them in the project's folder:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

| Project         | What `pnpm test` runs and needs                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `main-server`   | Vitest against PostgreSQL and Redis containers it starts itself; Docker running                              |
| `socket-server` | Vitest against a Redis container it starts itself; Docker running                                            |
| `worker-server` | Vitest on saved pages of each Source; no Docker                                                              |
| `match-server`  | Vitest against a PostgreSQL container it starts itself; Docker running                                       |
| `admin`         | Vitest: page tests in jsdom, and tests against a build of the site with a fake main server                   |
| `mobile`        | Jest, against the mocks and a fake main server and socket                                                    |
| `flow-tests`    | The three demo flows across the four built servers, under a Compose project of its own; Docker and `openssl` |

`flow-tests` builds the servers' images the first time, which takes some minutes, and leaves a running stack and its
data alone: [flow-tests/README.md](flow-tests/README.md).

## Repository layout

| Folder           | What it holds                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `main-server/`   | The main server: sign-in, Users, Friends, Quests, Parties, Location Sharing, events, the seed |
| `socket-server/` | The socket server: pushes positions and signals to the apps over Socket.IO, keeps no data     |
| `worker-server/` | The worker server: collects the events list, the menus and the shuttle on a schedule          |
| `match-server/`  | The match server: keeps the requests for Matching and groups them in rounds                   |
| `admin/`         | The admin site for Administrators                                                             |
| `mobile/`        | The app, with the native map module for Android and iOS in `modules/`                         |
| `flow-tests/`    | Tests of the three demo flows across the four servers                                         |
| `infra/`         | The PostgreSQL image with PostGIS, and the script that creates each server's database         |
| `docs/`          | Architecture decision records (`adr/`) and the agents' conventions (`agents/`)                |
| `.scratch/`      | Specs and tickets of each iteration's tasks, and research notes                               |
| `.github/`       | The CI workflow, the pull request template and the code owners                                |
| `.claude/`       | Shared skills for coding agents; `.agents/` links to them                                     |

## Data sources and attribution

| Source                                                                                                                | Used for                                                                   | Terms                                           |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| © OpenStreetMap contributors, through Overpass                                                                        | The Campus Boundary, the shuttle's line, two Places and some outlines      | [ODbL](https://www.openstreetmap.org/copyright) |
| 국토지리정보원, 연속수치지형도 건물 (2026), from VWorld                                                               | The outlines of the campus's buildings and the Places the campus map lacks | 공공누리 제1유형 (source must be shown)         |
| SNU campus map, `map.snu.ac.kr`                                                                                       | The Places and the shuttle stops' coordinates                              | No terms published                              |
| Kakao                                                                                                                 | The map in the app and the admin site, and walking routes; nothing stored  | Kakao's terms and operating policy              |
| SNU Co-op (`snuco.snu.ac.kr`), 관악학생생활관 (`snudorm.snu.ac.kr`), College of Veterinary Medicine (`vet.snu.ac.kr`) | The menus                                                                  | Collected from public pages                     |
| SNU's events list, `www.snu.ac.kr/snunow/events`                                                                      | The Global Events                                                          | Collected from public pages                     |
| The shuttle operator's route page and vehicle positions, `web.busin.co.kr` (route 41946)                              | The shuttle's stops, service hours and vehicles                            | Collected from public pages                     |
| Pretendard                                                                                                            | The app's font                                                             | SIL Open Font License 1.1                       |

The app shows "© OpenStreetMap · 국토지리정보원" on every map, with a screen that names both sources and their
licences. Each seed file in `main-server/seed/` records where it came from and when it was exported. No coordinate
comes from Kakao's, Naver's or Google's maps.

## Links

- [The team's Wiki](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki): the proposal, the requirements
  and specifications, the design documentation and the meeting log.
- [GLOSSARY.md](GLOSSARY.md): the project's words. [docs/adr/](docs/adr/): its architecture decisions.
- Each project's README: [main-server](main-server/README.md), [socket-server](socket-server/README.md),
  [worker-server](worker-server/README.md), [match-server](match-server/README.md), [admin](admin/README.md),
  [mobile](mobile/README.md) and [flow-tests](flow-tests/README.md).
