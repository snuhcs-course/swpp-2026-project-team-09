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

- [ ] **a5**, Tue 12:10: the User at 301동 (Classes 13:00–13:50 in 24동 and 17:00–18:15 in 58동), 민수 at the building level in 302동 (Classes until 12:15 and 15:30–16:45 in 302동). The first Plan: "**12:15 302동 앞**에서 만나요" / "12:43까지 함께 28분이에요"; the second 301동 앞 from 12:18, 27분, then 유회진 학술정보관 앞, 신양학술정보관 앞, and 학생회관, 27분 each, with "1/5"; the chips "301동에서", "13:00 수업까지", "민수 ✕"; the band 12:15–12:43 "12:15–12:43 · 함께 28분" over 12:00–18:30 with lanes 나 and 민수; the basis "민수 12:15 302동 수업 끝 · 15:30에 나서요", "301동 → 302동 앞 걸어서 3분", and "302동 앞 → 24동 걸어서 17분, 그래서 12:43에 나서요"; on the map 302동 앞 picked with "12:15 만남", 301동 앞 numbered 2, "13:00 수업 · 24동", the User's line 301동 → 302동 앞, and the way on to 24동.
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

### Decisions (2026-11-16)

1. **a5's criterion is the stored real reply's** (`mock/data/meet-answer.json`; P01-18, "Differences from the boards"): five Plans and "1/5", and the basis's three lines without a shuttle line, in place of the board's "1/2" and its basis.
2. **The button** stands on the Friend's card of the everyday map, a face's and the friend list's card of a Friend the map does not show, while the switch is on. It is the first and the main button; the card's own "파티 만들기" is secondary beside it, and the row wraps where the buttons do not fit. The Friend's profile over the answer frame has none.
3. **The meet's asker** is the signed-in User's id (`myUserId()`), and its date the day of Korea's calendar by the phone's clock.
4. **One way of asking**: ticket 22's `usePlanAsk` moved to `screens/main/use-plan-ask.ts` (one ask at a time, dropped once the card closed, the toast on a failure), used by the building's card, the Friend's card, and the Lookup's button.
5. **The pill's icon**: the frame drew the speech bubble for every turn, "여기서 먹기"'s included (there was no pin icon). It stays so for everything but a meet a button asked, which gets the person icon (`answer/pill-icon.ts`); "민수랑 만나고 싶어" typed keeps the speech bubble.
6. **A Friend Lookup's `meet`** is its main button (`mainActionOf` takes the first `guide` or `meet`; a refusal's offer still comes first). It asks the same meet, and the answer comes as a new turn whose pill reads "{name} · 만나고 싶다", the name as the friend list says it or else as the Lookup's chip does; that turn's reply takes the Lookup's place.
7. **"민수 ✕"**: in a meet of the User and one Friend, a person chip's ✕ closes the answer, as the frame's ✕ does, and opens that Friend's card by the main screen's address `?person=`, as a person pressed in a Quest's room does: the face's card where the map shows it, the map going there, else, with the switch on, the card of a Friend the map does not show. The Friend is the conditions', which is the chip's on the server.
8. **A meet's conditions change as a meal's**: `plan-input.ts` reads a meet's people and window, so its ✕, "＋ 같이", a face pressed, the band's handles, and the origin chip all recalculate; with two Friends each ✕ recalculates.
9. **"이대로 초대"** on a meet makes the Quest through `POST /plans` (#315), as a meal's does (P02-05): `Below` in `answer/plan-card.tsx` draws it on every Plan with a Friend, and the body carries the meet input. The card after inviting and the Quest kept on the phone (P02-07) need no change; the made Quest's flag reads "12:15 만나기", the word after "에서" in the Quest's title, as a meal's reads "12:15 점심".
10. **Words typed while a meet is on screen** carry its conditions and its Plan's id already (`chat-sheet.tsx` `contextAt` reads the answer on screen); `contextAt` is unchanged.
11. **The capability**: `ANSWER_CAPABILITIES` gains `meet`, sent only with a context (the switch on); the switch-off request still says `library` alone. The tests that pin the list, and q6's test that drew "닫기" alone, now expect the change.
12. **"＋ 같이" on a meet** is read aloud as "같이 만날 친구 추가", and the list it opens asks "누구와 같이 만날까요?" (`ConditionChips`' `meet`, `plan-card.tsx`'s `WHO_MEETS`); a meal and every other kind keep "같이 먹을 친구 추가" and "누구와 같이 먹을까요?".

### Checked on an emulator (2026-11-16)

On the Android emulator, with the mock and the switch on, at `770a01ef`:
- 김민준's card from the friend list: "만나고 싶다" first and main, "파티 만들기" beside it; from a face, "가까이 보기" between them, all three on one row.
- "만나고 싶다" opens a5: the pill "김민준 · 만나고 싶다" with the person icon, the chips, "12:15 302동 앞에서 만나요" / "12:43까지 함께 28분이에요", the band with 나 and 민수, "1/5"; on the map 302동 앞 with "12:15 만남", 민수 dashed at 302동, "나 · 3분", the others numbered, "13:00 수업 · 24동", and the way on to 24동. "근거" opens the server's three lines.
- "＋ 같이" asks "누구와 같이 만날까요?".
- "민수 ✕" closes the answer and opens 김민준's card again. The mock answers every meet with a5's copy, whose Friend is 민수, so the card is the Friend the meet was asked for.
- Not run on the emulator: a Friend Lookup's "만나고 싶다", since typing "민수 어디야?" needs the device's keyboard switched to Korean. The integration tests cover it.

### Agent usage (2026-11-16)

One session with two subagents for this ticket (the implementation, then a review with its fixes); the session's own time counted is the brief, the coordination with packages A, C, and D, the merge with Main, and the emulator check.

- Agent time: about 88 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 274,510; input 90,926,174, of which 90,097,995 were cache reads, 827,435 cache writes, and 744 uncached. Without cache reads: 1,102,689.

### Package C's line in `POST /plans` (2026-11-16)

- `POST /plans` makes a meet's Plan into a Quest as a meal's: the Plan's title and Sub Quest, the asker leading, the Friends invited. `PUT /plans/:questId` plans a meet again as a meet. The invitee's card gives their own way with no change to `own-way.ts` or `invitation-card.service.ts`; two tests show it.
- `GET /plans/:questId/better` offers nothing for a meet's Quest, found by its step's title "…에서 만나기": a meet has no meal's window to be planned better in.
- Package A's meet planner takes `leftOut`, as the meal planner does, so that a meet's Quest planned again does not meet its own step.
- A meet with only the asker is refused by A's `meetInputSchema` (`people.min(2)`) before `PLAN_ALONE` is reached.
- Left as it is: an invitee's time-to-leave notification names the building ("301동") where the Leader's names "301동 앞", since `invitee-time-to-leave.service.ts` reads a meal's step title.

### Agent usage for package C's line (2026-11-16)

Package C's line only. One implementing subagent (Opus 5.5); this session's review and the pull request are counted under P03 ticket 07.

- Agent time: about 33 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots and the heavy lock.
- Tokens: output 91,013; input 21,881,808, of which 21,591,605 were cache reads, 289,981 cache writes, and 222 uncached. Without cache reads: 381,216.
