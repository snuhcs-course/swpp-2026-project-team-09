# 01: A Plan becomes a Quest with its invitations

Parent: [P03 spec](../spec.md) ("A Plan becomes a Quest", "The app")
Status: ready-for-agent
Blocked by: none

## What to build

The asker presses "이대로 초대" on a Plan, and the app sends the answer's conditions and the Plan's id to the main server. The server calculates the Plan again, makes a Quest with the Plan's title and Sub Quests, invites every Friend of the Plan, and answers with the Quest and the invitations. The app has the typed call and a stored copy of a real reply.

## Acceptance criteria

- [x] `POST /plans` takes `{ input, planId, startAt, location }` with an `Idempotency-Key` and answers 201 with `{ quest, invitations }`.
- [x] The Plan is calculated again through the service the Assistant's tool and the recalculation call. Nothing of a Plan but its id and its start is read from the request.
- [x] The Quest has the Plan's title, the asker as its Leader and only Holder, the Join Policy Closed, no Board, and capacity 4 or the number of people of the Plan when that is more.
- [x] The Sub Quests are the Plan's, in the Plan's order as a Holder reads the Quest, each at its Place. Each ends where the next starts, and the last ends at the Plan's end.
- [x] Every other person of the Plan has a waiting invitation, created by the service that creates invitations, in the transaction that makes the Quest. The invitee lists it, and both are told with `quests-changed`.
- [x] Refused with 409 `PLAN_CHANGED` when the recalculation has no Plan of that id or the Plan starts at another time; with 400 `PLAN_ALONE` for a Plan with no Friend; and with 400 as a recalculation is.
- [x] A repeat with the same key makes one Quest.
- [x] Integration tests over the started server on the meal Plan's stage: the worked example with 민수, with both Friends, the refusals, and the repeat.
- [x] The app declares the contract, has `makePlanQuest(making, idempotencyKey)` with a check of the reply, and its mock answers from a stored copy of the real reply for the worked example with 민수.

## Comments

### Decisions (2026-11-14)

1. **A Plan alone is refused before anything is planned.** A body that names one person gets 400 `PLAN_ALONE`.
2. **The order of the refusals** is: the body's shape, `PLAN_ALONE`, a date out of reach, the recalculation's 400s (the asker first, a person who is no Friend, an unknown Place), then `PLAN_CHANGED`.
3. **A start is compared as an instant**, so `12:15:00+09:00` and `03:15:00Z` name the same start.
4. **A Sub Quest of a Plan has only its Place of the list**: no point and no label of its own, as a Sub Quest a Holder sets on a Place of the list.
5. **The Sub Quests' creation times are set a millisecond apart from the time on the server**, since the rows of one transaction share the database's `now()` and a Quest's Sub Quests are read in the order they were created.
6. **`InvitationsService` gains `create` and `announce`.** `create` checks the Friend and an invitation already waiting and writes the row in the caller's transaction; `announce` sends `quests-changed` and the push after the commit. `invite()` locks the Quest and refuses a Holder first, then calls both, so it does and refuses what it did.
7. **The mock's copy** is the real reply of `POST /plans` for 302동식당, made over the test stage on Tuesday 2026-11-17 at 11:50 with 유상 and 민수. The asker's and 민수's ids were replaced by those of the answer in `meal-answer.ts`; the Quest's, the Sub Quest's, and the invitation's ids, and the Quest's `createdAt` (the database's clock at the run, not the stage's), are as the server gave them.
