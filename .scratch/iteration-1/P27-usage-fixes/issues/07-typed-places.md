# 07: Typed places for Sub Quests

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: 04 (Titles of Quests for a Global Event) and 05 (Close the keyboard before the time sheet), as all three change 파티 만들기 and 05 changes the room's Sub Quest form

## What to build

A Holder can type where a Sub Quest happens and save it, in the room's Sub Quest form and in 파티 만들기's `어디서`. Words that name a campus Place become that Place, with its pin and route. Words that name none, such as 서울대입구역 or 홍대, are kept as words alone: the Sub Quest shows them and has no marker on the map and no route. A point picked on the map is kept as today.

The words name a Place when, ignoring spaces, they equal exactly one Place's name, its number, its number followed by `동`, or the words the app shows for it (such as `제1공학관 (301동)`). When none or more than one matches, the words are sent alone.

A Sub Quest's place becomes one of three: a Place, a point with its words, or words alone. The main server accepts and answers words alone (with no latitude or longitude), and a migration relaxes the database's check on a Sub Quest's place columns so that the words may stand without a point; no column is added. The mock API follows.

## Acceptance criteria

- [x] The main server creates and edits a Sub Quest whose place is words alone, and answers its place with the words and no position.
- [x] The migration relaxes the place check only as far as words without a point; a Place with a point, or a point without words, is still refused.
- [x] `지도에서 위치를 골라 주세요` is gone from both forms, and saving with typed words is allowed.
- [x] Typed `301동`, `301`, `제1공학관` and `제1공학관 (301동)` save the Place 제1공학관 (301동); typed `서울대입구역` saves the words alone.
- [x] A Sub Quest with words alone shows its words, has no marker on the main screen's map and offers no route.
- [x] Picking on the map and then keeping or changing the words behaves as today.
- [x] A Sub Quest's typed place can be edited later.
- [x] Server end-to-end tests and screen tests cover the above; `room-plan-test`, which asserted that typed words are refused, changes with it and the PR names it.

## Comments

- Server: migration `20261009120000_allow_sub_quest_place_words` replaces `sub_quests_place_check`. Latitude and longitude must still come together, a point still needs words, and a Place still stands alone. The only new case is words without a point. A Sub Quest's request body adds `{ label }` to its place union. Meetups keep their own `placeSchema` and check, so a Meetup still refuses words alone. In the answer, `latitude`/`longitude` of a place may now be `null`, which happens only for words alone. `toPlaceDto` is shared with Meetups, so a Meetup's answer type is wider too, though its data never holds a null.
- App: `mobile/src/features/places/typed-place.ts` decides the Place for typed words. It compares the words with spaces removed against the Place's name, its number, its number with `동`, `name number동` and `name (number동)`, and the match must be exactly one Place. The Places list (`placesQuery`, kept for good) is fetched when the form saves. If the fetch fails, the words are sent alone. Both forms use `usePlaceOf`. A point picked on the map is handled as before, and a Place picked with its words kept is still sent as the Place.
- `SubQuest.place.latitude/longitude` are now `number | null` in the app's types and the server answer guard. `positionOf` gives no position for words alone, so the main screen draws no marker or route for them. A Meetup proposal's body is now typed as `ChosenPlace`, which leaves out words alone. The mock API mirrors the server: the room's add/edit and `makeQuest` keep the place they are sent, words alone included.
- Tests: `sub-quests.e2e-spec` adds words alone on add and edit, plus the database check. New `room-typed-place-test` covers the room form: Place names, words alone, ambiguous names, editing a typed place, and keeping a picked point when its words change. `party-form-test` adds typed `어디서`, and `main-route-test` adds a Quest with words alone (no marker, no route, words in the list).
- Changed existing test: `room-plan-test` loses "the Leader's 일정 form, waiting › waits for a point while the place has words of its own", which asserted the refusal this ticket removes. No other existing test was changed.

### Agent usage (2026-10-09)

- Agent time: about 55 minutes (the implementer) in the resumed session (2026-10-08 to 09), an estimate. Much of it was spent waiting for the shared test slot while the Mac was short on memory. The earlier session, which was force-quit, is not counted: its usage was lost.
- Tokens: about 238 thousand in all, all subagents: the implementer (202 thousand). The subagent reports give only totals, so input and output, and the cache reads and writes, cannot be shown separately. Included is a ninth of the shared code review and review fixes (about 36 thousand tokens and 2.5 minutes). The orchestrator's own tokens are not counted.
