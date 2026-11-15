# 25: The band dragged whole: who cannot come and why while it moves, and a re-plan from where it is let go

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a12 and a6, note (3); design section 5 ("The time band")
Status: ready-for-agent
Blocked by: 24 (the meet's answers for a6); package A's words of a busy stretch (row-6-seams, ticket 25)

## What to build

P02-03 drags one handle at a time, and a handle stops 15 minutes short of the other. Board a12 moves the band whole, and note (3) plans again from where it is let go.

- **A drag on the band's body** moves it whole, keeping its width, in steps of five minutes inside the range. Its place before stays as the dashed outline (holds). The handles keep working as P02-03 built them. This is every Plan's band (row 6's decision D9).
- **While it moves**: each busy stretch it overlaps is drawn in red on its lane; the band's words name who cannot come ("15:20–15:48 · 민수가 안 돼요", several names joined); the card's two lines say why, from the first such stretch's words ("**민수**는 15:30부터 302동 수업이라" / "이때는 만날 수 없어요"); the time chip shows the band's start, marked as just changed; the input gives way. A band that overlaps nobody's stretch shows its own words.
- **Letting go** sends the band's start as the window's `from` and leaves `until` to the server, which plans the longest time together from then. The answer replaces the one on screen; the Plan shown is the first. "되돌리기" brings back the answer before the drag (holds).

## Acceptance criteria

- [ ] **a12**: 민수's meet of board a5, the band dragged to 15:20: 민수's 15:30–16:45 stretch red where the band covers it, "15:20–15:48 · 민수가 안 돼요", the lines "**민수**는 15:30부터 302동 수업이라" / "이때는 만날 수 없어요", the dashed outline at 12:15–12:43, the time chip "15:20", and no input.
- [ ] **a6**: let go at 14:00: the request's window is `{ from: '14:00', until: null }`; the answer "**14:00 신양학술정보관 앞**에서" / "15:20까지 함께 80분이에요", the second 학생회관 73분, the chips "24동에서", "14:00부터", "민수 ✕", the basis "나는 13:50에 24동 수업이 끝나요", "민수는 15:30 302동 수업이라 15:20에 나서요", "학생회관은 민수가 17분 걸어 73분이에요", and 민수 drawn dashed at 302동 (his position at 14:00 is taken from the Timetable).
- [ ] "되돌리기" brings back a5's answer without a request.
- [ ] A drag past the range's end stops there; a step is five minutes; a drag shorter than a step changes nothing; a screen reader moves the band by the same steps.
- [ ] On a meal's band the body drag works the same, and its handles as before (P02-03's tests unchanged).
- [ ] Unit tests of the whole-band arithmetic (each end of the range, a step, an overlap at one minute and at none) and of who cannot come; integration tests at the main screen over the fake main server of a12 and a6 down to the request.
- [ ] The screen is run on an Android emulator, and the pull request carries boards a12 and a6.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Boards a12 and a6; note (3) ("시간 띠를 끄는 동안 끌기 전 자리는 점선으로 남고, 누군가의 수업과 겹치면 그 칸이 빨갛게 되고 누가 안 되는지 말해요. 띠를 놓은 때(14:00)에서 다시 골라").
- Mid-drag the origin chip stays; a12's "24동에서" comes with the reply, since only the server knows where the User sets out at the new time.
- a6's last row draws "되돌리기" and "이대로 초대" without the arrows; the card keeps P02-03's last row, arrows and count, since there are two Plans.
