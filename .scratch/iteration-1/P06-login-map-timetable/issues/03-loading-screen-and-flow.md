# 03: Loading screen and the flow between screens

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 01 (Design system), 02 (Mocks and the API client)

## What to build

A User opens the app and sees the loading screen while the app gets ready, and is then taken where they belong: to the sign-in screen the first time, to Onboarding when they signed in and did not finish it, and to the main screen otherwise. The screen is the `Splash` frame.

The sign-in, Onboarding and main screens are placeholders here; tickets 04, 05 and 08 build them.

## Acceptance criteria

- [x] The loading screen has the frame's look: the campus photos, the wordmark, the bar with its percentage and the step labels.
- [x] It is shown while the app reads what the phone keeps and, for a User who is signed in and finished Onboarding, fetches the Lobby. The bar fills as that work goes, and the step labels follow the bar.
- [x] It stays for at least 0.5 seconds, and is shown once, when the app starts.
- [x] When the work fails it says "불러오지 못했어요" and offers "다시 시도", which starts the work again.
- [x] After it: the sign-in screen for a User who is not signed in, Onboarding for one who signed in and did not finish it, the main screen for one who did.
- [x] A User cannot reach a screen that is not theirs: not the main screen without a sign-in, not the sign-in screen once signed in.
- [x] Motion respects the phone's reduced-motion setting.
- [x] Jest tests: the screen while the work runs, each of the three places it leads to, the shortest time, and the failure with its retry.
- [x] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots of each state, taken from the app's web target at a phone's size and compared with the frames, are in the pull request under Test Results.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Built on the branch `1.0/P06-03-loading-screen-and-flow`. The four checks pass: lint, format, types, and 100 tests in 20 files, 9 of them this ticket's.

The frames, read again: `Splash` is as it was when the spec was written (5892 bytes, version `1791129072-d0ec` of the canvas). Nothing changed.

Where things are:

- `src/screens/loading-screen.tsx` is the screen and `src/screens/use-loading.ts` its bar. `src/session/start.ts` is the work it waits for.
- `src/session/session.tsx` holds where the User is while the app runs. A screen of one place starts with `useOwnPlace`, which leads anyone else to their own place. `/` is the loading screen, then `/sign-in`, `/onboarding` or `/main`.
- The three other screens are placeholders with the ways on that the real screens will have, in development only: a sign-in, a save, a sign-out.

Decisions:

- The bar follows the work in two stretches: it creeps to 35 until the phone's memory is read, to 90 while the Lobby is fetched, and runs to 100 when the work is done. The step labels are the frame's and follow the bar: 지도, 친구, 일정, 완료.
- The screen leaves once the work is done, the bar is full and 0.5 seconds have passed.
- A Lobby refused with `ONBOARDING_REQUIRED` leads to Onboarding, and one refused with 401 to the sign-in screen. Any other failure shows "불러오지 못했어요" and "다시 시도". A failure of the main server's own is asked once more first, so the words appear after about 1.6 seconds with the mocks.
- The Lobby's answer is kept for the main screen and not asked again by a screen that reads it.
- The photos move only once the phone has said that it does not ask for reduced motion. Until then, and with reduced motion, the first photo stands still.
- The loading screen stays drawn until the next screen has taken its place, and screens change with a fade.

Differences from the frame:

- The frame's band of light that crosses the photos is left out.
- The wordmark is in the heaviest weight the app ships, 700; the frame's is 800.
- The photos grow and give way to each other as in the frame, without the frame's small sideways drift.
- On the web target the shade over the photos is even, not a gradient: the web draws no gradient from React Native's style.

Not done, and not checked:

- No screenshots were taken and nothing ran on a phone or in a browser, by the developer's decision: a teammate checks the screen from the pull request. The screenshots' criterion is open.
- The photos are the two of the frame, copied from the wireframes. Where they come from and whether the app may ship them is not recorded anywhere.

### Agent usage (2026-10-05)

- Agent time: about 25 minutes in this session, an estimate.
- Tokens, this session from the request to the pull request: input 56 new, 9.8 million read from the cache, 47 thousand written to the cache; output 33 thousand. One review subagent: 68 thousand.
