# 38: A day whose menus are not posted yet is said as not posted, never as closed

Parent: [P05 spec](../spec.md); the user's checklist item "아직 수집 못한 날짜에 대한 답변은 X"
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- The worker reads the menus of today to six days ahead at 05:00 and 10:00. A day not posted has no menu rows at all, while the hours, kept by kind of day, are still there.
- An hours answer for such a day drew the map's label "그날은 쉬어요" (today "지금 닫음 · 오늘은 쉬어요"), while the model said the usual hours: `spanOf` ignored `serves: 'not known'`.
- `planMeal` told the model the same reason for a closed day and a day not posted ("No Restaurant is open for that meal that day, or no menu was collected for it"), and the card said "그날은 수집된 메뉴가 없어요", our own word, without when.
- Every meal tool takes a day up to a week ahead, but the worker never reads +7.

## Cases

| Asked for | Menus | The card | The model is told | The map's label of an hours answer |
| --- | --- | --- | --- | --- |
| Today | posted | plans | planned | its state now |
| Today, before 05:00 | none yet | "오늘 메뉴는 아직 올라오지 않았어요" | not posted yet | "메뉴 아직 안 올라옴 · 평소 점심 …" |
| +3 | posted | plans | planned | each meal's span |
| +6 | not posted yet | "11/29(일) 메뉴는 아직 올라오지 않았어요" + "메뉴는 엿새 뒤 날짜까지 볼 수 있어요" | not posted yet | "평소 점심 … · 저녁 …" |
| +7 | never read | the same as +6 | not posted yet | the same |
| +10 | out of reach | — | "not between today and a week from today" | — |
| A weekend | posted, few open | plans at those open | planned | its state, or "쉬어요" where the menus hold only notes |
| A holiday the menus mark closed | only notes | "점심에 여는 식당이 없어요" | no Restaurant serves that meal | "그날은 쉬어요" |
| One source posted, the other not | partly | plans at those posted only | planned | — (see below) |

## What changes

- `hours-lookup.ts`: a meal not posted yet is said with its usual hours ("평소 점심 11:00–14:30"; today "메뉴 아직 안 올라옴 · 평소 …"). The label says "쉬어요" only when the menus hold only notes, and the card's basis gives "점심 11:00–14:30 (평소, 그날 메뉴는 아직 안 올라옴)".
- `MealPlanService.planned` says whether the day has any menu (`posted`). `planMeal` then tells the model `NOT_POSTED` for a day without menus: say the menu is not posted yet and comes later, never that nothing is open. The `no-menu` reason is now only for menus that hold only notes. The meal rules say the same in one sentence.
- The card says "11/30(월) 메뉴는 아직 올라오지 않았어요" and "메뉴는 엿새 뒤 날짜까지 볼 수 있어요"; today it says "오늘 메뉴는 아직 올라오지 않았어요" alone. The reason stays `no-menu`, since the app accepts only its three reasons.
- `findMenu` and `getMenus` say a day without a menu is not posted yet, not that it was not collected.
- **+7 (choice)**: the tools keep a week ahead, since `DAYS_AHEAD` is shared with the events and free-time tools, which do have +7. +7 gets the not-posted line, and the card's second line says how far ahead menus come.

## Acceptance criteria

- [x] Unit tests: the not-posted card words today, the day before, +3, +6, and +7; planMeal's reason with no menus and with notes only; the label of an hours answer on a day not posted (another day and today), and "쉬어요" only for notes only.
- [x] Integration tests updated (`assistant-meal-plan`, `assistant-menu`, `assistant`).
- [x] Eval cases written, not run: a meal, a menu, and the hours on a Friday the P4 world has no menus for.
- [x] README; lint, format, and types of the main server.

## Comments

### One source posted and the other not (checked, not built)

`menusOf` knows only none against some, so a weekday where the dormitory posted and the Co-op did not plans only at 901동 and 919동, as if the rest were closed. To add "학생회관식당 메뉴는 아직 안 올라왔어요", the planner would list the Restaurants with kept hours for that meal and kind of day that have no menu that day. That needs one new read in `RestaurantHours` (every Restaurant's hours for a meal and kind of day), the names passed to `mealAnswer`, one line on the card or in the basis, and a field in the model's result: about 30 lines and a test, its own small ticket.

### Agent usage (2026-11-23)

- Agent time: about 30 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 18.3 million, of which about 18.3 million cache reads and 0.04 million cache writes; output about 25,000. No subagents. Measured from the session's transcript at the time of the pull request.
