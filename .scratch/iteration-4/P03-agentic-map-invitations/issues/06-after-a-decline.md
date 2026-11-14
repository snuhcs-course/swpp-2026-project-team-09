# 06: After a decline, the Leader is offered a better Plan

Parent: [P03 spec](../spec.md) ("After a decline")
Status: ready-for-agent
Blocked by: 01, 05

## What to build

After a Friend declines, the Leader's app asks the main server whether the people left have a better Plan than the Quest as it stands. When they do, the Leader can change the Quest to it with one request: the title and the Sub Quests are replaced, and everyone of the Quest is told.

## Acceptance criteria

- [ ] `GET /plans/:questId/better` answers `{ current, better, input }` to the Leader only. The people are the Leader, the other Holders, and the invited who have not answered; the day and the meal are those of the Quest's destination step.
- [ ] The Quest's own Sub Quests are left out of everyone's day in that calculation, so that the Quest does not stand in its own way.
- [ ] `better` is the first Plan when it is at another Place or starts at another time and has more minutes together than the Quest as it stands, and null otherwise.
- [ ] `PUT /plans/:questId` with `{ input, planId, startAt, location }` changes the Quest to that Plan, checked by recalculation as the making is. The Holders and the waiting invitations stay.
- [ ] Every Holder and every invited User is told with `plan-changed` and `{ questId }`, and with `quests-changed`.
- [ ] Integration tests on the worked example with both Friends: 지은 declines, the better Plan is 302동식당 from 12:15 with 28 minutes against 22, the change, its signals, and no better Plan once the Quest stands at it.
- [ ] The app's contract has both replies, the client has `getBetterPlan(questId)` and `changePlanQuest(questId, making)`, and its mock answers from stored copies of real replies.

## Comments
