# 32: A meal answer's card: the sentence, the list, and a restaurant's menu

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. Shares the chosen place with the Frame and Map pull requests of the answer screen's rebuild (boards E1 to E4, 2026-11-22).

Native files: none. Releases: an app OTA update only.

## What happens now

- The docked card of a meal answer is a row of chips: the kinds of food (한식 10, 일식 3, …) and "메뉴 보기".
- "메뉴 보기" opens every candidate's dishes over the dock, in the map's order, and a press on a group chooses that place and folds the list.
- With eleven candidates the chips run off the row, and there is no way to see one restaurant's whole menu, with its corners and its other meal.

## What to build

- **Docked (E1, E2):** the Assistant's sentence in at most two lines; a press raises the card to the list. No kind chips and no "메뉴 보기". The input and the main button stay under it, and the main button acts on the chosen place.
- **Raised to the list (E3):** the kinds of food on top as a filter ("전체 N" first). Under them, every candidate as a row: number, name, the walking this choice adds ("걸음 N분", from ticket 31's `addedWalk`), the main dish with "외 n", and the lowest price. The rows are ordered by walking, then by arrival, then by the map's number; without a known start, a row shows its arrival time instead. A candidate the map fades (`fadedPlan`) is faded here too, unless chosen. The chosen row is marked. A press on a row chooses that place and opens its menu.
- **A restaurant's menu (E4):**
  - "‹ N곳 목록" returns to the list; the day and the meal ("내일(월) 점심") stand at the right.
  - The number and name with the time.
  - The meals of that day as chips, with their hours when the menu's note gives them.
  - The chosen meal's menu as corners: a heading's title and price with the dishes it serves in one flowing line, and the dishes ordered one by one as rows with prices.
  - Without the day's menus for that restaurant, the Plan's own menu.
- **The chosen place:** `control.answer.plan`, set by `show(planId)`, as the map's press sets it. `openMenu(planId)` and `closeMenu()` on the shown answer hold the menu. `openMealMenu(control, planId)` raises the card to that menu; the map's "메뉴 ›" calls it. A docked card closes the menu, so the next raise opens the list.
- **The caption's right side** ("올리면 N곳 목록", "걸음이 적은 순") is drawn by the frame's caption row from `answer.plans.length`. While a menu is open the caption hides and back closes the menu first: two lines that whichever of the frame's and this pull request merges second adds.

## Decisions where the boards are silent

- The opening time beside the walking is left out: the menus give hours only in a note, which the menu's meal chips show.
- A meal chip in the menu changes only what the card shows; it asks for no new answer. The bar's tick still asks for the other meal.
- An answer with one candidate has no list.

## Acceptance criteria

- [ ] The docked meal card shows the sentence and neither kind chips nor "메뉴 보기". (Integration test.)
- [ ] The raised card lists every candidate, the least walking first, the chosen one marked, under the kinds. (Integration test.)
- [ ] A press on a row chooses that place and opens its menu; "‹ N곳 목록" returns. (Integration test.)
- [ ] No row takes a press while the Plan is sent. (Integration test.)
- [ ] The kinds filter the list and recede the map's candidates as before. (Integration test.)
- [ ] A menu's corners, hours, and the list's order. (Unit test.)
- [ ] Pictures with the crowded case: docked, the list, a menu. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
