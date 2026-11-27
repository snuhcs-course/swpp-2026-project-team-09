# 24: A study plan alone is saved as a Quest taken alone

Parent: [P10 spec](../spec.md); the study candidates screen the user approved on 2026-11-27, whose main button on a study place other than 관정 is "일정에 넣기" (the app's P10 ticket 19).
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server; the app's button comes with ticket 19.

## What changes

- `POST /plans` makes a study plan for the asker alone into a Quest taken alone, through the same path as a meal's, a meet's and an events Plan (`aloneInputOf` and `makeAlone` in `plans.service.ts`):
  - it plans again through `planStudy` (`PlanAnswersService`) and takes the Plan named at the time shown, else 409 `PLAN_CHANGED`;
  - the Quest is held by the asker alone (`capacity` 1, `takenAlone`), titled as the Plan ("공대 신양학술정보관에서 공부");
  - it keeps the leave-by and answers the card's two lines, as for a meal.
- A study plan's one step is the stay at its building ("<building>에서 공부" at the arrival, `study-plan-parts.ts`), as a meal's Plan has the meal at its Restaurant, so that the Quest has its place and time.
- The card's first line where the User already is says "에서 공부해요" (`goingLine`, `alone-plan.ts`).
- A study together, or with a Friend, is still refused with 400 `PLAN_KIND`: it is the group study room's request (ticket 12). `PUT /plans/:questId` (changing a Quest from a new Plan) still takes a meal's and a meet's only.
- 관정's seat is not saved this way: it is booked through the seat ticket (ticket 22), so the app offers no "일정에 넣기" for it.
- No migration, no new field on the Quest, no ADR.

## Plan kinds saved alone as a Quest at `POST /plans`

| Plan kind | Was | Now |
|---|---|---|
| events | saved alone | unchanged |
| meal, asker alone | saved alone | unchanged |
| meet, asker alone | saved alone | unchanged |
| study, asker alone | 400 `PLAN_KIND` | saved alone |
| study together or with a Friend | 400 `PLAN_KIND` | unchanged: the group study room's request |
| meal or meet with a Friend | made a 파티, inviting them | unchanged |
| new-quest | posted as a recruiting Quest | unchanged |
| quests | 400 `PLAN_KIND` | unchanged: a Quest to join is joined from its card |

## Acceptance criteria

- [x] A study plan alone at `POST /plans` is a Quest held alone with its stay as its step. (Integration test, 400 before the change.)
- [x] A time no longer the Plan's is 409 `PLAN_CHANGED`. (Integration test, 400 before the change.)
- [x] A study together is 400 `PLAN_KIND`. (Integration test.)
- [x] `aloneInputOf` takes a study alone and not one together or with a Friend. (Unit test, failing before the change.)
- [x] A study plan has its stay as its one step. (Unit test, failing before the change.)
- [x] The card's first line where the User is: "에서 공부해요". (Unit test, failing before the change.)
- [x] The whole of main-server's and mobile's lint, format and types; the touched test files run locally.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 25 minutes, an estimate, in one session.
- Tokens, estimated as a quarter of that session's: input 10M, of which 9.9M cache reads, 0.07M cache writes and under 1k uncached; output 20k.
