# 07: Typed places for Sub Quests

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Titles of Quests for a Global Event) and 05 (Close the keyboard before the time sheet), as all three change 파티 만들기 and 05 changes the room's Sub Quest form

## What to build

A Holder can type where a Sub Quest happens and save it, in the room's Sub Quest form and in 파티 만들기's `어디서`. Words that name a campus Place become that Place, with its pin and route. Words that name none, such as 서울대입구역 or 홍대, are kept as words alone: the Sub Quest shows them and has no marker on the map and no route. A point picked on the map is kept as today.

The words name a Place when, ignoring spaces, they equal exactly one Place's name, its number, its number followed by `동`, or the words the app shows for it (such as `제1공학관 (301동)`). When none or more than one matches, the words are sent alone.

A Sub Quest's place becomes one of three: a Place, a point with its words, or words alone. The main server accepts and answers words alone (with no latitude or longitude), and a migration relaxes the database's check on a Sub Quest's place columns so that the words may stand without a point; no column is added. The mock API follows.

## Acceptance criteria

- [ ] The main server creates and edits a Sub Quest whose place is words alone, and answers its place with the words and no position.
- [ ] The migration relaxes the place check only as far as words without a point; a Place with a point, or a point without words, is still refused.
- [ ] `지도에서 위치를 골라 주세요` is gone from both forms, and saving with typed words is allowed.
- [ ] Typed `301동`, `301`, `제1공학관` and `제1공학관 (301동)` save the Place 제1공학관 (301동); typed `서울대입구역` saves the words alone.
- [ ] A Sub Quest with words alone shows its words, has no marker on the main screen's map and offers no route.
- [ ] Picking on the map and then keeping or changing the words behaves as today.
- [ ] A Sub Quest's typed place can be edited later.
- [ ] Server end-to-end tests and screen tests cover the above; `room-plan-test`, which asserted that typed words are refused, changes with it and the PR names it.
