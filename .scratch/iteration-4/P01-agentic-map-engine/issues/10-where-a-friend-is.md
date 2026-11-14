# 10: Where a Friend is

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 06, and the Friend view on `4.0/Main` (pull request 239, P03 ticket 04)

## What to build

"민수 어디야?" is answered on the map with what the asker's map shows of Minsu, and nothing more (wireframe row 7, boards q5 to q7; design section 5, question 12; section 7). The Assistant neither asks Minsu nor tells him.

## Acceptance criteria

- [ ] The tool reads the Friend only through the Friend view.
- [ ] At exact location: Minsu at his position, tagged with the Place he is at or near ("민수 · 301동 앞"), the lines "**민수**는 지금 301동 앞에 있어요", and the basis "민수는 내게 정확한 위치를 보여 줘요".
- [ ] At the building: Minsu at his Place, drawn as a building-level face ("민수 · 지금 302동"), the lines "**민수**는 지금 302동이에요" and, during a Class, "12:15까지 수업이에요".
- [ ] At the Timetable only, during his Class or within 15 minutes after it: Minsu drawn dashed at the Class's Place ("민수 · 수업 중 12:15까지"), the lines "민수는 **12:15까지 302동 수업**이에요" / "지금 위치는 보여 주지 않아요", and the basis open with "민수는 내게 시간표만 보여요" and "민수에게 묻거나 알리지 않아요".
- [ ] At the Timetable only, at any other time: nothing drawn for Minsu, and one line from his Timetable label ("공강 · 14:00까지", "첫 수업 13:00", "오늘 수업 끝", "오늘 수업 없음").
- [ ] A test with the view answering "Timetable only" checks that the reply, the Lookup, and what the model is given hold no position and no Place beyond the Timetable's.
- [ ] The answer chat no longer tells the User to look at the map when asked where a Friend is. An app without the capability is answered as today.
- [ ] Unit tests for each level; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The tool** is `findFriend`. It takes the Friend's id from `resolveFriend` in this message, or the tapped Friend.
2. **The map scene's person** gains the source `building` beside `exact` and `timetable`: a face with a plain border at the building.
3. **The action** is "만나고 싶다" (`meet`) with the Friend's id. The screen it opens is package B's (row 6).
4. **"이동 중"** (on the move) on board q5 is left out: the server keeps one position, not the motion.
5. **The chips** are the Friend's name only. Board q5's "지금" chip states no condition the answer could change.

## Comments
