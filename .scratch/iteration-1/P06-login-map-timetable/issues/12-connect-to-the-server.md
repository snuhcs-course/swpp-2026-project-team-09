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

- [ ] Under Comments, before any code: for each feature the demo's flows use and each other feature named, what the main server serves on its main line that day. A feature it does not serve yet stays a mock, and that is recorded there and in `todo.md` section 3.
- [ ] The settings the app needs are named in an example settings file with one-line comments and empty values: the main server's address, the socket server's address and the Google client IDs. The values are a person's to fill in.
- [ ] The client attaches the access token, renews the Session once on a 401 and repeats the request, and shows the sign-in screen when renewal fails. A 401 with `SESSION_REPLACED` shows the sign-in screen without a renewal, and a 403 with `ONBOARDING_REQUIRED` shows Onboarding with the suggestion it carries.
- [ ] A sign-in against the main server in a built Android app. The sign-in module already asks Google there with `react-native-nitro-google-signin`, with the main server's client as the server client, and checks the account's domain itself (ticket 04). Left for this ticket: the ID token is sent to the main server, the main server's tokens are kept in the phone's secure storage, and the main server's word replaces the app's check, so that each ending of the spec's table comes from Google's and the main server's answers. Expo Go keeps the mock sign-in.
- [ ] Onboarding is completed on the main server with the fields it stores, and the fields it does not store stay on the phone. The main server's word on whether a User finished Onboarding replaces the phone's.
- [ ] Each of the other features is read from the main server through its adapter, and its mock stays for the tests.
- [ ] A User in no Party is not a failure: `GET /parties/mine` answers 404 `NOT_IN_PARTY`, and the client's `getMyParty` turns exactly that into null. A test against the fake server covers it.
- [ ] The app keeps one connection to the socket server open with the access token, and opens it again with a new token when the server closes it at the token's expiry.
- [ ] `session-ended` with the code for a replaced Session shows the notice and the sign-in screen, as a 401 with that code does.
- [ ] A `position` moves that User's Avatar on the map, gliding, and a `position-removed` takes it off. The visible positions are fetched when the connection opens and when the app returns to the front.
- [ ] A signal that something the screen shows has changed makes the app fetch it again.
- [ ] The app sends no position of its own: that is built in P09 with the Master Switch.
- [ ] The app's time is the phone's: the fixed moment of the mocks (`src/clock.ts`) and the mock's fixed User id (`myUserId()`) are gone from a build that asks the main server.
- [ ] Jest tests against a fake server: the token and the one renewal, a failed renewal, each ending of a sign-in, Onboarding completed, each connected feature's answer through its adapter, and, with a fake socket, a position arriving, a position removed and the Session's end. The screens' tests pass unchanged.
- [ ] `todo.md` section 3 says what is connected and what is still a mock, and the list of mocks in the app holds nothing that the demo's flows use and the main server serves.
- [ ] A sign-in with an SNU account on the emulator or the shared phone reaches the main screen, recorded under Comments with a screenshot in the pull request.
- [ ] The app's four checks pass: lint, format, types and tests.
