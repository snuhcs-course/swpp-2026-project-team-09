# 05: The 학과 field's words stay clear of the search icon

Parent: [P15 spec](../spec.md), item 5; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after board for this item under "P15. 출시 전 앱 청소"
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none

## What is on screen now

- When 프로필 편집 is first opened, the 학과 field reads correctly: the search icon, then "컴퓨터공학부", then ✕. When the field is pressed, the hint "학과 검색" is drawn over the icon. When the User presses elsewhere and leaves the field, "컴퓨터공학부" is drawn over the icon. Once this has happened, the field does not go back to how it first looked until the screen is opened again. Reproduced on an Android emulator.
- The cause is a guess, not verified: the field widens its left padding to leave room for the icon, and when the press changes the field's border style, Android falls back to its default side padding, so the words are drawn from the left edge.

## What changes

- The words and the hint always start to the right of the search icon: when the screen is opened, while the field is pressed, and after the User leaves it, however many times.

## Fixed with it

- The 학과 field of Onboarding is the same component, so it is fixed by the same change.

## Acceptance criteria

The criteria are what is seen on screen, not the cause.

- [ ] On opening 프로필 편집, the department's words start to the right of the search icon.
- [ ] While the 학과 field has the focus, the hint "학과 검색" starts to the right of the icon and does not overlap it.
- [ ] After leaving the field, the chosen department starts to the right of the icon, and pressing and leaving the field again does not move the words.
- [ ] The same three hold for the 학과 field of Onboarding.
- [ ] Tests, by ADR 0007: the integration tests of the Onboarding fields and of 프로필 편집 still pass. The icon and the words' position are native layout, so they are checked by hand on an Android emulator, which is an integration check by the ADR; the check is recorded under this ticket's Comments.
