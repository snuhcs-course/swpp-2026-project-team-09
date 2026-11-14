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

### Decisions (2026-11-14)

- The flow plans tomorrow's lunch, not today's, so that it passes at any hour: the worker collects the menus of a week, and a Plan needs a meal still to be served.
- The steps are checked by what a Plan and a Quest must share (the title, the steps' titles, the end, who is invited), not by a Restaurant's name: the stack's menus are a saved page, and which Restaurant comes first is the engine's own tests' matter.
- It runs in CI's `flow-tests` job with the other flows.

### Agent usage (2026-11-15)

The session itself (Fable 5.2), for the whole package: the spec and the tickets, the review of tickets 01 to 06, their pull requests and the merges of the iteration branch into them, and this flow. Up to the opening of the last pull request. The six implementing subagents are counted under their own tickets (04 in its own pull request).

- Agent time: about 146 minutes, an estimate from the transcript's timestamps; it includes waits for the machine's shared test lock.
- Tokens: output 246,235; input 92,686,315, of which 92,005,098 were cache reads, 680,829 cache writes, and 388 uncached. Without cache reads: 927,452.
