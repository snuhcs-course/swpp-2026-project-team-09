# 09: A Restaurant's menu on the map

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 07

## What to build

"오늘 301동식당 메뉴 뭐야?" at 11:40, during the Class in building 301 that ends at 11:50, is answered on the map: the Restaurant with that meal's menu beside it, how many minutes it takes to get there, and how long the User can eat before the next Class (wireframe row 7, board q8; design section 5, question 14).

## Acceptance criteria

- [ ] A tool shows one Restaurant's menu for a day and a meal as a Lookup of kind `menu`, for an app with the `answer` capability.
- [ ] Tuesday 11:40, Class in building 301 until 11:50, next Class 13:00 in building 24: the lines "**301동식당** 오늘 점심은 제육덮밥" / "12:45까지 55분 먹을 수 있어요", the band from 11:50 to 12:45 ("11:50–12:45 · 식사 55분"), the Restaurant as the pick with its menu as the label's line, and the way on to building 24 drawn as the next item.
- [ ] The time to eat runs from when the User can be there (free, plus the walk) to when they must leave for their next item, cut by the Restaurant's hours for that meal; with no next item, to the end of the meal's hours.
- [ ] A Restaurant with no menu collected for that day and meal, or closed then, answers none with the reason.
- [ ] A question about menus that names no Restaurant ("오늘 점심 뭐야?") is answered as today.
- [ ] Unit tests for the time to eat; integration tests at the endpoint with the scripted model and the seed's menus.

## Decisions (2026-11-15)

1. **The tool** is `findMenu`. It takes the date, the meal, and the Restaurant by the words of its name, as `getMenus` takes them ("301동식당", "자하연"), or the Restaurant at a tapped Place. Words that fit several Restaurants answer them as candidates, and the model asks which one. The menu reaches the model inside the delimiters for collected text, as `getMenus` gives it today.
2. **The time to eat is the meal Plan's.** The tool asks the meal Plan's service for the User alone at that Restaurant (`MealPlanService` with the Restaurant's Place fixed), so that "when can I eat there" agrees with "배고파": the start, the end, the minutes, the way there, and the way on to the next item. The Lookup takes that Plan's scene and band, and nothing of it becomes a Quest.
3. **The first line** names the Restaurant and the first dish of its main line, and the label's line on the map lists the dishes of that line ("제육덮밥 · 순두부찌개").
4. **The action** is route guidance to the Restaurant. The board's "다른 식당" opens the next candidate of a meal Plan, which this Lookup does not have, so it is left to the meal Plan ("배고파").
5. **The chips** are the start and the next item, as for a way ("301동에서", "13:00 수업까지").

## Comments
