---
status: accepted
---

# A Restaurant is open for a meal when its cell has a line that is neither a note nor a closure

Supplements [ADR 0001](0001-menus-kept-as-lines.md), under which hours are text and the app cannot say whether a Restaurant is open.

공강에 밥 (P04) needs one answer that ADR 0001 left out: which Restaurants serve this meal on this day. A Restaurant is open for a meal when that day's cell of that meal has at least one line that is neither a note nor a closure. A cell of only notes and closures (휴무, hours, ※ notices, "공대수시면접으로 인해 휴점합니다") is closed, and so is a meal with no lines. A closure is a line without a price whose words close the meal (휴점, 휴무, 휴관, 휴업, 휴일 as in 공휴일, 미운영, 운영없음, 운영하지 않습니다) and that does not also say something is served (정상운영, 중식만 운영). The rule reads the kind the worker gave each line and the words of the lines that are not dishes, at `src/menus/open-rule.ts` in the main server, so the worker's line classification and the chat's `getMenus` do not change. It answers whether a meal is served that day, not whether a Restaurant is open at a given minute: the meal windows of the judgement are one table for all Restaurants, and the hours stay text.

In the pages of 2026-10-01, the one cell of only notes is 자하연식당 3층's dinner, a line about group bookings. On a public holiday the Co-op writes the closure in the cell as "개천절 휴무", which the worker already reads as a note. The Co-op's and the dormitory's pages from March to November 2026 also wrote closures the worker gives no kind, each as the cell's one line: "대체공휴일" (once "대체굥휴일"), "제헌절 공휴일", "광복절 대체공휴일", "공휴일 운영없음", "추석연휴 미운영", "정전으로 휴점" and "공대수시면접으로 인해 휴점합니다".

## Considered Options

- **A seed of each Restaurant's hours**, as Siksha keeps. Someone would keep it by hand, and it could not know a closure of one day, which the cell does show.
- **Reading the hours from the `※ 운영시간` notes.** The notes come in several spellings and only for some cells, and a meal's cell has its dishes whether or not it has them.
- **Marking closures as notes in the worker.** The app's menu of a meal leaves notes out, so a closed meal would show no words at all, and the days already collected would keep their kinds until collected again.
- **Special cases** for particular Restaurants or days. A rule with exceptions has to be kept up with the pages. The closure words are one list for every Restaurant, checked against every cell of those pages.

## Consequences

- A cell with only a heading, or a notice without a closure's words, counts as open: when unsure, a Restaurant stays a candidate. A closure beside a line that is served leaves the meal open, as on 301동식당's lunch of 2026-10-15, whose staff room was 휴무 beside its 식사 corner.
- A Restaurant's rows of a meal reach the model and the card without their notes and closures: its served lines are what `findMealRestaurants` returns.
- A question about a meal a closure closes is answered as not served, with the closure's words.
- A later rule that reads more from the lines can replace this one without collecting again, as ADR 0001 promised.
