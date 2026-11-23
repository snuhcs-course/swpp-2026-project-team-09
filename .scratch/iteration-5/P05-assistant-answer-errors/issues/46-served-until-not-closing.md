# 46: A Restaurant's closing is when it last serves, not when the meal ends

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server only. The answer keeps its shape; the plans' ends and words change.

## What happens now

Reported on 2026-11-23 after ticket 45. "배고파" at 13:34 from home, the next Class at 15:30 in 302동. 301동식당 and 302동식당 serve lunch until 13:30.

- The planner took a Restaurant's closing as the end of the meal there. At 13:05, 302동식당 "closed" at 13:30, so the plan had 25 minutes and fell behind 3식당 (ticket 45).
- A Restaurant's closing is when the food is last served. One who arrives at 13:25 is served and may stay after 13:30. One who arrives at 13:34 is not served at all, yet the old rule offered nothing else either way.
- The words said "13:30에 닫아" and "13:30까지" as if the meal ended there.

## What to build

1. **Arrival, not the meal, is bounded by the serving end.** A Restaurant fits when everyone can be there at or before its serving end less 10 minutes (`SERVING_CUTOFF_SECONDS`, `travel/judgement-constants.ts`). The margin is for food or a queue running out.
2. **The meal's own end.** It is the earliest of:
   - when someone must leave for their next item, less the way on;
   - the end the User set on the bar (`window.until`);
   - an hour after the start (`LONGEST_MEAL_SECONDS`).

   "식사 N분", the 30-minute tier, "같이 먹으면 식사가 M분 줄어요" and the leave-by times all follow from it. Since a meal now lasts an hour at most, the span is always said in minutes.

3. **Arriving inside the last 10 minutes.** It is not offered as a Plan. It appears among the dropped places with "14:00에 배식이 끝나요". At a Place the User fixed, the lines are when serving ends and who arrives last, and when ("13:55에 배식이 끝나요", "나는 13:48에 도착해요").
4. **Serving, not closing, in the words:**
   - the dropped reason and the line naming a nearer Restaurant: "…에 배식이 끝나요";
   - the menu line "· 14:30까지 배식", and 근거 "메뉴와 배식 시각";
   - `fellBack` keeps only plans that end because someone must leave ("…13:30엔 나서야 해서 25분뿐이에요"), never "13:30에 닫아 25분뿐이에요";
   - the meal rule: a plan's end is when someone must leave, the end the User set, or an hour after its start. Never give a Restaurant's hours as when the meal is, and never say a meal ends because the Restaurant closes;
   - the menu Lookup's 근거 says "식사는 한 시간으로 잡았어요" when the hour ends the meal.
5. **Unchanged.** The hours answers (`restaurantHours`) still say the serving hours as they are.

## Left out

- `free-time/meal-fit.ts`, the text chat's older free-time meals, still ends a meal at the closing. The frozen P4 eval suite labels its `eatingMinutes`, and it serves only old apps. It is a follow-up if wanted.
- With Friends, the order sums everyone's walking (ticket 40), while `order` speaks of the User's next item alone (ticket 45). That was so before this ticket. It is a follow-up if wanted.

## Case table

The clock is pinned on Tuesday 2026-11-17. The places are 301동식당 and 302동식당 serving until 13:30, 3식당 until 14:00, and 학생회관식당 until 14:30, on the seed's walking table.

| Row | Case                                                                 | Result                                                                                          | Where tested                                                               |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 13:34, no position, next Class 15:30 in 302동 (the report)           | 301동식당 and 302동식당 dropped, "13:30에 배식이 끝나요"; 3식당 first by the walk on to 302동   | `order-words.unit.test.ts`                                                 |
| 2   | 13:05, the same day                                                  | 302동식당, 301동식당, 3식당, 학생회관식당, each "식사 60분"; no `fellBack`                      | the same file                                                              |
| 3   | 13:05 with 민수, whose Class at 학생회관 starts at 13:50             | 302동식당 last with 28 minutes; `fellBack` "302동식당은 13:33엔 나서야 해서 28분뿐이에요"       | the same file                                                              |
| 4   | Board n12, 13:47, arriving 13:48 at 학생회관식당 serving until 14:00 | fits (by 13:50), "식사 60분"                                                                    | `meal-answer-unmet.unit.test.ts`; `meal-answer-unmet-reasons.unit.test.ts` |
| 5   | The same, serving until 13:55                                        | dropped, "13:55에 배식이 끝나요"; fixed there: "13:55에 배식이 끝나요", "나는 13:48에 도착해요" | the same files                                                             |
| 6   | The start the User set at 14:00, serving until 14:05                 | dropped, "14:05에 배식이 끝나요"                                                                | `meal-answer-unmet.unit.test.ts`                                           |
| 7   | A Friend free from 14:25, the lunch band ending 14:30, no hours read | no Plan: "14:30에 배식이 끝나요", "하은은 14:25에 시간이 돼요"                                  | `meal-answer-fixed-place.unit.test.ts`                                     |
| 8   | Nothing after the meal                                               | an hour, "식사 60분"; the menu Lookup's 근거 "식사는 한 시간으로 잡았어요"                      | `meal-answer.unit.test.ts`; `menu-lookup.unit.test.ts`                     |
| 9   | The end the User set before the leave-by                             | "12:40까지로 정했어요"                                                                          | `meal-answer-fixed-place.unit.test.ts`                                     |
| 10  | Serving ends at 14:30 before the end set at 15:00                    | an hour, no line about serving, no until chip                                                   | `meal-answer-conditions.unit.test.ts`                                      |

## Acceptance criteria

- [x] Rows 1 to 10, each in a test at a pinned clock.
- [x] The words above say serving, and `fellBack` names only plans someone must leave.
- [ ] Eval: no case added, none run. The eval world reads no Restaurant hours, and the run needs the team's model key, which this worktree does not have.
- [x] Lint, format and types of the main server pass.

## Comments
