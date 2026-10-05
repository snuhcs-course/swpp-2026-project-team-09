# 10: Main screen: the lists and the controls around the map

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 09 (Main screen: markers, cards and the route)

## What to build

The main screen gains what the `Main` frame shows around the map: the friend list on the left, the Quest list on the right, the buttons above the navigation and the AI input. The lists collapse, a row takes the map somewhere, and a control that would open something this task does not build says so. The frames are `Main` and `MainCollapsed`.

## Acceptance criteria

- [x] The friend list shows the pill with the number of Friends in the list, not the frame's fixed 12, and a separate round button beside it that collapses and expands the list. Every Friend is a row with the dot in the status colour, the name, and the status with the place ("공강 · 중앙도서관", "위치 꺼짐").
- [x] The Friends' rows are in a window three rows high that scrolls, snaps to the rows and fades towards its end.
- [x] A press on a Friend's row moves the map to that Friend at the "close" level and opens their card, or shows "<이름>님은 위치가 꺼져 있어요" for 2000 ms for a Friend without a position.
- [x] The Quest list mirrors the friend list at the right: the round button that collapses it, the pill with the count and the full-screen button inside it, and today's Quests joined by the frame's rail, with "오늘 일정 없음" when there are none. The two lists collapse separately.
- [x] A Quest's row is drawn by its kind: a class with the `clock` icon in grey `#555C74`; a Party that others may join with `users` in blue `#2F6FC0`; a closed Party or a Shared Quest with `lock` in `#B63A07`. The colours are tokens, and `QuestRowView` says the row's kind and icon.
- [x] A press on a Class Quest's row moves the map to its Place at the "names" level and shows the toast "<title> · <place>" ("자료구조 · 301동 118호"). The frame's professor's name is in no answer and is left out.
- [x] "오늘의 발자국", "활성 파티", the 편의기능 button and the AI input with its send button are where the frame puts them, with the frame's words.
- [x] "오늘의 발자국" shows three faces and "친구 5명의 오늘" from a mock of the app's own behind the API client.
- [x] "활성 파티" is shown only while the User is in a Party. Its second line is "<n>명 공유 중", counting the members who share their position without the User, or "응답 대기" when nobody else shares.
- [x] The AI input's send button is disabled while the input is empty.
- [x] These show the "준비 중이에요" toast: the friend pill, the Quest list's full-screen button, the row of a Quest other than a Class Quest in the Quest list, 오늘의 발자국, 활성 파티, the 편의기능 button, and the AI input when it is touched or sent. The AI input never keeps the keyboard up over the map.
- [x] The lists stay readable over the map, as in the frame, and every control carries a Korean accessibility label and a touch area of at least 48 where the frame's spacing allows it.
- [x] While a card is open, the 오늘의 발자국 / 활성 파티 row and the 편의기능 button are hidden; both lists, the AI input and the navigation stay. The card and the AI input do not cover each other.
- [ ] Kakao's logo and the credit for the map data stay uncovered by the controls: the map component is told what the controls cover of its edges (an inset) and draws the credit and the provider's logo inside what is left.
- [x] Jest tests: both lists shown, collapsed and expanded, each by itself; a Friend's row with and without a position; a Class Quest's row; the empty Quest list; each control's toast; 활성 파티 absent without a Party; the send button disabled while empty; the controls hidden while a card is open; the credit inside the inset.
- [x] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots are in the pull request under Test Results, each compared with its frame: of the web target with the lists open and collapsed, and, once ticket 07 is merged, of the emulator.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-06)

The frames `Main` and `MainCollapsed` were read again when the work started, in the copy of the canvas at version `1791129072-d0ec`, and are unchanged since the spec: 148106 and 796 bytes.

The criterion about Kakao's logo and the credit is half met. The credit is clear of every control, in every build. Kakao's logo is not: the Android module places it itself and does not read the inset yet, so on a phone the AI input covers it. What the module has to do is at the end of this comment.

Where things are, in `mobile/`:

- `src/screens/main/`: `friend-list.tsx` (the pill, the rows, what a row's press does), `quest-list.tsx` (the pill with its button, the rows with the rail, what a row's press does), `list-parts.tsx` (the round collapse button and `RowWindow`, the window three rows high), `bottom-controls.tsx` ("오늘의 발자국", "활성 파티", the 편의기능 button and the AI input), `layout.ts` (`LISTS`, `listsTop`, `AI_INPUT`, `BUTTON_ROW`, `LAYERS_BUTTON`, `mapInset`), `main-screen.tsx` (the parts together).
- `src/api/`: the operation `getFootprints`, its type `Footprints` marked as the app's own, its mock in `mock/data/footprints.ts` and `footprintsQuery`.
- `src/features/`: `footprints/` (`FootprintsView`, `useFootprints()`), `parties/` (`ActivePartyView`, `toActiveParty`, `useActiveParty()`), `quests/adapter.ts` (`QuestRowView` gained `tone`, `icon` and `place`).
- `src/design-system/`: the tokens `questTone`, `onKey`, `textHalo`, `mapText` and the shadows `mapMark`, `mapRail`, `faceRing` and `floatKey`; the icons `chevronRight`, `chevronUp` and `expand`; `ChatInput` gained `label` and `floating`.
- `src/map/`: `types.ts` (`MapInset`, and `inset` of `MapProps` with its rule), `map.tsx` (the credit inside the inset), `native-map.tsx` (the inset handed to the module's view).
- Tests: `__tests__/main-lists-test.tsx`, `main-controls-test.tsx` with `__tests__/support/lists.ts`, `__tests__/features/main-controls-data-test.tsx`, and additions to the map's, the native map's, the client's and the adapters' tests.

Decisions made while building:

- The window's fade is neither a mask nor a gradient. React Native has no mask on any platform without another library, and a gradient over the window would colour the map under it. Each row's own opacity follows the scroll instead: the row in the window's third place is at 40%, the mask's strength there, and the rows above it are solid. This is so on Android, iOS and the web alike.
- The last row becomes solid as the list reaches its end, where the frame's mask keeps it faded for ever: the fade says that the list goes on.
- A list with no more rows than the window shows fades none. The frame's friend list always fades its third row; with the mock's twelve Friends the two are the same.
- The Quest list has the same window as the friend list, as the frame's has.
- A row is as wide as its words, not as its column, so that the map beside a short name still takes a press. The columns are the frame's, 160 and 182 wide; on a phone narrower than 374 they overlap by a few points in their middle, where no row's words reach in the mock.
- The lists are 52 from the screen's top edge, as the frame's are from its own, and 8 under a status bar that leaves less than that.
- The controls' names for a screen reader are the frame's: "친구 목록 열기", "친구 목록 접기" and "펼치기", "퀘스트 목록 접기" and "펼치기", "퀘스트 전체 화면으로 열기", "<이름> 지도에서 보기", "오늘의 발자국 재생 · 친구들의 오늘 스토리", "활성 파티 <title> 열기", "편의기능 (식당 · 셔틀버스 · 공부공간)", "AI에게 메시지" and "보내기". The friend pill also tells its number, and a Friend's row its line, as a value and a hint. A Quest's row, which the frame gives no name, is read as its kicker, title and meta joined by " · ".
- A press on a class's row also closes an open card, as in the frame. A class without a place moves nothing and says the title alone.
- A Quest that the User holds alone is drawn as a closed one, with `lock`: nobody else may join it.
- While a list's data is loading, and after a failure, its pill has no number and the list has no rows. Nothing says that the list failed.
- "오늘의 발자국" has its name and the play mark alone while its data is loading, after a failure and when no Friend left a story.
- The AI input puts the keyboard away as soon as it is touched (`Keyboard.dismiss()`), so on a phone and on the web nothing can be typed into it, and its send button stays disabled there. What a sent message does is built and tested for the day typing is let through.
- The map's inset: 126 at the bottom, where the row of buttons ends, 62 at the right, the zoom control, and 8 at the left. So the credit is just above "오늘의 발자국", 16 from the left, in the strip that the frame leaves free between the friend list's end and the row of buttons; the logo's place is left of the zoom control, above "활성 파티". While a card is open the inset's bottom is the card's top edge, and the credit sits above the card.
- The card and the AI input: the card's bottom is 72 above the navigation and the input's top 62, since the input is 50 high and does not grow. 10 are between them, as in the frame.
- The touch areas: a row is 56 high. The friend pill, 40 high, reaches 4 above and below. A collapse button, 32, reaches 8 above and below, 13 away from its pill and 3 towards it, half of the room between the two. The full-screen button, 32 inside the Quest pill, reaches 8 on every side, over the pill's own ground, which takes no press. The send button, 40, reaches 4. The other buttons are 48.

Differences from the frame:

- The frame strokes the text over the map in white, 3 wide, under two white glows. React Native has no stroke for text and one shadow, so one white glow of radius 6 is drawn.
- The rows fade as said above, without the frame's last 14 points down to nothing.
- The web target does not snap to the rows: React Native's `snapToInterval` does nothing there.
- A collapse button's arrow turns at once; the frame turns it over 0.2 seconds.
- The Friends are in the order of their names, as the main server lists them, so the first rows are 강도윤, 김민준 and 박지호 where the frame starts with 김민준, 이서연 and 박지호.
- Every face of "오늘의 발자국" shows the name's letters; the frame shows a photo for two.
- The play mark is a triangle made of a border's corner, 7 by 8, where the frame draws one of 10.
- "활성 파티" says "<n>명 공유 중" from one member on; the frame says "응답 대기" for one.
- The AI input is one line of 40 and does not grow with its text, where the frame's grows to 120, and its text style is the design system's `ChatInput`.
- The class's toast has no professor's name.
- On a phone too narrow for both buttons of the row, "활성 파티" is cut short with an ellipsis, as the frame lets it shrink. The width at which that starts was not measured.

Not checked: nothing ran in a browser, on a phone or in a native build. So the glow's strength over Kakao's map, the rail and the rings on Android, the fade while a list scrolls, the snap, the keyboard's short appearance when the AI input is touched on Android, the widths of the two buttons in their row and the credit's place were not seen. No screenshot was taken.

What the Android module (`mobile/modules/snu-now-map`) has to do for the inset; nothing in it was changed:

- Declare the view's prop `inset` in `SnuNowMapModule.kt`, a record of four numbers in points, `{ top, right, bottom, left }`. `native-map.tsx` hands it over already, always with all four sides, and with the same object for as long as no side changes. Whether a view of Expo's that is handed a prop it does not declare ignores it without a warning was not checked in a build.
- In `SnuNowMapView.kt`, where the logo is placed today with `kakaoMap.logo?.setPosition(MapGravity.RIGHT or MapGravity.BOTTOM, pixels(LOGO_MARGIN), pixels(LOGO_MARGIN))`, add the inset: `pixels(LOGO_MARGIN + inset.right)` for the horizontal margin and `pixels(LOGO_MARGIN + inset.bottom)` for the vertical one. `LOGO_MARGIN` stays 8, the credit's margin.
- Place the logo again whenever the prop changes, also after the map is ready: the main screen changes the inset when a card opens, closes or changes its height.
- With the main screen's inset the logo's bottom right corner is 70 from the view's right edge and 134 from its bottom, left of the zoom control and above "활성 파티". While a card is open it is 16 from the right, 8 above the card.
- The camera need not follow the inset.
- The iOS module (ticket 11) takes the same prop.

### After the review and the screenshots (2026-10-06)

The main line was merged in, with ticket 09 squashed in it, and a review of the code and screenshots of the web target were answered. Where this comment and the result above differ, this one holds.

Measured on the web target at 390 by 844 before this round: both pills, the rows, the three buttons, the AI input and the whole stack from the bottom had the frame's sizes and places to the pixel.

What changed:

- **The lists no longer take the map's touches.** Before, each list's window was as wide as its column and 172 high and took every touch in it: on the web a marker beside a Friend's row could not be pressed until the list was collapsed. Now only a row takes a touch. The window is as wide as its widest row, never wider than its column, and stands at the list's side, the friend list's at the left and the Quest list's at the right. The window, its content, the box around each row and everything around the window are `box-none`, so a touch beside a row, between two rows or under the last one reaches the map. "오늘 일정 없음" takes no touch.
- **A drag that starts on a row scrolls the list.** A scroll view that is `box-none` does not scroll on Android: `ReactScrollView.onTouchEvent` refuses the touch (read in React Native 0.86's source). So the window takes touches from the moment a touch starts on a row until that touch or its drag ends, and is `box-none` at every other time. The same code runs on every platform.
- **The two columns never share a point.** The Quest column keeps 182. The friend column is 160 or, on a screen narrower than 374, what the Quest column leaves: 146 at 360, 106 at 320.
- **The AI input is a button, not a field.** It has the look of the frame's empty input: the white bar of radius 28, the placeholder "무엇이든 부탁해 보세요" and the grey send button. Nothing takes the focus, no keyboard comes up and nothing can be typed, on a phone and on the web alike. A press on the bar says "준비 중이에요", and so does a press on the send button. The bar is read as the button "AI에게 메시지" and the send button as "보내기", disabled. The code and the tests for typing and sending are removed, and the design system's `ChatInput` is as it was before this ticket, without `label` and `floating`. The real input comes with the AI chat's own task.
- **The lists fit a low screen.** A window shows the whole rows that fit above what is under it, with 8 clear: three where they fit, else two, one or none. Under the Quest list is the zoom control, whose top is 270 above the navigation. Under the friend list is the strip of the map's credit, 22 high, on "오늘의 발자국". While a card is open, under both lists is the credit's strip on the card. The rule is `listRows` in `layout.ts`, from the stage's height, which `OverMap` tells when it is laid out; until then a window has three rows. With a status bar of 24 the Quest list has three rows on a stage of 526 or more and the friend list on one of 404 or more.
- **The credit is never under a list or a control.** It stays where it was, just above "오늘의 발자국" and, while a card is open, just above the card. It was not moved: the lists end above its strip instead, so there is always a free strip for it, down to a list with no rows.
- **A Friend's row pressed before the map's cards came** moves the map at once and opens the card when the cards come. A selection of something else, or a close, before that ends the wait. If the cards come without that Friend, as they do after a failure of the Friends or of their positions, nothing opens and nothing is said.
- **"활성 파티" stays whole on a narrow screen.** It never shrinks. "오늘의 발자국" gives way on a stage narrower than 390 while a Party is shown: it drops its second line and keeps one face, has no face under 360, and is the one button of the row that shrinks, its name cut with an ellipsis. The second line is not wider than the name, so dropping it frees no width by itself; the faces do, 18 each. Alone in the row, "오늘의 발자국" is whole at every width.
- **The collapse buttons** carry `aria-expanded` beside the state for the phone's screen reader, and so does the 편의기능 button.
- **The fade follows the frame's mask.** Each row is drawn as strongly as the mask is at the row's middle: solid down to 114 of the window's 172, 40% from 122 to 158, nothing at 172. So the row in the last place is at 40% while the list rests, as the frame's is, and a row that scrolls out at the window's end goes down to nothing. The fade still lifts as the list reaches its end, and a list with no more rows than its window fades none. A window of one row, on a low screen, fades none either. The lists snap to the rows on Android and iOS; React Native's web target has no snap.
- **The play mark** is a triangle of 10 by 10.

The tests: `__tests__/main-room-test.tsx` is new (the touches, the columns, the low and the narrow screens, `aria-expanded`); `main-lists-test.tsx` has the fade at rest, after a scroll and at the list's end, and the row pressed before the cards came; `main-controls-test.tsx` has the AI input as a button. The test that asserted nothing about the Quest list's fade is replaced by one that fails when a row's strength or a window's height is wrong.

Left as they were: the Friends' order, the single white glow behind the text, and the class's toast without the professor's name.

Not checked:

- The fixes of this round were not looked at in a browser, and nothing ran on a phone. Jest sees the styles and the rules, not the layout or a touch.
- The map's touches beside the lists. That a window is as wide as its widest row, that a touch beside a row reaches the native map, and that a drag from a row scrolls on Android all rest on how React Native lays out and hit-tests, read in its source and not seen. On Android the window turns to taking touches a frame or two after the touch starts on a row; whether a very fast flick scrolls from its first moment was not seen. On iOS a `box-none` scroll view may still take a touch in its own box; there the window is no wider than its widest row.
- The short and narrow screens. The widths at which "오늘의 발자국" gives way, 390 and 360, come from the frame's width and an estimate of the words' widths, not from a measurement. The two pills with their round buttons are about 156 and 172 wide by the same estimate, so at 360 they meet in the middle and under 360 they overlap; nothing was changed for that.
- Kakao's logo against the controls: the Android module still places it itself, as said above.
- The play mark's look at 10 by 10 inside its round of 24.
