# 21: The map's friend list opens the same Friend card, and the card's "파티 만들기" and "어디까지 보이나"

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a4, a10, a13, note (7); row 9 boards 2 and 2-3
Status: ready-for-agent
Blocked by: 18 (the Friend card)

## What to build

Only what ticket 18 leaves out; any part 18 already does is dropped from this ticket.

- **From the list.** With the switch on, a press on a Friend's row in the map's friend list, or in the friend panel its pill "친구" opens, opens 18's card, as a press on the face does; the panel closes. A Friend on the map: the map goes to the face at the "close" level, as today. A Friend not on the map (no position): the same card with what the app holds (the full name, the department, "어디까지 보이나", the Friend ID, and the date), the map where it is, in place of today's toast "…님은 위치가 꺼져 있어요".
- **"파티 만들기"** opens today's party form as 비공개 with that Friend chosen (today's `private-party`, `features/map/adapter.ts`).
- **"어디까지 보이나"**, ticket 18's row of the card, opens row 9 board 2's card in the Friend card's place on the everyday map: the kicker "어디까지 보이나", the Friend's name with where the map shows them ("지은 · 지금 두산인문관"), the line "내가 지은에게: 정확한 위치" (the User's own end, `level`), the note "서로 지금 있는 건물까지 보여요 (낮은 쪽을 따라요)" (from `seen`), and "바꾸기", which opens the 위치 공유 screen. Its ✕ goes back to the Friend card.
- The card's buttons stay ticket 18's: "파티 만들기", and "가까이 보기" where the everyday map offers it.

Waits for other tickets:

- The Timetable lines of row 9 board 2-3 ("12:15에 24동 수업이 끝났어요 · 공강 14:00까지", "다음 수업 14:00 · 43-1동", "지금 위치는 보여 주지 않아요"): the app holds no Friend's Timetable, and these are the words of the server's card, which the tap endpoint's Friend half brings (ticket 22, row-6 seams). They fill the same card then.
- "만나고 싶다", first in the card's row of buttons, with ticket 24.

## Acceptance criteria

- [x] A row of a Friend on the map opens their card and brings the map to them; a row of a Friend with no position opens the card with what the app holds, with no toast.
- [ ] Waits for ticket 22's Friend half: row 9 board 2-3 with the mock's 서준 at 12:31: "12:15에 24동 수업이 끝났어요 · 공강 14:00까지", "다음 수업 14:00 · 43-1동", "지금 위치는 보여 주지 않아요" (the words of the server's card, row-6-seams, ticket 18).
- [x] "파티 만들기" opens the party form as 비공개 with the Friend chosen.
- [x] "어디까지 보이나" for 지은 (my end exact, `seen` building): "내가 지은에게: 정확한 위치" and "서로 지금 있는 건물까지 보여요 (낮은 쪽을 따라요)". The note is the 위치 공유 screen's line for `seen` ("서로 시간표만 보여요", "서로 지금 있는 건물까지 보여요", "서로 정확한 위치까지 보여요"), with "(낮은 쪽을 따라요)" only when my end is above `seen`. "바꾸기" opens 위치 공유.
- [x] With the switch off the list and the face open today's card.
- [x] Tests at the main screen over the fake main server: each press, each button's route, and the three `seen` words.
- [x] The screen is run on an Android emulator, and the pull request carries the card from the list and the "어디까지 보이나" card.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Note (7) of row 6: one card, whether the face or the list is pressed; a Friend not on the map gets the Timetable's card (row 9 2-3). The row 9 note: the card's "어디까지 보이나" opens board 2.
- Not drawn: board 2's second line, "지은이 나에게: 지금 있는 건물". `GET /friends` gives the Friend's end only as `seen` (P02-11), so the app cannot say it (row 6's decision D5).
- The list is hidden while an answer is shown (P02-01), so this is the everyday map's list only.
- No seam: `GET /friends`, `GET /places/at`, and the 위치 공유 screen are used as they are.

### Decisions (2026-11-15)

1. The card of a Friend with no position is ticket 18's card (`friendProfileCard`), opened as a selection of its own (`useSelection`'s `friend` and `selectFriend`), so that one card is open at a time: a face pressed after it replaces it, its ✕ and Android's back close it, it gives way to the answer frame, and it takes the bottom of the map as any card does. It has the full name, the department, "어디까지 보이나", the Friend ID and the date where the main server sends them, and "파티 만들기"; no status or way line, no "가까이 보기", and the map does not move.
2. That card closes for good, as a thing's card does once its thing leaves the map, once the switch is turned off, since only the switch opens it, and once the Friend is no longer among the User's Friends (the friendship ended, or `GET /friends` cannot be read). It stays open once the Friend gets a position meanwhile: it is the same Friend's card.
3. "어디까지 보이나" stays ticket 18's row (its decision 3), not a third button. On the everyday map with the switch on the row opens board 2's card in the Friend card's place. Its ✕ and Android's back bring the Friend card back, and the next back closes it, as the back button closes ticket 18's profile alone; this holds also after 위치 공유, opened by "바꾸기", is left. Both steps are the selection's (`useSelection`'s `seen`), so another card selected in its place opens as itself. Board 2's card is shown only while the switch is on: turning it off brings the Friend card back, whose first back then closes it, and turning it on again leaves the Friend card.
4. Inside the answer frame and with the switch off, the row opens 위치 공유 at once, as ticket 18 built it.
5. The head of board 2's card: the Friend's Avatar, "어디까지 보이나" in the sub-label's place, and the title "{full name} · 지금 {Place}", the Place being what `GET /places/at` gives for the Friend's position ("301동" by its number, or its name), as ticket 19 finds the User's own. A Friend whom the map does not show, or whose Place is not known yet, is named alone. A Place an exact-level Friend stands near reads as one they are in, as the building level shows it.
6. Under the head: "내가 {full name}에게: {my end}" with the person icon, in the 위치 공유 screen's words of the levels; the note in the board's blue box; and "바꾸기", the design system's secondary button, to `/me/location-sharing`. The card has no "파티 만들기", and never the Friend's own end (D5).
7. Outside the User's Party (decision 11), my end is what the Friend sees of the User: `level` while the User's Master Switch is on, "시간표만" while it is off. The note follows from it: the lower of `seen` and my end, with "(낮은 쪽을 따라요)" only when that is below my end, so with the Master Switch off it reads "서로 시간표만 보여요".
8. "파티 만들기" is ticket 18's: `/party-form?friendId=…`, 비공개 with the Friend chosen, from a face and from either kind of row.
9. A press on the same Friend while their board 2 card is shown, on their face or on their row in either list, brings their card back: the press means this Friend.
10. With the switch on, a row of the friend panel (the whole list the pill "친구" opens, `friend-panel.tsx`) closes the panel and does what a row of the list over the map does: a Friend on the map has the map go to their face, a Friend with no position gets the card of decision 1. A screen reader hears the row as "{full name} 프로필"; its calendar button keeps its own press. With the switch off the panel's rows take no press, as before.
11. "어디까지 보이나" and the User's own card (ticket 19) take what a Friend sees of the User from one rule, `seenLevels` in `features/friends/seen-of-me.ts`, so that the two cannot say different things of the same Friend. A Friend in the User's Party, while the User's Master Switch and the User's own switch for the Party are on, reads "내가 {full name}에게: 정확한 위치 · 파티 중" and the note "파티 중에는 서로 정확한 위치까지 보여요": the main server gives a common Party the exact position before it compares the two ends of the friendship, and `seen` of `GET /friends` leaves the Party out, so decision 7's lower of the two would say less than the Friend sees. The note says the Party's rule, not the lower of the two, which would read "서로 시간표만 보여요 (낮은 쪽을 따라요)" under the line that says the exact position. The app does not know the Friend's own Master Switch or switch for the Party, so both lines may say more than the two see, never less, as ticket 19's row does (its decision 5).
12. The two lines wait for the Lobby (the Master Switch) and `GET /parties/mine`. Until both are read the card has its head and "바꾸기" alone, with no words of a level, and it stays so while either read has failed, until a later read succeeds: a level said without the Party would be the friendship's, which may be less than the Friend sees. Opening the card does not ask for a failed Party again (`retryOnMount: false`): a Party never read goes back to waiting while it is asked, and the map's own cards wait with it, which would close the Friend card.

### Checked on an emulator (2026-11-15)

On the Android emulator (1080 × 2400, density 2.625), a development build on the mock with its campus walk, the switch on:

- A press on 김민준's row in the map's list opened his card; its "어디까지 보이나" row opened board 2's card ("내가 김민준에게: 시간표만", "서로 시간표만 보여요", the mock's User having the Master Switch off), and Android's back returned to the Friend card.
- In the full friend panel, a press on 서지우's row, a Friend with no position, closed the panel and opened her card: "심리학과 / 서지우", "시간표만 보여요", "친구 ID SJ5U9BVN", "11월 5일부터 친구", and "파티 만들기", with no toast.

Found on the emulator and fixed: the full panel's rows took no press, so a Friend with no position could not be reached (decision 10).

### Agent usage (2026-11-15)

One session with two subagents for this ticket (the implementation with the review's fixes, and a review of the spec and the standards); the session's own time counted is the emulator checks and the merge with Main.

- Agent time: about 83 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 246,322; input 75,968,312, of which 75,000,268 were cache reads, 967,520 cache writes, and 524 uncached. Without cache reads: 1,214,366.
