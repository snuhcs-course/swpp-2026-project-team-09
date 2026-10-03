# 13: Onboarding screen

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 12 (Sign-in, loading and the Session)

## What to build

A new User confirms a name and a department after the first sign-in and arrives at the map. The screen is the frame `Onboarding`. The main server's side exists (P04): its README records the suggestion, the request that completes Onboarding and the profile's limits.

The course level and the gender are fake until the main server stores them.

## Acceptance criteria

- [ ] The screen appears for a User who has not finished Onboarding, with no way back on screen or with Android's back button.
- [ ] The name and the department are filled in from the suggestion, each with the badge "Google 계정에서 가져옴" until the User changes it. A part the suggestion lacks, or a department that is not in the list, stays empty.
- [ ] The department is chosen from the frame's lists of undergraduate and graduate departments, searched as in the frame. Changing the course level clears the department.
- [ ] The admission year list runs from this year back twelve years. "그 외" stores no admission year.
- [ ] The gender's choices are the frame's, with a text of the User's own for "직접 입력".
- [ ] Interests follow the server's limits: 20 at most, 30 characters each, no whitespace, none twice whatever its case. The `#` is shown and not stored. The frame's suggested interests can be added with a tap.
- [ ] The save button is enabled once a name and a department are there. Saving completes Onboarding on the server and shows the loading screen.
- [ ] "로그아웃" signs out and shows the sign-in screen.
- [ ] Jest tests: the suggestion filled in and its badges, a suggestion without a department, the save button's condition, the interests' limits, a successful save and sign-out.
