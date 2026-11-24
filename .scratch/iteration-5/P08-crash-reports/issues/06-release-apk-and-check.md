# 06: The Release, the 1.0.4 APK to the testers, and the check on the Release's build

Parent: [P08 spec](../spec.md)
Status: ready-for-human
Blocked by: 01, 02, 03, 04, 05

Native files: none. Releases: `all` or `app`, by a person.

## What to do

1. Release once tickets 01 to 04 are merged and ticket 05 is done. The app job builds the 1.0.4 APK and publishes the
   bundle.
2. Install the APK on a phone and, in 내 정보, long-press the build line and send the test error.
3. In Sentry: the test error is there, its stack names a source file and line of ours, its tags hold the Release's
   tag and the update's id, and its event holds no query string, no id in a path and no user beyond an id. Under
   Releases, a session of this release is counted.
4. Turn the switch off, start the app again, send the test error: nothing arrives.
5. Give the testers the 1.0.4 APK, and tell them that an older build takes no later update.

## Done when

- [ ] Steps 2 to 4, each with what was seen, are written under Comments, with a screenshot of the Sentry event that
      shows no personal data.
- [ ] Ticket 03's last criterion is ticked there.
- [ ] The testers have the 1.0.4 APK before they start. The beta test starts on 2026-11-25.

## Comments
