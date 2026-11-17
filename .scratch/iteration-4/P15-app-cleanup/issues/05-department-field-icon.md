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

- [ ] On opening 프로필 편집, the department's words start to the right of the search icon.
- [ ] While the 학과 field has the focus, the hint "학과 검색" starts to the right of the icon and does not overlap it.
- [ ] After leaving the field, the chosen department starts to the right of the icon, and pressing and leaving the field again does not move the words.
- [ ] The same three hold for the 학과 field of Onboarding.
- [ ] Tests, by ADR 0007: the integration tests of the Onboarding fields and of 프로필 편집 still pass. The icon and the words' position are native layout, so they are checked by hand on an Android emulator, which is an integration check by the ADR; the check is recorded under this ticket's Comments.

## Comments

### Notes from the implementation (2026-11-18)

- **The cause, read in the React Native 0.86.3 source, not seen on a device:**
  - The field changed its own `boxShadow`, the focus ring, on focus and on blur.
  - On Android, `BackgroundStyleApplicator.setBoxShadow` replaces the background with a layered drawable that keeps the EditText's theme background, so Android applies the theme's padding.
  - Fabric sends the padding again only when the layout's padding changes.
- **The fix:** Onboarding's `Input` draws its border, background, height and ring on a box around the text field. The field's own style no longer changes with the focus. The 학과 field passes its words' side room as `inset`.
- **Every Onboarding field shares `Input`:** 이름, 성별 직접 입력, 관심사 추가, 도서관 예약 학번 and 학적상 이름. Their look is unchanged. On Android their words most likely stop moving after a focus too.
- **The design system's `TextField`** still changes its own ring on focus. Only the catalogue uses it, so this ticket leaves it.
- **The criteria are not ticked yet.** Criteria 1–4 are seen on screen, and criterion 5 asks for the hand check on an Android emulator to be recorded here. That check is still to do. With a build that has this change:
  1. Open 프로필 편집. 학과 reads: the icon, then "컴퓨터공학부", then ✕.
  2. Press the field. The hint and the cursor start right of the icon.
  3. Leave the field. The department starts right of the icon.
  4. Repeat steps 2 and 3 a few times, and type a few letters.
  5. Do the same on Onboarding's 학과 field, and look at 이름 and 학번 too.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out. Tickets 02–05 ran in one session, in parallel, so that session's own share is split evenly among them.

- Agent time: about 36 minutes. Three Opus 5.5 subagents worked on it: one implemented the ticket and two reviewed it.
- Tokens: output about 59,000. Input about 13.6 million: 13.2 million cache reads, 0.46 million cache writes and about 250 uncached.
