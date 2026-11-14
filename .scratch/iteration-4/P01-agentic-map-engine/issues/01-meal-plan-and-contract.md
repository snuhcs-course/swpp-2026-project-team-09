# 01: A meal's Plan, computed for real, in the shared contract

Parent: [P01 spec](../spec.md) ("The contract", "The gathering calculation", "The wording", "The Assistant")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User whose app says it can draw an answer asks "배고파, 민수랑 같이" and the Assistant's reply carries an answer: the Restaurants in the order of the time everyone is together, each with its start and end, its Merging Point, every person's part, its map scene, its time band, its two lines, and its basis. The server computes all of it from the Timetables, the location the asker may see, and the walking table. The app and the server declare the contract with the same shape, and the app's mock data holds a copy of a real answer.

## Acceptance criteria

- [x] **The contract.** The request context, `PlanInput`, `AnswerReply`, `Plan`, `MapScene`, and `TimeBand` are declared in the app's Assistant types and in the main server's Assistant DTOs, with the shapes of the spec. The server checks a request context against a schema and refuses one of another shape.
- [x] **The calculation** is a pure module, with unit tests, that follows the spec's rules: where a person sets out from, whole minutes for each leg, the Merging Point, leave-by, at least 15 minutes together, setting out, the order, and the dropped Restaurants.
- [x] **The worked example** of the design's section 6.1 (Tuesday 11:50) passes on the seed's walking table. The asker's Class in 301동 ends at 11:50 and the next is at 13:00 in 24동; 민수's Class in 302동 ends at 12:15; 지은's Class in 8동 ends at 12:15 and her next is at 13:00 in 8동.
  - Alone: 301동식당 11:50 to 12:45 (55 minutes), 학생회관식당 12:05 to 12:59 (54), 3식당 12:03 to 12:54 (51), and 302동식당 11:53 to 12:43 (50).
  - With 민수: 301동식당 12:18 to 12:45 (27), 학생회관식당 12:33 to 12:59 (26) with the two meeting in front of 301동 at 12:18, and 3식당 12:31 to 12:54 (23).
  - With 지은: 자하연식당 12:18 to 12:55 (37), 학생회관식당 12:20 to 12:55 (35), and 3식당 12:25 to 12:50 (25), and 301동식당 dropped at 13 minutes.
  - With both: 학생회관식당 12:33 to 12:55 (22) first, with the meeting at 12:18, then 자하연식당 12:35 to 12:55 (20).
- [x] **The boundaries** have unit tests: nobody can be on time, no shared time, a Friend seen only through the Timetable (at the end of a Class, 15 minutes after it, and 16), a Friend whose position is unknown, two candidates that tie, a walk of 60 and of 61 seconds, 15 and 14 minutes together, and a detour of one and of two minutes.
- [x] **Through the Assistant.** With the `answer` capability, the chat has a tool that plans a meal in place of the Restaurant card tools, and the reply's `answer` holds what the tool planned. Without the capability the chat and its reply are as before, with `answer` null.
- [x] **What the model is given**: Restaurant names, clock times, and minutes. No coordinates, course names, or rooms.
- [x] **A Friend's position** is used only when the asker's map shows it: an integration test with a Friend who shares and one who does not.
- [x] **Integration tests** at the Assistant's endpoint cover the worked example for two and for three people, an app without the capability, a context of another shape, the asker's location from the context, and a day without menus.
- [x] **The app.** `askAssistant` can send a request context, which also says the app draws answers, and returns the reply's `answer`. The mock client answers "배고파" asked with a context from a copy of a real answer taken from the server. Unit tests check that the copy passes the app's check of a reply.
- [x] The main server's README says what the request context and the answer are.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in the main server and in the app; and no native file of the app changed.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The answer rides on the existing reply.** `POST /assistant/messages` gains an optional `context` and its reply an `answer`, null when there is none. An app that sends the `answer` capability gets the meal planned on the map; any other app gets the Restaurant cards as before. In the app, giving `askAssistant` a request context is what sends the capability.
2. **The server words the answer.** The chips, the two lines, the basis, the flags, a dropped Restaurant's reason, and the title and Sub Quests of the Quest a Plan becomes are written by the server from the calculation, so a recalculation reads like the first answer. The model's own sentence stays in the reply's `text`, and the prompt keeps it to one sentence about the first Plan.
3. **The arithmetic is the design's.** Whole minutes, each leg rounded up, no further margin before a Class, and no rounding of the start. The Restaurant cards keep their own rules (a one-minute margin, a start rounded up to five minutes), frozen with their evaluation.
4. **The Merging Point** is the asker's starting Place, when going by it costs the Friend at most one minute. The Friend's starting Place is never one, and two Friends never merge without the asker.
5. **Everyone sets out as late as still has them there at the start**, and the Merging Point's time follows from the start. With the start held back by a later arrival, the two who merge meet later, not earlier. A person's part of a Plan therefore has no arrival time of its own: everyone arrives at the Plan's start.
6. **Where a person sets out from**: the Place of the item they are busy with until they are ready; when free now, the location the asker may see; without one, the Place of an item that ended at most 15 minutes ago; otherwise unknown, and then no walk is counted for them.
7. **Only walking is counted.** The shuttle joins the Travel Time in a later ticket.
8. **The order** is the longest time together, then the earlier start, then the Restaurant's name.
9. **The meal's window** is the one the Restaurant cards use (lunch 11:00 to 14:30, dinner 17:00 to 19:30). A Restaurant's own closing time is not in the collected data.
10. **A Friend's position** is read in one private method of the meal Plan's service, through what the asker's map shows today (both Master Switches and the friendship's switch on). Ticket 04 moves that one place to the Friend view.
11. **`PlanInput`'s window, fixed Place, and constraints** are in the contract from this ticket and are honoured from ticket 02. The Assistant's tool sends them empty.
12. **A Plan's id** is its Restaurant's name, which is unique within an answer.
13. **A building is called** by its number with 동 when its Place has one, and by the Place's name otherwise, as the app does. 두산인문관 therefore reads 8동.
14. **The time band** reaches from the half hour at or before the later of now and one hour before the Plan's start, to the half hour at or after 30 minutes past its end, so a Plan for another day has a band on its own day.
15. **"Plan" and "Merging Point" join the glossary**, since the glossary ruled "plan" out as a word for a Quest.
16. The spec and the tickets of P01 land with this ticket's pull request.

### What differs from the design's worked example (2026-11-14)

Every walking time of the design's section 6.1 equals the seed's walking table, rounded up, and every time and count of minutes the design gives is reproduced. Three things differ, and none was bent to fit.

- **With 민수, the design names 301동식당 first** (27 minutes from 12:18). The calculation finds 302동식당 ahead of it: the asker walks 3 minutes to the Place of 민수's Class, the meal starts when that Class ends at 12:15, and the asker leaves at 12:43 for the 17-minute walk to 24동, which gives 28 minutes. The design's table did not list that Restaurant.
- **With both Friends, the design lists two candidates.** The calculation finds a third after them, 3식당, from 12:31 to 12:50 (19 minutes).
- **Alone, the design lists four candidates.** With 자하연식당 open the calculation finds a fifth, from 12:07 to 12:55 (48 minutes).

The answer "meet in front of 301동 at 12:18, eat at 학생회관식당 from 12:33 to 12:55" is the design's answer for the asker with both Friends. With 민수 alone, 학생회관식당 is the third candidate, from 12:33 to 12:59, with the same meeting.

Counted with the shuttle, 민수's own way from 302동 to 자하연식당 is 16 minutes against 19 on foot, more than the three minutes the shuttle must save, so the order of the example with both Friends can change when the shuttle joins the calculation.

### The real model (2026-11-14)

The three cases of the worked example were sent through `POST /assistant/messages` of the started server (the test harness's database and Redis containers, the seed, and the real walking table) with the production model, `anthropic/claude-haiku-5.5` through OpenRouter. Each time the model called `resolveFriend` for each Friend and then `planMeal`, and replied in one sentence:

| Asked | The reply's text | The first Plan |
|---|---|---|
| 배고파 | 11:50에 301동식당에서 먹을 수 있어요. | 301동식당 11:50 to 12:45 |
| 배고파, 민수랑 같이 | 12:15에 302동식당에서 민수랑 같이 먹어요. | 302동식당 12:15 to 12:43 |
| 배고파, 민수랑 지은이랑 같이 | 12:33에 학생회관식당에서 먹어요. | 학생회관식당 12:33 to 12:55, meeting 민수 at 301동 at 12:18 |

The app's mock data is the reply to the second.
