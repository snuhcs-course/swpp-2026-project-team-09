# 07: The Release, the 1.0.4 APK to the testers, and the check on the Release's build

Parent: [P08 spec](../spec.md)
Status: done
Blocked by: 02, 03, 04, 05, 06

Native files: none. Releases: `all` or `app`, by a person.

## What to do

1. Before the reports go on: read the retention on the account's Subscription page (ticket 06's step 5), write it
   under ticket 06, and put the figure back into the privacy policy's sentence on retention and its test
   (`legal-documents.ts`, `consent.integration.test.tsx`), which name none until then. Then set the repository
   variable `PRODUCTION_APP_SENTRY_DSN`, which is what turns the reports on.
2. Release once tickets 02 to 05 are merged and ticket 06 is done. The app job builds the 1.0.4 APK and publishes the
   bundle.
3. Install the APK on a phone and, in 내 정보, long-press the build line and send the test error.
4. In Sentry: the test error is there, its stack names a source file and line of ours, its tags hold the Release's
   tag and the update's id, and its event holds no query string, no id in a path and no user beyond an id. Under
   Releases, a session of this release is counted.
5. Turn the switch off, start the app again, send the test error: nothing arrives.
6. Give the testers the 1.0.4 APK, and tell them that an older build takes no later update.

## Done when

- [ ] Steps 3 to 5, each with what was seen, are written under Comments, with a screenshot of the Sentry event that
      shows no personal data.
- [ ] Ticket 04's last criterion is ticked there.
- [ ] The testers have the 1.0.4 APK before they start. The beta test starts on 2026-11-25.

## Comments

### The check on a phone (2026-11-26)

- Steps 1 and 2: the retention was read on the account and put in the policy (#549), `PRODUCTION_APP_SENTRY_DSN` was
  set, and the Release `snunow/all/26.11.25-1` published the bundle. The 1.0.4 APK had been built by the Release of
  2026-11-24, so this Release published an update only; a phone on 1.0.4 takes it on its next starts.
- Step 3 and the arrival in step 4: the owner sent the test error from a phone on that update, and it arrived in
  Sentry. It was also posted in `#team9-app-crash` (ticket 09).
- Not recorded here: the stack's file and line, the tags, the event's contents beyond its arrival, step 5 (the switch
  off) and a screenshot. The owner closed the ticket on 2026-11-26 with these left unchecked, so the criteria above
  stay unticked as a record of what was not written down; ticket 04's last criterion stays open for the same reason.
