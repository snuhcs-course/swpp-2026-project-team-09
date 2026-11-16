# 14: Conditions that cannot be met give the nearest plan and say what was relaxed

Parent: [P02 spec](../spec.md); the design's row 8, boards n10, n11, n11b, n12, n23, principle 3
Status: ready-for-agent
Blocked by: package A's review of the seam (`row-8-seams.md`, ticket 14); #265 (P02-09 changes `use-shown-answer.ts` and `plan-card.tsx`); ticket 16 for n12

## What to build

- **n10, alone, the first stretch too short.** The plan moves to the next stretch and says so: "수업까지 10분이라 식사는 어려워요" / "수업 끝나고 **{시각}** {식당}", the until chip marked relaxed, and the basis "5분이 안 되는 길이라 나설 알림은 없어요" for a walk under 5 minutes.
- **n11, together, no shared time now.** "지금" is a condition (`window.now`), and with it no stretch fits now: no pick, the lines "지금은 셋이 먹을 때가 없어요" / "{지은}이 **12:00**에 다시 수업이에요", and buttons that relax one condition each: "{지은} 빼고 보기" and "{13:00} 이후".
- **n11b, the relaxed plan.** "13:00 이후" recalculates with `window.from`; the lines "**13:00 자하연식당** · 셋이 55분" / "지금 대신 13:00으로 미뤘어요", a from chip "13:00 이후" marked relaxed, and "처음으로". Pressing the relaxed chip or "처음으로" goes back to n11.
- **n12, a place about to close.** A Restaurant that closes before the asker can eat is faded with "14:00 닫아요" and the lines name it: "**자하연식당** · 13:50 도착" / "학생회관식당은 14:00에 닫아요".
- **n23, a Friend whose position is unknown.** Words only: "**301동식당** · {하은}의 길은 빼고 정했어요" / "{하은}은 지금 어디 있는지 몰라요", the basis "{하은}은 시간표만 보여요. 10:45에 수업이 끝나 지금 자리는 몰라요" and "{하은}의 길은 {하은}의 초대장에 떠요. 나에게는 수락과 거절만 와요", open at first.

## Acceptance criteria

- [x] Each board's lines, chips, and buttons as above, from the server's answer; the relaxed mark on `ConditionChip`; `noPlan.relax` for n11.
- [x] The relax buttons and the relaxed chip use the existing recalculation (`withoutPerson`, `withBound`), without the model.
- [x] Tests on both sides with the worked examples; the real server's replies kept as the app's mock copies.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- This changes how package A's engine plans (`gathering.ts` takes the next stretch silently today) and its answer words. It is built last, after package A has seen the seam.
- Naming who is busy (n11's "{지은}이 **12:00**에 다시 수업이에요") holds only between Friends, and only for what the lowest Friend level shows: the Timetable's building and end. Someone who is not the asker's Friend (a candidate, another party's member) is never named or timed. `plan-tools.ts:161` changes only that far.
- Decision to review: n11's time chip "지금" relaxes the plan when pressed, as the board's play shows, while P02's rule says the time chip focuses the band; "지금" is not a time on the band, so it relaxes.
- n10's "16:48" is an example value: the next meal is dinner, whose window opens at 17:00, unless the Restaurant's own hours (ticket 16) open earlier.

### Decisions (2026-11-16)

1. **지금.** `MealInput.window.now` (optional, both sides) is set by the model for 지금 and kept in `[Plan on screen: …]`. With it and no `from`, a plan lies in a stretch everyone shares that starts at most 30 minutes after now (`NOW_MINUTES`); a later stretch is never taken silently. The 30 minutes let board n11's "지은 빼고 보기" plan now with 민수, whose Class ends at 12:15. With `from` as well, 지금 was eased to it: the plan is calculated from `from` as any fixed start, and the answer says so.
2. **What n11 offers.** `noPlan.relax` holds a `without` button for each Friend whose leaving out lets the rest eat now, in the plan's order, then one `from` button: the start of the next stretch everyone shares with a Restaurant that fits, rounded up to the half hour as the time band marks it (12:50 → "13:00 이후", as the board shows), unless that leaves less than a meal. `noPlan.reason` stays `no-shared-time`; the model is told only that there is no time now and that the app offers buttons.
3. **Who is named.** n11's second line names the first Friend to leave out, by their Class only: "{지은}이 **12:00**에 다시 수업이에요" for a Class ahead ("다시" after an earlier Class that day), "{민수}는 **12:15**까지 수업이에요" during one. A Friend kept by a Quest's item is not named and the line is left out. Alone, the asker's own item is said without a name. The rule line in `plan-tools.ts` lets the model name only a Friend of the plan, and only when their Class ends or starts.
4. **The time chip.** When nothing fits 지금, a from chip "지금" stands in place of the until chip; eased, a from chip "{from} 이후" marked `relaxed` does. A plan met now keeps its origin and until chips (n23's). n11's "지금" chip takes the answer's later start when pressed (the play board), and the relaxed chip and "처음으로" clear `from` and keep `now`, each through the recalculation. "처음으로" shows only for an eased start, as on the board; after "지은 빼고 보기" a Friend comes back with "＋ 같이". n10's relaxed until chip still focuses the band, since nothing in the input can undo it.
5. **n10.** The asker alone, with no 지금 and no window fixed, is free now only until an item, and no Restaurant, whatever its hours, fits before it: the plan of the gathering (the next stretch) gets the lines "{수업}까지 {N}분이라 식사는 어려워요" / "{수업} 끝나고 **{시각}** {식당}" on every Plan, the item's until chip marked `relaxed`, and, for a walk under 5 minutes, "5분이 안 되는 길이라 나설 알림은 없어요" in the basis.
6. **Hours.** `MealPlanService` reads `RestaurantHours.hoursOf` for each candidate. One with hours has them as its window, narrowed by the fixed start and end; one without has the fixed meal window; the gathering's window holds them all. With no hours read nothing changes. A Restaurant whose closing ends the stay before a meal fits is dropped with "{HH:MM} 닫아요", which covers both arriving after it closes and arriving too close to it (the board's 13:52 arrival and 14:00 closing).
7. **n12's lines** name the nearest Restaurant that closes first, by the asker's walk, only for the asker alone and only when it is nearer than the pick. The board's own times (학생회관식당 at 13:52, 자하연식당 at 13:50) put the closed one farther, so the worked example sets out from 24동, a minute from 학생회관식당.
8. **n23.** With a Friend whose position is unknown and no window fixed, every Plan says "**{식당}** · {하은}의 길은 빼고 정했어요" / "{하은}은 지금 어디 있는지 몰라요". The basis says "{하은}은 시간표만 보여요. {10:45}에 수업이 끝나 지금 자리는 몰라요" only at the timetable level (the Friend view's level is now on the answer's person), else the line of before, then "{하은}의 길은 {하은}의 초대장에 떠요. 나에게는 수락과 거절만 와요". Meets keep their words. The app opens the basis at first, and on browsing, for a Plan with such a Friend. The person chip is not marked.
9. **Where the code is.** The calculation is in `gathering/unmet-plans.ts` (with the asker's meal alone, so that `MealPlanService.plan` stays within its length), the words in `gathering/unmet-words.ts`, `RelaxOffer` and the meal's window schema in `refusals/relax.dto.ts`; package A's files take one line each where the words meet them. `meal-answer.ts` is at its line limit, so P02-13's first-Plan lines and the nearest-first basis line are now reached through `unmetLines` and `unmetBasis`, unchanged. `withBound` takes null to clear a bound. On the app, the types are in `api/relax-types.ts`, their check in `api/server/relax-answers.ts`, the changes of the conditions in `features/assistant/relaxed-plan.ts`, and the buttons in `answer/relax-buttons.tsx`.
10. **Tests and the mock.** The integration tests' stage reads no hours unless a test gives them, since the hours kept in the shared test database belong to no day and would reach every plan on a weekday. Board n11's and n11b's answers were printed once from the endpoint with the scripted model and kept as `mobile/src/api/mock/data/meal-answer-not-now.json` and `meal-answer-eased.json`; the mock answers "민수, 지은이랑 지금 점심" with the first, and a recalculation of a meal 지금 of three, or one eased from it, with the matching copy. On the seed's walking table the eased plan picks 학생회관식당 (59 minutes), a minute from the asker's 14:00 Class in 24동, not the board's 자하연식당.
11. **The real model** (`anthropic/claude-haiku-5.5`) set `now: true` for "민수, 지은이랑 지금 점심" in the first round, after resolving both Friends; no rule change was needed.
12. **Not built here.** n12's "지금" chip shows only when the model sets 지금, not for "배고파"; n11's faded "학생회관식당 · 지은은 10분뿐이에요" on the map, and "여기로" (package D's), are not built.
13. **On today's Main.** With the meal taken by the clock (#309), `planMeal` answers `none` with the meal as well, and only the ordinary lines open with the meal: the lines of boards n10, n11b, n12, and n23 stay the boards', as P02-13's do. The drops keep each person's part (#299) beside the closing time. `answer.dto.ts` passed its line limit with `window.now` and `noPlan.relax`, so the plan inputs and their schemas moved to `dto/plan-input.dto.ts`, and `answer.dto.ts` exports them again under the same names.
14. **What n11 and n11b name.** n11's second line names an item only when it cuts the stretch a meal by `NOW_MINUTES` would need (the current item, or the next one starting before a 15-minute meal begun by then would end), and says "{점심/저녁}은 {HH:MM}부터예요" instead when no Restaurant serves the meal by then. n11b's basis names an item only when it ended after the meal was first served, else says when the meal is first served if that was after the time asked.
15. **Measured by each Restaurant's hours.** A fit and a drop carry their Restaurant's own window when hours were read, and a Plan's missed line and a fixed Place's unfit lines measure by it: a Restaurant that opens after the fixed start says "{식당}은 {HH:MM}에 열어요" and nobody is late, and one that closes first says "{식당}은 {HH:MM}에 닫아요" in place of the meal's end.

### Agent usage (2026-11-16)

Two implementing subagents (Opus 5.5): the first build on 2026-11-15 and its port onto `4.0/Main` after #309 and #302 on 2026-11-16. This session's review and the pull request are counted under P03 ticket 07.

- Agent time: about 118 minutes (82 and 36), an estimate from the transcripts' timestamps; it includes waits for the Mac's shared check slots and the heavy lock.
- Tokens: output 275,913; input 92,190,908, of which 91,473,706 were cache reads, 716,586 cache writes, and 616 uncached. Without cache reads: 993,115.
