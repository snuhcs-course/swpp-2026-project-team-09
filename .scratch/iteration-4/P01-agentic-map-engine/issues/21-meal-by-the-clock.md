# 21: "배고파" at 15:00 plans dinner: the server takes the meal by the clock

Parent: [P01 spec](../spec.md) ("The Assistant", "The wording")
Status: ready-for-agent
Blocked by: None. Needed for the acceptance test on 2026-11-16 at 15:00; the Release is cut from `4.0/Main` at 08:00.

## What to build

"배고파, 민수랑 같이" asked at about 15:00 must plan dinner, not a lunch that is over. In package B's first-path run on the real servers (Main 530e600e, the server's clock on Monday 2026-11-16 15:00 KST, an app that draws answers), the model called `planMeal` with `meal: 'lunch'` twice out of three, which answered `noPlan: no-shared-time` and no Plan, and `dinner` once, which gave 7 Plans. `PLAN_RULES` left the clock to the model: "the meal (lunch or dinner; when they name none, the one being served now or the next one)". "오후 3시쯤 민수랑 저녁 먹자" got a question back ("오후 3시는 저녁 시간보다 이르니 … 몇 시쯤") instead of a Plan.

The server takes the meal by the clock when the User's words name none, and a time the User names for a meal is its start, fitted to the meal's hours. Server only.

## Acceptance criteria

- [x] `planMeal`'s `meal` is optional. The model passes it only when the User's words name a meal (점심, 저녁); otherwise it leaves it out and the server takes it by the clock (`mealByClock` in `free-time/meal-fit.ts`): for today, lunch until lunch's window (`MEAL_WINDOWS`, 11:00–14:30) ends, then dinner; for another day, lunch.
- [x] The answer's input (`MealInput.meal`) stays required: the tool fills it before planning, so the app, the recalculation (`POST /assistant/answers`), and `constraintsOf` see a meal as before.
- [x] `PLAN_RULES`: the meal only when the User names one, otherwise left out. A time the User names for a meal is `from` (HH:MM), even before the meal's hours, and the server fits it to them; the model never asks back about the time.
- [x] A `from` before the meal's start today (dinner from 15:00) gives a window that starts at the meal's start, and the plan's second line says so ("저녁은 17:00부터예요"), as it already did for lunch. Nothing needed fixing there.
- [x] The meal taken is on the card without opening 근거: the first line of every Plan opens with it ("저녁 17:00 302동식당", "저녁 302동식당 · 식사 87분"), and the no-time and no-Restaurant lines name it when the window is the meal's own ("저녁 시간에는 같이 비는 시간이 없어요", "저녁에 여는 식당이 없어요"). The lines stay plain `AnswerLine`s, which the app's `isLine` accepts.
- [x] Nothing else changes: "오늘 점심" at 15:00 still plans today's lunch and gets its no-time answer, and "내일 점심 민수랑" plans tomorrow's lunch as before.
- [x] Tests:
  - unit (`test/meal-by-clock.unit.test.ts`): the clock's choice today at 09:00, 14:29, 14:30, 14:31, 15:00, 17:00 and 19:31, on another day, and with a start asked for; `planMeal` filling `meal`, keeping the constraints on screen for the meal it takes, and keeping a lunch the User named;
  - integration (`test/assistant-meal-by-clock.integration.test.ts`): at `POST /assistant/messages` with the scripted model at 15:00, `planMeal` without `meal` gives dinner Plans from 17:00, dinner from 15:00 starts at 17:00 with its line, and a named lunch answers that no lunch time is left.
- [x] The two sentences against the real model, five times each, in the benchmark (`eval/cases/meal-clock.yaml`, `pnpm eval --world p4-answer --category meal-clock`): on this branch "배고파, 민수랑 같이" planned dinner with Plans 5 of 5 (the model left `meal` out each time) and "오후 3시쯤 민수랑 저녁 먹자" 5 of 5 (`dinner` with `from: '15:00'` each time); on Main's code, 2 of 5 (three lunches with no Plan, and one of the two only after a second call) and 4 of 5 (one question back about the time).

## Comments

### Decided in the build (2026-11-16)

- **Today after dinner's end** the server keeps dinner, which answers honestly that no time is left ("저녁 시간에는 … 비는 시간이 없어요"). Tomorrow's lunch would plan a day the User did not ask about, and the words "배고파" ask about now.
- **The start asked for decides with the clock.** The meal is judged at the later of now and the start the User named (`from`), or at that start on another day. "내일 6시에 밥 먹자" then plans tomorrow's dinner, and "3시쯤 밥 먹자" asked at 10:00 plans dinner from 17:00, where lunch would have had no time inside its window. `until` is not read.
- **The boundary is lunch's window's end, 14:30**, not the last start that leaves the shortest meal (14:15): at 14:29 the server still takes lunch, which then says no lunch time is left. Moving it earlier would be a rule of its own; the edges are tested at the window's minutes.
- **The meal on the card is always there, not only when the server took it.** The recalculation and a change in words plan again from the input, which cannot say whether the meal was taken by the clock without a new field the installed app does not send back, so a word shown only then would vanish at the first drag. It opens the first line because that is the line every Plan has: the second line is missing for a Plan alone with no walk and no leave-by, and one of its variants already names the meal ("저녁은 17:00부터예요").
- **The model is told the meal**: `planMeal` answers `meal` beside `result`, so that its one sentence and its reason for no Plan can name it.
- **`planMeal` takes `Pick<MealPlanService, 'plan'>`**, so that the unit test gives it a stand-in.
- **`findMenu`'s rule** keeps "the one being served now or the next one": it only reads a menu, and this ticket changes only the meal plan.
- **The benchmark's `p4-answer` world** is the P4 world (its seeds, clock, and travel fixture) asked with `clientCapabilities: ['library', 'answer']`, as the app asks with a context, so that `planMeal` is offered. Its cases live in `eval/cases/` and stay out of the P4 suite's 40. `planMeal` is not one of the scorer's tools, so the case file only requires the call; the counts above were read from each run's `planMeal` input and the reply's `answer`. The model was OpenRouter's `anthropic/claude-haiku-5.5`, the server's default, with the clock at Monday 2026-11-02 15:00. `dotEnv()` also takes a provider's key from the command's environment, so that a worktree without its own `.env` can run it.
- **`pnpm eval` does not start on `4.0/Main`**: `src/common/settings.ts` imports `./llm-keys.js`, which Node's type stripping cannot resolve to the `.ts` file. The runs here used a resolve hook outside the repository (`node --import <hook> eval/cli.ts …`); fixing the import is left for its own change.
- **"오후 3시쯤 민수랑 저녁 먹자" in the P4 world** gives "저녁 17:15 301동식당" / "17:15에야 도착해요": the asker's Class in 301동 ends at 17:15, after dinner opens at 17:00, so the line names the asker's arrival, as it does for any start the User fixed.
