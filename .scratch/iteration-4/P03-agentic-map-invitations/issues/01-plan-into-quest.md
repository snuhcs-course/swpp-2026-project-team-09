# 01: A Plan becomes a Quest with its invitations

Parent: [P03 spec](../spec.md) ("A Plan becomes a Quest", "The app")
Status: ready-for-agent
Blocked by: none

## What to build

The asker presses "이대로 초대" on a Plan, and the app sends the answer's conditions and the Plan's id to the main server. The server calculates the Plan again, makes a Quest with the Plan's title and Sub Quests, invites every Friend of the Plan, and answers with the Quest and the invitations. The app has the typed call and a stored copy of a real reply.

## Acceptance criteria

- [ ] `POST /plans` takes `{ input, planId, startAt, location }` with an `Idempotency-Key` and answers 201 with `{ quest, invitations }`.
- [ ] The Plan is calculated again through the service the Assistant's tool and the recalculation call. Nothing of a Plan but its id and its start is read from the request.
- [ ] The Quest has the Plan's title, the asker as its Leader and only Holder, the Join Policy Closed, no Board, and capacity 4 or the number of people of the Plan when that is more.
- [ ] The Sub Quests are the Plan's, in the Plan's order as a Holder reads the Quest, each at its Place. Each ends where the next starts, and the last ends at the Plan's end.
- [ ] Every other person of the Plan has a waiting invitation, created by the service that creates invitations, in the transaction that makes the Quest. The invitee lists it, and both are told with `quests-changed`.
- [ ] Refused with 409 `PLAN_CHANGED` when the recalculation has no Plan of that id or the Plan starts at another time; with 400 `PLAN_ALONE` for a Plan with no Friend; and with 400 as a recalculation is.
- [ ] A repeat with the same key makes one Quest.
- [ ] Integration tests over the started server on the meal Plan's stage: the worked example with 민수, with both Friends, the refusals, and the repeat.
- [ ] The app declares the contract, has `makePlanQuest(making, idempotencyKey)` with a check of the reply, and its mock answers from a stored copy of the real reply for the worked example with 민수.

## Comments
