# 14: Choosing what or where to eat is planned on the map

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server.

## What happens now

Found in use of the released app (26.11.21-2), not in the usage test.

- "월요일에 밥 뭐 먹을까" is answered with a question in text: "어떤 종류가 당기세요? 한식, 일식, 양식, 분식… 점심인지 저녁인지도 알려 주세요." Then "한식" is answered with a Markdown list of every Restaurant's Korean dishes for Monday's lunch and dinner, with prices and hours, a recommendation, and the 지도에서 식당 보기 button. Nothing is drawn on the map.
- An app that draws answers gets three rules that compete with the meal planned on the map:
  - The chat's base rules say "To recommend a meal, first ask what the User feels like (한식, 일식, 양식, …), then recommend from that day's menus from getMenus."
  - The menu rules send a menu question that names no Restaurant ("오늘 점심 뭐야?") to getMenus.
  - The base rules say to call showOnMap with dining after an answer about menus.
- The meal rules name only hunger and a meal ("배고파, 밥 먹자, 점심 같이 먹자"), so "뭐 먹을까" reads as a menu question, and the meal rules' "Do not ask what the User feels like first" never applies.

planMeal itself can plan the answer: on a later day with no meal named, `mealByClock` takes lunch.

## What to build

For an app that draws answers only. An app that does not draw answers keeps its rules, and its eval cases (`small-talk-meal-recommendation-asks-taste`, `menus.yaml`) stay as they are.

- The meal rules call planMeal for a wish to choose what or where to eat (뭐 먹을까, 뭐 먹지, 밥 추천해 줘, 어디서 먹지, 먹을 만한 데), on any day. They never ask back about the kind of food, about lunch or dinner, or about the time.
- On a later day with no meal named, the plans are lunch's. The one sentence may say that 저녁 plans dinner.
- A kind of food in the same message or the next (한식, 국물 있는 거, 가벼운 걸로) is the meal rules' "picks by food": planMeal, read the plans' menus, plan again with the Restaurant that serves it. It is never answered with a list of menus in words.
- The menu rules keep findMenu for a question about what a named Restaurant serves (학생회관 오늘 메뉴 뭐야, 302동 저녁 뭐 나와). A question that names no Restaurant is a meal wish for planMeal. Breakfast, which planMeal does not plan, stays with getMenus.
- The base rules leave out the question about the User's taste, and keep the dining button only after an answer from getMenus.

## Acceptance criteria

- [x] Eval cases in the P4 world asked from an app that draws answers, on Monday 2026-11-02 at 11:30: "월요일에 밥 뭐 먹을까" (today there) and "수요일에 밥 뭐 먹을까" (a later day) call planMeal with that day and ask nothing back; "뭐 먹지", "밥 추천해 줘", "어디서 먹지", "먹을 만한 데 있어?" and "오늘 점심 뭐야?" call planMeal; none calls getMenus, showOnMap or findMenu. "수요일에 밥 뭐 먹을까" then "한식" plans again, with no getMenus. "학생회관 오늘 메뉴 뭐야" still calls findMenu, not planMeal. (`eval/cases/meal-wishes.yaml`. They load; they are not run here, since they call the model.)
- [x] The system prompt of an app that draws answers holds none of the three competing rules, and that of an app that does not draw answers is unchanged. (`assistant-meal-wish-rules.unit.test.ts`, fails before the change.)
- [x] Lint, format and types of the main server pass.

## Comments

- `assistant-menu.integration.test.ts` named getMenus "the answer to a question about menus that names no Restaurant". It is renamed to what stays true, getMenus in an app that draws answers, kept for breakfast and for a name findMenu does not know; its assertions are unchanged.
