# 05: The Sentry account, its keys, and the alert

Parent: [P08 spec](../spec.md)
Status: ready-for-human
Blocked by: 00

Native files: none. Releases: none.

**`SENTRY_AUTH_TOKEN` is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a
configuration file, a test or a screenshot. The DSN is not a secret, but it is kept out of the repository all the same.

## What to do

1. Make the Sentry organisation and one project (platform React Native) in the US region, by the owner ticket 00
   names.
2. In the project's settings: turn off the storing of IP addresses, and turn on the scrubbing of data on the server
   as a second guard behind the app's own.
3. Put `EXPO_PUBLIC_SENTRY_DSN`, the organisation's slug and the project's slug in the repository's Actions
   variables, and an auth token that may upload source maps in its secrets as `SENTRY_AUTH_TOKEN`.
4. Make an alert for a new issue and for a regression, sent the way ticket 00 decided.
5. Read the plan's retention of events and write it under Comments, for ticket 04's wording.

## Done when

- [ ] The variables and the secret are in the repository's Actions settings.
- [ ] The alert's test notification reached the team.
- [ ] The retention is written here.

## Comments
