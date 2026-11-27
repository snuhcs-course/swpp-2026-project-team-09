# 18: A study answer alone raised is the meal answer's list

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet
Blocked by: 17

Native files: none. Releases: an app OTA update, though no answer reaches it until the app says `study-plan` (ticket 23).

## What to build

The raised card of a study answer alone, as the approved board's ② draws it, in the meal answer's list (`MealList`), not a copy of it.

1. A study answer alone is a meal answer's card (`mealCard`).
   - Its card has the meal's body: the server's sentence, the hint lines, then the list.
2. The list's first line counts the places shown and says the server's order: "4곳 · 오래 머무는 순". The rows keep that order; the phone does not sort them by walking.
3. A row is the meal's row in the study colours:
   - its number;
   - its building;
   - under the building, its best space and hours as the server's lines say them ("3층 자유열람실 · 24시간", "1층 라운지 · 여는 시간을 몰라요");
   - at the right, its way there ("걸음 2분"), or its arrival when the way is not known.
   - The chosen row is in the study colours, as on the map.
4. The kinds of space filter the list on the phone alone: "전체 4", "열람실 3", "라운지 1", and "PC" and "그룹" when there are any.
   - A reading room and a library's own count as 열람실.
   - Fewer than two kinds offer none, as the meal's kinds of food.
   - The choice is not sent in the next message.
5. The places closed then stand under "쉬는 곳", as the meal's.
6. The places none may use but their students end the list, faded and unnumbered, with the server's words ("경영학도서관 · 경영대학 학생만 쓸 수 있어요"), with no walk.
   - The board's row 5 had a number and "걸음 7분". The server gives neither for such a place, so the row says only what it knows.
7. A press on a row chooses that place, as a press on its round does. Its own view is ticket 19's.
8. The row parts (`Row`, `ClosedRow`, `Heading`) move from `meal-list.tsx` to `candidate-rows.tsx`, for the file's length.

## Acceptance criteria

- [x] The first line, the order, and each row's words are the server's, in the study colours.
- [x] The kinds of space filter the list on the phone, and 전체 brings every place back.
- [x] 쉬는 곳 and the places only their students may use end the list.
- [x] A press on a row chooses the place.
- [ ] Emulator pictures at font scale 1.0 and 1.3, raised and with a kind chosen.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments
