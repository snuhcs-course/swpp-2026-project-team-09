# 17: A study answer alone has the meal answer's marks, in the study colour

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet
Blocked by: 03, 04

Native files: none. Releases: an app OTA update, though no answer reaches it until the app says `study-plan` (ticket 23).

## What to build

The first of the app's study answer alone, as the approved board draws it ("공부할 곳 후보 화면", 2026-11-27): the meal answer's frame and parts, not a copy of them for study.

1. A study answer alone, not together, with one person and no Plan carrying a group study room, is drawn as a meal answer (`drawsMeal`).
   - Its places are numbered rounds with their walking in a capsule.
   - The way there is drawn with its minutes, as a meal Plan's.
   - The group study room's answer (tickets 10 to 16) is not touched.
2. Its marks are the meal's in the study colour (`svcStudy`, `svcStudySoft`), where the meal's are coral.
   - The pick is a solid round with a white number.
   - Every other place is a soft round with a study rim and number.
   - The pick's label names its building and its arrival ("관정관 19:24"), with the 공부공간 layer's book before the name and its edge in the study colour.
   - The server's tag names the place's best space ("7층 열람실 · 23:00까지"); the map names the building.
3. A building none may use but its students stays grey with its space and whose it is ("열람실 · 경영대학"), from the server's scene.
4. Until ticket 19 opens a study place's view, a press on its pick does not open a meal's menu.
5. The mock answers "공부할 곳 추천해 줘" with the stored study answer.
   - It is main-server's fixture with each Plan's scene as `study-plan-parts.ts` draws it: every building, its own the pick, the dropped one, the User's start, and the pick's "19:12 공부".
   - "공부할 자리 있어?" stays the seat card until the app says `study-plan` (ticket 23).

## Acceptance criteria

- [x] `drawsMeal` holds for a study answer alone and not for one together.
- [x] The pick and the other places of a study answer are numbered in the study colour; the pick's label is its building and arrival with the book.
- [x] A dropped building is grey with its tag.
- [x] The mock answers its words with the study answer; "공부할 자리 있어?" stays the seat card.
- [ ] Emulator pictures at font scale 1.0 and 1.3.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments
