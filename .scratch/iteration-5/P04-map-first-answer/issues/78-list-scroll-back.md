# 78: Back from a restaurant's menu, the meal list is where it was, and the menu opens whole

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #581
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

Two faults on the user's phone, 2026-11-26:

- The sheet's content keeps one scroll place, so a press on a row of the meal list opened that Restaurant's menu at the place the list was scrolled to, and "‹ N곳 목록" or Android's back returned to the list at the menu's place, not where the list was ("뒤로가기를 눌렀을 때, 이전 스크롤 위치로 돌아가면 좋을 것 같아").
- A row pressed while the sheet is low opens the menu at low with its head cut through the name ("목록에서 항목을 선택하면 … 스크롤이 가장 위로 되어 있지 않아 위가 짤리네"): the back row shows whole, and only the top half of the name and of the number.

In the capture the menu was at its top, so that cut is low's height, not a scroll carried over:

- Low shows the content's top padding and two lines of the answer's words, 24 points each, over the footer's band.
- The menu starts with its back row (20), a gap of 12, then its head, whose name line (26) runs from 32 to 58.
- Low ends at 48, through the name.

## What to build

1. A menu opens at its top. Closing it, by "‹ N곳 목록" or Android's back, brings the list back to where it was scrolled when the row was pressed, the pressed row in sight, with the kind chosen kept.
   - A menu opened over another menu (another place chosen on the map) opens at its top too, and closing it still brings back the list's place.
   - A new answer or a recalculation keeps no place: it starts at the top as before.
2. Opening a menu raises a low sheet to middle, from a row of the list as from the chosen place's "메뉴 ›" on the map, which already did. A raised sheet stays at its step.
   - This was chosen over fitting the menu's head into low's two lines: the map's press already opens the menu this way, and middle shows the back row, the head, and the meals' tabs whole.
   - A menu dragged down to low still ends at low's line.

## Acceptance criteria

- [x] A row's press opens the menu at its top, and "‹ N곳 목록" brings the list back to its place.
- [x] Android's back does the same, with the kind chosen kept.
- [x] Another answer keeps no place from the one before.
- [x] A row pressed at low raises the sheet to middle with the menu.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

Built in PR #581. `useLayerScroll` in the card keeps the content's place while a menu is open over it, for the same answer only, and `useMenuRaising` makes every `openMenu` raise a low sheet. The content's scroll runs natively, so jest sees only its top: the place kept is checked by a unit test of the hook (`answer-layer-scroll`), and the wiring by `answer-meal-list-back`.

### Agent usage (2026-11-26)

- Agent time: about 33 minutes in one session, test runs included (an estimate).
- Tokens: input 33,178,357 (cache reads 33,074,193, cache writes 104,032, uncached 132); output 55,345. No subagents.
