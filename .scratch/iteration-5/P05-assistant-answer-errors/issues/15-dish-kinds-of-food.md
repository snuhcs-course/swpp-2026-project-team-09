# 15: Each dish carries its kind of food, and a meal answer its kind on screen and the other meal

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [14](14-meal-wishes-planned-on-the-map.md), which settled that a kind of food is answered on the map.

Native files: none. Releases: the main server (with a migration) and an app OTA update.

## What happens now

The app should offer one chip per kind of food that the candidates' dishes hold ("한식 3", "양식 1"), and filter the candidates at a press, without asking the model. Its bar should also offer the other meal of the day ("저녁 17:00 ›") and recalculate for it (P04 ticket 16, boards 24–26). But a meal Plan's menu (`Plan.menu`, ticket 12) gives each dish only its name and price. The answer keeps no kind of food the User named, and says nothing of the other meal.

## What to build

- **The kind of each dish.**
  - Each dish of a meal Plan's menu, and of a menu Lookup's, carries `cuisine`: 한식, 중식, 일식, 양식 or 분식. It is null for another cuisine, for what nobody chooses a place by (a side dish, rice, a drink, fruit, a dessert, a line that is no dish), and for a name not read yet.
  - It is named `cuisine` because `kind` already means heading, dish or note on a menu line.
- **Reading the kinds.**
  - The kind is kept per dish name, as a meal Plan names it (`dishName`), in a new table `dish_cuisines`.
  - When the worker posts a Collection, the main server answers it first, then asks the model for the names no row holds yet, at most 100 names per call, with the key `llm.key` names. A name is read once, never per request.
  - A failed call keeps nothing for those names; the next Collection asks for them again. The Collection itself never fails for it.
  - A setting `DISH_CUISINES` (on by default) turns the reading off without a release. The tests turn it off, so that no other test's scripted model is called.
  - The menus route and the tools' menu lines are unchanged: only the dishes of a meal Plan and a menu Lookup carry the kind, looked up by name when they are made.
- **Dishes stored before this lands.** They are read at the first Collection after the deploy. The worker posts today and the six days after at 05:00 and 10:00, so that Collection holds every menu stored from today on. Until then, the chips stay empty.
- **The kind on screen.**
  - `MealInput.cuisine` holds the kind on screen. planMeal sets it when the User names one, and lets it go for 아무거나. The server keeps it from the conditions on screen for the same day and meal, and returns it unchanged in the answer's input.
  - Every candidate stays; those whose Restaurant's main corner serves the kind come first, so that the model's one sentence names a place the chip shows. The model is told which serve it.
  - A dish or a taste (돈까스, 국물 있는 거) stays "picks by food" (ticket 14).
- **The other meal.** A meal answer carries `otherMeal`: the other meal of the day and when it starts (its window's start, or now when it is under way), null when it is over or no Restaurant with a Place serves it that day.
- **The switch to the other meal** needs no server change. The app recalculates the kept input with `meal` switched, and with the people's constraints, the window, the Place and the kind cleared.

Cost at the project's Haiku 5.5 prices (`eval/cost.ts`):
- A day has about 80 distinct names (the fixture of 2026-10-01). A first week fills in about three calls of about 2k input and 1.5k output tokens, about USD 0.003.
- After that, each of the two daily Collections asks only new names, under USD 0.001.

## Acceptance criteria

- [x] The model's answer is taken per number. "other" is none. A word not of the kinds, a number of no name, and a second answer are left unread. (`cuisine-reading.unit.test.ts`.)
- [x] A Collection's new names are read after the worker's answer and kept with their kinds or none. Names already kept are not asked again. A failed call keeps nothing, and the next Collection reads them. (`dish-cuisines.integration.test.ts`.)
- [x] A meal Plan's and a menu Lookup's dishes carry their kept kinds, null for a name not read. (`meal-menu.unit.test.ts`, `menu-lookup.unit.test.ts`.)
- [x] A kind named puts the Restaurants that serve it first, keeps every candidate, and tells the model which serve it. The conditions on screen keep it, 'any' lets it go, and a recalculation returns it unchanged. (`assistant-meal-kind.integration.test.ts`.)
- [x] A lunch answer offers dinner from 17:00. A dinner answer at 11:50 offers lunch from 11:50. Nothing is offered when no Restaurant serves the other meal. A kept lunch input recalculated as dinner answers dinner's plans. (`assistant-answers-other-meal.integration.test.ts`.)
- [x] The app believes a dish's kind, a meal input's kind and the other meal in their shapes, absent or null, and refuses other shapes. (`meal-plan-menu.unit.test.ts`, `meal-kind-and-other-meal.unit.test.ts`.)
- [x] An eval case: "한식" after a meal plan calls planMeal with `cuisine: 한식` (`meal-wishes.yaml`; loads, not run here).
- [x] Lint, format and types of the main server and the app pass.
