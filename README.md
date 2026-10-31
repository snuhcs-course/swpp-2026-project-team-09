# SNU Now

SNU Now is a social map for Seoul National University's Gwanak campus. A student signs in with an SNU Google account
and sees, on Kakao's map of the campus, the Global Events that an Administrator checked, their Friends and the members
of their active party moving as Avatars, the places of today's classes, today's menus and the shuttle. A student who
wants company for an event joins or opens a party (파티) for it, on a Board or among invited Friends; Friends plan
together in a private party (비공개 파티) with a place and a time. About to meet, any member activates the party
(활성 파티), and those who accept see each other on the map until they part. An AI assistant, "SNU Now AI", answers
about menus, the shuttle, events and recruiting parties and sets up a party from one sentence, and a screenshot of a
timetable becomes classes, read on the phone. The app's screens are in Korean.

In this README, as in the team's documents, a **party** is any gathering of Users, its **active party** is the members
who share their locations now, and a **Quest** is only an item of the User's to-do list. The code, the API and the
database keep their Iteration 1 names, and so does [GLOSSARY.md](GLOSSARY.md), which defines them: a party is a Quest
(`quests`), its members are Holders, its steps (일정) are Sub Quests, and an active party is a Party (`parties`).

The system is an Android and iOS app, four servers (main, socket, worker and match) with PostgreSQL and Redis, and an
admin site for Administrators.

## Table of contents

- [What the demo demonstrates](#what-the-demo-demonstrates)
- [Demo video](#demo-video)
- [Known limitations and todos](#known-limitations-and-todos)
- [Development and execution environment](#development-and-execution-environment)
- [Requirements](#requirements)
- [Setup](#setup)
- [Settings](#settings)
- [Running the servers](#running-the-servers)
- [Running the admin site](#running-the-admin-site)
- [Running the app](#running-the-app)
- [Running the tests](#running-the-tests)
- [Deployment](#deployment)
- [Repository layout](#repository-layout)
- [AI-generated code](#ai-generated-code)
- [Data sources and attribution](#data-sources-and-attribution)
- [Links](#links)

## What the demo demonstrates

### Goal of Iteration 2

The Iteration 1 review asked for more technical depth in one main feature, ideally solved with AI, and a clearer story
about Friends and parties. Iteration 2 answered it, and its work was merged into `2.0/Main` between 2026-10-17 and
2026-10-23. It was meant to show that:

- a student can ask in their own words instead of finding the screen: the Assistant answers from the collected data,
  shows events and parties as the app's own cards, and fills in a party that the User makes with one press, while the
  model never writes anything and never receives a location;
- a timetable screenshot can become classes on the phone, in light and dark mode, without sending the image anywhere;
- a plan with a Friend is a party like any other: the Meetup was retired, and a Friend's card opens a 비공개 파티 with
  the Friend invited;
- the 파티 tab, the party form, the room and the to-do list follow the wireframes;
- the system runs outside a laptop: the Dev Server deploys `development` by itself once its server checks pass, and
  Production runs on Amazon EKS in AWS, deployed by Release tags.

### Features at the end of Iteration 2

- **Sign-in and Onboarding**: Sign in with Google, for SNU accounts only; a consent screen; Onboarding with a name and
  department suggested from the Google account; one Session per User, so a sign-in on another phone signs the first one
  out.
- **The map**: Kakao's map of the campus with the User's Avatar, Friends, the active party's members, Global Events and
  the User's parties, the Places' outlines, the 퀘스트 list of today's classes and parties, a card for whatever is
  pressed, one marker for everything at one place (events, parties, restaurants and shuttle stops) whose card lists
  each kind, and a walking route on request.
- **Location Sharing**: the Master Switch (친구와 위치 공유) on 내 정보, off until the User turns it on; a switch for
  each Friend and each active party; the position sent every 5 seconds while the app is open and, on Android, every 30
  seconds in the background under a notification; Avatars dimmed after 2 minutes without a position and removed after
  10; nobody shown outside the Campus Boundary, and no history kept.
- **Friends**: Friend Requests by Friend ID, one-time Invite Links sent through any messenger, a sharing switch per
  Friend, and ending a friendship.
- **Parties (파티)**: a party for a Global Event or a plan of the User's own, with a capacity of 1 to 8 and a Join
  Policy: 공개 파티 recruit on the 식사, 진로, 취미 and 공연 Boards (바로 참여 or 승인 후 참여), 비공개 파티 only
  among invited Friends. The 파티 tab with 찾기, the Boards, 내 파티 and 초대, moved between by a sideways swipe; a
  card in 찾기 opens its post; 참여 중인 파티 on 내 정보 opens 내 파티 as a screen of its own; join requests and invitations, with
  waiting invitations the Leader can cancel; the room with the party's steps (일정), walking times, the Leader's
  controls and the hand-over of the Leader's role.
- **Active party (활성 파티)**: any member activates the party when they are about to meet; the members who accept see
  each other on the map, Friends or not, until they pause, leave or the Leader ends it. A User is in at most one.
- **Navigation**: on Android, a swipe from the screen's left edge goes back, as the back button does, and closes an
  open panel or sheet; inputs rise above the keyboard everywhere.
- **SNU Now AI**: a chat sheet from the map's input bar that answers about today's menus and the shuttle, finds Global
  Events and recruiting parties, and turns one sentence into a Proposal that the
  User makes or edits. 50 messages per User a day; the conversation stays on the phone.
- **Timetable**: classes entered with their times and Places, or imported from an SNUTT or 에브리타임 screenshot read
  on the phone; up to 10 timetable versions on the phone; a week grid from 09 to 22 on 내 정보; today's classes appear
  as Quests on the map.
- **Global Events and the admin site**: events collected four times a day from the university's events list and
  published shortly after each Collection when their time and place are read; on the admin site, Administrators review Drafts, correct and publish
  them, create and cancel events, see the Places on a map, see each Source's Collection status, and make or end
  friendships between Users for demo accounts.
- **Dining and shuttle**: a dining layer with today's menus of the Co-op's restaurants, the dormitory and the
  veterinary college, a menu panel for the next seven days, and a shuttle layer with the loop's stops, its line and the
  vehicles moving from stop to stop.
- **Demo data**: a Compose profile that fills the system with demo Users, events, parties on every Board, an active
  party, menus and moving Avatars, so that every screen has something to show with a single phone.

AI 매칭, which grouped strangers interested in the same event, was frozen in Iteration 2: its button still shows on the
행사 tab and the match server still runs, but no user story describes it and it gets no new work. Whether it is removed
is an open decision.

### The three demo flows

Each flow is what a User does with the app on campus, on two phones, or on one phone with the demo data.

1. **Event**: two Users sign in. An Administrator publishes a Global Event on the admin site. One User posts a 공개 파티
   for the event and the other joins it. One activates the party and the other joins in. Each sees the other's Avatar
   move on the map. One taps the party and sees the walking route to the event.
2. **Friend**: one User sends an Invite Link through a messenger. The other opens it and accepts. Both see each
   other's Avatar. One makes a 비공개 파티 from the other's card and the other accepts the invitation. Both see the
   party under 내 파티.
3. **Campus services**: a User turns on the dining layer and reads today's menus. The User turns on the shuttle layer
   and watches a vehicle move along the route (weekdays from 08:00 to 21:00, or at any time with the demo data).

To run the demo yourself: [Setup](#setup), [Running the servers](#running-the-servers) with the
[demo data](#demo-data), [Running the admin site](#running-the-admin-site) to publish an event, and
[Running the app](#running-the-app) on a phone on campus.

### Iteration 1, as history

Iteration 1 built a runnable Android prototype in which a student joins a group for a campus event and locates its
members on the map. It validated that the campus's data can be collected without anyone's help, that live positions
travel between phones within seconds and only between Users who agreed, that Kakao's map works in React Native
through a native module of our own, and that the four servers work together. Its Meetup between Friends was retired in
Iteration 2, and its Matching became the frozen AI 매칭.

## Demo video

The Iteration 2 demo is in [this Google Drive folder](https://drive.google.com/drive/folders/1LnGPIOsQbjt4Or9v-cogjmvhMoUhx7y6),
the same folder as Iteration 1's videos.
In this video:

- Checking friends' status
- Campus info (menus and the shuttle bus)
- Accepting a party request from a friend
- Looking for events
- My page (내 정보)
- Making an appointment using the AI assistant

## Known limitations and todos

What the demo cannot show, and what is known not to work yet:

- **No background sharing on iOS.** The app runs on Android and iOS (see [mobile/README.md](mobile/README.md), "Build
  the app for iOS"), and the Iteration 1 videos were recorded on an iPhone, but sharing in the background is built for
  Android alone, and the APKs are Android builds.
- **ARM only.** Kakao's map SDK ships ARM libraries only, so the app is built for `arm64-v8a` alone. It runs on an
  ARM phone or an arm64 emulator (an Apple Silicon Mac). On the x86_64 emulator of an Intel Mac or most Windows PCs, a
  development build made with `ANDROID_X86_64=1` adds `x86_64` and runs everything but Kakao's map; for the map, use a
  physical Android phone there.
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
  not seen, and a post of the events list that describes several sessions is one event.
- **Users outside the Campus Boundary are hidden** from everyone, by design: a demo must be run on campus. The app's
  development settings can replace the phone's position with a walk on campus ([mobile/README.md](mobile/README.md),
  "Development settings").
- **No dashed lines on the native map.** Neither the Android nor the iOS map module draws dashes, so the walking
  route and the shuttle's line are solid in a build.
- **An Invite Link that starts the stopped app opens the map** instead of the accept screen, on Android. With the app
  running, the same link opens the accept screen. The device run M2 found it at the end of Iteration 2 (Testing
  Documentation, 2.2); it is to be fixed in Iteration 3.
- **Targets not yet measured on phones.** The latency, scalability and stopping times of the non-functional
  requirements (a position on a viewer's map within 2 seconds, 10 Users at once, an Avatar removed within 2 seconds)
  are stated and not measured; they are measured in Iteration 3.
- **Registrations a person makes at Google and Kakao.** A build signed with any key other than the shared debug key
  needs that key registered: its SHA-1 in an Android OAuth client of the Google Cloud project, with the package name
  `com.bonnieandclaude.snunow`; its key hash at Kakao under the app's Android platform; and its SHA-256 in the main
  server's `ANDROID_CERTIFICATE_FINGERPRINTS` for Invite Links. Without the first, sign-in fails; without the second,
  the map stays blank. The admin site works only on `http://localhost:3100` and on Production's
  `https://admin.snunow.com`, the origins registered for its Google client and its Kakao key.
- **Invite Links open the app only under a fixed https address.** Links are built from the main server's public
  address, and Android opens the app only for links under the https host the build was made with. Production gives
  that address: the Production APK is built with `INVITE_LINK_HOST=api.snunow.com`. A link under a computer's own
  address or the Dev Server's, over http, opens the browser, not the app, and a build without the link host opens links
  only through `snunow://invite/<token>`. If a tunnel's address changes on restart, links made before stop working.
- **Plain http is allowed in every build**, so that a build reaches the servers on one's own computer and the Dev
  Server, which answers over http. Todo, once only Production is used: remove `usesCleartextTraffic` from
  `mobile/app.json`.
- **The walking route has a quota** of 1,000 routes a day for the team's Kakao app; a route is asked only when the
  User asks for one.
- **Sample data in a build.** Friends' statuses (such as 공강), who announced a Global Event and "오늘의 발자국" are the
  app's own sample data even against the servers: no server serves them yet.
- **Kept on the phone only.** The party form's 사진 and 태그 and the room's 파티 채팅 are kept on the phone that made
  them: the main server stores none of them yet, so other members do not see them. Timetable versions other than the
  current one belong to one phone, and while a switch runs the server's timetable is empty or partial for a few
  seconds. The + button (올리기) answers "준비 중이에요", and the legal texts of the consent screen are being written.
- **SNU Now AI.** Its answers depend on the model, and how often it picks the right tools is measured only when a
  developer runs the benchmark (`pnpm eval` in `main-server/`), which no run has reported yet. Replies are not
  streamed, a conversation is lost when the app restarts, and the Assistant cannot manage an existing party or
  activate one. Messages go to the model provider through OpenRouter, which the empty chat says.
- **Timetable reading.** Photos of a screen, a professor's name printed inside a block and two overlapping classes
  drawn side by side are not read; the last are reported as left out. A real dark-mode screenshot is not yet among the
  test screenshots.
- **Left in the code.** AI 매칭 and the match server are frozen: they run in every deployment and are still tested.
  The active party's own join request and invitation routes and the `meetups` table remain, unused. Redis runs
  without a password.
- **Planned for later iterations**: reading university notices with AI; a meeting place and time proposed for a party
  from the members' free time and walking times on the campus's slopes; push notifications; Private Events, Private
  Zones and blocking; organizer accounts and study spaces; cafés and other restaurants in the dining layer; arrival
  estimates for the shuttle.
- **Slow tests under load.** A few Jest tests of the app can exceed their 60 seconds on a busy machine; they pass when
  their file is run alone.

## Development and execution environment

What the project was built and run with:

| Part                   | Used                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Development machine    | macOS on Apple Silicon                                                                                       |
| Node.js and pnpm       | Node.js 24.14.0, the version in `.nvmrc`; pnpm 12.6.0                                                        |
| Containers             | Docker Desktop (Docker 29, Compose 5), `compose.yaml` at the repository root                                 |
| Servers                | NestJS 12 on Node.js 24 in containers; Prisma 7; Socket.IO 4                                                 |
| Data stores            | PostgreSQL 18 with PostGIS 3, Redis 8                                                                        |
| Assistant              | Vercel AI SDK 7 with the OpenRouter provider; the model set by `ASSISTANT_MODEL`                             |
| Admin site             | Next.js 16 with React 19, in a desktop browser                                                               |
| App                    | Expo SDK 57, React Native 0.86, Expo Router; local Expo modules around Kakao Maps SDK and ML Kit             |
| Android build          | JDK 17 (Temurin), Android SDK Platform and Build-Tools 36, Gradle 9.3.1 through the wrapper                  |
| Android devices        | Emulator: Android 16 (API 36), Google Play, `arm64-v8a`; ARM Android phones                                  |
| Device runs            | Maestro 2.11.0 on the Android emulator (API 36, `arm64-v8a`)                                                 |
| iOS build (not demo)   | Xcode 27 with the iOS 27 simulator, CocoaPods 1.17                                                           |
| Continuous integration | GitHub Actions on `ubuntu-latest`, on each push: every project's four checks, `flow-tests`, the infra checks |
| Deployment             | Dev Server: Docker Compose and Caddy; Production: Terraform, Amazon EKS in AWS's Seoul Region                |

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
- For SNU Now AI only: an OpenRouter API key with a credit limit. Without it every other feature runs.
- For the device runs only: Maestro 2.11.0 ([mobile/README.md](mobile/README.md), "Device runs").
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

Then open `main-server/.env`, fill in `KAKAO_REST_API_KEY` and, for SNU Now AI, `OPENROUTER_API_KEY`, and replace the
example address in `INITIAL_ADMINISTRATOR_EMAILS` with your Google account's address, so that you can sign in to the
admin site. The main server reads it only when it starts on a database that holds no Administrator: once the servers
have run with the example address, a new address is not taken until the data is deleted with `docker compose down -v`.

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

| Setting                            | What it is                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `PORT`                             | The port the HTTP server listens on.                                                                |
| `DATABASE_URL`                     | The main database, reached with the main server's own role.                                         |
| `REDIS_HOST`                       | Redis's host, which carries messaging between the servers.                                          |
| `REDIS_PORT`                       | Redis's port.                                                                                       |
| `ACCESS_TOKEN_PRIVATE_KEY`         | The private key that signs access tokens; written by `pnpm keys:generate`, never shared.            |
| `ACCESS_TOKEN_PUBLIC_KEY`          | The public key of the same pair, which the socket server is given; written by the same command.     |
| `GOOGLE_APP_CLIENT_ID`             | The app's Google OAuth client; already in `.env.example`.                                           |
| `GOOGLE_ADMIN_CLIENT_ID`           | The admin site's Google OAuth client, which must differ from the app's; already in `.env.example`.  |
| `INITIAL_ADMINISTRATOR_EMAILS`     | The Administrators registered when the database holds none; your own address.                       |
| `KAKAO_REST_API_KEY`               | The REST API key of the team's Kakao app, for walking routes; a secret the Owner shares.            |
| `WORKER_TOKEN`                     | The secret the worker server sends with what it collects; generated in [Setup](#setup).             |
| `PUBLIC_URL`                       | The address the apps reach this server at from outside, from which Invite Links are built.          |
| `ANDROID_CERTIFICATE_FINGERPRINTS` | The SHA-256 fingerprints of the app's signing certificates, for Invite Links' App Links.            |
| `MATCH_SERVER_URL`                 | Where the match server is reached.                                                                  |
| `MATCH_SERVER_TOKEN`               | The secret the main and match servers send each other; generated in [Setup](#setup).                |
| `DEMO_ACCOUNT_EMAILS`              | Read by the demo profile only: real SNU addresses that get demo Friends, requests, an invitation.   |
| `OPENROUTER_API_KEY`               | The OpenRouter key SNU Now AI calls its model with. Empty, the Assistant answers it is unavailable. |
| `ASSISTANT_MODEL`                  | The OpenRouter id of the Assistant's model; `anthropic/claude-haiku-5.5` in `.env.example`.         |
| `ASSISTANT_DAILY_MESSAGES`         | Optional: the messages a User may send in a day in Korea; 50 unless set.                            |
| `ASSISTANT_MAX_STEPS`              | Optional: the model calls per message; 8 unless set.                                                |
| `ASSISTANT_TIMEOUT_MS`             | Optional: the milliseconds over all of a message's model calls; 30000 unless set.                   |
| `ASSISTANT_MAX_OUTPUT_TOKENS`      | Optional: the tokens the model may write in each call; 1000 unless set.                             |

### socket-server

| Setting                   | What it is                                                                     |
| ------------------------- | ------------------------------------------------------------------------------ |
| `PORT`                    | The port of the HTTP server and the Socket.IO connections.                     |
| `REDIS_HOST`              | Redis's host.                                                                  |
| `REDIS_PORT`              | Redis's port.                                                                  |
| `ACCESS_TOKEN_PUBLIC_KEY` | The main server's public key, copied from `main-server/.env`, to check tokens. |

### worker-server

| Setting                | What it is                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `PORT`                 | The port the HTTP server listens on.                                                      |
| `MAIN_SERVER_URL`      | Where the main server is reached, to hand over what is collected.                         |
| `WORKER_TOKEN`         | The same line as in `main-server/.env`.                                                   |
| `EXTRA_SNU_COLLECTION` | `on` lets the schedule start extra.snu's Collections. `off` by default and in Production. |

### match-server

| Setting                  | What it is                                                    |
| ------------------------ | ------------------------------------------------------------- |
| `PORT`                   | The port the HTTP server listens on.                          |
| `DATABASE_URL`           | The match database, reached with the match server's own role. |
| `MATCH_SERVER_TOKEN`     | The same line as in `main-server/.env`.                       |
| `MAIN_SERVER_URL`        | Where the main server is reached.                             |
| `ROUND_INTERVAL_SECONDS` | The seconds from one round of AI 매칭 to the next.            |

### admin

| Setting                            | What it is                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `MAIN_SERVER_URL`                  | The main server's address, read on the site's server only.                     |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`     | The admin site's Google client: the main server's `GOOGLE_ADMIN_CLIENT_ID`.    |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | The JavaScript key of the team's Kakao app, for the maps; the Owner shares it. |

### mobile

| Setting                            | What it is                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The Google client of type "Web application" the ID token is issued for: the main server's `GOOGLE_APP_CLIENT_ID`. Without it the sign-in stays the mock.            |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | The Google client of type "iOS"; the iOS build only.                                                                                                                |
| `GOOGLE_IOS_URL_SCHEME`            | The iOS client's ID reversed; the iOS build only.                                                                                                                   |
| `EXPO_PUBLIC_MAIN_SERVER_URL`      | The main server's address as the phone reaches it. Without it the app keeps its sample data.                                                                        |
| `EXPO_PUBLIC_SOCKET_SERVER_URL`    | The socket server's address as the phone reaches it.                                                                                                                |
| `INVITE_LINK_HOST`                 | The host of the main server's `PUBLIC_URL`, for Invite Links' App Links; read when the build is made.                                                               |
| `KAKAO_NATIVE_APP_KEY`             | The native app key of the team's Kakao app, for the map; the Owner shares it; read when the build is made.                                                          |
| `ANDROID_X86_64`                   | `1` adds `x86_64` to a development build, for an x86_64 emulator, where everything but Kakao's map runs; given on the prebuild command line, not in `.env.example`. |

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

It adds 8 demo Users and their friendships, 6 published Global Events today and this week, recruiting parties on every
Board, an active party, this week's menus and, outside the shuttle's hours, two shuttle vehicles, and keeps the demo
Users' Avatars walking along the shuttle's line on campus. List your own SNU address in `DEMO_ACCOUNT_EMAILS` of
`main-server/.env` before starting: once you have finished Onboarding, you receive demo Friends (the active party's
members among them), two Friend Requests and a party invitation within 5 seconds.
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

- Every build allows plain http (`usesCleartextTraffic` in `mobile/app.json`), so on the same network as the computer
  the two addresses can be the computer's address on that network, with ports 3000 and 3001. Invite Links do not open
  the app there (see "Invite Links open the app only under a fixed https address" under
  [Known limitations and todos](#known-limitations-and-todos)).
- From anywhere else, put the computer's ports 3000 and 3001 behind an https tunnel and use its two https addresses
  in `mobile/.env`. Set the main server's `PUBLIC_URL` to the tunnel's address for the main server and
  `INVITE_LINK_HOST` to its host, so that Invite Links open the app.
- Or use a deployed server instead of the computer's: Production at `https://api.snunow.com` for both addresses, with
  `INVITE_LINK_HOST=api.snunow.com`, or the Dev Server at the address in the comments of `mobile/.env.example`
  ([Deployment](#deployment), [infra/production/README.md](infra/production/README.md)).

A debug build loads its JavaScript from the development server on the computer (port 8081), which `pnpm android`
starts: keep its terminal open, and keep the phone on the cable or on the same network as the computer. Without it the
app shows an error screen, on iOS "No script URL provided".

Positions are shared only inside the Campus Boundary, so the flows are run on campus.

### Keys registered with the signing key

Google and Kakao accept the app only when they know the key that signed it:

- A development build and the APKs are signed with the Expo template's debug key, which every checkout shares.
  Its key hash is registered at Kakao, and its SHA-256 is already in the main server's
  `ANDROID_CERTIFICATE_FINGERPRINTS`. Google sign-in needs an Android OAuth client in the Google Cloud project with
  the package name `com.bonnieandclaude.snunow` and the key's SHA-1.
- A build signed with another key, such as one signed on EAS, needs the same three registrations for its key: the
  SHA-1 at Google, the key hash at Kakao and the SHA-256 in `ANDROID_CERTIFICATE_FINGERPRINTS`.
  `.scratch/research/external-sources.md`, sections 7.2 and 8, has the commands that read them.

### APKs

Release builds of the app, attached to the repository's
[GitHub releases](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases). Each is built for `arm64-v8a`
alone and signed with the shared debug key, so Google and Kakao accept it as they accept a development build. None
needs a build of the app or a development server.

- **Production**: the app for `https://api.snunow.com`, the APK for testers:
  `snunow-app-26.10.23-1.apk` on the
  [snunow/app/26.10.23-1 release](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/tag/snunow/app/26.10.23-1),
  built from `51ce92f` with every Iteration 2 feature. Invite Links under `https://api.snunow.com/invite/` open it. A
  phone that installed an earlier Production APK before Production was up should install this one, so that Android
  checks the Invite Links' App Link again. Later Production APKs are attached to the release page of their own
  `snunow/app/YY.MM.DD-N` tag ([Deployment](#deployment)).
- **Dev Server**: the app for the Dev Server, attached to a `dev-YYYY-MM-DD` release and listed at the Dev Server's
  [`/apk/`](http://swpp26t09.147-46-242-174.sslip.io/apk/) for a phone's browser.
- **Iteration 1 demo**: `snu-now-iteration-1.apk`, attached to the
  [Iteration 1 release](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/tag/iteration-1), for the
  servers on your own computer. It is Iteration 1's app, with the Meetup and without the Iteration 2 features.

The Production app updates itself. A Release that changes only JavaScript publishes the app's bundle to EAS Update,
and an installed app downloads it when it starts and runs it from its next start, with no new APK. A change to the
native part, such as a native dependency, a config plugin or `app.json`, needs a native Release instead: `version` is
raised, a new APK and iOS build are made, and `app-version.json` is replaced, so that older builds show
업데이트가 필요합니다 at their start. [infra/production/README.md](infra/production/README.md), "The Production APK" and
"The Production iOS build", has the steps.

The Iteration 1 APK reaches the main server at `http://localhost:3000` and the socket server at
`http://localhost:3001`, on the phone itself. With the servers running on your computer
([Running the servers](#running-the-servers), with the [demo data](#demo-data)), Android's Platform-Tools for `adb`, and
an ARM phone on its cable or an arm64 emulator with an SNU Google account signed in, forward both ports and install it:

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3001 tcp:3001
adb install -r snu-now-iteration-1.apk
```

The forwarding ends when the phone is unplugged or the emulator stops: run the first two lines again then. Invite Links
open it only through `snunow://invite/<token>`. The development settings are off in every APK, so a User away from the
campus is shown to nobody: on an emulator, set the location to a point on campus in the extended controls.

## Running the tests

Each project has the same four checks, which CI runs on every push. A test's level, unit, integration or end-to-end,
is in its file name ([ADR 0007](docs/adr/0007-test-levels-by-what-a-test-starts.md)). Run them in the project's
folder:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

| Project         | What `pnpm test` runs and needs                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main-server`   | Vitest against PostgreSQL and Redis containers it starts; Docker running; `pnpm test:unit` needs no Docker                                              |
| `socket-server` | Vitest against a Redis container it starts itself; Docker running; `pnpm test:unit` needs no Docker                                                     |
| `worker-server` | Vitest on saved pages of each Source; neither it nor `pnpm test:unit` needs Docker                                                                      |
| `match-server`  | Vitest against a PostgreSQL container it starts itself; Docker running; `pnpm test:unit` needs no Docker                                                |
| `admin`         | Vitest: `unit`, `integration-pages`, `integration-site`; neither it nor `pnpm test:unit` needs Docker                                                   |
| `mobile`        | Jest, against the mocks and a fake main server and socket; neither it nor `pnpm test:unit` needs Docker                                                 |
| `flow-tests`    | Iteration 1's demo flows (Event through AI 매칭, Friend, Campus services), A1, A2 and the stack checks, on the four built servers; Docker and `openssl` |

`flow-tests` builds the servers' images the first time, which takes some minutes, and leaves a running stack and its
data alone: [flow-tests/README.md](flow-tests/README.md). Its `pnpm test:admin-ui` runs the W1 and W2 journeys through
the admin site in a browser, which neither `pnpm test` nor CI runs.

Each project's `pnpm lint` runs the level check of `scripts/` with the globs its test runners include and exclude, so it
fails a test file that no runner of that project would run, as well as one without a level. After a coverage run,
`node ../scripts/coverage-by-file-set.ts coverage/coverage-summary.json` in a project's folder sums the report over the
P09 spec's file sets ([its coverage goals](.scratch/iteration-2/P09-unit-tests/spec.md)). The two scripts have tests of
their own, which no project runs. From the repository root:

```bash
node --test 'scripts/test/*.test.ts'
```

Not run by `pnpm test` or CI:

- **Coverage**: `pnpm test:cov` runs a project's whole suite with coverage, and `pnpm test:cov:unit` its unit tests
  only. The goals and the Iteration 2 figures, every one met, are in the
  [Testing Documentation](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Testing-Documentation).
- **Device runs**: `pnpm build:mock-apk`, then `pnpm test:device` in `mobile/`, run the M1 and M2 flows with Maestro on
  an Android emulator against the app's own mock data ([mobile/README.md](mobile/README.md), "Device runs"). At the end
  of Iteration 2, M2 on a cold start fails (see [Known limitations and todos](#known-limitations-and-todos)).
- **The Assistant's benchmark**: `pnpm eval` in `main-server/` runs its 62 cases against the real model and spends
  OpenRouter credit, so it runs by hand only.

## Deployment

The **Dev Server** is the team's shared server, server B of the two the course lends the team. It runs the four
servers, PostgreSQL, Redis and the [Demo Data](#demo-data) under Docker Compose, behind a Caddy proxy, at
`http://swpp26t09.147-46-242-174.sslip.io`. The stack is `compose.yaml` with `compose.deploy.yaml` over it.

It follows the `development` branch by itself: every minute it fetches the branch and, once a new commit's server
checks have passed in CI, rebuilds and restarts what changed. Nothing pushes to it
([ADR 0003](docs/adr/0003-the-dev-server-pulls-its-deployments.md)). No pull request targets `development`: a team
member fast-forwards it to `2.0/Main` from a checkout.

- `/deploy-status` shows the deployed commit and the last run's result, and `/apk/` lists the dev APKs for a
  phone's browser.
- To build the app against it, copy the two commented lines of `mobile/.env.example` into `mobile/.env`.
- The admin site is not deployed: run it on a laptop with `MAIN_SERVER_URL` in `admin/.env` set to the Dev Server's
  address.

The runbook, [infra/deploy/README.md](infra/deploy/README.md), says how to set up a server, read the status and the
journal, redeploy by hand, move `development`, restore a dump and add an APK.

**Production** is the system that people outside the team use, for user testing, the beta test, and the final demo.
It runs on Amazon EKS in AWS's Seoul Region, built with Terraform, and answers at `https://api.snunow.com` for the app
and at `https://admin.snunow.com` for the admin site. It starts with only the seed data and never carries Demo Data.
It changes only with a Release: a tag `snunow/<target>/YY.MM.DD-N` on a reviewed commit of the iteration branch, which
deploys one server, or all five with `all`, once every CI job has passed on that commit
([ADR 0006](docs/adr/0006-production-runs-on-eks-and-releases-are-pushed.md)). The first Release,
`snunow/all/26.10.22-1`, deployed everything on 2026-10-22. Two `t4g.small` nodes run the servers, the admin site and
Redis, the main and match databases are on RDS for PostgreSQL 18, and network policies allow only the listed
connections between pods. The Production APK is attached to the GitHub release page of its `snunow/app/YY.MM.DD-N`
tag. The runbook and the tool guide,
[infra/production/README.md](infra/production/README.md), say how to set up a laptop, release, deploy an earlier
Release again, rotate a secret, and move Production to another AWS account.

## Repository layout

| Folder           | What it holds                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `main-server/`   | The main server: sign-in, Users, Friends, parties, Location Sharing, events, SNU Now AI, the seed |
| `socket-server/` | The socket server: pushes positions and signals to the apps over Socket.IO, keeps no data         |
| `worker-server/` | The worker server: collects the events list, the menus and the shuttle on a schedule              |
| `match-server/`  | The match server of the frozen AI 매칭: keeps its requests and groups them in rounds              |
| `admin/`         | The admin site for Administrators                                                                 |
| `mobile/`        | The app; its native map and OCR modules in `modules/`, its Maestro flows in `maestro/`            |
| `flow-tests/`    | End-to-end tests across the four servers, and of the admin site in a browser                      |
| `scripts/`       | The level check every project's `pnpm lint` runs (ADR 0007), the coverage sums, their tests       |
| `infra/`         | The PostgreSQL image, the Dev Server (`deploy/`, `proxy/`), and Production (`production/`)        |
| `docs/`          | Decision records (`adr/`), the agents' conventions (`agents/`), and the demo videos (`demo/`)     |
| `.scratch/`      | Specs and tickets of each iteration's tasks, and research notes                                   |
| `.github/`       | The CI and Release workflows, the pull request template, and the code owners                      |
| `.claude/`       | Shared skills for coding agents; `.agents/` links to them                                         |

## AI-generated code

Everything the team wrote in this repository is AI-generated: the code, the tests, the CI workflow, the specs and
tickets in `.scratch/`, and the documents, this one among them. It was written with Claude Code (Claude Fable 5.1 and
Claude Opus 5.5) from 2026-09-28 on, and the wireframes were drawn with Claude Design. Each source file starts with a
box comment headed `AI-generated with Claude`, with a row for each day an agent changed the file: the date, the Claude
model, and the GitHub ID of the team member who prompted it. Markdown, JSON, lockfiles, Prisma migrations, and test
fixtures carry no box and are marked by this section, and every commit of the team carries a `Co-Authored-By: Claude`
trailer.

The team decided what to build, reviewed the specs and the table schemas, and checked the result on phones. People
also made the product decisions, such as the words party, active party and Quest, where API keys go and how much the
Assistant's benchmark may spend. Where something was wrong, the agent rewrote it; no code was edited by hand.

AI also runs inside the product: SNU Now AI calls a model through OpenRouter (Claude Haiku 5.5 in `.env.example`), and
the timetable is read on the phone with Google ML Kit's text recognizer.

Not AI-generated is what came from elsewhere: the skills in `.claude/skills/`, the seed data in `main-server/seed/`,
the saved pages that the worker's tests read, the images and the font in `mobile/assets/`, and the demo videos.

The AI Collaboration Reports on the Wiki, for
[Iteration 1](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/AI-Collaboration-Report-%E2%80%93-Iteration-1)
and [Iteration 2](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/AI-Collaboration-Report-%E2%80%93-Iteration-2),
tell how the work went, with the prompts in each iteration's Prompt Log.

## Data sources and attribution

| Source                                                                                                                | Used for                                                                   | Terms                                           |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| © OpenStreetMap contributors, through Overpass                                                                        | The Campus Boundary, the shuttle's line, two Places, outlines, 도보 시간   | [ODbL](https://www.openstreetmap.org/copyright) |
| NASA SRTM 30 m, through OpenTopoData                                                                                  | The elevation of the Places and shuttle stops for 도보 시간                | Public domain                                   |
| 국토지리정보원, 연속수치지형도 건물 (2026), from VWorld                                                               | The outlines of the campus's buildings and the Places the campus map lacks | 공공누리 제1유형 (source must be shown)         |
| SNU campus map, `map.snu.ac.kr`                                                                                       | The Places and the shuttle stops' coordinates                              | No terms published                              |
| Kakao                                                                                                                 | The map in the app and the admin site, and walking routes; nothing stored  | Kakao's terms and operating policy              |
| SNU Co-op (`snuco.snu.ac.kr`), 관악학생생활관 (`snudorm.snu.ac.kr`), College of Veterinary Medicine (`vet.snu.ac.kr`) | The menus                                                                  | Collected from public pages                     |
| SNU's events list, `www.snu.ac.kr/snunow/events`                                                                      | The Global Events                                                          | Collected from public pages                     |
| The shuttle operator's route page and vehicle positions, `web.busin.co.kr` (route 41946)                              | The shuttle's stops, service hours and vehicles                            | Collected from public pages                     |
| Pretendard                                                                                                            | The app's font                                                             | SIL Open Font License 1.1                       |
| OpenRouter and the model it routes to                                                                                 | SNU Now AI's answers; conversations are not stored, locations never sent   | OpenRouter's terms                              |
| Google ML Kit Text Recognition v2 (Korean), bundled in the app                                                        | Reading a timetable screenshot on the phone; nothing is sent               | ML Kit's terms                                  |

The app shows "© OpenStreetMap · 국토지리정보원" on every map, with a screen that names both sources and their
licences. Each seed file in `main-server/seed/` records where it came from and when it was exported. No coordinate
comes from Kakao's, Naver's or Google's maps.

## Links

- [The team's Wiki](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki): the proposal, the
  [Requirements and Specifications](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Requirements-and-Specifications),
  the [Design Documentation](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Design-Documentation), the
  [Testing Documentation](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Testing-Documentation), the
  AI Collaboration Reports and Prompt Logs, and the meeting logs.
- [GLOSSARY.md](GLOSSARY.md): the project's words, as the code names them. [docs/adr/](docs/adr/): its architecture
  decisions.
- Each project's README: [main-server](main-server/README.md), [socket-server](socket-server/README.md),
  [worker-server](worker-server/README.md), [match-server](match-server/README.md), [admin](admin/README.md),
  [mobile](mobile/README.md) and [flow-tests](flow-tests/README.md).
