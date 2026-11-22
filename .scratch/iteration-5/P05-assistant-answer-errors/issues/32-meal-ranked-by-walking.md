# 32: A meal's plans come least walking first

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server only.

## What happens now

Reported from the released app on a Sunday at 21:20: "내일 점심 어디서 먹을까". On Monday the User's Class ends at 10:45 in 301동, and the next starts at 15:30 in 302동. The first plan was 학생회관식당, 32 minutes' walk away, though 301동식당 and 302동식당 are 3 minutes away. The reply said "11:00부터 14:30까지 먹을 수 있어요", which is the Restaurant's hours.

`gather` puts every plan in the same order: the longest time together, then the earlier start, then the key. Walking is not part of it. 학생회관식당 closes at 14:30 and the two engineering Restaurants at 13:30, so 학생회관식당 wins by an hour, an hour nobody needs for lunch. The meal rule then asks the model for the first plan "and when everyone is there", and the model read the plan's start and end as when the meal is.

## What to build

- A meal's plans (`gatherMeal`, and through it `mealAnswer`) are ordered:
  1. those where everyone has at least `UNHURRIED_MEAL_SECONDS` (30 minutes) first, then those with 15 to 30, so that a meal one can barely eat never comes first for being near;
  2. in each, by the least walking for everyone together: to the Restaurant, and on to each one's next item;
  3. then by the smaller largest walk of any one person;
  4. then by the earlier start;
  5. then by the key.
- The 30 minutes is a named constant beside `SHORTEST_MEAL_SECONDS` in `judgement-constants.ts`.
- Beyond the two tiers, the time together is a floor, not something to maximise. A plan fits when everyone has at least `SHORTEST_MEAL_SECONDS` (15 minutes) there, as before.
  - This 15 minutes is the length the server already uses as a meal's. It is in the band's "식사 N분", the Friends counted free, and the lines that say a meal does not fit ("식사 15분 이상").
  - The app's band has no meal length of its own: it is drawn from the plan's start to its end.
  - A longer floor would change who counts as free and every one of those lines, so it is not part of this ticket.
- A chosen kind of food still comes first (`kindFirst`), each group in the order above.
- A meet (`gatherToMeet`) keeps the longest time together first: being together longest is the point of meeting. `gather` takes `order: 'together'` from the meet, and the meal's order is the default.
- "같이 먹으면 식사가 N분 줄어요" compares with the asker's longest meal alone, as it did, now taken as the longest plan alone instead of the first.
- The meal rule (`PLAN_RULES`):
  - says the plans with 30 minutes for everyone come first, then the shorter ones, each least walking first;
  - has the sentence say why the first plan is first, in the User's terms (가장 가까워요, 수업 끝나고 바로 가요, 둘 다 가까워요, or that it serves the kind of food asked for), and its start, when everyone is there;
  - says a plan's end is when someone must leave or the Restaurant closes, so the reply never gives the start and end, or the Restaurant's hours, as when the meal is.
- planMeal's description says the same order.

## Case table

| Row | Case | First plan | Where tested |
| --- | --- | --- | --- |
| 1 | Alone; a Class ends 10:45 in 301동, the next starts 15:30 in 302동; asked on Sunday for Monday | 301동식당, then 302동식당 (the walk ties; the key decides); 학생회관식당 later, though it is the longest | `assistant-meal-nearest-first.integration.test.ts` |
| 2 | Alone; a Class ends in 301동 and nothing follows | 301동식당 | the same file |
| 3 | Alone; a near Restaurant with 30 minutes before it closes, and a far one with 90 | the near one | `gathering-order.unit.test.ts` |
| 4 | Alone; a near Restaurant with 20 minutes, and a far one with 90 | the far one: 20 minutes is under the tier | the same file |
| 5 | Alone; two Restaurants with under 30 minutes | the one with less walking, though the other gives 2 minutes more | the same file |
| 6 | Alone; one Restaurant near the Class before but far from the one after | the one with less walking there and on | the same file |
| 7 | With a Friend across campus | the least walking for both together, not the asker's nearest | the same file, and the worked example with 지은 (`gathering-worked-example.unit.test.ts`: 26 minutes of walking to 학생회관식당 against 28 to 자하연식당) |
| 8 | With a Friend, two Restaurants with the same walking together | the one whose longest single walk is shorter, before the earlier start | `gathering-order.unit.test.ts` |
| 9 | Walking ties | the earlier start, then the key | the same file |
| 10 | A kind of food chosen | those serving it first, each group in the order above | `kindFirst`, unchanged (`meal-menu.unit.test.ts`) |
| 11 | A meet | the longest time together first, as before | `gathering-order.unit.test.ts`, the meet tests unchanged |
| 12 | Under 15 minutes together | dropped, as before | `gathering.unit.test.ts` |

## Acceptance criteria

- [x] Rows 1 and 2: the integration test fails under the old order, where a Restaurant open longer (3식당 there) comes first, and passes after.
- [x] Rows 3, 5, 6, 7 and 8: the order's unit tests fail on 5.0/Main and pass after. Rows 4, 9 and 11 hold on both: the longest first also puts row 4's far Restaurant first.
- [x] The worked examples and the boards keep what they test; where they read the first plan, it is now the least walking.
- [x] The meal rule and planMeal's description say the order and why the first is first, and forbid the Restaurant's hours as the meal's time.
- [x] An eval case in the P4 answer world (`meal-wish-tomorrow-nearest`) asks "내일 점심 어디서 먹을까" on Sunday night. Its reply must name 301동식당, say why, and not say "까지 먹을 수".
  - Run 3 times on this branch, every reply said why, such as "301동식당이 가장 가까워서 12:19에 먹어요", and none gave the hours.
  - On 5.0/Main every reply named only the time and the place, such as "내일 점심은 12:19에 301동식당에서 먹어요".
  - Two of the branch's three runs still fail the case, because the model calls showOnMap after planMeal. That failure is 5.0/Main's too: it fails 7 of the other meal-wish runs there and 9 on this branch. It is not this ticket's.
- [x] Lint, format and types of the main server pass.

## Comments
