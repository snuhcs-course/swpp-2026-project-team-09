# 17: A meal already in the schedule is changed, not doubled

Parent: [P04 spec](../spec.md)
Status: needs-triage
Blocked by: P05 ticket 16 for `AnswerReply.mealSet` and the 409 of `POST /plans`; [04](04-plan-bottom-without-text.md) for the main action beside the input.

Native files: none. Releases: an app OTA update only.

## What to build

With a lunch already put in the schedule (일정에 넣기), "점심 뭐 먹지?" is answered with plans as if that lunch were not there, and the answer says so: "이미 12:16 302동식당 점심이 있어요. 바꿀까요?"

- **The meal is the User's own** (`mealSet` with `shared: false`): the main action beside the input reads 바꾸기. A press makes the new Plan; the main server drops the kept Quest and its leave-by reminder in the same step, so there are never two lunches. A second choice, 그대로 두기, closes the answer.
- **The meal is shared** (`shared: true`: another holder, or an invitation not yet answered): no 바꾸기. The line says to change it in that Quest; whether the main action opens that Quest is decided before this ticket is built.
- A `POST /plans` that answers 409 `MEAL_ALREADY_SET` (the meal became shared after the answer) shows the same line as a shared meal and makes nothing.

## What happens now

- The kept Quest fills the meal's window, and the answer is `noPlan` 'no-shared-time' (fixed on the main server by P05 ticket 16).
- The main action of a meal Plan is 일정에 넣기 (`planActionOf`); 409 from `POST /plans` is not handled.

## What changes

- `AnswerReply.mealSet?: { questId; title; startAt; place; friendNames; shared } | null` read by the app's guard.
- `planActionOf` reads 바꾸기 for a meal answer with an own `mealSet`; 그대로 두기 takes a place in the dock (where is decided with the phone screens: a chip, or beside 바꾸기).
- The make request's 409 `MEAL_ALREADY_SET` becomes the shared case's line.

## Must not break

- 일정에 넣기 and 초대 of a meal answer without `mealSet` (`answer-*-invite`, `plan-action`).
- The dock at rest: the input and one main button.

## Acceptance criteria

- [ ] A meal answer with an own `mealSet`: 바꾸기 beside the input; a press sends `POST /plans`; 그대로 두기 closes the answer and sends nothing. (Integration test.)
- [ ] With `shared: true`: no 바꾸기, the line names the Quest. (Integration test.)
- [ ] A 409 `MEAL_ALREADY_SET` on 바꾸기 shows the shared line and makes nothing. (Integration test.)
- [ ] The two states on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
