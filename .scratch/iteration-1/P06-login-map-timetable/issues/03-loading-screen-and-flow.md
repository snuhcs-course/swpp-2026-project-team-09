# 03: Loading screen and the flow between screens

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Design system), 02 (Mocks and the API client)

## What to build

A User opens the app and sees the loading screen while the app gets ready, and is then taken where they belong: to the sign-in screen the first time, to Onboarding when they signed in and did not finish it, and to the main screen otherwise. The screen is the `Splash` frame.

The sign-in, Onboarding and main screens are placeholders here; tickets 04, 05 and 08 build them.

## Acceptance criteria

- [ ] The loading screen has the frame's look: the campus photos, the wordmark, the bar with its percentage and the step labels.
- [ ] It is shown while the app reads what the phone keeps and, for a User who is signed in and finished Onboarding, fetches the Lobby. The bar fills as that work goes, and the step labels follow the bar.
- [ ] It stays for at least 0.5 seconds, and is shown once, when the app starts.
- [ ] When the work fails it says "불러오지 못했어요" and offers "다시 시도", which starts the work again.
- [ ] After it: the sign-in screen for a User who is not signed in, Onboarding for one who signed in and did not finish it, the main screen for one who did.
- [ ] A User cannot reach a screen that is not theirs: not the main screen without a sign-in, not the sign-in screen once signed in.
- [ ] Motion respects the phone's reduced-motion setting.
- [ ] Jest tests: the screen while the work runs, each of the three places it leads to, the shortest time, and the failure with its retry.
- [ ] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots of each state, taken from the app's web target at a phone's size and compared with the frames, are in the pull request under Test Results.
- [ ] The app's four checks pass: lint, format, types and tests.
