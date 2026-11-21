# 17: The Assistant knows the User's Quests, answers from them, and changes them in place

Parent: [P05 spec](../spec.md)
Status: ready-for-agent (the case table was accepted with the amendments below; slice 1 is designed here)
Blocked by: [16](16-own-meal-quest-set-aside.md), whose set-aside this widens.

Native files: none. Releases: the main server (with a migration) and an app OTA update (P04 ticket 17 draws 바꾸기 / 그대로 두기).

## The aim

The user's words: "핵심은 이미 만들어진 퀘스트들에 대해서도 에이전트가 잘 알고 있고, 이를 바탕으로 유연하게 답변할 수 있느냐야." Today the model reads only the plan on screen and what was tapped (`context-lines.ts`). No tool reads the User's own Quests. A planner treats them as busy time and names them only for a meal (`alreadySet`, ticket 16). So "오늘 뭐 있지?", "민수랑 약속 몇 시였지?", "그거 3시로 옮겨 줘" and "저녁 약속 취소해 줘" cannot be answered. The case table below is the test of completeness for the change path.

## Amendments accepted on the case table

- Row 2 (a Friend leads it): no plans. The kept meeting is shown as in row 14, with "내일 14:00 민수가 잡은 약속이 있어요. 바꾸려면 민수에게 말해 주세요." and 파티 보기.
- Row 6 (its only invitee declined): it is the same meeting. It is set aside, and 바꾸기 changes it in place and invites 민수 again. The line: "민수가 거절한 내일 14:00 약속이 있어요. 이 시간으로 다시 물어볼까요?"
- Row 14: the kept Quest shown and no plans. It is the shape that also answers a question about what is set. A released app never gets an empty card (slice 1 uses a shape released apps draw; see below).
- Row 17: 30 minutes.
- Row 28: a released app's handling of an unknown notification kind is checked before choosing. If it drops or mangles one, the change is sent as a kind it already shows, with new words.
- A, related always: rows 3, 8, 9, 21, 22, 23 no longer say "named when it limits the plans". Every planner's answer carries the related Quests (below), and the model's line mentions the one that matters.
- B, row 23: a hand-made Quest with the same people is related and named by its title, never set aside by a guess. It is changed only when the User names it, and then it keeps its title.
- C, explicit target: the planners take the Quest to change as an input. The "same meeting" rule is the server's default only when the model gives none and exactly one fits. Row 10b stays a question.
- D, one rule for every change in place, a meeting, a shared meal and a 파티 alike: it keeps everyone who is in. A Holder stays a Holder, is told with `step-changed` (the push the room's 일정 수정 sends), and may leave if the new time does not suit; a waiting invitee stays waiting and the invitation shows the new time; nobody goes back to waiting. Every Holder's leave-by kept for the old steps is forgotten (ticket 21). A change means the same whether typed or tapped. Rows 4, 5, 7 and 26–28 follow it.

## Design, slice 1: Know (read-only), as built

Slice 1 lands in two PRs, each releasable: (1a) reading, below; (1b) `related` and `planSet` in the meal and meeting planners' answers.

1. **Reading a day: `findDay`, widened.** It draws a day as a Lookup of kind `day`, which released apps draw, and now holds the User's Quests beside their Classes. The Quests are those they hold, and those they were invited to and have not answered (`quests/kept-quests.ts`).
   - Optional `questIds` shows only those Quests, with no Class. A ref is a Quest's id or its first 8 characters. One that fits two Quests answers that it is ambiguous, and picks none.
   - The drawn steps give a Quest's title and the others who have not declined ("SK경영관 앞에서 만나기 · 김민수"), so that two meetings are told apart; a Class stays its time and building.
   - The model reads each Quest's `ref`, `kind`, `title`, `start`, `end`, `place`, `people` (each with its `answer`), `mine` and `changeable`. Words others wrote go inside the delimiters for collected text.
   - `kind` is `meal-lunch`, `meal-dinner`, `meet` (new `Quest.meet`, set when a meet Plan becomes a Quest, filled by title "…에서 만나기"), `event`, `seat` or `other`.
   - `changeable`: the User leads it, nobody else holds it or is invited and not declined, and it is for no event, no seat, and not under way.
2. **Questions about what is set** are answered by `findDay` with `questIds`: the row-14 shape, no plans. The day Lookup then carries `kept`, the Quests asked about, which P04 draws as the answer's flag. Released apps draw the steps.
3. **The line ahead**, `[Ahead: …]`, after the User's message each turn, for an app that draws answers:
   - today's Classes still to come, and the User's Quests of today and the next 6 days;
   - at most 6 items, nearest first;
   - each Quest with its day, time, kind, title, place, ref (8 characters), `mine`, and the others with their answers.
   - It was first today only, without titles; "과외 몇 시였지?" (Thursday, asked on Monday) then had nothing to go on, so it covers the coming week.
   - Measured on the schedule eval cases (OpenRouter, Haiku 5.5, 4 cases × 3), with the line against without:
     - "과외 몇 시였지?" passes 3/3 against 0/3.
     - The other cases pass with and without it, one run lost to a provider error.
     - The first step reads 40,679 input tokens against 40,395 (+284 for 5 items).
     - Turns take 1.92 steps against 2.42, so a turn reads 24% fewer input tokens in all (899,462 against 1,186,866), costs USD 0.092 against 0.122, and answers in 3.3 s against 4.1 s.
   - So it stays, though above the 120 tokens first budgeted: the delimiters around titles and places cost most of it.
4. **The evaluation's scorer** counted a turn as TOOL only for cards, a map button, or a lookup of its own table answered in words. A reply that draws an answer or a Lookup on the map now counts as shown, as cards do, so map-answer cases (these, and ticket 14's meal wishes) score as they ran.
5. **Ticket 16 stays** as the meal instance until slice 3, and `mealSet` beside `planSet` (1b) for one release.
6. **Slice 1b: `planSet` and `related`** on the meal and meeting answers (`MealPlanService.touched`, `gathering/related-quests.ts`).
   - `planSet` is the asker's Quest the plan sets aside, today only a meal's own, as ticket 16 sets it aside.
   - `related` holds the asker's other Quests that day of the kind asked for, or with a Friend asked for, at most three, nearest the time asked first.
   - The model reads `related` from planMeal and planMeet, and its rules mention the one that matters whether or not it limits the plans.
   - The app reads both as optional, and P04's ticket 17 draws 바꾸기 or 파티 보기 from `planSet.changeable`.

### Eval cases (three or four per kind; slice 1's are read-only)

- **meal**: "점심 어디서 먹기로 했지?", "오늘 저녁 몇 시였지?", "점심 뭐 먹지?" (with lunch set: planMeal, its line names it), "점심 누구랑이었지?"
- **meet**: "민수랑 약속 몇 시였지?", "내일 뭐 있지?", "민수 만나는 데가 어디였지?", "민수랑 지은이랑 내일 보자" (related: the meeting with 민수 is named)
- **event**: "오늘 가는 행사 몇 시야?", "그 설명회 어디서 해?", "이번 주에 가기로 한 행사 있어?"
- **seat**: "도서관 몇 시까지 있기로 했지?", "오늘 관정 예약 있어?"
- **class**: "오늘 수업 뭐 있어?" (as now), "오늘 뭐 있지?" (Classes and Quests together)

## Slices

1. Know (above).
2. Change a meeting in place: rows 1–19 and 24–33 as amended, with the explicit target, and a 파티 made from a Proposal (rows 36–44, ticket 18's second step).
3. Shared meals through the same path (row 20), then cancelling by words: through the leave or delete path, confirmed by a button, and a Quest others hold is left, not deleted.
4. A 파티's title, capacity, Join Policy, Board and description changed by words (row 39). Until then the line points to 수정 in its room.

## What happens now

Reproduced on 5.0/Main at bbc1cfed (a temporary test, not kept). The asker made a meeting with 민수 for tomorrow at 14:00 from a meet Plan: "SK경영관 앞에서 만나기", 민수 invited and not yet answering. Then:

| Asked (planMeet) | Answer today |
|---|---|
| 민수랑 내일 2시에 보자 (`from` 14:00) | Five new plans from 14:30; the kept meeting fills 14:00–14:30. Nothing names it. Making one makes a second meeting. |
| 민수랑 내일 3시에 보자 (`from` 15:00) | Five new plans at 15:00. Nothing names the kept one. |
| 민수랑 내일 보자 | Five new plans 09:00–14:00, ending at the kept one. Nothing names it. |

What exists for changing a Quest: `PUT /plans/:questId` (`BetterPlanService.change`, made for "a better plan after a decline"):
- It is for the Leader only, and refuses a Quest for a Global Event (`ATTENDING_SUB_QUEST`).
- It refuses unless the plan's people are exactly the Quest's: the Leader, the other Holders, and the waiting invitees (`PLAN_PEOPLE_CHANGED`).
- It plans again with the Quest's own Sub Quests left out of everyone's day. `PLAN_CHANGED` comes when the shown plan no longer fits.
- It replaces the title and the Sub Quests inside the Quest's lock, keeping its id.
- It sends the people the `plan-changed` and `quests-changed` signals, and keeps the Leader's leave-by.
- It does not: put accepted Friends back to waiting, push a notification, or forget the invitees' leave-by.

A meeting's Plan titles its Quest and its step "<Place>에서 만나기". Nothing on a Quest records that it came from a meet Plan.

## Words

- **The same meeting**: a Quest made from a meet Plan (new `Quest.meet`, filled by title for those made before), not ended, starting on the day asked, whose people are exactly the people asked. Its people are the Leader, the other Holders and the waiting invitees; a Friend who declined is not one of them.
- **The asker can change it** when they lead it.
- `planSet`: the answer's field that names it (below, "The app").

## The case table

Each row: what exists → what is asked → what the answer says and draws → what 바꾸기 / 그대로 두기 / making does → who is told. "Set aside" means its Sub Quests are left out of everyone's day while planning.

### Who made it

| # | Exists | Asked | Answer | 바꾸기 / making | Told |
|---|---|---|---|---|---|
| 1 | My meeting with 민수, tomorrow 14:00 | 민수랑 내일 3시에 보자 | Set aside; plans from 15:00. Line: "이미 내일 14:00 SK경영관 앞에서 민수와 약속이 있어요. 바꿀까요?" `planSet` changeable. | 바꾸기 = `PUT /plans/:questId` with the plan shown: same Quest, new time and place. `POST /plans` (a second one) answers 409 `PLAN_ALREADY_SET` with `questId`. 그대로 두기: the app drops the answer; nothing is made. | 민수 (rows 11–14) |
| 2 | 민수's meeting with me (I am invited or accepted) | 민수랑 내일 3시에 보자 | Not set aside: an accepted one still fills my time, a waiting one does not. Line: "내일 14:00 민수가 잡은 약속이 있어요. 바꾸려면 그 약속에서 민수에게 말해 주세요." `planSet` not changeable, `leader` 민수. Plans as today, for seeing only. | No 바꾸기. Making answers 409 `PLAN_SET_BY_FRIEND`. | Nobody |
| 3 | A public 파티 with 민수 and others who joined | 민수랑 내일 보자 | Not the same meeting (other people): it fills its time as today and is named as what fills it when nothing fits. | — | — |

### The invited

| # | Exists | Answer | 바꾸기 |
|---|---|---|---|
| 4 | 민수 waiting | Same meeting (row 1). | 민수 stays waiting; the invitation shows the new time. No push: they are not a Holder. |
| 5 | 민수 accepted | Same meeting. | 민수 stays a Holder and is told with `step-changed`; they may leave if the new time does not suit. Their leave-by is forgotten (row 26). |
| 6 | 민수 declined | Not one of its people: a meeting with 민수 is asked, so it is not the same meeting. It is mine alone, set aside only by a plan for me alone. Line names it as declined: "민수가 거절한 내일 14:00 약속이 있어요." | — |
| 7 | 민수 accepted, 지은 waiting, 현수 declined | Its people are 나, 민수, 지은. "민수랑 지은이랑 내일 보자" is the same meeting; with 현수 too it is not. | 민수 stays and is told with `step-changed`; 지은 stays waiting and sees the new time. |

### The people asked

| # | Exists | Asked | Answer |
|---|---|---|---|
| 8 | Meeting with 민수 | 민수랑 지은이랑 내일 보자 (one more) | A different meeting: not set aside. It fills its time, and is named as the reason when it limits the plans or nothing fits ("내일 14:00엔 민수와 약속이 있어요"). Not offered for change. |
| 9 | Meeting with 민수 and 지은 | 민수랑 내일 보자 (one fewer) | As row 8. |
| 10 | Two meetings with 민수 tomorrow, 11:00 and 16:00 | (a) 민수랑 내일 4시 반에 보자 | (a) The one the asked time falls in, or the nearest one after it on that day, is set aside and named. (b) Both are named, nothing is set aside, and no plan is made: "내일 민수와 11:00, 16:00 약속이 있어요. 어느 걸 바꿀까요?" |
|  |  | (b) 민수랑 내일 보자 | |

### What is asked

| # | Asked | Answer | 바꾸기 |
|---|---|---|---|
| 11 | A new time (3시에) | Plans at the time, with it set aside. | Time and place from the plan chosen. |
| 12 | A new place only (도서관에서 보자) | Plans at that Place, from the kept time: the rules give `from` as the kept start. | Place changes, time kept. |
| 13 | Both | Plans at both. | Both change. |
| 14 | Nothing new (민수랑 내일 보자) | Shows the kept meeting; plans none. `plans` is empty, `planSet` names it, and the line says "이미 내일 14:00 SK경영관 앞에서 민수와 약속이 있어요. 시간을 바꿀까요?" The app offers 시간 바꾸기 (asks "몇 시로 바꿀까요?") and 그대로 두기. | — |

### When

| # | Exists | Answer |
|---|---|---|
| 15 | It is over (its end has passed) | Not the same meeting: a new one is planned as today. |
| 16 | It has started (start ≤ now < end) | Not set aside and not offered for change. It fills its time and is named: "지금 민수와 약속 중이에요." |
| 17 | It starts in under 30 minutes | Same meeting, changeable. The line adds "곧 시작해요". 민수 is told at once (push). |
| 18 | "내일" asked at 23:59 and at 00:01 in Korea | The server matches only by the date the model gives. The rules read 내일 against now, so at 00:01 내일 is the day after. An eval case checks both. |
| 19 | A Class that day | Never set aside: a Class is no Quest the asker made. |

### Kinds crossing

| # | Exists | Asked | Answer |
|---|---|---|---|
| 20 | A lunch Quest with 민수 (shared meal) | 민수랑 점심 먹자 | Slice 2: it is my shared lunch, so it is set aside and changed in place like row 1 (`PUT /plans/:questId`), in place of today's 409 `MEAL_ALREADY_SET`. |
| 21 | A lunch with 민수 | 민수랑 내일 보자 (a meeting) | Different kinds: the lunch is not set aside. It fills its time and is named as the reason when it limits the plans. |
| 22 | A meeting with 민수 | 민수랑 점심 먹자 | As row 21, the other way. |
| 23 | "민수와 스터디", a Quest made by hand with 민수 | 민수랑 내일 보자 | Does not count: it was not made from a meet Plan. It is its own activity, titled and planned by hand, and a "보자" should not rewrite it. It fills its time and is named by its title when it limits the plans. |

### After 바꾸기

| # | What | Done |
|---|---|---|
| 24 | The Quest | Same id; its room, links and chat stay. Title and Sub Quests are replaced (as `change` does now). `meet` stays true. |
| 25 | My leave-by | Kept again for the new plan (`keepTimeToLeave`, which replaces the old one by its identity). |
| 26 | The others' leave-by | Every Holder's leave-by kept for the old steps is forgotten where `step-changed` is sent (ticket 21), the asker's included and then kept again (row 25). Recomputing each Holder's from their own day is not done. |
| 27 | Invitees' answers | Nobody goes back to waiting: a Holder stays a Holder, a waiting invitee stays waiting. Declined Friends are not in it. |
| 28 | What they are told | Each other Holder: `step-changed`, which released apps already show, as the room's 일정 수정 sends it. A waiting invitee: no push; the invitation shows the new time. `quests-changed` as now. No new kind. |
| 29 | An invitee busy at the new time | The plan was made with their day: a Class or Quest they hold blocks it. A Quest they were invited to and have not accepted does not. If they became busy after the plan was shown, `change` plans again and the shown plan no longer fits: 409 `PLAN_CHANGED`, and the app asks again. |
| 30 | 그대로 두기 | The app drops the answer and its plans. Nothing is sent; the kept meeting is as it was. |

### At once

| # | What | Done |
|---|---|---|
| 31 | Two 바꾸기 at the same moment | `change` locks the Quest (`lockLed`). The second plans against the first's result: its shown plan no longer fits, so 409 `PLAN_CHANGED`. |
| 32 | An invitee accepts while it changes | Accepting locks the same Quest. Accept first: they are a Holder and are told with `step-changed`. Change first: they accept the new time. |
| 33 | An invitee declines while it changes | Declining first: they are no longer one of its people, so the plan's people differ and `change` refuses (`PLAN_PEOPLE_CHANGED`); the app asks again. Change first: they decline the new time. |

### Words

| # | Rule |
|---|---|
| 34 | Only Friends in the plan are named. A busy Friend is named only by when their Class ends or starts, never the course or the room (PLAN_RULES as now). |
| 35 | The kept meeting is named by its time, its place and its people; a hand-made Quest by its title. Titles and places written by others go inside the delimiters for collected text. |

### A 파티 made from a Proposal

Asked as "방금 만든 파티 19시로" after 만들기 made it. Ticket 18 only says it is posted and points to 수정 in its room; these rows change it in place. What the room's 일정 수정 does today is the measure: it changes the Sub Quest, pushes `step-changed` to every other Holder, and tells join requesters and invitees nothing.

| # | The made 파티 | Done |
|---|---|---|
| 36 | Public or closed, nobody else in it | Changed in place: same Quest, its Sub Quest's time and place; the post stays on its Board. Nobody to tell. |
| 37 | Public, others joined | Changed in place, as 일정 수정 does: each Holder is told with `step-changed`. The line says who will be told before the button is pressed ("바꾸면 참여한 2명에게 알림이 가요") and after ("참여한 2명에게 알렸어요"). |
| 38 | Approval, join requests waiting | Changed in place; the requests stay and the requesters are not told. A known gap of the room's own edit, not fixed here. |
| 39 | Asked for more than time or place ("6명으로", "승인제로", "제목 바꿔줘") | Slice 2 changes time and place only. For the rest the line says it is changed in the room and offers the button that opens the room's 수정; never a new card. By words: slice 4. |
| 40 | Closed, Friends invited from the Proposal | As row 37, by rule D: one who accepted stays a Holder and is told; one waiting stays waiting. |
| 41 | Started, or over | Not changed, as rows 15–16: "이미 시작한 파티예요." |
| 42 | Gone (cancelled), or the User left it | Not changed. The line says it is no longer there and offers to propose it again. |
| 43 | The User handed over the Leader | Not changed, as row 2: "리더에게 말해 주세요." |
| 44 | For a Global Event | Only a meeting time before the event, as proposeQuest already refuses a start after it. |

## The app

- One field for both kinds: `AnswerReply.planSet?: { kind: 'meal' | 'meet'; questId; title; startAt; place; friendNames; changeable: boolean; leader: string | null } | null`.
  - `changeable` replaces `shared` for meals.
  - `leader` is null when the asker leads, else the leader's name.
- `mealSet` (PR 417) is sent beside it for one release, then dropped. Released apps read neither yet; P04's ticket 17 reads `planSet`.
- Error codes:
  - Making a second meeting: 409 `PLAN_ALREADY_SET` `{ questId }`.
  - Making when a Friend made it: 409 `PLAN_SET_BY_FRIEND`.
  - A shared meal answers 409 `MEAL_ALREADY_SET` until slice 2, then goes through `PUT`.
- 바꾸기 calls `PUT /plans/:questId` with the plan shown (the body of `POST /plans`).

## Tests

- One integration test per row, in `assistant-own-meeting.integration.test.ts` and `plans-change-meeting.integration.test.ts`.
- The app's guard for `planSet`.
- Eval cases for the model's lines (rows 1, 2, 10b, 14, 16, 18).
- The sweep of all tests and mocks before each push.
