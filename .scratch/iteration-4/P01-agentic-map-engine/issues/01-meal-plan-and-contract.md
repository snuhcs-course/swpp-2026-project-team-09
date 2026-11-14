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
