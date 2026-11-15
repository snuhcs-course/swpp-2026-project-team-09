# 23: "이 근처" asks about the visible area: its study spaces, the restricted ones faded, 관정 pointed to

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), board a9, note (6); design section 5, question 13
Status: ready-for-agent
Blocked by: package A's area tool and its Lookup (row-6-seams, ticket 23); PR 270 on `4.0/Main`

## What to build

- **The visible area in every request.** With the switch on, the request context's `viewport` is the map's view at rest, its south, west, north, and east, worked out from the camera and the view's size, and null before the map is ready (today always null, `screens/main/chat-sheet.tsx` `contextAt`). The app announces the capability that lets the server answer with the area (row-6-seams).
- **The answer** is a Lookup of kind `study`, drawn as 270 draws a Lookup, with:
  - the area the request sent outlined on the map (solid until the native Release's dashed lines);
  - the chips, including "보는 범위" and the kind asked for ("조용한 곳");
  - the restricted spaces faded with their reason (`dropped`);
  - the flag at the area's edge pointing to 관정 ("↑ 관정"), to which the app adds "· 빈 자리 N석" from its own Library Session (the free seats of 관정's sectors the User may book), or nothing without a session;
  - the buttons "가는 길" (`guide`, main) and "관정 보기" (`ask`: its words are sent as if typed, as row 8's offers are).
- **The camera** stays where the User put it: the area is the question. The answer's marks that fall outside it are not fitted.

## Acceptance criteria

- [ ] Every request with the switch on carries `viewport` as the view at rest when it was sent; a request before the map is ready carries null.
- [ ] **a9**, Tue 12:10, the User at 301동 (next Class 13:00 in 24동), the map moved over 공대, "이 근처 조용히 공부할 곳": the chips "301동에서", "13:00 수업까지", "보는 범위", "조용한 곳"; the lines "보는 범위에선 **신양학술정보관**" / "빈 자리 수는 관정만 알 수 있어요"; 신양학술정보관 (44-1동) picked with "3층 자유열람실 · 학기 중 24시간" and "걸어서 8분 · 12:52까지 34분"; the User's line 301동 → 44-1동; 301동's and 302동's department rooms faded with their stored restriction labels; the basis "지도에 보이는 범위 안의 공부공간만 찾았어요" and "학과 전용 열람실은 흐리게 두었어요".
- [ ] The "↑ 관정" flag at the area's edge; with a Library Session, "· 빈 자리 {N}석" added from the phone's own read; without one, "↑ 관정" alone.
- [ ] "가는 길" starts the route guidance to 신양학술정보관; "관정 보기" sends "관정 지금 자리 있어?" (row 7 board q13's words) as a new turn.
- [ ] The camera does not move for this answer; ✕ returns to the everyday map where the User left it.
- [ ] The mock answers a9's words with a copy of the main server's real reply.
- [ ] Tests: a unit test of the view-to-viewport function (two zooms, a tall and a wide view); integration tests at the main screen over the fake main server of the request's `viewport`, the answer's drawing, the flag with and without a session, and both buttons.
- [ ] The screen is run on an Android emulator, and the pull request carries board a9's screen.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Board a9 and note (6): "이 근처" is the one case where study spaces are not looked for at 관정 alone; the names and hours are the app's study-space list (`main-server/seed/study-spaces.json`).
- Words that differ from the board: the faded rooms take the stored names and labels ("해동학술정보실", "전기·정보공학부·컴퓨터공학부"), not "301동 열람실 · 전기정보·컴공만".
- Row 6's decisions D7 (one pick) and D8 (the count added by the phone) hold here.
