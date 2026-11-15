# 20: A Friend's face says what the User sees of them: a green dot at the exact position

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), boards a13 (and a0, a4); row 9 board 1; design section 4 ("What stays on the map")
Status: ready-for-agent
Blocked by: nothing; package C's one line in `live/connection.ts` (row-6-seams, ticket 20) keeps the look through a live update

## What to build

The design gives a face three looks: a green dot for an exact location measured now, a plain border for the building the Friend is in, and a dashed border for a position from the Timetable. The answer's faces draw only the dashed one, and the everyday map's none.

- **Everyday map.** A Friend whose position is at the exact level (`Position.level` `'exact'`) carries a small green dot at the face; one at the building level (`'building'`) is drawn as today. A dimmed face (a position over two minutes old) carries no dot.
- **Answers.** A scene person with `source: 'exact'` carries the same dot; `'building'` stays plain and `'timetable'` dashed, as today.
- **Live updates.** A position signal without a level keeps the Friend's last level from `GET /positions` until C's line passes the level on.

## Acceptance criteria

- [ ] Board a13: 지은 at the exact level carries the green dot; 민수 at the building level does not (boards a0, a4).
- [ ] A dimmed face has no dot; it comes back when a fresh position comes.
- [ ] In an answer, a person with the source `exact` has the dot, `building` none, `timetable` the dashed ring (unchanged).
- [ ] The User's own dot and a non-Friend Party member's face are unchanged.
- [ ] A live position without a level keeps the dot of the level `GET /positions` gave.
- [ ] Each look has its own name, and two looks that draw the same picture share one, as the marker looks' rule says; the looks are asked for ahead, so that no picture is waited for.
- [ ] Unit tests of the face's looks (the everyday Avatar and the answer's face), and an integration test at the main screen of the three Friends of board a0.
- [ ] The screen is run on an Android emulator, and the pull request carries the everyday map with an exact and a building Friend.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Board a13 ("정확한 위치까지 보이는 친구: 얼굴이 잰 자리에 뜨고 초록 점이 붙는다"); the work split, section 8, gives "the Avatar's three shapes and badges" to package B.
- Not here: the dashed face of a Friend seen through the Timetable only on the everyday map (row 9, boards 2-1 and 2-2, 서준 at 43-1동 on board a0). It needs each such Friend's Class building and end on the everyday map, which package C's row 9 gives.
- The dot's rule for a stale position is row 6's decision D10.
