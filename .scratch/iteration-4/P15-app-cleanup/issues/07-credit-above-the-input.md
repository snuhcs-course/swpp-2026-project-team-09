# 07: Nothing floats over an empty place above the AI input

Parent: [P15 spec](../spec.md), item 7; found by 김태현 using the Production app on 2026-11-18, and the cause read in the code of `4.0/Main` at `df1deb53`; the team canvas's before/after boards for this item (the boards under the title "P15-7. 지도 출처 문구와 kakao 로고")
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none

## What is on screen now

Heights are in points above the navigation's top edge. The AI input's top is at 62 while it holds one line.

- On the everyday map, with no card and no answer shown, the credit "© OpenStreetMap · 국토지리정보원" at the bottom left and Kakao's logo at the bottom right stand at 134. Between them and the AI input there are 72 of empty map.
- **The cause.** The map is told how much of its bottom the screen's controls cover, and draws the credit and the logo above that. The main screen counts it from the row of buttons above the AI input, which ends at 126. #280 (P06-05, 2026-11-16) removed "오늘의 발자국" from that row. The row now holds only "활성 파티" and is drawn only while the User is in a Party. Its place was kept on purpose, so that nothing above it moved. For a User in no Party the place is empty, and everything that counts from it stands over nothing.
- **The same empty place is under three more things.** They are not on the boards; they were found in the code. Each stands at the left, above the row's place, also for a User in no Party:
  - the 새내기 튜토리얼's start button, whose bottom is at 134;
  - the first run's line "관심을 맡기면 맞는 행사를 알려 드려요", at 134, or above the start button;
  - the line of a Quest made from a Plan, above whichever of those is shown.
- The friend list's window ends above the credit, so on a low screen the empty place also costs it rows.
- A User in a Party sees no empty place: "활성 파티" stands in the row.

## What changes

The rule: nothing stands over an empty place above the AI input. The row's place is kept only while the row is drawn.

- **In no Party, with nothing else at the left:** the credit sits 8 above the AI input's top, and Kakao's logo at the same height at the right, left of the 편의기능 button. This is the after board.
- **In no Party, with the start button or a line shown:** the lowest of them stands in the row's place: its bottom is 16 above the AI input's top, in line with the 편의기능 button's bottom. The others keep today's order (the start button, the line that asks for interests, the line of a made Quest) and today's 8 between them. The credit and the logo sit 8 above the highest.
- **When the User joins or leaves a Party** while the map is shown, the row appears or goes, and what is above it moves with it.
- **A taller AI input.** The input grows upward while it holds more than one line. The credit and the logo are never under it: when the input's top is higher than what stands at the left, they sit 8 above the input's top. The keyboard's lift does not count: only the input's own height does.
- **The friend list** follows by its own rule, which does not change: its window ends 8 above the credit. With the credit lower it may show more rows on a low screen.

## What stays as it is

- In a Party, everything: "활성 파티" in the row, the start button and the lines above it, the credit and the logo above them.
- While a card, the answer frame, a received invitation's card or a made Quest's card is shown, the credit and the logo sit on it, as the boards' second pair shows.
- The 편의기능 button and its stack, the zoom control, the Quest list, the place of a toast, and the room a route is fitted into.
- While the keyboard is up: the start button and the lines give way to the examples, and the credit and the logo stay where they are with the keyboard down, behind it.
- A tall AI input still covers the buttons right above it ("활성 파티", the 편의기능 button, the start button), as it does today. That is an overlap, not an empty place, and is not this ticket.
- The credit's words, its press, which opens the sources of the map data, and Kakao's logo itself.
- No native file changes: the native map already places the logo by what the screen tells it, so the change ships over the air.

## Acceptance criteria

- [ ] In no Party, with no card and no answer shown, the credit is 8 above the AI input's top, and Kakao's logo is at the same height, left of the 편의기능 button. Neither is covered, and neither covers a control.
- [ ] In no Party, the 새내기 튜토리얼's start button stands 16 above the AI input's top, and the credit and the logo 8 above it. The same holds for the line that asks for interests and for the line of a made Quest, each alone.
- [ ] In no Party, with more than one of the three shown, they stand in today's order with 8 between them, the lowest 16 above the AI input, and the credit and the logo 8 above the highest.
- [ ] In a Party, "활성 파티", what is above it, the credit and the logo are where they are today.
- [ ] Joining and leaving a Party moves them between the two, without the map being opened again.
- [ ] With the AI input holding several lines, the credit and the logo are 8 above its top, or above what stands at the left where that is higher. Back at one line, they come back down.
- [ ] With a card, the answer frame, a received invitation's card or a made Quest's card shown, the credit and the logo sit on it as they do today.
- [ ] On a low screen the friend list's window ends 8 above the credit in every case above, and never reaches the start button or a line.
- [ ] Tests, by ADR 0007: the rule that gives each height is a pure function and gets unit tests for the cases above. The main screen's integration tests that check where the credit sits follow the new heights, and one renders the map for a User in no Party and for one in a Party. Kakao's logo is drawn by the native map, so its place is checked by hand on an Android emulator with a build that holds the native map, which is an integration check by the ADR; the check and its screenshots are recorded under this ticket's Comments.
