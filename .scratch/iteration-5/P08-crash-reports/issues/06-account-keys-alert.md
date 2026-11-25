# 06: The Sentry account, its keys, and the alert

Parent: [P08 spec](../spec.md)
Status: ready-for-human
Blocked by: 01

Native files: none. Releases: none.

**`SENTRY_AUTH_TOKEN` is a secret.** It never goes into chat, a pull request, an issue, a commit, a document, a
configuration file, a test or a screenshot. The DSN is not a secret, but it is kept out of the repository all the same.

## What to do

1. Make the Sentry organisation and one project (platform React Native) in the US region, by the owner ticket 01
   names.
2. In the project's settings: turn off the storing of IP addresses, and turn on the scrubbing of data on the server
   as a second guard behind the app's own.
3. Put `EXPO_PUBLIC_SENTRY_DSN`, the organisation's slug and the project's slug in the repository's Actions
   variables, and an auth token that may upload source maps in its secrets as `SENTRY_AUTH_TOKEN`.
4. Make an alert for a new issue and for a regression, sent the way ticket 01 decided.
5. Read the plan's retention of events and write it under Comments, for ticket 05's wording.

## Done when

- [ ] The variables and the secret are in the repository's Actions settings.
- [ ] The alert's test notification reached the team.
- [ ] The retention is written here.

## Comments

### The retention (2026-11-25)

- **30 days**, from Sentry's own pages, read on 2026-11-24 and 2026-11-25: "Data Retention Periods" (Security, Legal,
  & PII › Security) lists Errors at 30 days on the Developer plan and 90 on Team, and says the retention is fixed when
  an event is taken in, by the plan then in effect; the pricing page says "30-day lookback" for Developer. The
  privacy policy's part (ticket 05) names 30 days from this.
- Not yet read on the account's own Subscription page; a person adds what it shows here. A change of plan changes the
  figure, and the policy with it.
