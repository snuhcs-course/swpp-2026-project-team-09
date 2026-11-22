# 36: A Restaurant's hours are answered from its serving hours

Parent: [P05 spec](../spec.md); a report from the released app: with a lunch plan for 예술계식당 on the screen, "예술계 밥 언제까지 해?" got "예술계식당의 영업 종료 시간은 데이터에 없어서 확인되지 않아요"
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- The serving hours are kept (`RestaurantHours.hoursOf`, for each Restaurant, meal, and kind of day), and the menu Lookup's card shows them, but no tool gave them to the model. `findMenu` answers when the User can eat (the plan's start and end) and the menu's lines. `getMenus` answers lines only. `planMeal`'s plans carry only `closesAt`. So the model had no opening or closing time and said that it was not in the data.
- With a plan on the screen, a reply in words alone takes the plan off the screen (`EARLIER_REPLIES` in `chat-assistant.ts`).

## Cases

| Asked | The tool answers | The reply |
| --- | --- | --- |
| A Restaurant's close today ("예술계 밥 언제까지 해?") | each served meal's `opensAt` and `closesAt`, `now`, `servingNow` | "예술계식당 점심은 11:30부터 14:00까지예요. 저녁은 17:00–18:30이에요." |
| Its open ("몇 시에 열어?") | the same | the meal asked for first |
| "지금 열었어?" | `servingNow`: the meal whose hours hold now, or null | whether it serves now, and when it opens or closes next |
| A day it does not serve (only notes) | that meal `serves: false` with the notes | that it does not serve then |
| A meal it does not serve | that meal left out, or `serves: false` when its menu holds only notes | that it does not serve that meal |
| A Restaurant with no hours kept | `hours: 'not recorded'` with the menu's notes | that it serves the meal, that the hours are not known, and a time a note states |
| A day whose menu is not collected yet | `serves: 'not known'` with the usual hours for that kind of day | the usual hours, as usual ones |
| Neither a menu nor hours | `none` with the reason | that nothing is known for that day |
| Any of these with a meal plan on the screen | the same, and the plan planned again from the context's conditions into the reply's `answer` | the plan stays on the screen |
| Without a plan on the screen | the same, nothing drawn | words only |

## What changes

- A new tool `restaurantHours(date, restaurant?)` with `HOURS_RULES`, for an app that draws answers (`lookup/hours-tools.ts`, `lookup/hours-words.ts`). The rules send every question about when a Restaurant opens, closes, or serves a meal to it, answered in one or two plain sentences, and forbid saying that the hours are not in the data when the tool gave them.
- **The plan on the screen stays.** With a meal answer on the screen, the tool plans it again from the context's conditions and puts it in the reply's `answer`. `EARLIER_REPLIES` now names `restaurantHours` beside `planMeal` as a reply that keeps the plan. The app redraws the answer from its first plan, so a plan reached with the arrows comes back as the first one. Keeping the very plan browsed to would need the app to keep the frame on a reply in words, which is out of this ticket.

## Acceptance criteria

- [x] Unit tests (`restaurant-hours.unit.test.ts`): each case of the table, the edges of `servingNow` (11:29, 11:30, 13:59, 14:00, 17:30, 18:30), another day without `now`, and the tool planning the meal on the screen again, or drawing nothing without one.
- [x] Eval cases (`eval/cases/restaurant-hours.yaml`): the close, the open, "지금 열었어?", and a question after a plan; written and committed, not run (no key in the worktree).
- [x] The README describes `restaurantHours`.
- [x] Lint, format, and types of the main server pass.

## Comments

### The day of a bare "예술계 점심" at 00:40 on a Monday (checked, not changed)

- The request's system lines give "Now in Korea" with the date, and the meal rules say the day is today when the User names none. At 00:40 on Monday that is Monday, and `mealByClock` takes lunch, since Monday's lunch has not ended. The answer's own words name that day 오늘 (`meal-menu.ts`).
- No rule speaks of the hours past midnight. A "내일" in the reply would be the model's own word for the coming day of someone who has not slept yet, or a plan for Tuesday from the model's own choice of date; `mealAfterHours` offers "내일 점심" only once today's meal is over, which is not the case at 00:40. The screenshot's plan is for 11/24 (Tuesday): if it was asked at 00:40 on Monday 11/23, the model chose Tuesday against the rule; if it was asked at 00:40 on Tuesday, it is today's lunch and "내일" is the model's word. The run's record is needed to tell which.
