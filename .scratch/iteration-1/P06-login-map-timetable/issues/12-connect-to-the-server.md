# 12: Connect the mocks to the main server

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 10 (Main screen: the lists and the controls around the map)

## What to build

The app's mocks give way to the main server, one feature at a time. Every feature that the demo's flows (P20) use on this task's screens is connected, where the main server serves it by then: sign-in, Onboarding, the Lobby, Friends and their positions, Quests, Parties, Global Events and the walking route. Any other feature is connected when the app's developers name it. For each feature the client and its adapter change and the screens do not.

The app also opens its one connection to the socket server, so that a Friend's Avatar moves as their position arrives and the app learns when its Session ended.

Sending the User's own position is not part of this ticket. The Master Switch is on 내 정보, which P09 builds, and the main server refuses every position while the switch is off, so sending is built with the switch, in P09.

A real sign-in needs three things that code cannot give: a built app, a Google sign-in client registered for the app's identifier and signing key, and a main server that the phone can reach. The ticket starts by recording which of these hold and which features the main server serves on its main line that day.

## Acceptance criteria

- [x] Under Comments, before any code: for each feature the demo's flows use and each other feature named, what the main server serves on its main line that day. A feature it does not serve yet stays a mock, and that is recorded there and in `todo.md` section 3.
- [x] The settings the app needs are named in an example settings file with one-line comments and empty values: the main server's address, the socket server's address and the Google client IDs. The values are a person's to fill in.
- [x] The client attaches the access token, renews the Session once on a 401 and repeats the request, and shows the sign-in screen when renewal fails. A 401 with `SESSION_REPLACED` shows the sign-in screen without a renewal, and a 403 with `ONBOARDING_REQUIRED` shows Onboarding with the suggestion it carries.
- [x] A sign-in against the main server in a built Android app. The sign-in module already asks Google there with `react-native-nitro-google-signin`, with the main server's client as the server client, and checks the account's domain itself (ticket 04). Left for this ticket: the ID token is sent to the main server, the main server's tokens are kept in the phone's secure storage, and the main server's word replaces the app's check, so that each ending of the spec's table comes from Google's and the main server's answers. Expo Go keeps the mock sign-in.
- [x] Onboarding is completed on the main server with the fields it stores, and the fields it does not store stay on the phone. The main server's word on whether a User finished Onboarding replaces the phone's.
- [x] Each of the other features is read from the main server through its adapter, and its mock stays for the tests.
- [x] A User in no Party is not a failure: `GET /parties/mine` answers 404 `NOT_IN_PARTY`, and the client's `getMyParty` turns exactly that into null. A test against the fake server covers it.
- [x] The app keeps one connection to the socket server open with the access token, and opens it again with a new token when the server closes it at the token's expiry.
- [x] `session-ended` with the code for a replaced Session shows the notice and the sign-in screen, as a 401 with that code does.
- [x] A `position` moves that User's Avatar on the map, gliding, and a `position-removed` takes it off. The visible positions are fetched when the connection opens and when the app returns to the front.
- [x] A signal that something the screen shows has changed makes the app fetch it again.
- [x] The app sends no position of its own: that is built in P09 with the Master Switch.
- [x] The app's time is the phone's: the fixed moment of the mocks (`src/clock.ts`) and the mock's fixed User id (`myUserId()`) are gone from a build that asks the main server.
- [x] Jest tests against a fake server: the token and the one renewal, a failed renewal, each ending of a sign-in, Onboarding completed, each connected feature's answer through its adapter, and, with a fake socket, a position arriving, a position removed and the Session's end. The screens' tests pass unchanged.
- [x] `todo.md` section 3 says what is connected and what is still a mock, and the list of mocks in the app holds nothing that the demo's flows use and the main server serves.
- [ ] A sign-in with an SNU account on the emulator or the shared phone reaches the main screen, recorded under Comments with a screenshot in the pull request.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### What the main server serves (2026-10-06, before any code)

Read from the main server's code on `origin/1.0/Main` at `61881c7`, the day the work started. "Served" means a route a User's access token reaches.

| Feature | Served on the main line? | What the app does |
|---|---|---|
| Sign-in, refresh, sign-out | Yes: `POST /auth/google` (200 tokens and `onboarding`; 401 for a bad ID token; 403 for an account outside SNU or an unverified address, without a `code`), `POST /auth/refresh`, `POST /auth/sign-out` (204) | Connected |
| Onboarding: name, department, admission year, interests | Yes: `POST /users/me/onboarding`, 204 | Connected |
| Onboarding: course level, gender | No: the main server has no field for them | Stay on the phone |
| Whether a User finished Onboarding | Yes: in the sign-in's answer, and in every 403 `ONBOARDING_REQUIRED`, which carries `onboarding.suggestion` | Connected: the main server's word replaces the phone's |
| Lobby | Yes: `POST /lobby`, now `{ profile, masterSwitch }` | Connected. `masterSwitch` is read by nobody until P09 |
| Friends | Yes: `GET /friends`, the same shape as the mock's | Connected |
| Friends' positions | Yes: `GET /positions`, and the socket's `position` and `position-removed` | Connected |
| Friends' status, place, walk and photo | No | Mock (the app's own). A Friend without a status is shown by `visible` alone, as before |
| Quests, Class Quests | Yes: `GET /quests`. Its Quest also has `leader`, `capacity` and `joinPolicy`, which the app does not read | Connected |
| Global Events | No route lists the published events for a User. They reach a User only as the attending Sub Quest of a Quest the User holds (`GET /quests`), by id in `matching-requests`, and through `GET /quests/recruiting?globalEventId=`. The signal `global-events-changed` exists | Mock. The list stays the app's own until a route lists them |
| Who announced a Global Event | No | Mock (the app's own) |
| Parties | Yes: `GET /parties` and `GET /parties/mine` (404 `NOT_IN_PARTY` for a User in no Party). The shapes differ from the provisional mock: the Quest a Party is marked with is `quest: { id, title, globalEvent }`, not `mark: { questId, … }`, and a listed Party also has `holdsQuest` and `friends` | Connected; the app's types, mocks and adapters follow the main server's shape |
| The number on 파티 (`getPartyNews`) | No: the parts exist (`GET /party-invitations`, `GET /parties/mine/join-requests`), but no answer gives the frame's number | Mock (the app's own) |
| 오늘의 발자국 (`getFootprints`) | No: no spec covers stories | Mock (the app's own) |
| Walking route | Yes: `GET /walking-route` | Connected |
| The User's own id | Yes: the access token's `sub` | Connected |
| The app's time | The phone's | Connected |
| Socket: the Session's end | Yes: `session-ended` with `{ code: 'SESSION_REPLACED' }` or `{}`; the server closes the connection when the access token expires (`io server disconnect`) | Connected |
| Socket: signals | Yes: `friends-changed`, `quests-changed`, `party-changed`, `global-events-changed`, `meetups-changed`, `matching-changed`, all without a payload | The first four make the app fetch what it shows again. `meetups-changed` and `matching-changed` name nothing these screens show; an accepted Meetup also sends `quests-changed` |

What a real sign-in needs, on the same day:

- A built app: the Android project is generated in `mobile/android/` on this Mac, and its debug build allows plain HTTP (`usesCleartextTraffic` in the debug manifest), so `http://10.0.2.2:3000` reaches a main server on this Mac from the emulator.
- A Google sign-in client for the app's identifier and signing key: a person's to confirm in Google Cloud. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is the main server's `GOOGLE_APP_CLIENT_ID`, which was checked before the work.
- A main server the phone can reach: the emulator, through `10.0.2.2`, once the main server runs on this Mac. The shared phone cannot reach this Mac's server; that needs a deployed server.

The debug build is signed with `mobile/android/app/debug.keystore` (`android/app/build.gradle`, `signingConfigs.debug`), not with `~/.android/debug.keystore`:

| Keystore | SHA-1 | SHA-256 |
|---|---|---|
| `mobile/android/app/debug.keystore` (signs the debug build) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |
| `~/.android/debug.keystore` on this Mac (not used by the build) | `A7:61:B3:BF:4D:E8:C6:03:64:58:12:AA:49:79:33:FC:D7:50:AE:9B` | `F4:99:F8:1E:E4:CC:1A:88:55:48:C9:C5:51:7B:4E:F9:09:9F:BE:AF:04:43:95:EB:74:3C:14:25:2A:D1:EC:19` |

The first is the Expo template's debug key, the same in every checkout; its SHA-256 is already in the main server's `ANDROID_CERTIFICATE_FINGERPRINTS`. Google Cloud's Android client needs its SHA-1.

### Result (2026-10-06)

Built on `1.0/P06-12-connect-to-the-server`, from `origin/1.0/Main` at `61881c7`, with tickets 08 to 10 merged. Every criterion is met but the sign-in with an SNU account on a phone, which waits for a person (below).

What is connected and what stays a mock, feature by feature, is the table of `todo.md`, section 3. In short: sign-in, refresh and sign-out, Onboarding's four stored fields and the main server's word on whether it is finished, the Lobby, Friends, their positions (fetched and pushed), Quests with Class Quests, Parties and the User's Party, the walking route, the User's own id and the phone's time are connected. These stay mocks, each because the main server serves nothing for it: the Friends' status, place, walk and photo; the Global Events, since no route lists the published ones for a User; who announced a Global Event; the number on 파티; 오늘의 발자국. The course level and the gender stay on the phone.

Where things are, in `mobile/`:

- `src/api/servers.ts`: the two addresses and `asksMainServer()`, which decides between the main server and the mocks. A build asks the main server when it holds Google's sign-in module, has the Google settings and has `EXPO_PUBLIC_MAIN_SERVER_URL`, and no development setting names the sign-in's ending. Expo Go, the web and the tests keep the mocks.
- `src/api/server/http.ts`: the one way to the main server. It attaches the access token, renews the Session once on a 401 (requests refused at the same moment share one renewal) and asks again; a refused renewal, a second 401 and a 401 `SESSION_REPLACED` end the Session; a 403 `ONBOARDING_REQUIRED` takes the User to Onboarding with its suggestion. No answer is `ApiError` status 0 and ends nothing.
- `src/api/server/answers.ts`: a check of each answer's shape. The lint forbids casting an answer to its type, so each is checked; an answer of another shape fails as `UNEXPECTED_ANSWER`, status 0.
- `src/api/server/client.ts`: the connected operations. The rest are the mock's, through the same `ApiClient`.
- `src/api/client.ts`: `apiClient` chooses at each call between the server's client and the mocks.
- `src/auth/tokens.ts`: the main server's tokens in `expo-secure-store`. `src/auth/sign-in.ts`: the ID token goes to `POST /auth/google`; `myUserId()` is the access token's subject.
- `src/session/session-events.ts`: the Session's end and the main server's word on Onboarding, which `SessionProvider` follows; it also shows the dialog "다른 기기에서 로그인했어요" and clears the cache at the end of a Session and at a sign-out. `src/session/start.ts`: with the main server, a User is signed in only with tokens, and the Lobby is asked whatever the phone kept, so that its 403 decides Onboarding.
- `src/live/connection.ts` and `src/live/live-updates.tsx`: the one Socket.IO connection, as `socket-server/README.md` describes, kept open while the User is on the main screen's side of the flow.
- `src/clock.ts`: the phone's time with the main server.
- New dependencies: `expo-secure-store` (with its config plugin in `app.json`) and `socket.io-client`.
- `.env.example`: `EXPO_PUBLIC_MAIN_SERVER_URL` and `EXPO_PUBLIC_SOCKET_SERVER_URL`, empty, with a one-line comment each. The Google client IDs were already there. `mobile/.env` on this Mac got the emulator's values, `http://10.0.2.2:3000` and `http://10.0.2.2:3001`; its Google and Kakao values are as they were.
- Tests: `__tests__/api/server-session-test.ts` (the token, the one renewal, the refusals, the User's id and the time), `__tests__/api/server-features-test.ts` (each connected feature through its adapter, `NOT_IN_PARTY` as null, what stays a mock), `__tests__/auth/server-sign-in-test.ts` (each ending of a sign-in and the sign-out), `__tests__/live-test.tsx` (a position arriving and removed, the signals, the return to the front, the token's expiry) and `__tests__/server-app-test.tsx` (the whole app against the fake server: the start, Onboarding when the main server says so, no position sent, the Session's end with and without the notice). Supports: `__tests__/support/fake-server.ts` (a main server behind `fetch`), `fake-socket.ts`, `secure-store.ts`, `server.ts` and `live.ts`. 487 tests pass; the 54 suites that were there pass unchanged but for two fixtures that build a Party, whose shape followed the main server's.

Decisions made while building:

- The Party's shape is now the main server's: `quest: { id, title, globalEvent }` in place of the provisional `mark: { questId, … }`, and a listed Party also has `holdsQuest` and `friends`. The types, the mocks and the two adapters that read it followed; no screen changed.
- A build with Google's module and no main server's address keeps the app's own check of the domain and the mocks, as before, so that a build without a server still runs.
- When the access token has gone and the renewal gets no answer, the Session is not ended: the request fails as no answer, and the socket tries the renewal again after five seconds.
- A `position` for a Friend or a member whom the cached answers call unseen fetches those answers again, since `visible` decides whether the friend list's adapter shows a position.
- On a reconnection after a drop the app fetches everything it shows again; on the first connection only the positions, which the main screen has just fetched otherwise.
- "23분 후" in a Quest's row is worded when the Quests are fetched, not each minute. They are fetched again on `quests-changed`, when the connection opens again and when the app returns to the front.

Checked against the real servers on this Mac, beyond the fake ones: the main and socket servers ran from `compose.yaml`, with `main-server/.env` and `socket-server/.env` made from their examples (a new key pair, new `WORKER_TOKEN` and `MATCH_SERVER_TOKEN`, and a placeholder `KAKAO_REST_API_KEY`). Three Users and their Sessions were written into the local database and their access tokens signed with the local key, since a Google ID token cannot be made without a person. A Jest file that was deleted afterwards then ran the app's own client and connection against them:

- An expired access token was refused, the Session renewed once with the refresh token and the request repeated; `myUserId()` read the subject.
- `GET /friends`, `/positions`, `/quests`, `/parties`, `/parties/mine` (404 `NOT_IN_PARTY`, so null) and `POST /lobby` passed the shape checks. The Lobby's answer also holds `profile.friendId`.
- A User who had not finished Onboarding was refused the Lobby with 403 `ONBOARDING_REQUIRED` and its suggestion, completed Onboarding with 204, and entered the Lobby.
- `GET /walking-route` answered 502, because the local `KAKAO_REST_API_KEY` is a placeholder; the app shows "길을 찾지 못했어요" for it.
- The socket connection opened, got a `position` when a Friend uploaded one with both Master Switches on, a `position-removed` when the Friend turned theirs off, and `session-ended` (`replaced: false`) at a sign-out.
- A token that expired while connected: the socket server closed the connection, the app renewed the Session and opened again with the new token. A token that had expired before connecting: refused, renewed, opened.

The debug build still builds with the new native module: `npx expo prebuild --platform android` (for `expo-secure-store`'s config plugin), then `./gradlew assembleDebug` with JDK 17, gave `app-debug.apk`. The prebuild cleared and generated `mobile/android/` again, which is not committed; its `debug.keystore` is the same key as before, and `android/local.properties`, which the clearing removed, was written again with `sdk.dir=$HOME/Library/Android/sdk`. The app was not installed or started: that is the person's sign-in below.

The containers and the local Users are left running on this Mac (`docker compose ps`), so that a person can sign in against them; `docker compose down -v` removes them with the data.

Waiting for a person (사람 확인 대기):

- The criterion "A sign-in with an SNU account on the emulator or the shared phone reaches the main screen" is not ticked. It needs a Google sign-in, which only a person can do, and Google Cloud's Android client checked first: the package `com.bonnieandclaude.snunow` with the SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` of `mobile/android/app/debug.keystore`, which signs the debug build, and the SNU account as a test User of the consent screen while the app is in testing. The steps: the servers running (`docker compose up --build` at the repository root), an emulator with Google Play and the SNU account, `npx expo run:android` in `mobile/` (with `JAVA_HOME` at JDK 17, as the README's "Tools" says), and the sign-in. The screenshot goes in the pull request.
- The shared phone cannot reach a server on this Mac; it needs a deployed main server.

### Agent usage (2026-10-06)

- Agent time: about 1 hour 20 minutes, an estimate. 3 minutes in the session that checked that tickets 08 to 10 were merged and prepared this run, and about 1 hour 15 minutes in this session, of which about 40 minutes went to waiting for the Android debug build. No time was spent waiting for a person. No subagents ran.
- Tokens, both sessions together, read from their transcripts just before the commit (the commit itself adds a little): input 330, of which cache reads 34,222,000 and cache writes 392,700 are counted apart, so about 34.6 million input tokens in all; output 157,400.
