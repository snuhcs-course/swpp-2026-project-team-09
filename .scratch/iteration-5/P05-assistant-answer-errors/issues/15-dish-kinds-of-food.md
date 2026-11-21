# 15: Each dish carries its kind of food

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [14](14-meal-wishes-planned-on-the-map.md), which settled that a kind of food is "picks by food" on the map.

Native files: none. Releases: the main server (with a migration) and an app OTA update.

## What happens now

The app should offer one chip per kind of food that the candidates' dishes hold ("한식 3", "양식 1"), and filter the candidates at a press, without asking the model (P04 ticket 16, boards 24–26). A meal Plan's menu (`Plan.menu`, ticket 12) gives each dish only its name and price, so the app cannot tell a kind.

## What to build

- Each dish of a meal Plan's menu, and of a menu Lookup's, carries `cuisine`: 한식, 중식, 일식, 양식, 분식 or 기타. It is null for what nobody chooses a place by (a side dish, rice, a drink, fruit, a dessert, a line that is no dish), and for a name not read yet. It is named `cuisine` because `kind` already means heading, dish or note on a menu line.
- The kind is kept per dish name, as a meal Plan names it (`dishName`), in a new table `dish_cuisines`. When the worker posts a Collection, the main server answers it first, then asks the model for the names no row holds yet, at most 100 names per call, with the key `llm.key` names. A name is read once, never per request.
- A failed or late call keeps nothing for those names, and the next Collection asks for them again. The Collection itself never fails for it. A setting `DISH_CUISINES` (on by default) turns the reading off without a release. The tests turn it off, so that no other test's scripted model is called.
- The menus route and the tools' menu lines are unchanged. Only the dishes of a meal Plan and a menu Lookup carry the kind, looked up by name when they are made.
- The other meal of the same day needs no server change. The app recalculates the kept input with `meal` switched and with the people's constraints, the window and the Place cleared, as the chat clears them when the meal changes.

Cost at the project's Haiku 5.5 prices (`eval/cost.ts`): about 80 distinct names a day (the fixture of 2026-10-01), so a first week fills in about three calls of about 2k input and 1.5k output tokens, about USD 0.003. After that, each of the two daily Collections asks only new names, under USD 0.001.

## Acceptance criteria

- [x] The model's answer is taken per number; a kind not of the six, a number of no name, and a second answer are left unread. (`cuisine-reading.unit.test.ts`.)
- [x] A Collection's new names are read after the worker's answer and kept with their kinds or none; names already kept are not asked again; a failed call keeps nothing and the next Collection reads them. (`dish-cuisines.integration.test.ts`.)
- [x] A meal Plan's and a menu Lookup's dishes carry their kept kinds, null for a name not read. (`meal-menu.unit.test.ts`, `menu-lookup.unit.test.ts`.)
- [x] A kept lunch input recalculated with `meal: 'dinner'` and its constraints cleared answers dinner's plans. (`assistant-answers-other-meal.integration.test.ts`.)
- [x] The app believes a dish with a kind, with null, and without the field, and refuses a kind not of the six. (`meal-plan-menu.unit.test.ts`.)
- [x] Lint, format and types of the main server and the app pass.
