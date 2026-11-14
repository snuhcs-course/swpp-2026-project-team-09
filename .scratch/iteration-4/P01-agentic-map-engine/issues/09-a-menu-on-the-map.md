# 09: A Restaurant's menu on the map

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 07

## What to build

"오늘 301동식당 메뉴 뭐야?" at 11:40, during the Class in building 301 that ends at 11:50, is answered on the map: the Restaurant with that meal's menu beside it, how many minutes it takes to get there, and how long the User can eat before the next Class (wireframe row 7, board q8; design section 5, question 14).

## Acceptance criteria

- [x] A tool shows one Restaurant's menu for a day and a meal as a Lookup of kind `menu`, for an app with the `answer` capability.
- [x] Tuesday 11:40, Class in building 301 until 11:50, next Class 13:00 in building 24: the lines "**301동식당** 오늘 점심은 제육덮밥" / "12:45까지 55분 먹을 수 있어요", the band from 11:50 to 12:45 ("11:50–12:45 · 식사 55분"), the Restaurant as the pick with its menu as the label's line, and the way on to building 24 drawn as the next item.
- [x] The time to eat runs from when the User can be there (free, plus the walk) to when they must leave for their next item, cut by the Restaurant's hours for that meal; with no next item, to the end of the meal's hours.
- [x] A Restaurant with no menu collected for that day and meal, or closed then, answers none with the reason.
- [x] A question about menus that names no Restaurant ("오늘 점심 뭐야?") is answered as today.
- [x] Unit tests for the time to eat; integration tests at the endpoint with the scripted model and the seed's menus.

## Decisions (2026-11-15)

1. **The tool** is `findMenu`. It takes the date, the meal, and the Restaurant by the words of its name, as `getMenus` takes them ("301동식당", "자하연"), or the Restaurant at a tapped Place. Words that fit several Restaurants answer them as candidates, and the model asks which one. The menu reaches the model inside the delimiters for collected text, as `getMenus` gives it today.
2. **The time to eat is the meal Plan's.** The tool asks the meal Plan's service for the User alone at that Restaurant (`MealPlanService` with the Restaurant's Place fixed), so that "when can I eat there" agrees with "배고파": the start, the end, the minutes, the way there, and the way on to the next item. The Lookup takes that Plan's scene and band, and nothing of it becomes a Quest.
3. **The first line** names the Restaurant and the first dish of its main line, and the label's line on the map lists the dishes of that line ("제육덮밥 · 순두부찌개").
4. **The action** is route guidance to the Restaurant. The board's "다른 식당" opens the next candidate of a meal Plan, which this Lookup does not have, so it is left to the meal Plan ("배고파").
5. **The chips** are the start and the next item, as for a way ("301동에서", "13:00 수업까지").

## Comments

### Decisions taken in the build (2026-11-15)

1. **The Restaurants findMenu knows** are those of the restaurant seed (`seed/restaurant-places.json`), the ones with a Place, by `RestaurantPlaces.names()`. Words match as in getMenus, spaces and case not counting, and the one Restaurant named exactly by the words wins when there is one, so "자하연식당 3층" is not also 2층. A tapped Place gives the Restaurants that stand there. A name outside the seed answers none, and the rules send the model to getMenus with the same words.
2. **The main line** is the first corner of the meal's cell that holds a dish: a heading and the lines under it, or the lines before the first heading. Notes are left out (ADR 0011). A dish is called by its name without the price, else by its text. The label lists at most three dishes, so that it stays one line on the map: 302동식당's buffet of 2026-10-01 lists six.
3. **The lines.** "**301동식당** 오늘 점심은 부대짬뽕&군만두", the day being 오늘, 내일, 모레, or the date (`dayWords`), and "12:45까지 55분 먹을 수 있어요", from the Plan's end and minutes.
4. **The basis** is the walk there when there is one, in the Plan's words ("301동 → 학생회관식당 걸어서 15분"), then what ends the meal: the walk on, in board q8's words ("24동까지 걸어서 15분이라 12:45에 나서요"), or the meal's hours ("점심은 14:30까지예요").
5. **The scene** is the Plan's without the other Restaurants (one at the same Place, such as 자하연식당 2층 beside 3층, and those dropped). The Plan's flag at the Restaurant ("11:50 점심") carries the dishes instead, which the app draws as the line of the pick's label.
6. **No time to eat**, when no break of the meal lets the User be there and eat: findMenu answers none with the menu's lines, and nothing is drawn, since a Lookup takes the Plan's scene and band and there is no Plan. The rules have the model still say the menu.
7. **Closed** is a cell of only notes (ADR 0011), answered none with the notes ("개교기념일 휴무"); **not collected** is no line at all for that Restaurant, day, and meal.
8. **The menu reaches the model** as `lines`, each inside the delimiters labelled `menu.line`, notes included, as findMealRestaurants wraps them. getMenus gives its lines without the delimiters today, which this ticket leaves as it is.
9. **What the model is given**: the Restaurant, collectedAt, the lines, start, end, eatingMinutes, where the User sets out from (a label), and walkMinutes; no Place id and no coordinate.
10. **Lunch or dinner only**, as the meal Plan takes; a breakfast menu stays with getMenus. `MENU_RULES` sends a named Restaurant to findMenu instead of getMenus, a question that names none to getMenus as today, asks which one on several, and keeps the reply to one sentence without showOnMap. findMenu clears the map buttons and the answer, as findWay does.
11. **The code.** The words and the scene are `lookup/menu-lookup.ts` (`menuAnswer`, `dishesOf`), the menu and the meal Plan `lookup/menu.service.ts` (`MenuLookupService`), and the tool with its rules `lookup/menu-tools.ts`.
12. **The app's copy** (`mobile/src/api/mock/data/menu-lookup.json`) was written by the server's `menuAnswer` over the meal Plan (`mealAnswer` on the seed's Places and walking table), for board q8 on Tuesday 2026-11-17 at 11:40, with 301동식당's lunch collected on 2026-10-01 and the asker's id of the meal copies. The app's reply check passes it; the mock answers no message with it.

### Where the data differs from the boards

- The dishes on board q8 (제육덮밥 · 순두부찌개) are examples. 301동식당's lunch of 2026-10-01 has the main line "<식사>": 부대짬뽕&군만두 and (뚝)순댓국&계란장조림, which the unit tests and the app's copy show. The endpoint tests post the tests' menu, 제육볶음.
- "14:00에 닫아요": the server holds no hours of a Restaurant (ADR 0001 and 0011: hours are the text of notes), so the time to eat is cut by the meal's window, one for every Restaurant (lunch 11:00–14:30), and nothing says when the Restaurant closes. 301동식당's note of 2026-10-01 says "운영시간 11:30~13:30" for 식사.
- "301동식당 · 지금 있는 건물": the pick's tag is the Restaurant's name alone, as a Plan's pick's is.
- "셔틀은 24동까지 17분 넘게 걸려 걸어요" is left out: the meal Plan walks on to the next item without weighing the shuttle, and its leave-by is the walk's.
- The times are the board's: 301동 → 24동 895 seconds (15 minutes), so the band runs 11:50–12:45, 55 minutes, in a range of 11:30–13:30.

The tests were run on the build machine and pass: `menu-lookup.unit.test.ts` (11), the endpoint's `assistant-menu.integration.test.ts` (9), and the app's `way-lookups.unit.test.ts`, with lint, typecheck, and format of both projects.
