# 17: A Quest already set is changed, not doubled

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: P05's PR 417 for `AnswerReply.mealSet` (`MealSet`) and the 409 of `POST /plans`; [04](04-plan-bottom-without-text.md) for the main action beside the input.

Native files: none. Releases: an app OTA update only.

## What to build

With a lunch already put in the schedule (일정에 넣기), "점심 뭐 먹지?" is answered with plans as if that lunch were not there, and the answer says so: "이미 12:16 302동식당 점심이 있어요. 바꿀까요?"

- **The line and 그대로 두기:** the model's line is the dock's one line, and 그대로 두기 is a chip in the same row. 그대로 두기 drops the new Plan and the line: the answer closes and the map goes back to what it showed.
- **A Quest the User may change** (`mealSet` with `shared: false`): 바꾸기 is the one main button beside the input. A press makes the new Plan; the main server drops the held Quest and its leave-by reminder in the same step, so there are never two lunches.
- **A shared Quest** (`shared: true`: another holder, or an invitation not yet answered): no 바꾸기; 파티 보기 beside the input opens that 파티. The line says to change it there.
- A `POST /plans` that answers 409 `MEAL_ALREADY_SET` (the Quest became shared after the answer) says to change it in its 파티 and makes nothing.
- **General from the start:** the line, the chip, and the buttons are drawn from one shape that names a Quest (title, time, place, people, shared, whether this answer may change it), `SetQuest`, with `mealSet` as its first source. P05's next ticket makes "already set" a property of every planner's answer (meal, meeting, event, seat) and adds changing and cancelling a Quest by words; the general field is agreed with P05 then, and `setQuestOf` reads it.
- **Left room for, not built:** a question about what is already set ("민수랑 약속 몇 시였지?") is answered by showing that Quest on the map, its flag and its time on the bar, with no new plan. Its shape is agreed with P05 first.

## What happens now

- The held Quest fills the meal's window, and the answer is `noPlan` 'no-shared-time' (fixed on the main server by P05 ticket 16).
- The main action of a meal Plan is 일정에 넣기 (`planActionOf`); a 409 from `POST /plans` other than `PLAN_CHANGED` and `SHARED_QUEST_HELD` says only that inviting failed.

## What changes

- `setQuestOf(answer)` (`features/assistant/set-quest.ts`): the `SetQuest` an answer stands beside, from `mealSet` for now.
- `planActionOf` reads 바꾸기 for a Quest the User may change, and 파티 보기 for a shared one.
- The dock: a Plan beside a set Quest rests as the model's line with 그대로 두기 (`setQuestRestOf`), which leaves the answer as ✕ does.
- The make request's 409 `MEAL_ALREADY_SET` is told as "같이 정한 약속이라 그 파티에서 바꿔 주세요".
- The mock answers 배고파 beside a lunch its User made from a Plan with `mealSet` and the main server's line, so the mock build shows both states.

## Must not break

- 일정에 넣기 and 초대 of a meal answer without `mealSet` (`answer-plan-bottom`, `answer-taken-alone`, `answer-here-alone`, `answer-invite-after`).
- The dock at rest: one row over the input and one main button.

## Acceptance criteria

- [ ] A meal answer with an own `mealSet`: the line and 그대로 두기 in the dock, 바꾸기 beside the input; a press sends `POST /plans`; 그대로 두기 closes the answer and sends nothing. (Integration test.)
- [ ] With `shared: true`: no 바꾸기; 파티 보기 opens that 파티. (Integration test.)
- [ ] A 409 `MEAL_ALREADY_SET` on 바꾸기 says to change it in its 파티 and makes nothing. (Integration test.)
- [ ] `setQuestOf` for none, a Quest held alone, and a shared one. (Unit test.)
- [ ] The mock's 배고파 beside a lunch held alone and one shared with 민수. (Unit test.)
- [ ] The two states on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
