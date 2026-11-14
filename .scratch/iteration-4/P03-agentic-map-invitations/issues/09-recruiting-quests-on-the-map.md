# 09: Recruiting Quests answered on the map

Parent: [P03 spec](../spec.md) ("Events and recruiting Quests answered on the map": the contract and "Recruiting Quests")
Status: ready-for-agent
Blocked by: 08

## What to build

A User asks for the parties going to an event ("민수가 있는 파티", from the event's answer) or for an activity ("배드민턴 칠 사람"), and the main server answers in the shape of a meal's answer: one Plan for each recruiting Quest the User could enter, the ones a Friend holds first, with when they set out, how they go, when they arrive, and how long they can stay before their next item. A Quest that has started or cannot be reached in time is dropped with the reason. Joining stays the User's press on today's routes. This is row "4. 행사" boards 같이 5 to 7, and row "5. 파티" boards 합류 1 to 3. The app's contract, check, and stored copy follow; the screen does not.

## Acceptance criteria

- [x] `QuestsInput` joins the union of `PlanInput`; the recalculation plans it, and `POST /plans` refuses it with `PLAN_KIND`.
- [x] One Plan for each Quest the recruiting list gives the asker (Open or Approval, not held, with a step ahead) among those the input names, judged on its first Sub Quest ahead that has a start and a Place of the list. A Quest with no such step is left out.
- [x] It fits when the asker can be at that Place by the step's start, by the faster of walking and the shuttle. The stay runs from the start to the earlier of the step's end and when the asker must leave for their next item.
- [x] The order: a Quest a Friend holds first, then the earlier start, then the title. Dropped, with the reason: one that has started ("13:30 파티 · 이미 시작했어요") and one the asker cannot reach in time ("17:00 파티는 17:02에야 도착해요").
- [x] A Plan carries the Quest as the recruiting list gives it and the names of the Friends among its Holders, read through the Friend view.
- [x] The lines are the wireframe's: "**18:00 체육관** · 17:43에 나서요"; with a Friend, "**14:20 문화관 앞** 파티에" and "민수가 있어요". The basis says the way, the minutes, and the leave-by. With no Plan, the line says that no party can be reached.
- [x] A tool `planQuests` joins the events chat (`answer` and `events`): it takes a Global Event's id (resolved, on screen, or from the events answer on screen) or the ids `searchRecruitingQuests` returned in the same message, and gives the model the Plans in words and minutes, without coordinates.
- [x] The design's examples: row 4 (Friday 13:50; the job fair's party at 14:20 in front of 문화관 with 민수 among 3 Holders: set out 14:16, stay until 15:12, 52 minutes; its 13:30 party dropped as started) and row 5 (Thursday 16:45; badminton at the gymnasium at 17:00 and 18:00: the 18:00 one by shuttle, set out 17:43; the 17:00 one dropped, 17:02).
- [x] Unit tests of the calculation with its boundaries (reaching a start exactly and a minute late, a step under way, a Friend among the Holders, no step with a Place, the shuttle), and integration tests of the tool and the recalculation over the started server.
- [x] The app declares `QuestsInput` and the Plan's Quest, checks them, and stores a copy of the main server's real answer for the row 5 example.

## Comments

### Decisions (2026-11-15)

- The step judged is the first Sub Quest, in the order of starts, that is not cancelled, has not ended, and has a start and a Place of the list. A party for a Global Event is judged on its 모이기 step: the event's own Sub Quest has the event's point, not a Place of the list.
- A Quest has started when its step's start is before now, a whole minute. One that starts exactly now is judged by the way, like any other.
- Reaching it is judged as an event that has not started is (ticket 08's rules, through the same function): from the stretch of Free Time the step's start lies in, or, when the asker is in an item then, from the first stretch after it. A Quest with no such stretch that day is left out.
- The stay runs from the step's start to the earliest of the step's end, and when it has none the Global Event's end for a Quest of one or else 30 minutes (as an event with no end), and the leave-by. A stay under a minute drops the Quest as "18:00 파티 · 0분밖에 못 있어요".
- A step's place is called by its own words, which for a Place of the list is the Place's name, as the Quest shows it: "18:00 체육관", and "14:20 문화관 파티에" where the wireframe writes "문화관 앞", a party's own words that a step at the Place 문화관 does not hold.
- The first line is "**18:00 체육관** · 17:43에 나서요", by shuttle or on foot alike, alone; with Friends among the Holders "**14:20 문화관** 파티에" and "민수가 있어요", the names joined by ", " ("민수, 지은이 있어요").
- The basis is the way there with when to set out ("24동에서 문화관까지 걸어서 4분, 14:16에 나서요"), the way on as an event's, and "15:30 수업이라 15:12엔 나서요" when the next item cuts the stay. With no Plan the line is "제시간에 갈 수 있는 파티가 없어요", reason `no-fit`.
- The chips are the first Plan's origin and the item after it. A Plan's id and title are the Quest's, it has no Sub Quests, and its scene and band are an event Plan's.
- The Friends among the Holders, and the Friends a new Quest may invite, are read through the Friend view's `list`.
- `QuestsInput` takes exactly one of `globalEventId` and `questIds` (at most 20), else 400. The recalculation does not check its day, since each Quest is on the day of its own step.
- `planQuests` refuses Quest ids no tool returned in the message. It takes a Global Event's id as `searchRecruitingQuests` does, unchecked, since an unknown one finds nothing. The model is told each Plan's title, place, start, setOut, stayMinutes, leaveBy, holderCount, capacity, join, and the names of the Friends in it.
- The seed's walking table gives the design's walks (24동 to 문화관 4, 문화관 to 301동 18, 301동 to 체육관 28). Only the shuttle is the design's: 17 minutes from 301동 to 체육관, added to ticket 08's example provider.
- The app's stored copy is the main server's answer over the integration stage with that shuttle, asked on Thursday 2026-11-19 at 16:45, with the asker's id renamed to that of `meal-answer.ts`.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5) built tickets 09 and 10 together; their time and tokens are counted here once, and not again under ticket 10.

- Agent time: about 120 minutes, an estimate from the transcript's timestamps.
- Tokens: output 338,681; input 133,937,008, of which 133,278,879 were cache reads, 657,549 cache writes, and 580 uncached. Without cache reads: 996,810.
