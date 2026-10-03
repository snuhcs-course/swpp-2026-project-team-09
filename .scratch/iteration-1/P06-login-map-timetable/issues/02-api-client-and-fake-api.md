# 02: API client and fake API

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Every screen reaches the server through one API client, and a feature whose server does not exist yet is answered by a fake at that same place. This ticket builds the client, the fake API and the list that says which features are fake, so that a later ticket connects a feature by removing one line.

The client carries the rules of the spec's "API client" and "Fake and real" decisions: the access token, the one renewal of the Session, the codes `SESSION_REPLACED` and `ONBOARDING_REQUIRED`, and the `Idempotency-Key` with its retry table. The sign-in screens that use these come in ticket 12; here the client is proven against a fake server.

## Acceptance criteria

- [ ] The settings the app needs are named in an example settings file with one-line comments and empty values: the main server's address, the socket server's address, the Kakao native app key and the Google client IDs. The values are a person's to fill in, as `.scratch/research/external-sources.md` §7.1.1 says.
- [ ] The client attaches the access token, renews the Session once on a 401 and repeats the request, and reports a failed renewal so that the app can show the sign-in screen.
- [ ] A 401 with `SESSION_REPLACED` is reported as a replaced Session without a renewal, and a 403 with `ONBOARDING_REQUIRED` is reported with the suggestion it carries.
- [ ] A creating request gets an `Idempotency-Key`, a UUID from Expo's crypto module made once per action of the User. The key and its request are kept in the phone's storage until answered, sent again when the app starts, and dropped after 24 hours.
- [ ] The client follows the spec's table for each answer: no response, success, 409 with the code for a key in use, a server error, 422 with the code for a reused key, any other refusal. It reads the code in the answer, not only the status.
- [ ] TanStack Query is set up, so that a screen asks for data and is told whether it is loading, failed or there.
- [ ] One list names the fake features, with the spec's starting set. A feature on the list is answered by its fake, any other by the server.
- [ ] A fake answers after a short wait in the server's shape, can answer with a failure and with nothing, and keeps what the User saves in the phone's storage.
- [ ] In a build without the native modules, which Expo Go is, every feature is fake whatever the list says.
- [ ] Jest tests against a fake server: the token and the one renewal, a failed renewal, the replaced Session, the same key on every retry, a new key for a new action, each answer of the table, and a saved request sent again after a restart.
- [ ] The app's README records the settings, the fake list and how a feature is switched to the server.
