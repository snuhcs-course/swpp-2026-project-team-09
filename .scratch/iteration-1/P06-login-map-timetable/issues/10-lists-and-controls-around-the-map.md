# 10: Main screen: the lists and the controls around the map

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 09 (Main screen: markers, cards and the route)

## What to build

The main screen gains what the `Main` frame shows around the map: the friend list on the left, the Quest list on the right, the buttons above the navigation and the AI input. The lists collapse, a row takes the map somewhere, and a control that would open something this task does not build says so. The frames are `Main` and `MainCollapsed`.

## Acceptance criteria

- [ ] The friend list shows the pill with the number of Friends in the list and the Friends' rows with their status and place, as in the frame, and collapses and expands.
- [ ] A press on a Friend's row moves the map to that Friend and opens their card, or shows "…님은 위치가 꺼져 있어요" for a Friend without a position.
- [ ] The Quest list shows the pill with the count and today's Quests joined by the frame's rail, with "오늘 일정 없음" when there are none, and collapses and expands.
- [ ] A press on a Class Quest's row moves the map to its Place and shows the frame's toast.
- [ ] "오늘의 발자국", "활성 파티", the 편의기능 button and the AI input with its send button are where the frame puts them, with the frame's words.
- [ ] These show the "준비 중이에요" toast: the friend pill, the Quest list's full-screen button, a Party's row in the Quest list, 오늘의 발자국, 활성 파티, the 편의기능 button, and the AI input when it is touched or sent.
- [ ] The lists stay readable over the map, as in the frame, and every control carries a Korean accessibility label.
- [ ] While a card is open, the controls that the frame hides are hidden.
- [ ] Kakao's logo and the credit for the map data stay uncovered by the controls.
- [ ] Jest tests: both lists shown, collapsed and expanded, a Friend's row with and without a position, a Class Quest's row, the empty Quest list, and each control's toast.
- [ ] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots are in the pull request under Test Results, each compared with its frame: of the web target with the lists open and collapsed, and, once ticket 07 is merged, of the emulator.
- [ ] The app's four checks pass: lint, format, types and tests.
