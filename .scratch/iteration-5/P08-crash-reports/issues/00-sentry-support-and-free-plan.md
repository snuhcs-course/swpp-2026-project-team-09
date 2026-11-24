# 00: Sentry supports Expo 57 and React Native 0.86, and two points of the free plan

Parent: [P08 spec](../spec.md)
Status: ready-for-human
Blocked by: None (can start immediately)

Native files: none. Releases: none.

## What to do

1. Confirm that `@sentry/react-native` supports the app's Expo 57 and React Native 0.86. (Done, see Comments.)
2. Before making the account, read Sentry's pricing page and terms for the free (Developer) plan:
   - whether one login shared by the team's four members is allowed. If not, the account is one person's, and the
     others are told by alerts;
   - whether the plan has the Slack integration. If not, choose how the team is told: email alerts to each member, an
     email address of a Slack channel, or the GitHub Student Developer Pack's Sentry offer.
3. Write what was decided under Comments, and change the spec's "Reading" if the alert's way changes.

## Done when

- [x] The SDK's support for Expo 57 and React Native 0.86 is confirmed, with where it was read.
- [ ] The account's owner and how the others see crashes are written here.
- [ ] How the team is told of a new issue is written here.

## Comments

### What was found (2026-11-24)

- **Support.** The app has `expo ~57.0.25` and `react-native 0.86.3` (`mobile/package.json`). `@sentry/react-native`
  8.36.0 (2026-11-17, the newest) asks for `expo >= 49` and `react-native >= 0.65`. Sentry's own task "Support Expo
  SDK 57" (getsentry/sentry-react-native#6384) was closed as completed on 2026-07-01, with their Expo sample moved to
  SDK 57 (#6385), and the changelog has a later fix for iOS on React Native 0.86 and above (#6654). So 8.36.0 is the
  version to install.
- **The free plan,** from Sentry's pricing page and other pages read on 2026-11-24: one member and 5,000 errors a
  month; alerts by email. Several pages, a reply by Sentry's staff on its forum among them, say the Slack integration
  starts at the Team plan. Sentry's terms on a shared login were not found. These two are a person's to confirm on
  the pricing page and in the terms before the account is made.
