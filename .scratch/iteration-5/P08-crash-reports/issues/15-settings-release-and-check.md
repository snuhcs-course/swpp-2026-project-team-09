# 15: The settings, the Release, and the check that events arrive

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-human
Blocked by: 11, 12, 13, 14

Native files: none. Releases: `all` (the main server, then the app's update), by a person.

**The project token is kept out of the repository.** PostHog calls it safe to ship, but its value goes into no chat,
pull request, issue, commit, document, configuration file, test or screenshot. The personal API key is a secret and
is never used here.

## What happens now

- The PostHog organisation and its project exist on PostHog Cloud US, on the free plan.
- After tickets 11 to 14 the app records the usage choice and sends nothing without `EXPO_PUBLIC_POSTHOG_TOKEN`; the
  main server sends nothing without `POSTHOG_PROJECT_TOKEN`.
- After ticket 12, `.github/workflows/release.yml` gives the app job `EXPO_PUBLIC_POSTHOG_TOKEN` from
  `vars.PRODUCTION_APP_POSTHOG_TOKEN`, which is unset; after ticket 14, the main server reads the parameter
  `posthog-project-token`, which is absent.

## What to do

1. **Read the plan.** On the organisation's billing page, read the plan, the monthly event limit and the retention of
   events, and write them under Comments. If the retention is not 1 year, change the privacy policy's sentence and its
   test (`legal-documents.ts`, `consent.integration.test.tsx`) to the figure shown before going on.
2. **Turn off IP addresses.** In the project's settings, turn on "Discard client IP data", and write under Comments
   that it is on.
3. **Check the wording.** Ticket 11's Korean wording has been reviewed, as its Comments say.
4. **The app's token.** Add the repository variable `PRODUCTION_APP_POSTHOG_TOKEN` with the project token. Ticket 12
   made the Release workflow's app job pass it as `EXPO_PUBLIC_POSTHOG_TOKEN`; it is what turns the app's sending on.
5. **The main server's token.** Put the project token in Parameter Store as `posthog-project-token`, entered with
   `read -rs` as the other secrets are (infra README § Crash alerts in Slack).
6. **Release** once tickets 10 to 14 are merged: the main server first, then the app's update. No new APK.
7. **The check on a phone** with the Release's build and a test User's account:
   - sign in; the consent screen asks, with the item not ticked; tick it and go on;
   - open three screens, send the Assistant a message, make a 비공개 파티, accept a Friend Request from a second
     account, and book and then cancel a seat;
   - in PostHog's activity view, within a few minutes: `app_opened`, `screen_viewed` with routes holding `:id` and no
     value, each action's `_requested` and `_completed` from the app, and the main server's `_completed` with
     `source: server` for the same User id; no IP address on any event, and no property outside the spec's table and
     PostHog's own device and OS;
   - with a second account that does not tick the item: nothing arrives from it, from the app or the main server;
   - on the first account, turn 내 정보's "사용 기록 보내기" off, send the Assistant a message and open two screens:
     nothing more arrives, from the app or the main server; turn it on again and the next events arrive.
8. **iOS** is ticket 08's owner's: when an iOS build is next made, the same check on an iPhone is written there.

## Done when

- [ ] The plan, the limit, the retention and the IP setting are written under Comments.
- [ ] The variable and the parameter are in place.
- [ ] Step 7, with what was seen, is written under Comments, with a screenshot of one event that shows its
      properties and no IP address (no token in it).
- [ ] The account that did not tick the item sent nothing, and the first sent nothing while its switch was off.

## Comments
