# P11: End-to-end tests through the admin site and the servers' interfaces, and the app's first device runs

Status: ready-for-agent

## Problem Statement

The schedule's P11 "Add end-to-end tests" is due with P9 and P10 on 2026-10-23. Under ADR 0007 (`docs/adr/0007-test-levels-by-what-a-test-starts.md`) an end-to-end test drives the whole system from outside, as a User or an Administrator would: through a screen, or through the servers' public HTTP and socket interfaces.

What exists is `flow-tests/`: a Compose stack of the four built servers with PostgreSQL, Redis and a stand-in for the outside services, driven over HTTP and Socket.IO. It runs three demo flows (a Global Event to Matching to a Party; Friends from an Invite Link who see each other and stop when they part; menus and the shuttle), plus checks of the Dev Server's stack and a self-test of the harness. It leaves four gaps.

- **The end of a Session is never checked.** No flow signs a User in on a second phone, so nothing shows that the first phone receives `session-ended` or that its position uploads are then refused (US-AUTH-02 scenario 1; NFR-07).
- **Signals to the other members are checked once.** The event flow checks only that a Party's Leader receives `party-changed` when a Holder enters. No flow checks that the other Holders receive `quests-changed` when a Leader accepts a join request, or `quests-changed` and `party-changed` when a Leader ends a group (US-QUEST-03 scenarios 1 and 2).
- **Nothing drives a screen against the started servers.** The admin site's page tests run against `FakeMainServer`, which computes several expected values itself, such as what a Draft still needs to be published, and no admin test reaches the real main server.
- **The app never runs on a device.** Its Jest tests mock `expo-location`, `expo-secure-store`, the Google sign-in module, `socket.io-client` and the map module, and `jest-expo` resolves files as iOS. No test shows that the Android build starts, keeps what it stored across a relaunch, or opens an Invite Link handed to it from outside, which the Requirements mark "not yet verified".

## Solution

Six journeys, each tied to scenarios of the Requirements (the Wiki's Requirements and Specifications, section 5.2), at the level ADR 0007 gives them.

| Journey | What it does | Level (ADR 0007) | Runs with |
|---|---|---|---|
| A1 | A User signs in on a second phone; the first phone is told its Session ended, and its uploads are refused | end-to-end, through the servers' interfaces | `pnpm test` in `flow-tests/`, so the per-push flow-tests check |
| A2 | A Leader accepts a join request, then ends the group with its Party on; the other Holders are told each time | end-to-end, through the servers' interfaces | the same |
| W1 | An Administrator signs in to the admin site in a browser, creates a Draft and publishes it; a User is told and sees the Global Event | end-to-end, through a screen | `pnpm test:admin-ui` in `flow-tests/`, run by hand |
| W2 | A Draft without a start time or a position cannot be published, and the site names what is missing | end-to-end, through a screen | the same |
| M1 | On an Android emulator, a first run: sign-in, consent, Onboarding, the map, and a relaunch that opens the map directly | integration (the app against its own mock data) | `pnpm test:device` in `mobile/`, run by hand |
| M2 | On the emulator, an Invite Link opened from outside the app, on a cold and on a warm start, and accepted | integration | the same |

A1 and A2 are two new flows in `flow-tests`. W1 and W2 run the admin site as Production builds it, inside the flow stack and against its real main server, driven by Playwright's Chromium; Google's sign-in script is replaced at the network, so the site's own code runs unchanged. M1 and M2 run a release APK of the app that answers from its own mock data, driven by Maestro on a local Android emulator. ADR 0007 files these as integration tests, because the app does not reach the servers; they are P11's because they are the app's first runs on a device.

No product code changes. CI workflows, branch rulesets and the existing tests stay as they are, apart from P09's rename and P10's changes. Every expected value comes from the scenario or from the test's own input, and every wait waits on a condition.

## User Stories

1. As a developer, I want a test in which a User signs in on a second phone and the first phone receives `session-ended` with `SESSION_REPLACED` and is disconnected, so that the signal the app turns into "다른 기기에서 로그인했어요" is known to arrive.
2. As a developer, I want the first phone's next position upload refused with 401 and `SESSION_REPLACED`, and the second phone's upload to reach the same Friend, so that "sends no more positions" holds and only the old Session ended.
3. As a developer, I want a test in which a Leader accepts a join request and every Holder receives `quests-changed` and reads the new Holder, so that "every member's room shows B without refreshing" is checked at the servers.
4. As a developer, I want the same test to end the group as the app does when its Party is on, every other member to receive `party-changed` and `quests-changed`, and the Quest and its post to be gone, so that "the group and its post disappear" holds.
5. As a developer, I want A1 and A2 in `pnpm test`, written like the existing flows, so that the per-push check runs them and a failure names the User, the call and what was waited for.
6. As a developer, I want an Administrator to sign in to the admin site in a real browser, create a Draft and publish it, and a connected User then to be told and to see the Global Event, so that the site and the real main server are shown to work together (US-ADMIN-01 scenario 1).
7. As a developer, I want a Draft without a start time or a position to be refused, with the site naming what is missing, and no User told, so that US-ADMIN-01 scenario 2 holds against the real server.
8. As a developer, I want the site under test built from `admin/Dockerfile`, and Google's sign-in replaced only at the network by a stand-in that hands the page an ID token signed with the run's key, so that the sign-in page, its Server Action, the cookie and the main server's token check run as they do for a person.
9. As a developer, I want every other request the browser makes outside the site refused, and the browser in a time zone far from Seoul, so that a run calls nothing outside the repository and a time read in the wrong zone fails.
10. As a developer, I want W1 and W2 behind their own command, so that `pnpm test` and CI neither build the admin image nor need a browser.
11. As a developer, I want one command that builds a mock release APK with the server addresses and Google's web client ID blanked, so that the app always signs in by its mock and answers from its own mock data.
12. As a developer, I want a first-run flow from sign-in through consent and Onboarding to the map, and a relaunch that finds the map without signing in again, so that US-AUTH-01 scenario 1 is shown on a device with the phone's real storage.
13. As a developer, I want an Invite Link opened from outside to show its accept screen on a cold and a warm start, and accepting it to put the sender among the Friends, so that US-FRIEND-01 scenario 2 is shown on a device.
14. As a developer, I want every flow to start from a cleared app, with no retry, no fixed sleep and the emulator's animations off, so that a flow passes or fails for one reason.
15. As a developer, I want the emulator image, API level, ABI, the Maestro version and the commands pinned, and each run to write a JUnit report and screenshots, so that another teammate's run is the same run and its result can be reported.
16. As a reviewer, I want every expected value taken from the scenario or from what the test itself typed, never computed by the code under test, so that a test cannot agree with a bug.

## Implementation Decisions

### Levels and names

- A1, A2, W1 and W2 are end-to-end tests, named `*.e2e.test.ts`. M1 and M2 are integration tests; a Maestro flow's level is its folder, `mobile/maestro/integration/`. `mobile/maestro/subflows/` holds shared steps and has no level of its own. Nothing goes into `mobile/maestro/e2e/`.
- The work lands after P09's rename, beside the renamed flows, with the new suffixes from the start.
- flow-tests keeps P09's single `test` script and gains `test:admin-ui` beside it; mobile gains `build:mock-apk` and `test:device`. None of them is a unit or integration script, and `pnpm test` runs none of the new commands.

### A1: one phone at a time

US-AUTH-02 scenario 1. A new file in `flow-tests/test/` with one test:

1. A signs in on phone 1, and B signs in. They become Friends through an accepted Invite Link, both turn the Master Switch on, and phone 1's position on campus reaches B.
2. A signs in on phone 2 with the same Google account.
3. Phone 1 receives `session-ended` with `{ code: 'SESSION_REPLACED' }`, then the socket server closes its connection (`io server disconnect`; `socket-server/src/users/users.gateway.ts` sends the event before it disconnects).
4. Phone 1 uploads a position. `POST /positions` answers 401 with `code: 'SESSION_REPLACED'` (`main-server/src/auth/access-token.guard.ts`), and B receives no position of A within the quiet window.
5. Phone 2 uploads a position on campus, and B receives it.

What the app shows for `session-ended` is not part of A1; the app's Jest whole-app tests feed the same event through their fake socket.

### A2: a Leader runs a group

US-QUEST-03 scenarios 1 and 2. A new file in `flow-tests/test/` with one test and four Users: A is the Leader, B and C join, D only reads the Board.

1. A creates an Approval Quest on a Board, with a Sub Quest ahead so that it is listed for recruiting. D finds it on the Board's list.
2. B asks to join, and A is told (`quests-changed`). A accepts, and B is told.
3. C asks to join, and A accepts. A, B and C each receive `quests-changed`, and reads of the Quest by B and by C list A, B and C as Holders.
4. A opens the Quest's Party, and B and C enter it.
5. A ends the group as the app does when the Party is on: the Party first (`POST /parties/mine/end`), then the Quest (`POST /quests/:questId/end`). B and C each receive `party-changed` and `quests-changed`. Afterwards B's read of the Quest is refused as not found, B and C are in no Party, and D's Board no longer lists the Quest.

The signal names are the main server's: `quests-changed` from `quests/join-requests.service.ts` and `quests/leader.service.ts`, `party-changed` from `parties/leader.service.ts`.

### The harness

- The flows use `people.ts`, `caller.ts` and `inbox.ts`, with three additions:
  - a `Student` keeps the Google account it signed in with and can sign in again "on another phone", answering a second `Student` for the same User with its own token and socket, and skipping Onboarding;
  - an `Inbox` can wait for its connection to be closed by the server, with the same bounded wait as a message;
  - `people.ts` exports the Administrator's ID token (`administratorIdToken()`), which `signInAsAdministrator()` and the admin-site stand-in both use.
- Waits stay the harness's: a message that must come is waited for up to 10 s, one that must not come for 1.5 s.

### W1 and W2: the admin site in the flow stack

- **A Compose overlay.** `flow-tests/compose.admin-ui.test.yaml` adds one service, `admin`, over `compose.yaml` and `compose.test.yaml`. Like `compose.deploy.test.yaml`, only one set of tests uses it; unlike it, it defines a new service. The image is the one `admin/Dockerfile` builds for Production; the site reaches the main server by its service name; `startStack` builds, starts, waits for health and removes it with the stack.
- The service builds `./admin` with the two build arguments `release.sh` passes: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=flow-tests-admin.apps.googleusercontent.com` (the stack's `GOOGLE_ADMIN_CLIENT_ID`) and an empty `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, so that the event form takes the position as two numbers and no Kakao script loads. At run time it gets `MAIN_SERVER_URL=http://main-server:3000`, the only setting the site reads on its server (`src/main-server.ts`). It publishes port 3100 on a free loopback port and depends on a healthy main server; its health check requests `/health/ready` with `node`, as the socket server's check in `compose.test.yaml` does.
- The run uses the flow stack's project name, so `pnpm test` and `pnpm test:admin-ui` run one after the other, never at once.

### W1 and W2: signing in

- **The Administrator** is the stack's own: `INITIAL_ADMINISTRATOR_EMAILS: admin@flow-tests.example` in `compose.test.yaml`. The main server registers it on its first start on an empty database (`AdministratorsService.onApplicationBootstrap`), and the empty state between tests keeps the `administrators` table. No seed or allow-list change is needed.
- **The stand-in.** The site loads `https://accounts.google.com/gsi/client` in the browser (`src/app/sign-in/google-sign-in.tsx`) and posts the credential to `POST /admin/auth/google` through a Server Action. A Playwright route handler answers that one URL with a stand-in script that defines `google.accounts.id.initialize` and `renderButton` as the site uses them and draws a sign-in button. A click calls the page's callback with an ID token from `googleIdToken()` (`caller.ts`): the stack's admin client ID as audience, the Administrator's email and subject, signed with the run's key, whose public key the stack's `sources` container already serves to the main server. It follows the admin page tests' Google stand-in (`admin/__tests__/support/google.ts`).
- A second route handler aborts every other request from the browser to a host other than the site's, and an aborted request fails the test.

### W1 and W2: the browser and the steps

- Playwright, the `playwright` package pinned at one exact version, as a dev dependency of `flow-tests`, run under Vitest so that the tests use the harness's `inject` values, Users and inbox unchanged. Chromium only, headless, installed once with `pnpm exec playwright install chromium`; `pnpm install` downloads no browser.
- The browser context runs in `America/Los_Angeles` and opens the site at `http://localhost:<published port>` (Chromium accepts the site's `Secure` cookies on `localhost` over plain HTTP). It accepts the site's `window.confirm` questions. Locators find elements by role and visible text; every assertion waits on a condition.
- **W1.**
  1. User A signs in over the API and stays connected.
  2. The Administrator opens the site, is sent to sign-in, presses the stand-in's button and lands on the Events page.
  3. Under "New event" they type a title, a description, a start and an end tomorrow in Seoul time, a place name, and the latitude and longitude of a point on campus, then press "Create the Draft".
  4. A's list of Global Events is still empty.
  5. On the Draft's page the Administrator presses "Publish" and confirms, and the page shows the event as published.
  6. A receives `global-events-changed`, and A's `GET /global-events` lists one event with the title, the start and end instants and the position typed. The expected instants are the Seoul times typed, converted by the test.
- **W2.**
  1. User A signs in over the API and stays connected; the Administrator signs in as in W1.
  2. The Administrator creates a Draft with a title only. Its page names a start and a position as missing and "Publish" is disabled; the Events list's "Still needs" column, filled from the main server's `missing`, names the same two.
  3. The Administrator adds a start and saves; the page and the list now name only the position.
  4. A receives no `global-events-changed`, and A's list of Global Events stays empty.
- **The command.** `pnpm test:admin-ui` runs a second Vitest configuration over `flow-tests/test/admin-ui/`, which the default configuration excludes, so `pnpm test` never picks it up. Its support files there (the stand-in script, the global setup) declare no test and need no level suffix. Its global setup is the flow stack's with the overlay added and the site's address provided; its setup file is the flow stack's own. It writes Vitest's JUnit report, and on a failure a screenshot and a Playwright trace, into a results folder git ignores.

### M1 and M2: the mock APK

- A release APK with the main server's address, the socket server's address and Google's web client ID set to empty strings for the build; the rest comes from `mobile/.env`. `@expo/env` loads a value from `.env` only when the variable is undefined, so a variable exported as empty stays empty. Then:
  - `googleAvailable()` is false (`src/auth/google.ts`), so `signIn()` takes the mock (`src/auth/sign-in.ts`);
  - `asksMainServer()` is false (`src/api/servers.ts`), so every answer comes from the in-app mock;
  - the clock stands at `FRAME_NOW` (`src/clock.ts`), so the mock Invite Link `from-yujian` is always valid;
  - `__DEV__` is false, so every development setting in `src/dev-settings.ts` is off.
- `INVITE_LINK_HOST` is empty too, so links open the app only through `snunow://` (`app.config.ts`). `ANDROID_X86_64` is unset, so the APK is `arm64-v8a` alone.
- `KAKAO_NATIVE_APP_KEY` is required, because the Kakao SDK refuses to start with an empty key; the real key from `mobile/.env` is used. The build is signed with the debug key the dev APK uses (`infra/deploy/README.md`, "Adding an APK"). No step depends on the map's content.
- `pnpm build:mock-apk` in `mobile/` runs a script that points `JAVA_HOME` at JDK 17 (Homebrew's `openjdk@17`), exports the blanks and unsets `ANDROID_X86_64`, and runs `pnpm expo prebuild --platform android --clean` and `./gradlew assembleRelease`.

### M1 and M2: the emulator and Maestro

- **The emulator**, pinned: a local Android emulator on the measurement Mac (Apple Silicon); system image `system-images;android-36;google_apis_playstore;arm64-v8a` (API 36, Google Play, ABI `arm64-v8a`), the image `mobile/README.md` names; the "Medium Phone" device profile; cold boot for the official run (`-no-snapshot-load`), then a wait until `sys.boot_completed` is 1. The emulator and image revisions on that Mac are recorded.
- **Maestro CLI 2.11.0**, on JDK 17. A person installs it, with their permission, when the work starts.
- **Flows.** Every flow names `appId: com.bonnieandclaude.snunow` and finds elements by visible text or accessibility label. Korean appears only in selectors; nothing is typed in Korean.
  - **M1, first run** (US-AUTH-01 scenario 1). Launch with cleared state. Tap "서울대 계정으로 로그인" (the mock signs in after 0.3 s). On consent, tap "동의하고 시작". "프로필 만들기" opens with the mock's suggested name; choose a department by scrolling to it in the list and tapping it. Tap "저장하고 시작하기". The map screen and its bottom tabs appear. Stop the app and launch it again without clearing its state: the map screen appears, and the sign-in screen does not.
  - **M2, cold start** (US-FRIEND-01 scenario 2). Launch with cleared state and run the sign-in subflow. Stop the app, then open `snunow://invite/from-yujian` from outside it (`openLink`, an Android VIEW intent). After the loading screen the accept screen shows "유지안님의 친구 초대" and the notice that accepting shows each other's location. Tap "수락". The app returns to the map with "유지안님과 친구가 됐어요", and the Friends list under "내 정보" lists "유지안".
  - **M2, warm start.** The same, but the link is opened while the app is on the map, and the accept screen appears at once.
- **Flow rules.** Each flow starts with a launch that clears the app's state; a later launch keeps it only where the journey is about what the phone kept. No `retry` and no fixed sleep: Maestro's assertions poll, and `extendedWaitUntil` with a timeout waits for the first screen after a launch. The run turns the emulator's window, transition and animator scales to 0. Each flow takes a screenshot at its checkpoints. Map markers are drawn inside Kakao's renderer and are not in the accessibility tree, so no step asserts on the map.
- **The command.** `pnpm test:device` in `mobile/` runs a script that checks exactly one device is connected, with ABI `arm64-v8a` and API 36, and that `maestro --version` prints 2.11.0; turns the animations off; reinstalls the mock APK; and runs `maestro test --format junit --output <run>/report.xml --test-output-dir <run> maestro/integration` from `mobile/`. The run folder, named by date and commit, sits in a results folder that `mobile/.gitignore` ignores.

### Documentation and repository rules

- `flow-tests/README.md`: A1 and A2 in the table of flows, a section on the admin site in a browser (the command, the Chromium install, what the stand-in replaces), and Google Identity Services under "What is replaced". `mobile/README.md`: a section on device runs (the APK build, the emulator, the Maestro install, `pnpm test:device`, where the results go).
- Every new source file starts with the AI-generated box that `CLAUDE.md` describes (`/* */` for TypeScript, `#` for the Compose overlay, the Maestro flows and the shell scripts).

## Testing Decisions

- A good journey drives the system as a User or an Administrator would and asserts only what they can see: an answer, a signal on their socket, a page, a screen. It reads no database and no server's internal state; the one exception is `flow-tests`' existing empty state between tests.
- Each journey checks its scenarios, and its expected values come from them or from the test's own input:

| Journey | Story and scenario | What is expected |
|---|---|---|
| A1 | US-AUTH-02, 1; NFR-07 | Phone 1 told `SESSION_REPLACED` and disconnected; its upload refused; nothing from it reaches the Friend; phone 2's upload does |
| A2 | US-QUEST-03, 1 and 2 | Every Holder told and reading the new Holder; every member told on the end; the Quest gone, off the Board, no Party |
| W1 | US-ADMIN-01, 1 | A connected User told, then listing the event with what the Administrator typed |
| W2 | US-ADMIN-01, 2 | Publish disabled; the start and the position named, then the position alone; nothing reaches Users |
| M1 | US-AUTH-01, 1 | Consent, then "프로필 만들기" with the suggested name, then the map; the map again on relaunch |
| M2 | US-FRIEND-01, 2 | The sender's name and the location notice on the accept screen; after "수락", the sender among the Friends (the mock's fixture) |

- Waits are bounded and wait on a condition: the harness's socket waits, Playwright's waiting locators, Maestro's polling assertions. Nothing sleeps for a fixed time, and nothing is retried to make a failure pass.
- The stand-in script is test tooling, exercised by W1 and W2.
- Prior art: the event and Friends flows of `flow-tests`; `compose.deploy.test.yaml`, for an overlay used by one set of tests; the admin site tests, which build the site and start it on a free port; the admin page tests' Google stand-in; the app's Jest whole-app tests, whose labels and texts the flows reuse.
- **The official measurement** is P09's, at the final commit, on the Mac P09's measurement runs on. The mock APK is built at that commit. Each journey's result and duration go into P09's Results: A1 and A2 from `pnpm test`, W1 and W2 from `pnpm test:admin-ui`, all four on the end-to-end line; M1 and M2 from the JUnit report of `pnpm test:device`, on the integration line as device runs, apart from mobile's Jest counts.

## Out of Scope

- The app against the started servers; the device runs use the app's own mock data.
- iOS, on a simulator or a phone, and devices other than the pinned emulator.
- A CI job for W1, W2, M1 or M2. No CI workflow changes.
- The other scenarios of the five stories, such as US-AUTH-02 scenario 2, US-ADMIN-01 scenario 3, a refused sign-in on the admin site, and an Invite Link that no longer works.
- What the map shows: Avatars, markers, routes.
- Changes to product code, to the existing flows beyond P09's rename and P10's fix, and to the admin and mobile tests.

## Further Notes

- **W1 and W2 run by hand.** They are not part of `pnpm test` or CI. A developer runs `pnpm test:admin-ui` after changing the admin site, its Server Actions or the main server's Administrator routes, and once in the official measurement. The same holds for `pnpm test:device` after changing the screens M1 and M2 pass through.
- **Installs.** Maestro's installer and Playwright's Chromium each download once, with a person's permission when the work starts. Maestro runs on JDK 17, Homebrew's `openjdk@17`, already on the measurement Mac (JDK 25 breaks the app's Android build).
- **Order.** After P09's rename: A1 and A2 first, since they need only small harness additions and no new tool; then W1 and W2; then the APK build and M1 and M2.
