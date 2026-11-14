# 01: A meal's plan, computed for real, in the shared contract

Parent: [P01 spec](../spec.md) ("The contract", "The gathering calculation", "The Assistant")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User whose app says it can draw an answer asks "배고파, 민수랑 같이" and the Assistant's reply carries an answer: the Restaurants in the order of the time everyone is together, each with its start and end, its merging point, every person's way, its map scene, its time band, its two lines and its basis. The server computes all of it from the Timetables, the location the asker may see and the walking table. The app and the server declare the contract with the same shape, and the app's mock data holds a copy of a real answer.

## Acceptance criteria

- [ ] **The contract.** The request context, `PlanInput`, `AnswerReply`, `Plan`, `MapScene` and `TimeBand` are declared in the app's Assistant types and in the main server's Assistant DTOs, with the shapes of the spec. The server checks a request context against a schema and refuses one of another shape.
- [ ] **The calculation** is a pure module, with unit tests, that follows the spec's rules: where a person sets out from, whole minutes for each leg, the merging point, leave-by, at least 15 minutes together, the order, and the dropped places.
- [ ] **The worked example** of the design's section 6.1 (Tuesday 11:50) passes on the seed's walking table:
  - alone: the building 301 cafeteria 11:50 to 12:45 (55 minutes), the Student Center cafeteria 12:05 to 12:59 (54), Cafeteria 3 12:03 to 12:54 (51) and the building 302 cafeteria 11:53 to 12:43 (50);
  - with the Friend in building 302: the building 301 cafeteria 12:18 to 12:45 (27), the Student Center cafeteria 12:33 to 12:59 (26) with the two meeting in front of building 301 at 12:18, and Cafeteria 3 12:31 to 12:54 (23);
  - with the Friend in Doosan Humanities Hall: the Jahayeon cafeteria 12:18 to 12:55 (37), the Student Center cafeteria 12:20 to 12:55 (35) and Cafeteria 3 12:25 to 12:50 (25), and the building 301 cafeteria dropped at 13 minutes;
  - with both: the Student Center cafeteria 12:33 to 12:55 (22) first, with the meeting at 12:18, then the Jahayeon cafeteria 12:35 to 12:55 (20).
- [ ] **The boundaries** have unit tests: nobody can be on time, no shared time, a Friend seen only through the Timetable (at the end of a Class, 15 minutes after it, and 16), a Friend whose position is unknown, two candidates that tie, a walk of 60 and of 61 seconds, 15 and 14 minutes together, and a detour of one and of two minutes.
- [ ] **Through the Assistant.** With the `answer` capability, the chat has a tool that plans a meal in place of the Restaurant card tools, and the reply's `answer` holds what the tool planned. Without the capability the chat and its reply are as before, with `answer` null.
- [ ] **What the model is given**: Restaurant names, clock times and minutes. No coordinates, course names or rooms.
- [ ] **A Friend's position** is used only when the asker's map shows it: an integration test with a Friend who shares and one who does not.
- [ ] **Integration tests** at the Assistant's endpoint cover the worked example for two and for three people, an app without the capability, a context of another shape, the asker's location from the context, and a day without menus.
- [ ] **The app.** `askAssistant` can send a request context, which also says the app draws answers, and returns the reply's `answer`. The mock client answers "배고파" asked with a context from a copy of a real answer taken from the server. Unit tests check that the copy passes the app's check of a reply.
- [ ] The main server's README says what the request context and the answer are.
- [ ] Each changed source file has its AI-generated row, lint, format, type checks and the touched tests pass in the main server and in the app, and no native file of the app changed.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The answer rides on the existing reply.** `POST /assistant/messages` gains an optional `context` and its reply an `answer`, null when there is none. An app that sends the `answer` capability gets the meal planned on the map; any other app gets the Restaurant cards as before. In the app, giving `askAssistant` a request context is what sends the capability.
2. **The server words the answer.** The chips, the two lines, the basis, the flags, a dropped place's reason, and the party's title and steps are written by the server from the calculation, so a recalculation reads like the first answer. The model's own sentence stays in the reply's `text`.
3. **The arithmetic is the design's.** Whole minutes, each leg rounded up, no further margin before a Class, and no rounding of the start. The Restaurant cards keep their own rules (a one-minute margin, a start rounded up to five minutes), frozen with their evaluation.
4. **The merging point** is the asker's starting Place, when going by it costs the Friend at most one minute. The Friend's starting Place is never one, and two Friends never merge without the asker.
5. **Everyone sets out as late as still has them there at the start**, and the meeting's time follows from the start. With the start held back by a later arrival, the two who merge meet later, not earlier.
6. **Where a person sets out from**: the Place of the item they are busy with until they are ready; when free now, the location the asker may see; without one, the Place of an item that ended at most 15 minutes ago; otherwise unknown, and then no walk is counted for them.
7. **Only walking is counted.** The shuttle joins the Travel Time in a later ticket.
8. **The order** is the longest time together, then the earlier start, then the Restaurant's name.
9. **The meal's window** is the one the Restaurant cards use (lunch 11:00 to 14:30, dinner 17:00 to 19:30). A Restaurant's own closing time is not in the collected data.
10. **A Friend's position** is read in one private method of the meal plan's service, through what the asker's map shows today (both Master Switches and the friendship's switch on). Ticket 04 moves that one place to the Friend view.
11. **`PlanInput`'s window, fixed place and constraints** are in the contract from this ticket and are honoured from ticket 02. The Assistant's tool sends them empty.
12. **A plan's id** is its Restaurant's name, which is unique within an answer.
13. **A building is called** by its number with 동 when it has one, and by its Place's name otherwise, as the app does. Doosan Humanities Hall therefore reads 8동.
14. The spec and the tickets of P01 land with this ticket's pull request.

### What differs from the design's worked example (2026-11-14)

Every walking time of the design's section 6.1 equals the seed's walking table, rounded up, and every time and count of minutes the design gives is reproduced. Three things differ, and none was bent to fit.

- **With one Friend, the design names the building 301 cafeteria first** (27 minutes from 12:18). The calculation finds the building 302 cafeteria ahead of it: the asker walks 3 minutes to the Friend's building, the meal starts when the Friend's Class ends at 12:15, and the asker leaves at 12:43 for the 17-minute walk to building 24, which gives 28 minutes. The design's table did not list that cafeteria.
- **With both Friends, the design lists two candidates.** The calculation finds a third after them, Cafeteria 3, from 12:31 to 12:50 (19 minutes).
- **Alone, the design lists four candidates.** With the Jahayeon cafeteria open the calculation finds a fifth, from 12:07 to 12:55 (48 minutes).

The answer "meet in front of building 301 at 12:18, eat at the Student Center cafeteria from 12:33 to 12:55" is the design's answer for the asker with both Friends. With the one Friend in building 302 the Student Center cafeteria is the third candidate, from 12:33 to 12:59, with the same meeting.

Counted with the shuttle, the Friend's own way from building 302 to the Jahayeon cafeteria is 16 minutes against 19 on foot, more than the three minutes the shuttle must save, so the order of the example with both Friends can change when the shuttle joins the calculation.
