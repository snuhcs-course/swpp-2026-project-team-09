# 25: The band dragged whole: who cannot come and why while it moves, and a re-plan from where it is let go

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a12 and a6, note (3); design section 5 ("The time band")
Status: ready-for-agent
Blocked by: 24 (the meet's answers for a6); package A's words of a busy stretch (row-6-seams, ticket 25)

## What to build

P02-03 drags one handle at a time, and a handle stops 15 minutes short of the other. Board a12 moves the band whole, and note (3) plans again from where it is let go.

- **A drag on the band's lanes** moves it whole, keeping its width, by the finger's distance in steps of five minutes inside the range: the drag starts anywhere on the lanes, on the band or beside it, outside the handles' touch areas, which win where they overlap. Its place before stays as the dashed outline (holds). The handles keep working as P02-03 built them. This is every Plan's band (row 6's decision D9).
- **While it moves**: each busy stretch it overlaps is drawn in red on its lane; the band's words name who cannot come ("15:20–15:48 · 민수가 안 돼요", several names joined); the card's two lines say why, from the first such stretch's words ("**민수**는 15:30부터 302동 수업이라" / "이때는 만날 수 없어요"); the time chip shows the band's start, marked as just changed; the input gives way. A band that overlaps nobody's stretch shows its own words.
- **Letting go** sends the band's start as the window's `from` and leaves `until` to the server, which plans the longest time together from then. The answer replaces the one on screen; the Plan shown is the first. "되돌리기" brings back the answer before the drag (holds).

## Acceptance criteria

- [ ] **a12**: 민수's meet of board a5, the band dragged to 15:20: 민수's 15:30–16:45 stretch red where the band covers it, "15:20–15:48 · 민수가 안 돼요", the lines "**민수**는 15:30부터 302동 수업이라" / "이때는 만날 수 없어요", the dashed outline at 12:15–12:43, the time chip "15:20", and no input.
- [ ] **a6**: let go at 14:00: the request's window is `{ from: '14:00', until: null }`; the main server's real answer (`meet-answer-a6.json`) "**14:07 302동 앞**에서 만나요" / "15:30까지 함께 83분이에요", "1/5", the second "14:04 유회진 학술정보관 앞" for 82 minutes, the chips "24동에서", "14:00부터", "민수 ✕", the basis "민수 12:15 302동 수업 끝 · 15:30에 나서요", "24동 → 302동 앞 걸어서 17분", "302동 앞 → 58동 걸어서 27분, 그래서 16:33에 나서요", and 민수 drawn dashed at 302동 앞 (his position at 14:00 is taken from the Timetable).
- [ ] "되돌리기" brings back a5's answer without a request.
- [ ] A drag past the range's end stops there; a step is five minutes; a drag shorter than half a step changes nothing, and a longer one moves the band to the nearest step; a screen reader moves the band by the same steps.
- [ ] On a meal's band the drag on the lanes works the same, and its handles as before (P02-03's tests unchanged).
- [ ] Unit tests of the whole-band arithmetic (each end of the range, a step, an overlap at one minute and at none) and of who cannot come; integration tests at the main screen over the fake main server of a12 and a6 down to the request.
- [ ] The screen is run on an Android emulator, and the pull request carries boards a12 and a6.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Boards a12 and a6; note (3) ("시간 띠를 끄는 동안 끌기 전 자리는 점선으로 남고, 누군가의 수업과 겹치면 그 칸이 빨갛게 되고 누가 안 되는지 말해요. 띠를 놓은 때(14:00)에서 다시 골라").
- Mid-drag the origin chip stays; a12's "24동에서" comes with the reply, since only the server knows where the User sets out at the new time.
- a6's last row draws "되돌리기" and "이대로 초대" without the arrows; the card keeps P02-03's last row, arrows and count, since there are two Plans.

### Decisions (2026-11-16)

1. The User's own lane reads "내가 안 돼요", with a Friend "나, 민수가 안 돼요", and the line "**나**는 13:00부터 24동 수업이라".
2. The reason names the busy stretch's own start ("13:00부터" for a band from 13:20 inside a class from 13:00).
3. A busy stretch without a label reads "일정".
4. The particles 이/가 and 은/는 follow the last syllable's final consonant by `withParticle`'s check; "이라" is fixed.
5. A band off the five-minute grid moves by whole steps and stays off it: a5's second Plan, 12:18–12:45, dragged 105 minutes asks from 14:03.
6. The names of who cannot come count each lane once, by `userId`, in lane order.
7. A drag moves the band by the nearest whole step of its distance; less than half a step changes nothing. The criterion says so in place of "shorter than a step".
8. The answer to a band moved whole shows its first Plan, also when it holds the Plan shown before; a handle's drag keeps that Plan as before. "되돌리기" brings back the answer and the Plan shown before the drag.
9. While the band moves, the dashed outline is its own place before this drag, also when an earlier drag left an outline elsewhere.
10. While the band moves, a lane draws red the parts of its busy stretches the band covers, in place of the clashes with the window the User fixed.
11. The band's place, its words, the card's lines, the time chip, and the input giving way hold from the first move until the recalculation's answer comes or fails. Let go where it started, or where no recalculation is asked, everything goes back at once.
12. The time chip is the answer's start chip ("14:00부터") when it has one, else its end chip ("13:00 수업까지"). While the band moves it reads the band's start, "15:20", in the Quest colour, the look of a chip the server eased. A handle's drag marked no chip before and still marks none.
13. The input gives way only to the drag that moves the band whole; a handle's drag never hid it and still does not.
14. A screen reader moves the band with the body's adjustable actions ("시간 띠", its value "12:15–12:43"), one step each, and each step asks at once, as a handle's step does.
15. A band over nobody's busy stretch keeps the Plan's own words ("12:15–12:43 · 함께 28분") while it moves, though they name the Plan's time and not the band's.
16. a6's real answer puts 302동 앞 first (14:07–15:30, 83 minutes) where the board drew 신양학술정보관 앞 (14:00–15:20, 80 minutes, fourth in the answer); the criterion follows the answer. Its "14:00부터" chip carries no mark, so it is drawn plain where the board highlighted it.
17. The mock answers a meet asked from 14:00 with a6's copy, and any other meet with a5's.
18. Every Plan's band, a meal's and a meet's, takes the drag that moves it whole; a Lookup's band, which has no handles, takes none.
19. The drag that moves the band whole starts anywhere on its lanes (the track right of the names), on the band or beside it, outside the handles' 44-point touch areas, and moves the band by the finger's distance: the band does not jump to the finger. The handles keep their touch areas and win where they overlap, so a band narrower than the two touch areas, as a5's 28 minutes (about 24 points on a phone), is dragged from beside it. A press on the lanes had no meaning before. The screen reader's action stays on the band.
20. While the band moves, the red parts of the busy stretches it covers are drawn on their lanes over the band and its handles, which take no touch from them; under the band they were hidden, and on a12's band, about 24 points wide, the two handles cover nearly all of it (seen on the emulator). Without a move the red stays under the band, as before.
21. While the band moves, the input is not drawn but its room stays: the card keeps its bottom padding and its content's height, and a blank strip shows where the input was. At the drag's first step the card's bottom dropped about 62 points and the lanes slid away from the finger (seen on the emulator). Board a12 draws the card lower; a card that moves under the finger is worse. The list of Friends to add and 보는 중 still take the input's room as before.
22. The pick's label is never left out at a view: when no side is free, it takes the first side of its list whose box stays inside the area, though it covers other symbols, else its first side; the labels placed after it keep clear of it. On the emulator a6's first Plan showed no pick: its own points do not fit the area even at the outer zoom, and the camera rests with the view's bottom on the south edge of the camera's bounds, so 302동 앞 stands at 493 of 914, its lines below would reach past the card's top, and above they cover the symbols of 제1공학관 앞 and 유회진 학술정보관 앞. The camera cannot leave room below without wider bounds, which ticket 08's native camera rests on, so the label gives way instead. Ticket 08's test of the pick left out under an area two points shorter now puts the pick above, over 301동's symbol.

### Checked on an emulator (2026-11-16)

On the Android emulator, with the mock and the switch on, at `73c2358b`, after asking 김민준's "만나고 싶다" (a5):
- A drag that starts beside the band, at about 13:20 on the lanes, moves it whole; held at 15:20 (a12): the chip "15:20" in the Quest colour, "**민수**는 15:30부터 302동 수업이라" / "이때는 만날 수 없어요", "15:20–15:48 · 민수가 안 돼요", 민수's overlap red across the band, the dashed outline at 12:15–12:43, and the input's room left blank, the card not moving.
- Let go at 14:00 (a6): the chips "24동에서", "14:00부터", "민수 ✕", "14:07 302동 앞에서 만나요" / "15:30까지 함께 83분이에요", the band at 14:07–15:30, "1/5", "되돌리기" and "이대로 초대"; on the map "나 · 17분" from 24동, 민수 dashed at 302동, and the pick "302동 앞 · 14:07 만남" above 민수.
- "되돌리기" brings back a5.
- Left as it is: on a6 the face of a Friend not in the meet (하은) covers part of the pick's label, since the native map draws every Avatar above every marker.
- The first check, before decisions 20–22, showed a12's red hidden under the handles, the card dropping about 62 points at the drag's first step, and a6's pick with no label; those decisions fixed them.

### Agent usage (2026-11-16)

One session with five subagents for this ticket (the arithmetic built ahead, the screen, the merge with ticket 24 and the drag on the lanes, a review, and the emulator's three findings); the session's own time counted is the briefs, the merges, and two emulator checks.

- Agent time: about 99 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 396,075; input 93,389,173, of which 92,288,765 were cache reads, 1,099,508 cache writes, and 900 uncached. Without cache reads: 1,496,483.
