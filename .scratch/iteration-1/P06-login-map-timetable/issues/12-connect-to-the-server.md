# 12: Connect the mocks to the main server

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 10 (Main screen: the lists and the controls around the map)

## What to build

The app's mocks give way to the main server, one feature at a time, for the features the app's developers name when this ticket starts. A feature nobody names stays a mock. For each feature the client and its adapter change and the screens do not.

A real sign-in needs three things that code cannot give: a built app, a Google sign-in client registered for the app's identifier and signing key, and a main server that the phone can reach. The ticket starts by recording which of these hold and which features the server serves on its main line that day.

## Acceptance criteria

- [ ] Under Comments, before any code: the features named for this ticket, and for each what the main server serves on its main line that day.
- [ ] The settings the app needs are named in an example settings file with one-line comments and empty values: the main server's address and the Google client IDs. The values are a person's to fill in.
- [ ] The client attaches the access token, renews the Session once on a 401 and repeats the request, and shows the sign-in screen when renewal fails. A 401 with `SESSION_REPLACED` shows the sign-in screen without a renewal, and a 403 with `ONBOARDING_REQUIRED` shows Onboarding with the suggestion it carries.
- [ ] A real sign-in in a built Android app: the sign-in module uses `react-native-nitro-google-signin` with the main server's client as the server client, tokens are kept in the phone's secure storage, and each ending of the spec's table comes from Google's and the main server's answers. Expo Go keeps the mock sign-in.
- [ ] Onboarding is completed on the main server with the fields it stores, and the fields it does not store stay on the phone. The main server's word on whether a User finished Onboarding replaces the phone's.
- [ ] Each other feature named is read from the main server through its adapter, and its mock stays for the tests.
- [ ] Jest tests against a fake server: the token and the one renewal, a failed renewal, each ending of a sign-in, Onboarding completed, and each connected feature's answer through its adapter. The screens' tests pass unchanged.
- [ ] `todo.md` section 3 says what is connected and what is still a mock.
- [ ] A sign-in with an SNU account on the emulator or the shared phone reaches the main screen, recorded under Comments with a screenshot in the pull request.
- [ ] The app's four checks pass: lint, format, types and tests.
