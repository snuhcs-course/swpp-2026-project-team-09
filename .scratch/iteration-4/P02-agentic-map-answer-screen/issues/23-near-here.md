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

- [x] Every request with the switch on carries `viewport` as the view at rest when it was sent; a request before the map is ready carries null.
- [x] **a9**, Tue 12:10, the User at 301동 (next Class 13:00 in 24동), the map moved over 공대, "이 근처 조용히 공부할 곳": the chips "301동에서", "13:00 수업까지", "보는 범위", "조용한 곳"; the lines "보는 범위에선 **신양학술정보관**" / "빈 자리 수는 관정만 알 수 있어요"; 신양학술정보관 (44-1동) picked with "3층 자유열람실 · 학기 중 24시간" and "걸어서 8분 · 12:52까지 34분"; the User's line 301동 → 44-1동; 301동's and 302동's department rooms faded with their stored restriction labels; the basis "지도에 보이는 범위 안의 공부공간만 찾았어요" and "학과 전용 열람실은 흐리게 두었어요".
- [x] The "↑ 관정" flag at the area's edge; with a Library Session, "· 빈 자리 {N}석" added from the phone's own read; without one, "↑ 관정" alone.
- [x] "가는 길" starts the route guidance to 신양학술정보관; "관정 보기" sends "관정 지금 자리 있어?" (row 7 board q13's words) as a new turn.
- [x] The camera does not move for this answer; ✕ returns to the everyday map where the User left it.
- [x] The mock answers a9's words with a copy of the main server's real reply.
- [x] Tests: a unit test of the view-to-viewport function (two zooms, a tall and a wide view); integration tests at the main screen over the fake main server of the request's `viewport`, the answer's drawing, the flag with and without a session, and both buttons.
- [x] The screen is run on an Android emulator, and the pull request carries board a9's screen.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Board a9 and note (6): "이 근처" is the one case where study spaces are not looked for at 관정 alone; the names and hours are the app's study-space list (`main-server/seed/study-spaces.json`).
- Words that differ from the board: the faded rooms take the stored names and labels ("해동학술정보실", "전기·정보공학부·컴퓨터공학부"), not "301동 열람실 · 전기정보·컴공만".
- Row 6's decisions D7 (one pick) and D8 (the count added by the phone) hold here.

### Decisions (2026-11-16)

Details the ticket left open, listed so that any of them can be vetoed.

1. **The visible area** is the map's view at the camera the map last reported at rest, less the status bar: the stage (between the status bar and the navigation) and the status bar over it make the view, as the answer's camera counts it (`useFraming`). It is null until the camera and the stage are both known, and it goes with every request while the switch is on, also while an answer is on screen.
2. **The area outlined is the one the reply's request sent**, kept with the reply (`ChatBubble.area`), so that the outline does not follow the map once the User moves it. It is drawn dashed in SNU blue, 2 points wide, under the route; the native map draws it solid until it draws dashes.
3. **The camera fits nothing** for a `study` Lookup (its drawing has no points), so it stays where the User left it, and the labels' sides are chosen in metres. The area is the view asked from, so its outline lies along the view's edges until the User moves the map.
4. **The free seats** are those of the seat sectors the 공부공간 layer gives for the flag's Place (관정관's, already cut by 소속 on the server), each read for the time a tapped seat would be booked (`tappedSlot`: from the next half hour, up to two hours within its hours), added up. A sector whose read fails is left out; with none read, or without a library session, the flag reads "↑ 관정" alone. The count is read at most once a minute and never sent to the main server.
5. **The card's buttons**: `guide` reads "가는 길" for a `study` Lookup, as the building card says it, while the other Lookups keep "길 안내"; each `ask` is a secondary button after it that sends its words as the User's next turn; "닫기" stays last. Beside a refusal its offers stand in place of the Lookup's buttons, as before.
6. **The mock** points the stored a9 copy's `away` flag at the mock layer's 관정관 (`place-62-1`), so that the phone's seat read finds its sectors on the mock; the stored server copy is unchanged.
7. **The request context** moved out of `chat-sheet.tsx` into `use-context-chat.ts` (the file's 300-line limit); what was pressed and the visible area are kept in one ref.
8. **The board's words**: the line reads the server's building name, "보는 범위에선 **공대 신양학술정보관**" (P05-11 decision 3), and the faded rooms read their stored names and labels ("해동학술정보실 · 전기·정보공학부·컴퓨터공학부", "화생공 해동학술정보실·학생라운지 · 화학생물공학부").

### Checked on an emulator (2026-11-16)

On the Android emulator (1080 × 2400), a development build on the mock with its campus walk, the switch on, the AI input filled with "이 근처 조용히 공부할 곳" by a local change that was not committed (no typing on the emulator):

- With the map moved over 공대, the answer drew board a9 where the map stood: the pick 공대 신양학술정보관 with "3층 자유열람실 · 학기 중 24시간" and "걸어서 8분 · 12:52까지 34분", the User's line from 301동, the two faded rooms at 301동 and 302동 with their stored labels, "↑ 관정" without a library session, the area's north edge under the status bar, and the card's chips, two lines, "가는 길", "관정 보기", and "닫기". Opening the basis kept the camera where it was.
- The map's view grows when the tab bar gives way to the answer frame, as it does for every answer, so the area's other edges lie at the screen's sides and under the card.
- "관정 보기" sent "관정 지금 자리 있어?" as the next turn, and the mock answered with its library card (no session, so "관정도서관 로그인이 필요해요"; nothing was signed in).
- "가는 길" closed the answer and started the route guidance to 공대 신양학술정보관 on the everyday map.

### Agent usage (2026-11-16)

One session (package D's), no subagents; the window runs from the assignment to the pull request and includes a few minutes of drafting ticket 26 while tests ran.

- Agent time: about 50 minutes, an estimate from the transcript's timestamps (active stretches, gaps of five minutes or more left out), with the emulator check and the merges of `4.0/Main`.
- Tokens: input 67,117,044, of which 66,768,890 cache reads, 347,748 cache writes, and 406 uncached; output 145,056.
