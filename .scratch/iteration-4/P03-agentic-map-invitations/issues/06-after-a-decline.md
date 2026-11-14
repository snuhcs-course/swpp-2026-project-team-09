# 06: After a decline, the Leader is offered a better Plan

Parent: [P03 spec](../spec.md) ("After a decline")
Status: ready-for-agent
Blocked by: 01, 02

## What to build

After a Friend declines, the Leader's app asks the main server whether the people left have a better Plan than the Quest as it stands. When they do, the Leader can change the Quest to it with one request: the title and the Sub Quests are replaced, and everyone of the Quest is told.

## Acceptance criteria

- [x] `GET /plans/:questId/better` answers `{ current, better, input }` to the Leader only. The people are the Leader, the other Holders, and the invited who have not answered; the day and the meal are those of the Quest's destination step.
- [x] The Quest's own Sub Quests are left out of everyone's day in that calculation, so that the Quest does not stand in its own way.
- [x] `better` is the first Plan when it is at another Place or starts at another time and has more minutes together than the Quest as it stands, and null otherwise.
- [x] `PUT /plans/:questId` with `{ input, planId, startAt, location }` changes the Quest to that Plan, checked by recalculation as the making is. The Holders and the waiting invitations stay.
- [x] Every Holder and every invited User is told with `plan-changed` and `{ questId }`, and with `quests-changed`.
- [x] Integration tests on the worked example with both Friends: 지은 declines, the better Plan is 302동식당 from 12:15 with 28 minutes against 22, the change, its signals, and no better Plan once the Quest stands at it.
- [x] The app's contract has both replies, the client has `getBetterPlan(questId)` and `changePlanQuest(questId, making)`, and its mock answers from stored copies of real replies.

## Comments

### Decisions (2026-11-14)

- `GET /plans/:questId/better` and `PUT /plans/:questId` live in their own `BetterPlanController` and `BetterPlanService` in the plans module. The Leader check and the lock are `LeaderService`'s, now exported by the Quests module.
- The meal is the one whose serving window holds the destination step's start. A Quest without a destination step, whose destination step has no end, or whose step lies in no meal's window answers `{ current: null, better: null, input: null }`.
- `current.togetherMinutes` is the whole minutes from the destination step's start to its end.
- A date more than a week ahead, or a recalculation refused for the people (a Friend no longer a Friend), answers no better Plan with `current` and `input` still given, not an error.
- The people of the input are checked twice: before planning, and again once the Quest is locked, so that a Holder or an invitation that changed in between refuses the change with 400 `PLAN_PEOPLE_CHANGED`. The Leader comes first; the rest may come in any order.
- A Quest for a Global Event is refused at `PUT` with 409 `ATTENDING_SUB_QUEST`, the code the Sub Quest routes use. Its `better` answers no better Plan, since its attending step has no Place of the list.
- The making and the change share `PlansService.replanned` (plan again, refuse a date out of reach, find the Plan by id and start) and `subQuestsOf`, and both write the Sub Quests in order through `inOrder` of `quests/sub-quest-order.ts`; the change replaces the Quest's title and Sub Quests in one update. The making now refuses `PLAN_ALONE` before it plans, not after: both refusals are 400s, and a Plan alone is no longer planned for nothing.
- `plan-changed` and `quests-changed` go once to the Leader, the other Holders, and every User whose invitation waits, read inside the transaction.
- The app's mock answers `getBetterPlan` and `changePlanQuest` from the main server's real replies for the worked example after 지은 declined, whatever Quest is asked about.
