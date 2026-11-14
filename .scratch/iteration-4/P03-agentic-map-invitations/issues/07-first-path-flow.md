# 07: Steps 4 to 7 of the first path, as a flow across the servers

Parent: [P03 spec](../spec.md) ("Testing Decisions": the first path's steps 4 to 7)
Status: ready-for-agent
Blocked by: 01, 02, 03

## What to build

One flow test drives steps 4 to 7 of the first path's check through the servers' public interfaces, as two apps would: the Leader makes a Quest from a Plan, the invitation is in the invited Friend's list, the Friend opens it and reads their own way, and the acceptance reaches the Leader's socket. It runs with the other flows, so the check is repeated on every pull request.

## Acceptance criteria

- [x] `flow-tests/test/plan-invitation.e2e.test.ts` runs against the started main, socket, and worker servers, with no test double but the stack's own stand-ins for outside services.
- [x] It runs the same at any hour: the Plan is tomorrow's lunch, from the menus the worker collects, for two Friends who each have a Class before it. The answer is the recalculation's, which asks no model.
- [x] Step 4: the Quest has the Plan's title and steps, ends at the Plan's end, and lists the Leader as accepted and the Friend as invited.
- [x] Step 5: the Friend is told and lists the invitation.
- [x] Step 6: the Friend's card has a way with an origin from the Timetable and a time to set out, and its scene holds nobody but the Friend. The Leader gets 404.
- [x] Step 7: the Leader's socket receives `invitation-accepted` with the Quest and the Friend, and the Quest then lists both as accepted.
- [x] The flows' README lists it.
- [x] The app's stored copy of the reply to `POST /plans` lists its members, as the main server sends them once tickets 01 and 03 are together.

## Comments
