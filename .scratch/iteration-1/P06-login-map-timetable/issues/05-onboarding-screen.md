# 05: Onboarding screen

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Sign-in screen)

## What to build

A new User confirms a name and a department after the first sign-in, adds what else they like, and arrives at the main screen. The next time the app opens, Onboarding is not shown. The screen is the `Onboarding` frame.

The answers are kept on the phone through the mock of ticket 02.

## Acceptance criteria

- [ ] The screen appears after a sign-in for a User who has not finished Onboarding on this phone, with no way back on screen or with Android's back button.
- [ ] The name and the department are filled in from the suggestion, each with the badge "Google 계정에서 가져옴" until the User changes it. A part the suggestion lacks, or a department that is not in the list, stays empty.
- [ ] The department is chosen from the frame's lists of undergraduate and graduate departments, searched as in the frame. Changing the course level clears the department.
- [ ] The course level starts as undergraduate. The admission year list holds twelve years, this year and the eleven before it, and "그 외" stores no admission year.
- [ ] The gender's choices are the frame's, with a text of the User's own for "직접 입력".
- [ ] Interests follow the limits in the spec: 20 at most, 30 characters each, no whitespace, none twice whatever its case. The `#` is shown and not stored. The frame's suggested interests are added with a press.
- [ ] The save button is enabled once a name and a department are there. Saving completes Onboarding and shows the main screen.
- [ ] "로그아웃" signs out and shows the sign-in screen.
- [ ] After Onboarding the app opens on the loading screen and then the main screen.
- [ ] Jest tests: the suggestion and its badges, a suggestion without a department, the save button's condition, the interests' limits, a save, a restart after a save, and sign-out.
- [ ] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots of each state, taken from the app's web target at a phone's size and compared with the frames, are in the pull request under Test Results.
- [ ] The app's four checks pass: lint, format, types and tests.
