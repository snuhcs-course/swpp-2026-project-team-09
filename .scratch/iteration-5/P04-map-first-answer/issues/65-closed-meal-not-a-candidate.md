# 65: A Restaurant whose menu closes the meal is no candidate

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: a main-server Release. No app or worker change, and no migration.

## What happens now

From the phone on 2026-11-25, on the released app: asked for tomorrow's dinner, the first candidate was 302동식당 ("17:30 도착 · 이동 18분 · 셔틀"), and its dinner's menu was the notice "공대수시면접으로 인해 휴점합니다".

## Cause

- Whether a Restaurant serves a meal is one rule (ADR 0011, `main-server/src/menus/open-rule.ts`): its cell for that meal has a line that is not a note. The planner (`openRestaurants`), `findMenu`, `restaurantHours`, and the place card all read it.
- The worker marks a line as a note only when it starts with `※` or holds `휴무` (`worker-server/src/menu/menu-line.ts`). "공대수시면접으로 인해 휴점합니다" does neither, so it has no kind, counts as a served line, and the Restaurant counts as open. ADR 0011 named this ("a notice written without ※ counts as open") as a known limitation.

## The shapes in the collected pages

The worker's own reading of the Co-op's and the dormitory's pages for every day from 2026-03-02 to 2026-12-01: 550 pages, 4,653 meal cells. These are public menu pages, read again from their sites; Production's database was not queried. The veterinary college's page shows only the current week and was not read.

Closures the worker gives no kind, so counted as open until now. Each was the cell's one line:

| Line | Cells | Where |
| --- | --- | --- |
| 대체공휴일 | 11 | 2026-03-02, every Co-op Restaurant that posted that day |
| 공대수시면접으로 인해 휴점합니다 | 4 | 302동식당, lunch and dinner, 11-26 and 11-27 |
| 정전으로 휴점 | 4 | 생협기숙사(919동), lunch and dinner, 10-09 and 10-11 |
| 공휴일 운영없음 | 4 | 예술계식당, lunch and dinner, 05-01 and 05-05 |
| 제헌절 공휴일 | 3 | 07-17 |
| 추석연휴 미운영 | 2 | 아워홈(901동) breakfast, 09-26 and 09-27 |
| 대체굥휴일 (sic) | 1 | 302동식당 dinner, 03-02 |
| 광복절 대체공휴일 | 1 | 동원관식당 lunch, 08-17 |

Other shapes:

- **Already notes, closed before and after.** "<holiday> 휴무" in 154 cells, such as 추석연휴 휴무, 대체공휴일 휴무, 노동절 휴무, 개교기념일 휴무, 방학 중 휴무, and 정전으로 인한 휴무, some written without a space ("제헌절휴무").
- **A closure beside dishes.** One cell: 301동식당's lunch of 10-15. It had "개교기념일 휴무" under its staff room's heading, next to its 식사 corner's dish.
- **Notes alone with no closure's words.** 115 cells, all 자하연식당 3층's dinner ("※ 저녁 단체예약문의"). These were closed before and still are.
- **Information beside dishes.** For example "<뷔페 특성상 메뉴의 조기품절 …>", "※ 신학기 카페 이벤트", "※ 요일별 샐러드 종류 변경", "개교기념일- 구독샐러드 제공되지 않습니다.", "[방학기간 중 직화코너는 화요일만 운영합니다]", and "*특식*".
- **A notice for part of a meal.** None in these pages.

## What to build

- **The closure rule.** One rule in `open-rule.ts`, used everywhere the open rule is.
  - A **closure** is a line without a price whose words close the meal: 휴점, 휴무, 휴관, 휴업, 휴일 (as in 공휴일), 미운영, 미영업, 운영 or 영업 with 없음, 안 함, 하지 않, or 중단, and 쉽니다.
  - A line that also says something is served is no closure: 정상운영, …만 운영, 운영합니다.
  - `servedLines` leaves closures out, as it leaves notes out. `closureNotices` gives the closure's words for a cell with nothing served.
- **Decided when main-server reads the menu, not when the worker collects it.**
  - The app's menu of a meal (`cornersOf`) leaves notes out. A closure stored as a note would show "이날 메뉴를 아직 몰라요" instead of the notice.
  - Days already collected would keep their kinds until collected again.
  - ADR 0001 kept the lines' text so that a later rule can read more from them without collecting again.
  - `GET /menus` and the app are unchanged.
- **A plan or `findMealRestaurants`.** Every reader of `openRestaurants` leaves such a Restaurant out: no Plan, no numbered Place, and not counted in "N곳". When every Restaurant is closed, the existing "저녁에 여는 식당이 없어요" applies. The model is told "every menu collected for it is closed or holds only notes".
- **`findMenu` for that meal.**
  - It answers `closed`, telling the model to say it is closed and give the reason its lines state.
  - Its Lookup keeps the label "<day> 저녁은 안 해요" and quotes the closure as the basis.
  - The Restaurant still comes to the map (P04 ticket 59).
- **`restaurantHours` for that day.**
  - The meal is `serves: false`, with the closure's words as its notes and a `why` saying its menu closes it.
  - The rules say to give the reason the notes state.
  - The card's basis quotes it ("저녁: 공대수시면접으로 인해 휴점합니다").
- **Docs.** ADR 0011 and main-server's README say the new rule.

The line, when unsure, keeps a Restaurant a candidate:

- A meal is closed only when nothing in its cell is served.
- A closure beside a dish, a buffet's dish names, or a heading leaves it open.
- A line of information that does not say a closure's words is served.
- A cell of a heading alone stays open, as before.

## Acceptance criteria

- [x] The rule closes each shape in the table, alone in a cell and beside an hours note. It keeps open the 301동식당 cell, the information lines, a closure that says something is still served, and a line with a price. (Unit tests on those lines.)
- [x] A dinner plan leaves out 302동식당, closed by "공대수시면접으로 인해 휴점합니다", offers the open ones, and draws no Place of it. When every Restaurant is closed, it says "저녁에 여는 식당이 없어요". (Integration tests.)
- [x] "302동 저녁 메뉴" and "302동 몇 시까지 해?" for that day answer it as closed, with the closure to the model and on the card, and draw 302동식당. (Integration tests.)
- [x] The tests that said the old reasons are updated. Lint, format, and types of the main server pass.

## Comments

### Agent usage (2026-11-25)

- Agent time: about 25 minutes in the p04-58 session, from the request to the pull request. An estimate from the transcript's timestamps, adding gaps under 5 minutes. No subagents.
- Tokens: output about 100k. Input about 23M: cache reads about 22.7M, cache writes about 0.26M, and almost nothing uncached. Measured from the session's transcript when the pull request was opened.
