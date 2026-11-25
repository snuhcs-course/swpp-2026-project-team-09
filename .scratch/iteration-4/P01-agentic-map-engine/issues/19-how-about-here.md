# 19: "여기면 어때?": each person's arrival at a pressed Place during a Plan

Parent: [P01 spec](../spec.md) ("The contract"); package B's row 6 (P02 ticket 26)
Status: ready-for-agent
Blocked by: 17

## What to build

A building pressed during a Plan becomes "여기면 어때?". The recalculation with that Place fixed says when each person can be there and how long they are together. When the Place does not fit, it names who stays shortest and why: "지은은 12:31에 도착해 13분만 먹어요" / "13:00 수업에 가려면 12:44엔 나서야 해요". These are row 6, boards a7 and a8.

## Acceptance criteria

- [x] `PlanPart.arriveAt?: string | null` on both sides: the earliest the person can be at the Place (the gathering's `canArriveAt`), null when their position is unknown. a7: 나 12:35, 민수 12:35, 지은 12:18.
- [x] `DroppedPlace.parts?: PlanPart[]`, given when the input fixed that Place. a8: 나 0 minutes from 301동, 민수 12:18, 지은 12:31.
- [x] A fixed Place that does not fit gets `noPlan.lines` naming who stays shortest and why (`GatheringDrop.shortest`).
- [x] The app's checks (`isPart`, `isDropped`) accept the new fields, and the mock answers with copies of the real replies for a7 and a8.
- [x] Unit tests on the boards' values; integration tests at the recalculation.

## Decisions (2026-11-15)

1. **The contract** is the one in package B's seams note, section "여기면 어때?".

## Comments

The app's card was removed by P04 ticket 66 (2026-11-25); the main server's fixed Place stays.


### Decisions taken in the build (2026-11-15)

1. **One place for the parts.** `gathering/plan-parts.ts` holds `partOf` (moved from `meal-answer.ts`), the dropped Places (`droppedOf`), and the fixed Place's lines (`unfitLines`). A meal's and a meet's answers both call it, so a meet with a fixed Place gets the same fields and words. `GatheringDrop` carries each person's `parts`, as a fit does.
2. **`arriveAt` is on every part of a meal's or a meet's Plan**, not only at a fixed Place, since it is the same `canArriveAt`. The parts of events, recruiting Quests, and new Quests stay as they were.
3. **The first line** names who stays shortest: "{name}은 {arrival}에 도착해 {N}분만 먹어요". A meet's says "있을 수 있어요" in place of "먹어요". The asker is not named ("12:25에야 도착해요"). Someone whose arrival is before the window's start, or whose position is unknown, gets "{name}은 {HH:MM}부터 {N}분만 먹어요".
   - With 0 minutes, an arrival is timed only when it is known and is why there is no time: "{name}은 {arrival}에야 도착해요" when they arrive at or after the window's start. Otherwise the line is "{name}은 시간이 안 돼요" ("민수는 시간이 안 돼요"), and the second line says why.
4. **The second line** says what ends that stay. The next item gives "{HH:MM} 수업에 가려면 {leave-by}엔 나서야 해요" ("일정" for a Sub Quest). A leave-by the User fixed gives "{HH:MM}엔 나서야 해요", and the end the User fixed gives "{HH:MM}까지로 정했어요". The meal's own end gives "점심은 14:30까지예요" ("만남은 …" for a meet).
5. **Everyone long enough alone, but not together.** When even the shortest stay is 15 minutes or more, that person is not the reason. The lines are then "같이 있는 시간이 {N}분뿐이에요" / "{last}은 {arrival}에 도착하고 {first}은 {leave-by}엔 나서야 해요" (the asker as "나는"). One whose position is unknown is not said to arrive: "{last}은 {HH:MM}부터 시간이 되고 {first}은 {leave-by}엔 나서야 해요".
6. **The rest is unchanged.** The dropped Place's `reason` ("지은은 13분밖에 못 있어요") and its map tag stay as before. A dropped Place the input did not fix has no `parts`. The model is told nothing new: `planMeal` still answers `none` with the reason, and the lines are for the app.
7. **A meet's fixed Place.** The line "그곳에서는 함께 15분도 있을 수 없어요" is replaced by these lines; ticket 18's decision 6 is reworded to point here.
8. **The mock's copies** (`meal-answer-fixed-place.json` for a7, `meal-answer-unfit-place.json` for a8) were written by the server's own calculation and words on the seed's walking table, asked at 11:50. They use the key the real server gives ("자하연식당 2층") and the user ids of `meal-answer.ts`. Checked against the stored real reply for three people: its 자하연식당 2층 Plan matches field for field, except for the busy labels, which ticket 18 added later, and the map's other candidates, which a fixed Place does not have. The mock answers three people at a pressed Place with that Place's copy, and anything else as before. The older copies were not regenerated; they lack `arriveAt` and the busy labels, and both are optional.
9. **Files under the 300-line cap (app).** `PlanPart` and `DroppedPlace` moved to `api/plan-part-types.ts`, and the input's checks (with `isOneOf`) to `api/server/plan-inputs.ts`. `lookup-answers.ts` and `plan-quest-client.ts` import them from there.
10. **Privacy.** The lines name only people in the plan, all read through the Friend view. The times are a Class's start and a walk from the Timetable's building, which a Friend already sees.

### Differences from the boards (on the seed's walking table)

- **a7**: the Plan's own lines are a meal's, "**12:35 자하연식당 2층**" / "같이 먹으면 식사가 28분 줄어요" (against 48 minutes alone there). The card's note "12:35–12:55 함께 20분 · 지금 계획보다 2분 짧아요" is worked out by the app (P02-26).
- **a8**: 나's part has `arriveAt` 11:50 with 0 minutes from 301동, from which the app writes "지금 여기 있어요". The other values and both lines are the board's.

### Agent usage (2026-11-15)

- Agent time: about 50 minutes, an estimate from the session transcripts: the build about 35 minutes with the review's fixes, a review of the diff about 9, and the coordinating session about 6.
- Tokens, subagents included (the coordinating session's figures cover its whole stretch, part of which went to other pull requests):
  - Input: 474 uncached, plus 49,766,992 cache reads and 885,511 cache writes.
  - Output: 193,148.
