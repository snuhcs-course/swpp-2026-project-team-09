# 49: The main button takes its own row above the input

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([45](45-dock-button-and-bar-head.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone (Main at 87aa3554, a large system font): with "만들고 초대 보내기" beside it, the input is so narrow that its placeholder "이어서 말하기" wraps to two lines, and the input and the button differ in height again. Ticket 45's equal heights do not hold at that font size and label length.

## What to build

1. The answer's main button (일정에 넣기, 만들고 초대 보내기, 예약하기, 확인, a Lookup's button, 파티 수정하기) takes its own full-width row, directly above the input; the input is the last row, full width. It is the one slot every answer's main button goes through, so the rule is the same for every kind.
2. The input's placeholder stands on one line at any font size, cut with "…" if it must, and the empty field is one line high.
3. Second buttons (길 안내, 다시 고르기, and the like) stay in the card and never share the input's row.
4. Raised (the list, a restaurant's menu), the same two rows stand at the bottom.
5. The input tells the room it takes as the bar plus the button's row, so the answer's card keeps clear of both, and the camera fits the answer to the card's measured height.

## Acceptance criteria

- [ ] The main button's row is full width above the input; the input keeps the whole width. (Integration test.)
- [ ] The placeholder is one line and the empty field one line high. (Integration test.)
- [ ] Checked on a phone at a font scale of 1.3 with "만들고 초대 보내기" before the merge.
- [ ] No native file changes; lint, format, and types pass on the app.
