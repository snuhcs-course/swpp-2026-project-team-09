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

- [x] Board a13: 지은 at the exact level carries the green dot; 민수 at the building level does not (boards a0, a4).
- [x] A dimmed face has no dot; it comes back when a fresh position comes.
- [x] In an answer, a person with the source `exact` has the dot, `building` none, `timetable` the dashed ring (unchanged).
- [x] The User's own dot and a non-Friend Party member's face are unchanged.
- [x] A live position without a level keeps the dot of the level `GET /positions` gave.
- [x] Each look has its own name, and two looks that draw the same picture share one, as the marker looks' rule says; the looks are asked for ahead, so that no picture is waited for.
- [x] Unit tests of the face's looks (the everyday Avatar and the answer's face), and an integration test at the main screen of the three Friends of board a0.
- [ ] The screen is run on an Android emulator, and the pull request carries the everyday map with an exact and a building Friend.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- Board a13 ("정확한 위치까지 보이는 친구: 얼굴이 잰 자리에 뜨고 초록 점이 붙는다"); the work split, section 8, gives "the Avatar's three shapes and badges" to package B.
- Not here: the dashed face of a Friend seen through the Timetable only on the everyday map (row 9, boards 2-1 and 2-2, 서준 at 43-1동 on board a0). It needs each such Friend's Class building and end on the everyday map, which package C's row 9 gives.
- The dot's rule for a stale position is row 6's decision D10.

### Decisions (2026-11-15)

1. The dot is the wireframe kit's: a round of 11 in the live colour (`color.live`) with a white ring of 2.
2. On the everyday face (`MapPerson`, prop `exact`) it stands at the drop's lower right, its centre 45° below the drop's centre, its inner edge 1.5 inside the drop's rim. So it sits on the rim and stays outside the Avatar at the small, the full, and the selected size, and the letters stay whole. While it is carried the box grows as for ticket 18's "+" (6 at both sides and at the top), so the tip keeps its place, and a face can carry both: the "+" at the upper right, the dot at the lower right.
3. On an answer's face (`MapAnswerMark`, `exact` on the `face` symbol) it stands at the lower right of the 36-point symbol box, on the face's ring, where the "?" and "✓" stand at the upper right. The kit draws it there on a plain face.
4. Looks: a person's look gains `exact`, named after the photo and before `stale`, `selected`, and `addable` (`person:full:free:<id>:photo:exact:addable`), so the ends that the answer's faces match stay last. An answer's face adds "exact" to the list it is named by. `exact: false` and no `exact` share one name.
5. The rule lives in the map's adapter (`features/map/adapter.ts`): a Friend's mark carries `exact` when that Friend's position has `level` 'exact' and is not over two minutes old. A dimmed face and a Party member who is no Friend never carry it. `MapPerson` draws what it is given.
6. A live position without a level keeps the level of the position before it (`withPosition`, `live/live-updates.tsx`). Only the level is kept: the app reads `placeId` nowhere. A fetch of `GET /positions` replaces it whole, and once package C's line passes the level on, the level that comes wins.
7. The looks asked for ahead needed no new code: the everyday map asks for each card's looks with the dot (`everyLook`), `useFaces` keeps the dot on a "+" face and on its selected look asked for ahead, and an answer's looks name the dot with each face. A face that dims, or brightens again, takes a look made when it is asked, as before.
8. `LookView` passes a `testID` on to the person's and the answer's views, so that a unit test can find the dot, which has no words.
9. No stored answer has a Friend at the exact level, so the answer's test takes the stored "민수 어디야?" Lookup and changes 민수's `source`, with a comment.
10. `CardMark`'s person holds `stale` and `exact` in a type of their own (`PersonSeen`), which keeps `adapter.ts` within the lint's 300 lines.
