# 16: A meal already in the schedule is set aside, and replaced when a new one is made

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server (with a migration) and an app OTA update.

## What happens now

Found in use of the released app (26.11.21-3 or -4): with a lunch Quest of his own already made (일정에 넣기), "점심 뭐 먹지?" answered that there was nowhere to go.

- The Quest made from a lunch Plan runs from its start to the end of the free stretch, up to the meal's window. It is busy time in the User's day, so a new lunch plan found no free time: `noPlan` 'no-shared-time', "점심 시간에는 비는 시간이 없어요".
- The model was told only "There is no free time everyone shares during that meal." It could not say what filled the time, and the reply named no reason.
- Making a second lunch Plan into a Quest would have left two lunches.

## What to build

- A Quest made from a meal's Plan keeps its meal (`Quest.meal`). The migration adds the column and fills it for the meal Quests made before it, by their Plan titles ("…에서 점심", "…에서 저녁").
- A new meal Plan sets aside the Quest the asker holds for the same meal and day: its Sub Quests are left out of everyone's day. Other Quests and Classes still fill it.
- The meal answer carries `mealSet`: the Quest, its start, its Restaurant, the others in it, and `shared`. The model is told it (`alreadySet`), and its line says it and asks: "이미 12:16 302동식당 점심이 있어요. 바꿀까요?" The app draws 바꾸기 and 그대로 두기 (P04).
- Making a meal Plan into a Quest (`POST /plans`) replaces it in the same transaction: the asker drops it, it is deleted with nobody left, and its leave-by is cancelled. There is never a second lunch.
- A meal held with another Holder or a waiting invitation is never dropped from a new Plan: the making answers 409 `MEAL_ALREADY_SET` with its `questId`, and the line says it is changed in that 파티.
- A none answer for want of free time tells the model the User's own items that fill the meal's time (`busy`), and the rules have it say them ("점심 시간엔 13:00까지 수업이 있어요").

## Acceptance criteria

- [x] A User with a lunch Quest asks "점심 뭐 먹지?": the plans come as if it were not there, and the answer and the model name it. (`assistant-own-meal-quest.integration.test.ts`, fails before the change.)
- [x] Making the new Plan replaces the lunch kept: the old Quest is gone, and the new one is there.
- [x] A lunch with an invited Friend is set aside and named shared; making another answers 409 `MEAL_ALREADY_SET`, and the lunch stays.
- [x] Another Quest over lunch still fills it, and the model is told what fills it.
- [x] The app believes `mealSet` held alone, shared, null and absent, and refuses other shapes. (`meal-set.unit.test.ts`.)
- [x] Lint, format and types of the main server and the app pass.
