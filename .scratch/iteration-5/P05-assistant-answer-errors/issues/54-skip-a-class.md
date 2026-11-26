# 54: A Class the User says is cancelled is left out of the meal's plan

Parent: [P05 spec](../spec.md)
Status: ready-for-agent

Blocked by: none. The app's time card follows in P04 ticket 93.

Native files: none. Releases: a main server deploy.

## What happens now

Nothing can leave a Class out of a plan. Since ticket 49 (PR 592), the reply to "내일 1시 수업 휴강이야. 점심 뭐 먹을까?" says so ("1시 수업 휴강은 아직 반영하지 못해서, 13:00 302동 수업 전까지 …"), and the plan still ends before that Class.

## What to build

The user's decision (2026-11-26), design page "1. 수업 빼기" with option 다 for the time card:

1. **The input.** The meal's input takes the asker's Classes to leave out for this plan: `skipped`, the ids of their times.
   - An id survives any follow-up of the same day.
   - It is optional and top-level, so an installed app passes it through and sends it back unchanged. Today's app refuses an unknown constraint kind but not an unknown top-level field.
   - An id that is none of the asker's Classes that day is dropped, and the field is absent for none.
2. **planMeal.**
   - `skipClasses` names the Classes by start ("1시 수업" → 13:00) or by name ("자료구조"), several at once ("오후 수업 다").
   - `attendClasses` puts one back ("3시 수업은 가").
   - A word that names no Class of the day, or several, answers `unknownClass` with the day's Classes and plans nothing, so the model asks which.
   - Those left out on screen stay left out for any meal of the same day. A new conversation sends no conditions, so it forgets them.
   - The Timetable is never changed.
3. **The planner.**
   - A Class left out is free for the meal.
   - Where the asker sets out from, and the next item, come from the items left. A left-out Class before the meal gives way to the item before it or the present position. One after the meal gives way to the following item, or to none.
4. **The band.**
   - Each Plan's `band.skipped` lists the Classes left out, whole, with the label of a lane's busy stretch.
   - They are in no lane.
   - The range reaches over the time they free, to the next item left or the meal's end.
5. **The words.**
   - The rule replaces ticket 49's: the one sentence says the Class was left out ("1시 수업을 빼고, 가장 덜 걷는 301동식당을 추천해요.").
   - A Friend's Class is never left out, and the reply says only the User's own can be.
   - A Class that ends early or late is not in scope.
   - Making the Quest from such a plan is allowed and overlaps the Class in the Timetable, with no question.

## Acceptance criteria

- [x] Tests fail on the code before (`assistant-meal-skip-class`, integration):
  - by start, with the input, the band and the next item;
  - the range to the meal's end;
  - by name, and several at once;
  - the words the model gets;
  - a word of no Class, or of several, answering `unknownClass`;
  - kept on screen, then put back;
  - a recalculation keeping only the asker's own Class;
  - the origin moving to the item before.
- [x] The rules test fails on the code before: the rules call planMeal with skipClasses and attendClasses, never leave out a Friend's Class, and no longer say "아직 반영하지 못해서".
- [x] Eval cases written and marked not run: by start, by name, an afternoon's Classes, a start of no Class, a Friend's Class, and putting one back on screen.
- [x] No native file changes; lint, format and types pass on the main server.

## Comments

Built in PR #608.
