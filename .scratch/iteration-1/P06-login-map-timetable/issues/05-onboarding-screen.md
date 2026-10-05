# 05: Onboarding screen

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 04 (Sign-in screen)

## What to build

A new User confirms a name and a department after the first sign-in, adds what else they like, and arrives at the main screen. The next time the app opens, Onboarding is not shown. The screen is the `Onboarding` frame.

The answers are kept on the phone through the mock of ticket 02.

## Acceptance criteria

- [x] The screen appears after a sign-in for a User who has not finished Onboarding on this phone, with no way back on screen or with Android's back button.
- [x] The name and the department are filled in from the suggestion, each with the badge "Google 계정에서 가져옴" until the User changes it. A part the suggestion lacks, or a department that is not in the list, stays empty.
- [x] The department is chosen from the frame's lists of undergraduate and graduate departments, searched as in the frame. Changing the course level clears the department.
- [x] The course level starts as undergraduate. The admission year list holds twelve years, this year and the eleven before it, and "그 외" stores no admission year.
- [x] The gender's choices are the frame's, with a text of the User's own for "직접 입력".
- [x] Interests follow the limits in the spec: 20 at most, 30 characters each, no whitespace, none twice whatever its case. The `#` is shown and not stored. The frame's suggested interests are added with a press.
- [x] The save button is enabled once a name and a department are there. Saving completes Onboarding and shows the main screen.
- [x] "로그아웃" signs out and shows the sign-in screen.
- [x] After Onboarding the app opens on the loading screen and then the main screen.
- [x] Jest tests: the suggestion and its badges, a suggestion without a department, the save button's condition, the interests' limits, a save, a restart after a save, and sign-out.
- [x] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots of each state, taken from the app's web target at a phone's size and compared with the frames, are in the pull request under Test Results.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Where things are:

- The screen is `mobile/src/screens/onboarding/`: `onboarding-screen.tsx` with the fields in files of their own, `form.ts` for what the User has put in and what is saved, `interests.ts` for the interests' limits, `departments.ts` for the frame's two lists and `department-search.ts` for the search. `mobile/src/app/onboarding.tsx` only names the place.
- The tests are `mobile/__tests__/onboarding-test.tsx` (the suggestion, the save button, a save, a failed save, a restart, sign-out, no way back) and `mobile/__tests__/onboarding-fields-test.tsx` (department, admission year, gender, interests). `mobile/__tests__/support/onboarding.ts` holds what other tests need to pass Onboarding.

Decisions:

- The department is a name alone. No name is twice in one course level's list, so the college is not stored. A suggested department is looked for in the undergraduate list, the level the form starts with.
- "This year" is the year of `now()` in Korea's time, so the list is 26학번 to 15학번 while the clock is the frame's. A year is stored in full, as 2022.
- The admission year's list opens under its field, as the department's does: React Native has no select, and the app has no picker package. It holds "학번 선택" to take a choice back.
- An interest is counted without its `#`: 30 characters after it. One that is there already, whatever its case, is dropped without a message, as in the frame.
- "직접 입력" without words stores no gender. The words are 30 characters at most; the frame sets no limit.
- A save that failed shows the toast "저장하지 못했어요. 다시 시도해 주세요".
- The design system's icons gain `chevronDown`, which the frame draws on the admission year's field.
- No code handles Android's back button. The flow replaces each screen with the next, so nothing is behind Onboarding; a test checks that the router has nowhere to go back to after a sign-in and the consent.

Differences from the frame:

- Colours, text styles and buttons are the design system's where the frame draws its own: the title is 22 points and not 24, a field's border is the stronger one of the design system's TextField, the badge is the design system's Badge with a check and has its corners and not a pill's, "로그아웃" is the ghost Button in blue and not grey, the save button's corners are 12 and not 14, and "추가" is the 40-point Button beside a 48-point field.
- Touch areas are 48 points high. The course level's track is 48 and not 46, a row of a list 48 and not 44, the clearing × 48 and not 36, and the gender's and the suggested interests' pills keep their heights of 36 and 28 inside pressed areas of 48, so their rows stand further apart.
- The clearing × is called "학과 지우기", where the frame says "지우기".
- The frame starts with a name and a department of its own; the app starts with the suggestion, or empty.
- The frame's header and foot lie over the scrolling form; here they stand above and below it, and all of it moves up for the keyboard.

Not checked: nothing ran in a browser or on a phone. The look, the list that scrolls inside the form, the headings that stay at the top of the department's list, the keyboard's behaviour and Android's back button are unseen. No screenshots were taken.

Open: while the department's list is open, the field shows the searched words, so a User who opens it and chooses nothing sees an empty field although the department chosen before still holds. The frame does the same.

The frame `Onboarding` was read again when the work started and is unchanged since the spec (22488 bytes at canvas version `1791129072-d0ec`). Its only image is the font file `/_blob/1b72972d88ba451aaabb7e07244b8c11`, which the app does not need.
