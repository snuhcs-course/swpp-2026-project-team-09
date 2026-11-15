# 24: "만나고 싶다" finds when the two are both free and where they are together longest

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), board a5, notes (1), (2), and (9); design section 5, question 6
Status: ready-for-agent
Blocked by: package A's meet input and its planning (row-6-seams, ticket 24); 18 (the Friend card); for "이대로 초대", package C's line in `POST /plans` (row-6-seams, ticket 24)

## What to build

- **The button.** "만나고 싶다" on the Friend card (18), first among its buttons, and a Friend Lookup's `meet` action (which 270 does not draw yet: board q6 shows "닫기" alone) ask the recalculation (`POST /assistant/answers`) for a meet: `{ kind: 'meet', date: today, people: [the User, the Friend], window: { from: null, until: null }, placeId: null }`. No model is called. The pill reads "{name} · 만나고 싶다" with the person icon.
- **The answer** is drawn as a Plan is (P02 tickets 01 to 03): the marks, the lines, the arrows and the count, "근거", the chips, and the band with its handles. Its Plans are meeting places, the longest time together first, at the times people arrive, not rounded (note (1)).
- **The Friend's ✕** on the chip of the only Friend goes back to that Friend's card, as a5's chip does: a meet without the Friend has nothing to plan.
- **"이대로 초대"** makes the Quest as for a meal (P02-05), once `POST /plans` takes a meet; until then it is not drawn.
- Words typed after it go to the Assistant with the meet's conditions in the context, as a meal's do.

## Acceptance criteria

- [ ] **a5**, Tue 12:10: the User at 301동 (Classes 13:00–13:50 in 24동 and 17:00–18:15 in 58동), 민수 at the building level in 302동 (Classes until 12:15 and 15:30–16:45 in 302동). The first Plan: "**12:15 302동 앞**에서 만나요" / "12:43까지 함께 28분이에요"; the second 301동 앞, 27분, with "1/2"; the chips "301동에서", "13:00 수업까지", "민수 ✕"; the band 12:15–12:43 "12:15–12:43 · 함께 28분" over 12:00–18:30 with lanes 나 and 민수; the basis "민수 수업이 12:15에 302동에서 끝나요", "24동까지 302동에서 17분, 301동에서 15분", and the shuttle's line; on the map 302동 앞 picked, 301동 앞 numbered 2, "13:00 수업 · 24동", the User's line 301동 → 302동, and the way on to 24동.
- [ ] The button's request body is the meet input above, with the User's position.
- [ ] "민수 ✕" returns to 민수's card; a Friend added by "＋ 같이" or a face is planned with (holds, P02-09), and that Friend's ✕ recalculates as before.
- [ ] A Friend seen through the Timetable only sets out from the building where their Class ends; one whose position is unknown has no walk counted (note (9), row 8 board n23): drawn as the server answers.
- [ ] A Friend Lookup's `meet` draws "만나고 싶다" as its main button beside "닫기" and does the same.
- [ ] With C's line in, "이대로 초대" makes the Quest (row 0 board f8); without it, no "이대로 초대" on a meet.
- [ ] The mock answers a5 and its recalculations with copies of the main server's real replies.
- [ ] Integration tests at the main screen over the fake main server: the button from the card and from a Lookup down to the request, the answer drawn, "민수 ✕", and "이대로 초대".
- [ ] The screen is run on an Android emulator, and the pull request carries board a5's screen.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Board a5; notes (1) (the longest time together; 302동 앞 28 minutes before 301동 앞 27), (2) (the candidates, row 6's decision D6), and (9) (a Friend seen through the Timetable only).
- a5's map card has a third line, "내가 3분 걸어가요 · 12:43에 나서요"; a mark's label has a title and one line (P02 spec, "Where the words go"), so the third line is in the basis or the lines as the server writes them.
- Row 8's offer "만나고 싶다" (P02-10, #271) sends the words "{이름}랑 만나고 싶어"; with this ticket and A's meet tool, those words plan the same meet.
