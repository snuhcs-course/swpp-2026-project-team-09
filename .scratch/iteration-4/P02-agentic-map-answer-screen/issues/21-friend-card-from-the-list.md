# 21: The map's friend list opens the same Friend card, and the card's "파티 만들기" and "어디까지 보이나"

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a4, a10, a13, note (7); row 9 boards 2 and 2-3
Status: ready-for-agent
Blocked by: 18 (the Friend card)

## What to build

Only what ticket 18 leaves out; any part 18 already does is dropped from this ticket.

- **From the list.** With the switch on, a press on a Friend's row in the map's friend list opens 18's card, as a press on the face does. A Friend on the map: the map goes to the face at the "close" level, as today. A Friend not on the map (no position): the card of the Timetable only (row 9 board 2-3), the map where it is, in place of today's toast "…님은 위치가 꺼져 있어요".
- **"파티 만들기"** opens today's party form as 비공개 with that Friend chosen (today's `private-party`, `features/map/adapter.ts`).
- **"어디까지 보이나"** opens row 9 board 2's card in the same frame: the kicker "어디까지 보이나", the Friend's name with where the map shows them ("지은 · 지금 두산인문관"), the line "내가 지은에게: 정확한 위치" (the User's own end, `level`), the note "서로 지금 있는 건물까지 보여요 (낮은 쪽을 따라요)" (from `seen`), and "바꾸기", which opens the 위치 공유 screen. Its ✕ goes back to the Friend card.
- The card's buttons stand in one row of equal width: "만나고 싶다" first once ticket 24 adds it, then "파티 만들기" and "어디까지 보이나".

## Acceptance criteria

- [ ] A row of a Friend on the map opens their card and brings the map to them; a row of a Friend with no position opens the card of the Timetable only, with no toast.
- [ ] Row 9 board 2-3 with the mock's 서준 at 12:31: "12:15에 24동 수업이 끝났어요 · 공강 14:00까지", "다음 수업 14:00 · 43-1동", "지금 위치는 보여 주지 않아요" (the words of the server's card, row-6-seams, ticket 18).
- [ ] "파티 만들기" opens the party form as 비공개 with the Friend chosen.
- [ ] "어디까지 보이나" for 지은 (my end exact, `seen` building): "내가 지은에게: 정확한 위치" and "서로 지금 있는 건물까지 보여요 (낮은 쪽을 따라요)". The note is the 위치 공유 screen's line for `seen` ("서로 시간표만 보여요", "서로 지금 있는 건물까지 보여요", "서로 정확한 위치까지 보여요"), with "(낮은 쪽을 따라요)" only when my end is above `seen`. "바꾸기" opens 위치 공유.
- [ ] With the switch off the list and the face open today's card.
- [ ] Tests at the main screen over the fake main server: each press, each button's route, and the three `seen` words.
- [ ] The screen is run on an Android emulator, and the pull request carries the card from the list and the "어디까지 보이나" card.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Note (7) of row 6: one card, whether the face or the list is pressed; a Friend not on the map gets the Timetable's card (row 9 2-3). The row 9 note: the card's "어디까지 보이나" opens board 2.
- Not drawn: board 2's second line, "지은이 나에게: 지금 있는 건물". `GET /friends` gives the Friend's end only as `seen` (P02-11), so the app cannot say it (row 6's decision D5).
- The list is hidden while an answer is shown (P02-01), so this is the everyday map's list only.
- No seam: `GET /friends` and the 위치 공유 screen are used as they are.
