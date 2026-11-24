# 07: iOS: the build, its dSYM upload and its check

Parent: [P08 spec](../spec.md)
Status: needs-info
Blocked by: 06

Native files: none in the repository beyond ticket 01's. Releases: the iOS build by hand.

**To decide first:** whether the beta test has iPhones. If it has none, this ticket waits until an iOS build is next
made, and the app's code for iOS is ticket 01's all the same.

## What to do

1. Build iOS by hand as the infra README's "The Production iOS build" says, with the Sentry plugin of ticket 01.
2. Upload the build's dSYM files to Sentry with a person's own auth token, and add the step to that section of the
   README.
3. Do ticket 06's steps 2 to 4 on an iPhone.

## Done when

- [ ] The README's iOS section has the dSYM upload.
- [ ] The test error from an iPhone is in Sentry with a readable stack, and nothing arrives with the switch off.

## Comments
