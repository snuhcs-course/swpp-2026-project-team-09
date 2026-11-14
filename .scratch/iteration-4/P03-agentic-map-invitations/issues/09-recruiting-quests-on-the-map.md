# 09: Recruiting Quests answered on the map

Parent: [P03 spec](../spec.md) ("Events and recruiting Quests answered on the map": the contract and "Recruiting Quests")
Status: ready-for-agent
Blocked by: 08

## What to build

A User asks for the parties going to an event ("민수가 있는 파티", from the event's answer) or for an activity ("배드민턴 칠 사람"), and the main server answers in the shape of a meal's answer: one Plan for each recruiting Quest the User could enter, the ones a Friend holds first, with when they set out, how they go, when they arrive, and how long they can stay before their next item. A Quest that has started or cannot be reached in time is dropped with the reason. Joining stays the User's press on today's routes. This is row "4. 행사" boards 같이 5 to 7, and row "5. 파티" boards 합류 1 to 3. The app's contract, check, and stored copy follow; the screen does not.

## Acceptance criteria

- [ ] `QuestsInput` joins the union of `PlanInput`; the recalculation plans it, and `POST /plans` refuses it with `PLAN_KIND`.
- [ ] One Plan for each Quest the recruiting list gives the asker (Open or Approval, not held, with a step ahead) among those the input names, judged on its first Sub Quest ahead that has a start and a Place of the list. A Quest with no such step is left out.
- [ ] It fits when the asker can be at that Place by the step's start, by the faster of walking and the shuttle. The stay runs from the start to the earlier of the step's end and when the asker must leave for their next item.
- [ ] The order: a Quest a Friend holds first, then the earlier start, then the title. Dropped, with the reason: one that has started ("13:30 파티 · 이미 시작했어요") and one the asker cannot reach in time ("17:00 파티는 17:02에야 도착해요").
- [ ] A Plan carries the Quest as the recruiting list gives it and the names of the Friends among its Holders, read through the Friend view.
- [ ] The lines are the wireframe's: "**18:00 체육관** · 17:43에 나서요"; with a Friend, "**14:20 문화관 앞** 파티에" and "민수가 있어요". The basis says the way, the minutes, and the leave-by. With no Plan, the line says that no party can be reached.
- [ ] A tool `planQuests` joins the events chat (`answer` and `events`): it takes a Global Event's id (resolved, on screen, or from the events answer on screen) or the ids `searchRecruitingQuests` returned in the same message, and gives the model the Plans in words and minutes, without coordinates.
- [ ] The design's examples: row 4 (Friday 13:50; the job fair's party at 14:20 in front of 문화관 with 민수 among 3 Holders: set out 14:16, stay until 15:12, 52 minutes; its 13:30 party dropped as started) and row 5 (Thursday 16:45; badminton at the gymnasium at 17:00 and 18:00: the 18:00 one by shuttle, set out 17:43; the 17:00 one dropped, 17:02).
- [ ] Unit tests of the calculation with its boundaries (reaching a start exactly and a minute late, a step under way, a Friend among the Holders, no step with a Place, the shuttle), and integration tests of the tool and the recalculation over the started server.
- [ ] The app declares `QuestsInput` and the Plan's Quest, checks them, and stores a copy of the main server's real answer for the row 5 example.

## Comments
