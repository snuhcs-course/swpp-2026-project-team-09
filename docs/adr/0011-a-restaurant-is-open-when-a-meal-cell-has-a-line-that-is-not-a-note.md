---
status: accepted
---

# A Restaurant is open for a meal when its cell has a line that is not a note

Supplements [ADR 0001](0001-menus-kept-as-lines.md), under which hours are text and the app cannot say whether a Restaurant is open.

공강에 밥 (P04) needs one answer that ADR 0001 left out: which Restaurants serve this meal on this day. A Restaurant is open for a meal when that day's cell of that meal has at least one line that is not a note. A cell of only notes (휴무, hours, ※ notices) is closed, and so is a meal with no lines. The rule reads only the kind the worker gave each line, so the worker's line classification and the chat's `getMenus` do not change. It answers whether a meal is served that day, not whether a Restaurant is open at a given minute: the meal windows of the judgement are one table for all Restaurants, and the hours stay text.

In the pages of 2026-10-01, the one cell of only notes is 자하연식당 3층's dinner, a line about group bookings. On a public holiday the Co-op writes the closure in the cell as "개천절 휴무", which the worker already reads as a note.

## Considered Options

- **A seed of each Restaurant's hours**, as Siksha keeps. Someone would keep it by hand, and it could not know a closure of one day, which the cell does show.
- **Reading the hours from the `※ 운영시간` notes.** The notes come in several spellings and only for some cells, and a meal's cell has its dishes whether or not it has them.
- **Special cases** for particular words or Restaurants. A rule with exceptions has to be kept up with the pages. The one rule is stated in a sentence and frozen with the evaluation.

## Consequences

- A cell with only a heading, or a notice written without ※, counts as open. It is a known limitation, not a case to handle.
- A Restaurant's rows of a meal reach the model and the card without their notes: their lines that are not notes are what `findMealRestaurants` returns.
- A later rule that reads more from the lines can replace this one without collecting again, as ADR 0001 promised.
