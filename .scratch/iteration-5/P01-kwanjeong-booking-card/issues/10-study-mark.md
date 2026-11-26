# 10: The 관정 mark on the map as the meal's pick, in the study colour

Parent: [P01 spec](../spec.md); the user's decision of 2026-11-27 that the 관정 mark follows the Restaurant pick's policy
Status: ready-for-agent
Blocked by: none (stacked on P01 ticket 09)

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

A seat booking on the map is the answer's plain pick: a gold round with no icon, and a label "관정 7층 열람실 ›" over "7193번 17:00–18:00 · 걸음 6분". A screen reader says "관정 7층 열람실 › · 7193번 17:00–18:00 · 걸음 6분".

- The time range repeats the time card.
- The walk's minutes ride on the label, while the line of the walk carries none.

## What changes

- **The round.** The pick's round of the meal, in the study colour (`svcStudy`), with the study layer's book icon inside, with no number and no tail. It is the same `MapAnswerMark` with a `study` look, as `meal` is one.
- **The label.** It has the meal pick's make-up, with the study colour's border:
  - the first line is the room and the start, the start in gold: "관정 7층 노트북존 22:00";
  - the second line is what is known of the seat and the free seats, "7800번 · 빈 자리 171석", then "›", since the label opens the booking's card;
  - an unknown seat or count leaves only the rest ("빈 자리 171석", "7800번"), and with neither there is no second line, never an empty value;
  - once booked, the second line says "7800번 · 예약됨".
- **The walk.** It follows the meal's policy. While the User's position is known, the way there is drawn with its own minutes on its line ("6분"), as a meal Plan's way there is, and the label has no walk. Without the position, no way is drawn and the walk is not known, so the label has none either.
- **The free seats.** The card tells the map its free seats beside the seat (`BookingSeen.free`).
- **The flag kept while the rooms are listed** (P01 ticket 08) still holds. Its words are the new label's.

Not in this ticket: the marks of a booking that is one of several requests (its numbered step flag stays as it is), the list of study places, and the time card's range.

## Acceptance criteria

- [x] A booking's pick is the study round with the book icon, and its label has the study border, the room and the start in gold, and the seat and free seats with "›". (Unit tests.)
- [x] An unknown seat or count leaves the rest, and with neither there is no second line. (Unit test.)
- [x] With the User's position, the way has its minutes on its line, and the label no walk. Without it, neither. (Unit tests.)
- [x] The flag keeps its seat while the rooms are listed, and names the room chosen after it. (Integration test, as in ticket 08.)
- [ ] On the user's phone: the sky round with the book, the gold start, and the second line.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 45 minutes (an estimate), in one session, from 00:20 to 01:05 KST, between the seat ticket's runs.
- Tokens: within that session's totals for 2026-11-27 (no subagents); not split from P01 ticket 09's.
