# 05: The 학과 field's words stay clear of the search icon

Parent: [P15 spec](../spec.md), item 5; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after boards for this item (the `P15-05-*` boards under "P15. 출시 전 앱 청소")
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

- [x] On opening 프로필 편집, the department's words start to the right of the search icon.
- [x] While the 학과 field has the focus, the hint "학과 검색" starts to the right of the icon and does not overlap it.
- [x] After leaving the field, the chosen department starts to the right of the icon, and pressing and leaving the field again does not move the words.
- [x] The same three hold for the 학과 field of Onboarding.
- [x] Tests, by ADR 0007: the integration tests of the Onboarding fields and of 프로필 편집 still pass. The icon and the words' position are native layout, so they are checked by hand on an Android emulator, which is an integration check by the ADR; the check is recorded under this ticket's Comments.

## Comments

### Notes from the implementation (2026-11-18)

- **The cause, read in the React Native 0.86.3 source, not seen on a device:**
  - The field changed its own `boxShadow`, the focus ring, on focus and on blur.
  - On Android, `BackgroundStyleApplicator.setBoxShadow` replaces the background with a layered drawable that keeps the EditText's theme background, so Android applies the theme's padding.
  - Fabric sends the padding again only when the layout's padding changes.
- **The fix:** Onboarding's `Input` draws its border, background, height and ring on a box around the text field. The field's own style no longer changes with the focus. The 학과 field passes its words' side room as `inset`.
- **Every Onboarding field shares `Input`:** 이름, 성별 직접 입력, 관심사 추가, 도서관 예약 학번 and 학적상 이름. Their look is unchanged. On Android their words most likely stop moving after a focus too.
- **The design system's `TextField`** still changes its own ring on focus. Only the catalogue uses it, so this ticket leaves it.

### Hand check on an Android emulator (2026-11-18)

**Setup:** emulator `sdk_gphone64_arm64` (Medium_Phone AVD), the app's debug build with the bundle from Metro, run against the app's own mock data, so with no server address and no Google client ID. 학과 was pressed by a tap and left by a tap on the card's empty space, and each state was screenshotted.

**The fix (#350, `0020623b`)**
- **Onboarding, 프로필 만들기:**
  - On opening, "학과 검색" starts right of the icon.
  - It was pressed and left three times, with nothing chosen and then with 컴퓨터공학부 chosen. The hint, the cursor and "컴퓨터공학부" always started at the same place right of the icon, and ✕ stayed at the right end.
  - Typed letters ("comp") started right of the icon and stopped before ✕.
  - 이름 kept its 16 px inset and stayed centred in height through two presses.
- **프로필 편집:**
  - 학과 read the icon, then "컴퓨터공학부", then ✕ on opening.
  - Pressed and left three times, the words never moved.
  - 이름, 도서관 예약 학번 and 학적상 이름 kept their inset and their centring through presses.

**The same build on `4.0/Main`, before the fix:** on 프로필 편집 the bug showed as the ticket says.
- The field read correctly on opening.
- Once pressed, "학과 검색" was drawn over the icon.
- After leaving, "컴퓨터공학부" stayed over the icon.
- It did the same on the second press.

**Note:** the emulator's keyboard showed a small floating toolbar at the left edge while a field had the focus. It covers part of the icon in some screenshots. It is the keyboard's, not the app's.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out. Tickets 02–05 ran in one session, in parallel, so that session's own share is split evenly among them.

- Agent time: about 51 minutes. That is about 36 minutes of implementation and review, in which three Opus 5.5 subagents worked on it (one implemented the ticket and two reviewed it), and about 15 minutes for the emulator check.
- Tokens: output about 88,000. Input about 31.2 million: 30.7 million cache reads, 0.52 million cache writes and about 350 uncached.
