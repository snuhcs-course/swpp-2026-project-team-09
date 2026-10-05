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
- An interest is counted without its `#`: 30 characters, an emoji being one. Whitespace, a comma and a `#` each end an interest, so several are typed or pasted at once. One that is too long, there already whatever its case, or the twenty-first is not added: it stays in the field with the reason under it.
- "직접 입력" without words stores no gender. The words are 30 characters at most; the frame sets no limit.
- A save that failed shows the toast "저장하지 못했어요. 다시 시도해 주세요".
- The design system's icons gain `chevronDown`, which the frame draws on the admission year's field.
- No code handles Android's back button. The flow replaces each screen with the next, so nothing is behind Onboarding; a test checks that the router has nowhere to go back to after a sign-in and the consent.

Differences from the frame:

- Colours, text styles and buttons are the design system's where the frame draws its own: the title is 22 points and not 24, and the save button is the design system's Button, with corners of 12 and not 14. The fields, the badge, "추가" and "로그아웃" are drawn as the frame draws them, from the design system's tokens.
- Touch areas are 48 points high. The course level's track is 48 and not 46, a row of a list 48 and not 44, the clearing × 48 and not 36, "로그아웃" 48 and not 44, and the gender's and the suggested interests' pills keep their heights of 36 and 28 inside pressed areas of 48. The pressed areas of two rows lie over each other, so that the rows stand 8 and 6 apart as in the frame.
- The clearing × is called "학과 지우기", where the frame says "지우기".
- The frame starts with a name and a department of its own; the app starts with the suggestion, or empty.
- The frame's header and foot lie over the scrolling form; here they stand above and below it. While the phone's keyboard is up the foot is hidden, so that the form has the room.

Not checked: nothing ran in a browser or on a phone. The look, the list that scrolls inside the form, the headings that stay at the top of the department's list, the keyboard's behaviour and Android's back button are unseen. Two things in particular: Korean composition on Android's keyboards while a field's text is rewritten, which happens only when a name or the gender's words pass 30 characters; and KeyboardAvoidingView on Android, where the window may resize as well.

The frame `Onboarding` was read again when the work started and is unchanged since the spec (22488 bytes at canvas version `1791129072-d0ec`). Its only image is the font file `/_blob/1b72972d88ba451aaabb7e07244b8c11`, which the app does not need.

### After the review and the screenshots (2026-10-05)

- The department field shows what is saved. Leaving it without a choice closes the list and shows the department it held, also after words that found nothing; the badge stays with it. The list waits a quarter of a second after the field lost the focus, and for a press that began on a row, so that a press still chooses on the web and on Android.
- Interests are split on whitespace, commas and `#`, and none stores a `#`. The field has no limit of its own; each interest has. One that is not added stays in the field, and a line under it says why: "관심사는 20개까지 추가할 수 있어요", "이미 추가한 관심사예요" or "30자까지 쓸 수 있어요". A screen reader is told.
- A second press on the save button before the screen is drawn again sends nothing.
- The name, the gender's own words and an interest are counted in characters as Unicode numbers them, and a text is never cut inside one.
- The toast sits above the foot, whose height is measured.
- A field whose list opens is scrolled so that the list ends above the foot, and again when the keyboard comes. The field stays in view where both do not fit. The foot is hidden while the keyboard is up; the web tells nothing of a keyboard and keeps it.
- Fields, the admission year's control and the gender's pills have the light border and are 48 high. A focused field has the key colour's border and a pale ring, and the web's own outline is off.
- The badge is pale blue with blue words. "추가" is 48 high. "로그아웃" is grey. "학번 선택" is in the ink colour, as the frame's.
- The gender's rows stand 8 apart and the suggested interests' 6, as the frame's.

The tests are joined by `mobile/__tests__/onboarding-interests-test.tsx` and `mobile/__tests__/onboarding-rules-test.tsx`. Nothing ran in a browser or on a phone in this round either: the scrolling to an open list and the hidden foot are unseen.
