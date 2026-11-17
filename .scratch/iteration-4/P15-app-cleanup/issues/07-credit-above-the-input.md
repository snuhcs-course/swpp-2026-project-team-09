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

- [x] In no Party, with no card and no answer shown, the credit is 8 above the AI input's top, and Kakao's logo is at the same height, left of the 편의기능 button. Neither is covered, and neither covers a control.
- [x] In no Party, the 새내기 튜토리얼's start button stands 16 above the AI input's top, and the credit and the logo 8 above it. The same holds for the line that asks for interests and for the line of a made Quest, each alone.
- [x] In no Party, with more than one of the three shown, they stand in today's order with 8 between them, the lowest 16 above the AI input, and the credit and the logo 8 above the highest.
- [x] In a Party, "활성 파티", what is above it, the credit and the logo are where they are today.
- [x] Joining and leaving a Party moves them between the two, without the map being opened again.
- [x] With the AI input holding several lines, the credit and the logo are 8 above its top, or above what stands at the left where that is higher. Back at one line, they come back down.
- [x] With a card, the answer frame, a received invitation's card or a made Quest's card shown, the credit and the logo sit on it as they do today.
- [x] On a low screen the friend list's window ends 8 above the credit in every case above, and never reaches the start button or a line.
- [x] Tests, by ADR 0007: the rule that gives each height is a pure function and gets unit tests for the cases above. The main screen's integration tests that check where the credit sits follow the new heights, and one renders the map for a User in no Party and for one in a Party. Kakao's logo is drawn by the native map, so its place is checked by hand on an Android emulator with a build that holds the native map, which is an integration check by the ADR; the check and its screenshots are recorded under this ticket's Comments.

## Comments

### Notes from the implementation (2026-11-18)

- **The rule lives in `layout.ts`.** `Room` gains `buttonRow`, whether the row of buttons is drawn, and `inputHeight`, the AI input's own height without the keyboard's lift. `useRoom` fills them: the row from `useActiveParty()`, as `BottomControls` draws it, and the height from the input's layout, which `MapBottom` used to keep to itself.
  - The start button, the line that asks for interests and the line of a made Quest each take their bottom from the one under them (`tutorialStartBottom`, `interestsHintBottom`, `madeLineBottom`). The lowest stands 8 above the row while it is drawn, or at 78, the row's own place, 16 above the input's top.
  - `mapInset(room)` gives the credit and the logo the top of what stands at the left, or the input's top where nothing does or the input is higher. The friend list's window counts from the same height (`listRows`), so it follows by its own rule.
  - The start button now takes its `bottom` from the screen, as the two lines already did.
- **Where each criterion is checked:**
  - In no Party, nothing at the left: `main-layout.unit.test.ts` (an inset of 62, the credit at 70); `main-controls.integration.test.tsx`, "for a User in no Party"; `answer-frame-giving-way.integration.test.tsx`, after ✕.
  - The start button and each line alone, and two or three of them: `main-layout.unit.test.ts`, "what stands at the left above the AI input in no Party".
  - In a Party, as today: `main-layout.unit.test.ts`, "in a Party"; `main-controls.integration.test.tsx`, "sits above the row of buttons for a User in a Party".
  - Joining and leaving: `main-credit.integration.test.tsx`, against the fake main server, with `party-changed` over the fake socket while the map is shown.
  - A taller input, and back at one line: `main-layout.unit.test.ts`, "over a taller AI input"; `main-controls.integration.test.tsx`, which also checks that the keyboard's lift does not move the credit.
  - A card and the answer frame: `main-layout.unit.test.ts`; the card tests already in `main-controls.integration.test.tsx` and `main-room.integration.test.tsx`, and the frame's in `answer-frame-giving-way.integration.test.tsx`. A received invitation's card and a made Quest's card give their height as the frame's card does (`onAnswerHeight`), so they take the frame's branch, which this ticket leaves as it was.
  - The friend list on a low screen: `main-layout.unit.test.ts`, "the friend list's window on a low screen", for each case; `main-room.integration.test.tsx`, in a Party and in no Party.
- **The boards and the ticket agree.** The boards show only the everyday map in no Party and a card. The start button, the two lines, a Party, a taller input and the friend list follow the ticket.
- **Left as it was:** the input's height is kept while the input is away, as before. An input of several lines that goes away unsent, under a received invitation's card or the list of Friends to add, would come back as one line while the screen still counts the taller height, until the input is laid out at another height. That flow is rare and older than this ticket.

### Hand check on an Android emulator (2026-11-18)

**Setup:** emulator `sdk_gphone64_arm64` (Medium_Phone AVD), the app's debug build 1.0.3 with the native map module, its bundle from Metro, against the app's own mock data, so with no server address and no Google client ID. "No Party" is the mock with `EXPO_PUBLIC_MOCK_EMPTY=getMyParty`. The start button and the line that asks for interests came from a fresh first run (`EXPO_PUBLIC_FIRST_STATE=1`, 26학번, the interests card skipped). Kakao's map drew. Heights are in points above the navigation's top, read from the screen's layout and, for Kakao's logo, from the screenshot's pixels (2.625 pixels a point).

- **In no Party, nothing at the left:** the AI input's top at 62. The credit's bottom at 70, Kakao's logo's at 70. The logo's right edge is 71 from the screen's right, left of the 편의기능 button, whose left edge is 64 from it. Nothing covers either.
- **In no Party, the start button and the line that asks for interests:** the start button from 78 to 112, its bottom in line with the 편의기능 button's; the line from 120 to 154. The credit and the logo at 162.
- **In no Party, the start button alone,** after the interests card was answered from the line: the line went, and the credit and the logo came down to 120 without the map being opened again.
- **In a Party, as today:** "활성 파티" from 78 to 126, the start button's bottom at 134, the line from 176 to 210, the credit and the logo at 218.
- **A Friend's card open:** the credit and the logo 8 above the card's top, the logo 16 from the right, as today.
- **The AI input holding three lines, the keyboard down:** the input's top at about 110. The credit and the logo at 118, clear of it. The input covers the 편의기능 button, as the ticket keeps. Emptied back to one line, the credit came back to 70.
- **Joining and leaving a Party** could not be shown: the mock answers the same Party after "활성화에서 나가기". `main-credit.integration.test.tsx` checks it.

The screenshots, side by side: `~/Downloads/p15-07/P15-07-emulator-check.png`.
