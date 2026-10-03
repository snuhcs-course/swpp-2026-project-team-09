# 14: Real Google sign-in and the socket connection

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Android map module and build settings), 12 (Sign-in, loading and the Session)

## What to build

A built Android app signs a User in with their SNU Google account and keeps one connection to the socket server, so that a sign-in on another phone ends this one at once. 안진영 writes it; 함재현 builds it, tries a real sign-in on the shared Android phone, fixes what fails and merges. Nobody has tried a real sign-in yet: P05 only built the library into a trial app.

The Google client IDs are a person's to supply, and the Android client must be registered for this app's identifier and the signing key's SHA-1. `.scratch/research/external-sources.md` §8 has the details. The agent adds the settings, asks for the values and waits.

## Acceptance criteria

- [ ] The sign-in module's real implementation uses `react-native-nitro-google-signin`, with the Web client as the server client so that the ID token's audience is what the main server checks.
- [ ] On Android the request filters accounts by the hosted domain `snu.ac.kr`, tries the account sheet first and falls back to the sign-in button flow when no account qualifies.
- [ ] The app chooses the real or the fake implementation while it runs, by whether the build holds the library, and loads the library only when it is there.
- [ ] After a sign-in the app keeps one connection to the socket server open with the access token, and opens it again with a new token when the server closes it at the token's expiry.
- [ ] `session-ended` with the code for a replaced Session shows the dialog and the sign-in screen, as a 401 with that code does. Sign-out closes the connection.
- [ ] Jest tests with a fake socket: the connection opens after a sign-in, `session-ended` shows the dialog, and sign-out closes the connection.
- [ ] The app's README records the Google settings and what must be registered at Google for a signing key.
- [ ] The pull request stays a draft until 함재현 records under Comments: a sign-in with an SNU account reaches the map, an account outside SNU is refused with the screen's words, a closed sheet returns to the default state, and a sign-in on a second phone ends the first one's Session with the dialog.
- [ ] If the library cannot be made to work on the device, that is recorded under Comments with what was tried, and the ticket stops for a person to decide on a native module of the team's own.
