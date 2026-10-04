# 04: Sign-in screen

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Loading screen and the flow between screens)

## What to build

A User presses the one button of the sign-in screen, sees that the account is being checked, and is taken on, or is told why not. The screens are the `Login`, `LoginLoading` and `LoginError` frames.

The sign-in is the mock of ticket 02 behind the sign-in module. Google and the main server are connected in ticket 12.

## Acceptance criteria

- [ ] The screen has the frame's default, checking and refused states, with the frame's words, pictures and motion.
- [ ] A press shows the checking state, and the button takes no second press while it lasts.
- [ ] Each ending shows what the spec's table says: signed in leads on to Onboarding or the main screen; an account outside SNU shows the refused state; a closed sheet returns to the default state; any other failure shows the refused state with "잠시 후 다시 시도해 주세요".
- [ ] Each of the three legal documents opens on a screen of its own with the frame's placeholder text and closes back to the sign-in screen, also with Android's back button.
- [ ] The button and the links carry Korean accessibility labels, and the refused state's line is announced.
- [ ] Jest tests: each of the four endings, the button while checking, and a legal document opened and closed.
- [ ] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots of each state, taken from the app's web target at a phone's size and compared with the frames, are in the pull request under Test Results.
- [ ] The app's four checks pass: lint, format, types and tests.
