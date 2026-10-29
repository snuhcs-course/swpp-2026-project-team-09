# P04: Meals and parties in free time (공강 파티, 공강에 밥)

Status: ready-for-agent

## Problem Statement

A student's day has gaps between Classes. To use one, they have to work out a lot by hand.

- **A party in the gap.** Which recruiting Quests and Global Events start after this Class ends, and can they get there in time? Will they still be back before the next Class? The answer depends on walking times across a hilly campus and on whether the circular shuttle would be faster. The Boards and the Events tab show times and places, but nothing about the User's own day.
- **Lunch with Friends.** Which Friends are free at lunch? The student asks each one, compares Timetables, and picks a Restaurant that is open, has something everyone will eat and is not far for anyone. Then they make a 비공개 파티 by hand: title, time, Place and invitations.

The Assistant (P07) knows the menus, the shuttle, Global Events and recruiting Quests, but not the User's Timetable or anyone's Free Time. The Timetable screen's empty state already promises "수업을 넣으면 친구가 내 공강을 볼 수 있어요", but nothing keeps that promise.

## Solution

Two scenarios run in one new Assistant **Feature**, 공강. A router decides for each message whether the existing chat Feature or 공강 answers it. The input bar does not change.

- **공강 파티.** "오늘 멀티코어컴퓨팅이랑 현대암호학개론 사이에 갈 수 있는 파티 있어?"
  - The Assistant finds the gap between those Classes. It lists every recruiting Quest and Global Event the User can reach before it starts, and can still leave in time to reach the next Class.
  - Each card gets a **이동 시간** box: how long the way there takes, on foot or by shuttle, and either how long the way to the next Class takes or the time the User must leave by.
  - "운동만" narrows the list. A Quest card's own 참여하기 or 참여 신청 button joins it, as on the Board.
- **공강에 밥.** "오늘 점심에 누구 돼?"
  - The Assistant finds the User's Free Time at lunch and names the Friends who are free at the same time.
  - "민수랑 지은이랑 밥" gives the time all of them share. It also shows **Restaurant cards** for the Restaurants that are open then and leave enough time to eat. Each card has its menu, each person's Travel Time and a **파티 만들기** button.
  - Restaurants are sorted so that the person with the longest way walks as little as possible. "면 빼고" keeps only the Restaurants that have something else.
  - 파티 만들기 opens the party form already filled in: a 비공개 파티 at that Restaurant, at the earliest time all can be there, with the Friends invited. The form's own button makes it and invites them.

Underneath sit three pieces of technical work:

- an offline **walking-time table** between all Places, computed on OpenStreetMap's paths with elevation;
- **shuttle times derived from a few days of logged vehicle positions**, with rules that survive the operator's faulty feed;
- a frozen **evaluation** of the Assistant, of the walking table against stopwatch walks, and of the shuttle times against held-out days.

The model only interprets the request and words the reply. The server computes Free Time, fit, Travel Time and the shared time, and decides which candidates appear.

Words:
- **Free Time** (공강) is a stretch of a User's day not taken by a Class or by a timed Sub Quest of a Quest they hold.
- An **item** is one entry of a User's day: a Class meeting or such a Sub Quest.
- A **gap** is one Free Time interval between two items.
- **Travel Time** is the time from one Place to another, on foot or by the circular shuttle.
- A **Restaurant** is a dining place whose daily menu a Source publishes.
- A **Feature** is one way the Assistant answers, with its own system prompt and tool list. All Features share the Assistant's endpoint, and the router picks one for each message.

The wireframe's AI 채팅 boards (https://claude.ai/artifact/136sh65V4Trkv5KBM78Vgr) show the cards and example replies: 공강 파티 (`MainChatFreeParty`), 공강에 밥 ① (`MainChatMealWho`), ② (`MainChatMealPlaces`) and ③ (`MainChatMealParty`). Where a board and this spec differ, this spec wins (see Further Notes).

## User Stories

### Asking about a gap

1. As a User, I want to name two of my Classes ("멀코랑 현암 사이") and get the gap between them, so that I can ask the way I think about my day.
2. As a User, I want to ask with clock times ("2시부터 3시 반") or for "다음 공강", so that I do not have to name Classes.
3. As a User, I want to ask about any day from today to a week ahead, so that I can plan tomorrow's gap too.
4. As a User, I want the Assistant to tell me which gap it found, when the previous item ends and when the next one starts, so that I can check it understood me.
5. As a User, I want the Quests I hold to count as busy time, so that the Assistant never suggests something during a party I already joined.
6. As a User, I want a Sub Quest with no end time to count as 30 minutes long, so that an open-ended plan still blocks my time.
7. As a User asking about today, I want a gap that has already begun to start now, so that nothing in the past is suggested.
8. As a User without a Timetable, I want my whole day treated as free, so that I still get answers; when I name Classes I do not have, I want to be asked for the time instead.
9. As a User whose item next to the gap has no Place (a 과외 off campus, or a room the screenshot reader did not match), I want to be asked where I leave from or by when I must leave, so that the Travel Times are right without my storing anything.
10. As a User, I want what I answer to such a question used only for this request, so that nothing about my off-campus life is saved.

### 공강 파티

11. As a User, I want every recruiting Quest and every published Global Event that I can reach in the gap, so that I see all my options.
12. As a User, I want a candidate only when I can travel there from my previous item's Place and arrive a minute before it starts, so that I am never late.
13. As a User, I want a candidate with an end time only when I can travel from it to my next item and arrive a minute before that, so that I am not late for my next Class.
14. As a User, I want a candidate with no end, or one longer than 3 hours, shown when I can stay at least 30 minutes, with the time I must leave by, so that I can drop in and leave on time.
15. As a User, I want each card to show how long the way there takes and whether that is on foot or by shuttle, so that I know how to get there.
16. As a User, I want the card to show how long the way from the party to my next Class takes, or the time I must leave by, so that I can plan my exit.
17. As a User, I want the candidates' cards in order of start time, Quests and Global Events together, so that the soonest one comes first.
18. As a User, I want to narrow with a condition such as "운동만", so that I see only what I want.
19. As a User, I want no candidate I cannot use: full Quests, Quests I hold, Quests I already asked to join, Quests for a Global Event whose Shared Quest I hold, and candidates whose place is unknown. I also do not want to be told why each one was left out, so that the list is short and clean.
20. As a User, I want to be told how many fit and how to narrow when more than 20 do, with the 20 soonest shown as cards, so that a long list stays readable and none is out of reach.
21. As a User, I want to join a Quest from its card with its own 참여하기 or 참여 신청 button, through the same confirmation as on the Board, so that I can act at once.
22. As a User, I want a Global Event card with its usual 파티 찾기·모집 and AI 매칭 buttons, so that I can find company for it.
23. As a User, I want to be told plainly when nothing fits, so that I can make my own plan.
24. As a User, I want only Quests I could see on the Boards, so that the Assistant never shows me a Closed Quest.
25. As a User, I want the gap's candidates to ignore where I am standing right now, so that the answer is the same whether or not I share my location.

### 공강에 밥: who is free

26. As a User, I want to ask "오늘 점심에 누구 돼?" and get my Free Time at lunch and the Friends who are free with me for at least 15 minutes of it, so that I know whom to ask.
27. As a User, I want lunch to mean 11:00–14:30 and dinner 17:00–19:30, so that the answer matches when the Restaurants serve.
28. As a User, I want only the Friends who are free named, with no list of who is not, so that the answer is short and nobody's schedule is singled out.
29. As a User, I want a Friend who never entered a Timetable, or has no Classes that day, counted as free, so that they are not left out.
30. As a User, I want to name the Friends I want to eat with ("민수랑 지은이랑 밥") and get the time all of us share, so that we can pick a time.
31. As a User, I want two Friends with the same name told apart by their department when the Assistant asks me which one, so that the wrong person is never invited.
32. As a User, I want Friends' Classes, rooms and buildings never shown to me or sent to the AI provider, so that only "free or not" is shared.
33. As a User, I want only accepted Friends considered, whatever their Location Sharing switch, so that strangers' schedules are never used.

### 공강에 밥: where to eat

34. As a User, I want Restaurant cards for the Restaurants open for that meal that day, so that I only see places that serve.
35. As a User, I want a Restaurant shown only when, after everyone's Travel Time there, at least 15 minutes remain to eat before the first person must leave and before the meal ends, so that the meal is realistic.
36. As a User, I want each card to show "식사 가능 시간 N분", so that I know how long we can sit.
37. As a User, I want each card to show the Restaurant's building and meal ("63동 · 오늘 점심") and the menu's first two lines with "외 N개", so that I can choose by menu.
38. As a User, I want each person's Travel Time on the card ("나 도보 4분", "이민수 셔틀 9분"), with the longest one highlighted, so that I see who walks furthest.
39. As a User, I want the Restaurants ordered by the longest Travel Time shown on the card, shortest first, so that nobody walks far.
40. As a User, I want to say "면 빼고" and keep only the Restaurants that have something other than noodles, so that the choice fits our taste.
41. As a User, I want to say "국밥 먹고 싶어" and keep only the Restaurants that have it, so that I can look for a dish.
42. As a User, I want the earliest shared time in which a Restaurant fits to be used, and a time window I name to be respected, so that we eat when I meant.
43. As a User, I want a 지도에서 식당 보기 button under the answer, so that I can see the Restaurants on the map.
44. As a User, I want to be told plainly when no menu was collected for that day, when we share no time, or when no Restaurant fits, so that I am never shown an invented answer.
45. As a User asking about breakfast with Friends, I want to be told that this covers lunch and dinner, so that I know why there is no answer.

### Making the meal Quest

46. As a User, I want a 파티 만들기 button on each Restaurant card that opens the party form filled in, so that making the plan takes one press.
47. As a User, I want the form filled with a 비공개 파티 titled "<Restaurant>에서 점심" (or 저녁), the Restaurant's Place shown with the Restaurant's name, the Friends I named invited and room for all of us, so that I only check it.
48. As a User, I want the time filled with the moment the last of us can arrive, rounded up to 5 minutes (12:36 → 12:40), so that nobody is late.
49. As a User, I want to change any field in the form before I submit it, so that I stay in control.
50. As a User, I want the form's 파티 만들기 to make the Quest and invite the Friends exactly as the party form does, so that a plan made this way is no different.
51. As a User, I want the Restaurant card's 파티 만들기 not to wait for the AI, so that the form opens at once.
52. As a User, I want to say "여기로 하자" in the chat instead and get a Proposal as before, so that both ways work.
53. As an invited Friend, I want to accept the invitation and later open a Party with the others through 파티 활성화, so that we find each other on the map as we already can.

### Travel Times

54. As a User, I want Travel Times between buildings computed along real paths, steps and roads, so that a building behind a hill is not "2 minutes away".
55. As a User, I want climbing uphill to cost extra time, so that the way up the engineering hill is not as quick as the way down.
56. As a User, I want the shuttle used only when it is at least 3 minutes faster than walking, so that I am not sent to a stop for nothing.
57. As a User, I want the shuttle's time to include walking to and from the stops and the average wait at that hour, so that it is honest.
58. As a User, I want the shuttle left out at weekends and outside 08:00–21:00, so that I am never told to wait for a bus that does not run.
59. As a User, I want the same Travel Times in both scenarios, so that the two answers agree.
60. As a User, I want minutes always rounded up, so that "4분" never turns out to be five.

### Friends and privacy

61. As a User, I want my Timetable used for my Friends' answers without any switch, as on Everytime, so that lunch planning just works between Friends.
62. As a User, I want no new screen that shows my Timetable to Friends, so that only the Assistant's "free or not" uses it.
63. As a User, I want a Friend's busy time that comes from their Quests never explained, so that their plans stay theirs.
64. As a User, I want a Friend's item without a Place to make only their Travel Time unknown ("—"), so that they are still judged on time.
65. As a User, I want what I wrote, my Classes' names and my Friends' names sent only to AI providers that do not collect user data, so that they are not used for training.
66. As a User, I want rooms, the buildings of anyone's Classes and anyone's coordinates never sent to the AI provider, so that where people are stays private.

### Routing and the rest of the Assistant

67. As a User, I want to ask in the same input bar as always, so that I do not have to choose a mode.
68. As a User, I want questions that need my Timetable or Friends' Free Time answered by 공강, and everything else, such as "오늘 점심 뭐 있어?", answered by the chat as before, so that nothing I used to ask gets worse.
69. As a User, I want a follow-up to a 공강 answer ("운동만", "여기로 하자") answered by 공강, so that the conversation carries on.
70. As a User, I want the chat to answer when routing fails, so that a routing error never leaves me without a reply.
71. As a User on an APK from before P4, I want 공강 파티 answers to show as before and the chat to keep working, so that only the new Restaurant cards need the new APK.
72. As a User, I want my daily message count unchanged by routing, so that the router does not use up my messages.

### Operating and measuring

73. As a developer, I want the walking table built by one offline command, with a list of the Places whose Travel Times move most when their pin moves, so that the server only looks values up and we know where the table is fragile.
74. As a developer, I want the shuttle to work from day one on the notice's values, switch to logged values when they exist, and be logged on the Dev Server only, so that real Users are never disturbed.
75. As the PM, I want a frozen set of 40 cases with thresholds committed before any run, scored per scenario, so that a weak scenario cannot hide behind the total.
76. As the PM, I want the walking table measured against 30 walked pairs and a straight-line baseline, so that the travel model's accuracy is a number.
77. As the PM, I want the shuttle's derived times checked against held-out days, so that the log-based model is shown to beat the notice's values.
78. As the PM, I want P19's 62 cases run through the router, so that the chat is shown not to get worse.
79. As the PM, I want the ground-truth labels drafted without sight of the judgement code and reviewed by a person, so that the labels do not just copy the code.

## Implementation Decisions

### Shape: a router and two Features (ADR 0008)

- **The 공강 Feature** is a new Feature beside the chat Feature (ADR 0005). It has its own system prompt and its own tool list.
- **Shared tools have one definition.** A tool both Features need lives in one module, and each Feature lists it in its own tool list. Nothing is copied.
  - Shared: `showQuests`, `showGlobalEvents`, `showOnMap`, `resolveFriend`, `resolvePlace`, `proposeQuest`.
  - They are used as they are. The chat Feature, its prompt and its tools do not change.
  - The presenters' descriptions ask for ids from the chat's searches. So the 공강 prompt says that the ids `findFreeTimeEvents` returned are the ones to show. The presenters already accept any id a tool found in this message.
  - What 공강 needs beyond the shared tools is done in its own tools and its own run (below), not in the shared ones.
- **The router.**
  - It runs before every message in the adapter, the only place that imports the AI SDK.
  - It is one forced call to a `route` tool with one argument, the Feature: `chat` or `공강`.
  - Input: a short router prompt and the text of the last 6 messages.
  - Limits: 1 step, 5 seconds, 50 output tokens. Any failure or timeout routes to `chat`.
  - The boundary is written by meaning, with no keyword list:
    - a question that can only be answered with the User's Timetable or Friends' Free Time goes to 공강 ("점심에 누구 돼?");
    - a message that continues a 공강 answer, by narrowing its candidates or picking from them ("운동만", "여기로 하자"), also goes to 공강;
    - everything else goes to chat ("오늘 점심 뭐 있어?").
  - It always runs. There is no app version header.
  - It is its own injectable seam beside the model port. Tests bind a router that always answers `chat` unless they need 공강, so existing scripts do not change.
  - Its call is tagged in the run's records, so P19's scoring does not count it.
- **Limits.**
  - The 공강 Feature runs with up to 10 model steps, a setting of its own beside the chat's 8. The flow "who is free → resolve Friends → Restaurants → show → propose" is tight at 8.
  - The 30-second limit per message, the output token cap, the 20-message history and the daily message limit stay as they are.
  - The router's call does not count as a message.
- **OpenRouter data policy.** Every Assistant request, the router and the chat included, sets provider `data_collection: "deny"`. It adds no ZDR restriction, which could shrink the providers available. The reason is that course names, Friends' names and per-Friend results now reach the provider. This setting on the shared model call is the one change the chat's requests get (decided in the grill); what the chat answers does not change.

### Busy time and Free Time

- **Busy items on a day:**
  - each Class meeting on that weekday;
  - each timed Sub Quest of a Quest the User holds. The attending Sub Quest of a Global Event Quest takes the Global Event's start and end.
  - A Sub Quest with a start and no end is busy for 30 minutes. One with no start, or a cancelled one, is ignored.
  - The active Party blocks nothing.
- **Free Time** is every interval between busy items, including before the first and after the last item of the day. On today, it starts no earlier than now.
- **Friends' busy time** uses the same function on the Friend's Timetable and held Quests. The reason a Friend is busy is never shown or sent to the model.
- **Dates** are mapped to weekdays only. 휴강, public holidays, vacations and exam weeks are unknown (Further Notes).
- **No Timetable.** A User or Friend with no Classes is free all day. "다음 공강" is then the rest of the day. Two named Classes cannot be found, so the model asks for the time.
- **The origin of a gap** is the Place of the item before it. When there is no item before the gap, there is no travel on that side. Live positions are never used.
- **My item without a Place** next to a gap:
  - a tool that judges travel returns `needs: {side: before | after, item}` instead of results;
  - before → the model asks where the User leaves from and passes `departurePlace` (resolved through `resolvePlace`);
  - after → it asks by when the User must leave and passes `leaveBy`, which replaces the after side.
  - Nothing is stored.
- **A Friend's item without a Place:** that side's travel is left out, the Friend is judged on time only, and their Travel Time shows "—".

### Travel Time (ADR 0009)

One function, `travel(from Place, to Place, departure time)`, serves both scenarios. It returns seconds and a mode, walk or shuttle, and shows whole minutes rounded up. It sits behind an injectable provider. The eval runner and the labels test bind the frozen travel fixture to it (Evaluation plan), so the real table and shuttle file never reach the eval.

**Walking table.**
- **Built offline** by a TypeScript command in the main server. The output is a seed file of seconds for every directed pair:
  - Place → Place, 230 × 230;
  - Place ↔ Shuttle Stop, 230 × 14 each way.
  - The server loads the file at start and only looks values up.
- **Graph.**
  - Ways: every highway a pedestrian can use (footway, path, steps, pedestrian, living_street, service, residential, unclassified, tertiary, secondary, track).
  - Excluded: motorway, trunk and `foot=no`. `access=private` is excluded unless `foot=yes`.
  - The OpenStreetMap extract is pinned (an Overpass export with its timestamp) and committed, so the table can be rebuilt.
- **Joining a point to the graph.** Each Place point and each Shuttle Stop is joined to its nearest path and to every other path within that distance + 20 m. A join is only to the graph's main connected component, and never to a way tagged `sac_scale`. The walk from the point to the path costs its straight-line length. This replaces the earlier "every path within 40 m" rule (Further Notes).
- **Speed and climb.**
  - Speed is 1.1 m/s.
  - Climbing adds 0.5 minutes per 10 m, only when the destination is higher. Going down adds nothing, and steps are not modelled apart.
  - Each Place and Shuttle Stop gets one elevation, read once from SRTM 30 m and stored in the seed.
  - Speed and climb are not calibrated before 11-01.
- **Sensitivity mode.** The builder can move every pin 10 m and 20 m in random directions, 10 runs each, rebuild and compare. It prints the mean change and the Places that move most. This gives the fragile-Place list.
- **Licence.** The table file carries the ODbL notice the other OpenStreetMap seed files carry.
- **Kakao's walking route stays only for drawing routes.** It never feeds the table, and nothing is compared with it.

**Shuttle.**
- Only the circular route 41946 (anticlockwise). The clockwise 41914 has no stop data.
- **Shuttle travel** = walk to a boarding stop + average wait at that stop + ride to an alighting stop ahead on the loop (1 to 13 stops) + walk from that stop. The best pair of stops wins.
  - The wait and the ride use the band of the time the User reaches the stop.
  - The shuttle is offered only when the User reaches the boarding stop on a weekday between 08:00 and 21:00.
  - For a leave-by time, out-travel departs at the next item's start − 1 minute − the walking time.
- **Chosen when ≥ 3 minutes faster** than walking; otherwise the walk is shown.
- **The values** come from a committed `shuttle-timing.json`: per stop and band, the average wait; per pair of stops and band, the median ride. The file is derived from the Dev log (below).
  - Until the file exists, and for any stop-band or pair-band it lacks, fallback values apply:
    - wait 3.5 minutes from 08:00 to 19:00 and 10 minutes from 19:00 to 21:00;
    - ride = along-loop distance ÷ 4.15 m/s.
  - The derived file reaches Production with the next regular Release.
- **The average wait** at a stop is not half the headway but Σh² / (2Σh) over the observed headways h. This is the waiting-time paradox: irregular buses make the average wait longer.
- **Bands:** 08–11, 11–14, 14–17, 17–19, 19–21.

### 공강 파티: candidates and fit

- **Candidates:**
  - recruiting Quests, Open or Approval, visible as on the Boards;
  - published Global Events.
- **Left out, and neither returned to the model nor explained:**
  - full Quests;
  - Quests the User holds;
  - Quests the User has asked to join;
  - Quests for a Global Event whose Shared Quest the User already holds (what joining would refuse as `SHARED_QUEST_HELD`);
  - a Quest or Global Event with no start time inside the gap;
  - a candidate whose place cannot be mapped to a Place.
- **A Quest is judged on its first Sub Quest that starts inside the gap**, not on the existing next-Sub-Quest rule. That rule can pick an old Sub Quest with no end.
- **Mapping a candidate's place to a Place**, in order:
  1. the Sub Quest's Place;
  2. a Place whose point equals the coordinates exactly (collected Global Events match here);
  3. the Place the existing place lookup finds at the point (inside an outline or within 20 m of its wall);
  4. the nearest Place point within 150 m;
  5. a label that equals a Place name or number exactly;
  6. otherwise unknown, and the candidate is left out.
- **Fit:**
  - **Before.** With an item before the gap, the User leaves its Place at the start of the gap (the item's end, or now if that is later) and must arrive 1 minute before the candidate starts. Without one, the candidate only has to start after now.
  - **After, when the candidate has an end of at most 3 hours.** With an item after the gap, the User leaves the candidate when it ends and must reach the next item's Place 1 minute before it starts. Without one, there is no after side.
  - **After, when the end is unknown or longer than 3 hours.** The candidate fits when the User can stay at least 30 minutes before leaving for the next item. The card shows the leave-by time. Quests made in the app have no end, so this is the common case.
  - **Clock times** ("2시부터 3시 반") narrow the gap. A candidate must start inside the window, and when it has an end, that end must fall inside the window too. Travel still runs from the previous item's Place and to the next item, as for a gap.
- **Board.** `board` narrows Quests to that Board. Global Events have no Board, so they stay, and the model judges them by title like any other condition.
- **Order:** soonest start first. All fitting candidates are returned, with no cap. At most 20 become cards (the existing card limit). After the run, the 공강 Feature orders these cards by start whatever order the presenters were called in, so Quests and Global Events interleave.
- **Every number of the judgement** sits in one constants table, frozen with the evaluation:
  - 1 minute (arrival margin, for parties and meals);
  - 30 minutes (minimum stay at an open-ended or over-3-hour candidate);
  - 30 minutes (length of a Sub Quest with no end);
  - 3 hours;
  - 150 m;
  - 15 minutes (minimum eating time);
  - 5 minutes (rounding);
  - the meal windows;
  - 3 minutes (shuttle advantage).

### 공강에 밥: Friends, Restaurants and the meal Quest

- **Meals:** lunch 11:00–14:30 and dinner 17:00–19:30. These are the real hours across all Restaurants. Breakfast is not handled.
- **A Friend is free** when their Free Time and the User's share at least 15 minutes inside the meal window. Travel is not considered at this step. Only free Friends are returned and named.
- **The shared time** of the User and the named Friends is the intersection of their Free Time in the window.
- **Restaurants** are every collected one (Co-op, dormitory, veterinary college) that has a Place.
  - The app's hard-coded Restaurant → Place table (12 Restaurants) moves into a server seed.
  - A Restaurant's key is its name as `GET /menus` gives it, which is also its key in the seed.
  - `GET /menus` gains a `placeId` per Restaurant. The new app reads it for the dining layer and for the menu panel's "N동" label, and its hard-coded file is deleted. Old apps ignore the field.
  - A Restaurant not in the seed is left out.
- **Open (ADR 0010).** A Restaurant is open for a meal when that day's meal cell has at least one line that is not a note.
  - A cell of only notes (휴무, hours, ※ notices) is closed.
  - There are no special cases, and the worker's line classification does not change.
  - This adds to ADR 0001, which says the app cannot tell whether a Restaurant is open.
- **Fit and start time.** For each person:
  - Their free interval starts at the latest of: their previous item's end, the meal window's start and now.
  - in-travel = previous item's Place → Restaurant;
  - out-travel = Restaurant → next item's Place;
  - arrival = start of the free interval + in-travel.
  - **Start** = the latest arrival, rounded up to the next 5 minutes.
  - Each person must leave by the earlier of: their next item's start − 1 minute − out-travel, and the end of the meal window.
  - **식사 가능 시간** = the earliest leave-by − start.
  - The Restaurant fits when 식사 가능 시간 is at least 15 minutes.
  - When the shared time has several intervals, the earliest one in which the Restaurant fits is used. A window the model passes limits the search.
- **Travel shown per person:**
  - the in-time;
  - with no previous item, the out-time;
  - with neither, "—".
- **Order:** by the longest Travel Time shown, shortest first; then by the sum of the shown times; then by name. A "—" counts in neither and is never highlighted. At most 20 cards.
- **Menu conditions** ("면 빼고", "국밥 먹고 싶어") are read by the model from the menu lines it receives.
  - There is no condition code, keyword list or word-specific prompt hint.
  - "X 빼고" keeps Restaurants with at least one dish of that meal that is not X. "X 먹고 싶어" keeps those with an X dish.
- **The meal Quest on each Restaurant card** is a server-computed Proposal:

  | Field | Value |
  |---|---|
  | Join Policy | Closed, no Board |
  | Title | `<Restaurant>에서 점심` or `<Restaurant>에서 저녁` |
  | Start | the start above |
  | Place | the Restaurant's Place, named with the Restaurant's name (the form shows "학생회관식당 (63동)") |
  | Invitees | the Friends of this request |
  | Capacity | 1 + invitees |
  | Description | empty |
  | Global Event | none |

  - The card's 파티 만들기 opens the existing party form filled from this Proposal, the path 수정 already takes. No model call is made.
  - The form's own 파티 만들기 makes the Quest and invites through the existing making sequence.
  - The chat path ("여기로 하자" → `proposeQuest`) also stays.

### Tools of the 공강 Feature

**The rule is P07's: the model passes the User's words or ids it was given, and the server decides.**

- **`getMyDay(date)`** returns the User's items that day: id (a Class meeting's id is its ClassTime's), name (course name or Quest title), start and end. It never returns rooms, Places or coordinates.
- **`findFreeTimeEvents(date, from, to, board?, departurePlace?, leaveBy?)`**
  - `from` and `to` are each an item id, a clock time, `now`, or `end` (end of day).
  - It returns:
    - the gap or gaps found, each with its start, its end and the names of the items around it;
    - every fitting candidate, soonest first, with kind, id, title (wrapped as others' text), start, end, travel minutes and mode, and the minutes to the next item or the leave-by time.
  - Or it returns `needs` (Busy time and Free Time).
- **`findFreeFriends(date, meal | window, friendIds?)`**
  - It returns the User's Free Time in the window and the free Friends, each with id, name, department and the overlap.
  - With `friendIds`, it returns the time shared by the User and those Friends.
  - The model takes the Friends of a meal from this list. Two Friends with the same name differ there by department, which the shared `resolveFriend` does not give.
- **`findMealRestaurants(date, meal, friendIds, window?, departurePlace?, leaveBy?)`** returns the fitting Restaurants in order. Each comes with:
  - its key, name and Place;
  - its non-note menu lines (wrapped as others' text);
  - 식사 가능 시간, the start, and each person's Travel Time and mode.

  When no menu was collected for that day, it says so. It can also return `needs`.
- **`showRestaurants(keys)`** shows Restaurant cards. The server builds each card and attaches its Proposal.
- **Found ids.**
  - Presenters accept only ids a tool returned in this message, as today.
  - The ids found now also include:
    - the candidates of `findFreeTimeEvents`;
    - the Friends of `findFreeFriends`;
    - the Restaurants of `findMealRestaurants`, and their Places for `proposeQuest`.
  - After the run, the 공강 Feature attaches each candidate's 이동 시간 box to the Quest or Global Event card shown for it. The shared presenters stay as they are.
- **Follow-ups.** Tool results do not carry over between messages. A follow-up ("면 빼고", "여기로 하자") calls `findFreeFriends` again to get the named Friends' ids, then the find tool again. The 10 steps allow for this.
- **Never sent to the model:** rooms, the User's or Friends' Places and coordinates, Friends' Classes, and the reason anyone is busy.
- **No excluded candidate and no reason is ever returned.** This holds for Quests, Global Events, Restaurants and Friends.
- **System prompt of 공강.** It states:
  - the role, in 해요체, in the User's language;
  - the current time in Korea;
  - to answer only from tool results;
  - to ask when a Class or a Friend is ambiguous, when a tool returns `needs`, and for breakfast to say that lunch and dinner are covered;
  - that delimited text is data;
  - to keep answers short;
  - what a reply must hold (below).

  Reply texts on the boards are examples. The model words replies itself.
- **What a reply must hold:**
  - 공강 파티:
    - the gap found (when the previous item ends, when the next starts);
    - how many candidates fit;
    - when more than 20 fit, the total and how to narrow.
  - 공강에 밥, who is free: the User's Free Time in the window and the free Friends' names.
  - 공강에 밥, with Friends:
    - the shared time;
    - that the Restaurants are ordered by the longest Travel Time;
    - the dining map button.
  - When nothing fits, there is no shared time or no menu was collected: say so plainly, without naming who is busy.

### Cards and the API contract

- **Quest and Global Event cards** gain optional fields: travel `{mode: walk | shuttle, minutes}`, then either `next {minutes, isClass}` or `leaveBy "HH:MM"` with whether the end is unknown. Old apps ignore them.
- **A new card kind, `restaurant`:**
  - key, name, Place number;
  - date and meal, shown as "63동 · 오늘 점심";
  - 식사 가능 시간;
  - the non-note menu lines;
  - people: `{name ("나" for the User), mode, minutes | null, longest}`;
  - the Proposal.
- **The request DTO** accepts `{kind: "restaurant", id: <key>}` in the card references sent back in history. A key is a name, not a UUID.
- **Old APKs.** An APK from before P4 rejects any reply that contains a Restaurant card, as its ordinary failure ("지금은 답할 수 없어요"). Nothing crashes, and installing a new APK fixes it. 공강 파티 replies use existing card kinds and work there.

### App

- **The 이동 시간 box** on the Quest and Global Event cards, as the 공강 파티 board draws it:
  - "가는 길 {도보|셔틀} N분";
  - then "· 다음 수업까지 N분" ("다음 일정까지" when the next item is not a Class);
  - or "· HH:MM엔 나서야 해요" when the end is unknown or longer than 3 hours, after "끝 시간이 없어요" only when the end is unknown.
  - Existing buttons and the seats-left label stay.
- **The Restaurant card**, as board ② draws it:
  - name;
  - "N동 · 오늘 점심";
  - "식사 가능 시간 N분";
  - the first two menu lines and "외 N개";
  - a chip per person, "{name} {도보|셔틀} N분", with the longest highlighted;
  - 파티 만들기.
- **파티 만들기** opens the party form from the card's Proposal through the existing Proposal-to-form path. Board ③ shows the filled private form.
- **Restaurant cards** are sent back in history like other cards.
- **The dining layer and the menu panel** take each Restaurant's Place from `GET /menus`.
- **Attribution.** The 지도 데이터 출처 screen's OpenStreetMap card adds "도보 시간", and a card for SRTM elevation is added.

### Shuttle timing from the Dev log

**Collector (Dev only).**
- A small script and a systemd unit under `infra/deploy/`, like the existing `snu-now-*` units. It is installed once from the campus network on the Dev Server.
- It reads Dev Redis through `docker compose exec -T redis redis-cli`, because Redis publishes no port on the Dev Server.
  - Every 5 seconds it reads `shuttle:vehicles` and its remaining lifetime. The main server rewrites the key, with a 60-second lifetime, on each set the worker posts every 15 seconds.
  - A new set is a lifetime that jumped back towards 60 s. Its time is `receivedAt`, or for an empty set the read time − (60 s − the remaining lifetime). A missing key is an outage.
  - It records weekdays 08:00–21:00 only. Demo vehicles can appear at night and at weekends.
- **Format.** One CSV per day, outside the deployed checkout, such as `/srv/team/shuttle-log/2026-11-02.csv`.
  - One row per car per set, every car in every set, even unchanged ones. Logging only changes left 3 of 30 segments in a test.
  - Columns: `received_at` (KST, with `+09:00`; the main server stores UTC), `car_id`, `stop_id`, `stop_name`, `loop_order` (the stop's place in the stop seed).
  - A set log beside it keeps one line per set (time, number of cars), so that an empty set can be told from an outage.
  - Raw drawing positions are not kept. Redis holds only the snapped stop, and every observed position was exactly a stop.
- **Nothing on Production changes:** no Production Redis, manifest, image, Prisma schema or table.
- **Dates.** Collect on 11-02 (Mon) and 11-03 (Tue), and on 10-30 (Fri) if the collector and tools are ready. Afterwards the CSVs are fetched from the campus network, gzipped and committed as the fixed data of the shuttle metric.

**Tools.**
- `pnpm shuttle:derive` turns the CSV days into `shuttle-timing.json`.
- `pnpm shuttle:score` runs the shuttle metric.
- Both share one implementation of the cleaning rules below, and every dropped item is reported with its reason.

**Cleaning rules (frozen).**
- **Constants:**
  - **D_s**, the baseline drive from stop s to the next, = segment length ÷ 4.15 m/s. In seconds, from 정문 on: 80, 66, 86, 61, 39, 264, 70, 83, 55, 142, 120, 57, 53, 82. The loop is 5,226 m.
  - **Parking stops:** 정문, 38동 and 신소재공동연구소.
  - **LONG limit:** 신소재공동연구소 D_s + 180 s (444 s); every other stop D_s + 600 s.

| Rule | What it does | Fault it handles |
|---|---|---|
| R1 Clock | Read `received_at` in KST. Stop on a value without an offset, or on a set outside 07:55–21:05. Clean each date on its own. | UTC times moving every band. |
| R2 Sets | Each distinct `received_at` is a set. Drop a car listed at two stops in one set from that set. A repeated set time keeps the first. | Garbled or duplicate rows. |
| R3 Isolated sighting | Drop a sighting with no other sighting of that car within 60 s. | Ghost ids blinking in. |
| R4 Flicker | In three consecutive runs P, W, Q of one car, delete W when Q is at P's stop or the next, W has at most 2 sets or fewer than Q, and less than 8 min passes from P to Q. Merge P and Q when at the same stop. | A parked car drifting to a neighbouring stop; A-B-A flapping. |
| R5 Visit | A visit is a run, cut where the car is absent 8 min or more. Its first set is the arrival. | Brief dropouts splitting a visit. |
| R6 Move | Move V (stop a) → W (stop b), with g = W's first set − V's last set and k = (b − a) mod 14. In this order: ABSENT if g ≥ 8 min. JUMP if the loop distance a+1 → b exceeds 11 m/s × max(g, 15 s) ("backward" when k ≥ 12). STEP if g ≤ 35 s and k = 1. SKIP if g ≤ 35 s and k ≥ 2. GAP if g ≤ 120 s and k ≤ 2. BREAK otherwise. | Missed sets, skips (38동 can last one set), teleports, frozen positions. |
| R7 LONG | A visit is LONG when the time from its arrival to the next arrival exceeds its stop's LONG limit. | The 신소재공동연구소 layover and parked cars. |
| R8 Event (wait) | A visit left by a STEP, SKIP or GAP gives one event at its stop, and one at each skipped stop, at the car's first set at the next stop. This holds however long the visit was. The next visit must confirm the move: either it is left by a STEP, SKIP or GAP, or V was not LONG, W has ≥ 2 sets and W is not left by a backward JUMP. For banding, the event's time is that set's time minus D_s. | A parked car counts 0 times, a resting car once at its real departure, and a car that ends service and parks 0 times. |
| R9 Unknown windows | Mark the stops and times where a departure may have gone unseen: <br>• an unconfirmed move or a BREAK: stops a to b−1, between the two visits; <br>• a forward JUMP after standing under 10 min: stops a to b−1, from V's first set; <br>• a backward JUMP: stop a; <br>• ABSENT: all stops, unless neither side was timed; <br>• a set gap of 8 min or more: all stops; <br>• a car first seen mid-day or lost mid-day away from a parking stop: all stops, before its first set or after its last. <br>A car that vanishes at a parking stop gets a note only. | Unseen departures. |
| R10 Headways | A headway is the gap between consecutive events at one stop. It is dropped if it overlaps a window at that stop. | Waits from missing events. |
| R11 Wait | Riders arrive uniformly. A headway is split at band edges, and each band gets its part. A stop-band is scored only when at least 75% of its headway time was kept. | Long gaps credited to the wrong band; mostly lost bands. |
| R12 Ride | A segment is a visit entered by a STEP or SKIP, left by a STEP or SKIP into a confirming visit, and not LONG. Its time is the next arrival − its arrival, banded by its arrival. An A → B ride (1 to 13 stops ahead) is any run of consecutive segments of one car; its last visit may be LONG. | Untimed arrivals and the layover. Holds under 10 min elsewhere are real ride time (302동 holds to keep time). |

The rules were designed on a 30-minute pilot sample of 10-29 (15:50–16:20), which is never scored.

### Evaluation plan (frozen at the P8 freeze, 11-01)

Everything below is committed before any result: the cases, the world, the fixture, the labels, the pair list, the collection dates, the rules and every threshold.

**1. The Assistant, against the real model.**
- **A P4 suite** beside P19's, in the existing harness.
  - It lives in its own case directory, with its own world and its own default clock.
  - It has 40 cases: 공강 파티 15, 공강에 밥 15, 공통 10.
  - 공통 holds asking back, refusals, no Timetable, off-campus or no-Place items, and routing.
  - P19's directory, world, 62 cases and pinned counts are not touched.
- **Harness changes:**
  - a `now` per case;
  - the `restaurant` card kind, in `expect.cards` and in a fixed history's Assistant turns;
  - `text.absent`: words the reply must not hold (the names of Friends who are not free);
  - normalisers for the new tools.
- **What is checked**, with P19's assertion kinds and `text.absent`:
  - the action;
  - the tools called and their arguments (date, the two Classes, Board, Friends, meal);
  - asking back when the request is ambiguous or a tool returns `needs`;
  - exactly the cards the tools returned, none added or dropped, and no busy Friend named;
  - the fields of a Proposal from `proposeQuest`. The Restaurant card's Proposal is checked by integration tests only;
  - the reply's required content through `text.mentions`.
  - Routing shows in the tools: a case that must reach 공강 requires one of its tools, and one that must stay in chat forbids them.
- **Required cases:**
  - one gap where at least 21 candidates fit;
  - one follow-up turn that narrows it;
  - one "여기로 하자" turn after Restaurant cards.
  - The follow-ups are fixed-history cases.
- **The world:**
  - the User with a Timetable on at least 3 weekdays, gaps before the first and after the last Class, one off-campus item and one Class without a Place;
  - at least 5 Friends: one without a Timetable, one with no Classes that day, one with an off-campus item, and two with the same name in different departments;
  - a Quest for each exclusion, so that the checks confirm none appears;
  - a Sub Quest without an end, and Quests whose place is a label only or a point only;
  - Global Events with an end, without one, and longer than 3 hours;
  - lunch and dinner menus: a noodle-only Restaurant, a mixed one, a closed cell (notes only), an open Restaurant that does not fit the shared time, and a Restaurant without a Place.
- **The travel fixture.** A frozen file giving, for every ordered pair of Places the world uses, the seconds and the mode. It does not depend on the time of day. The labels do not change when the real table or the shuttle file changes.
- **Ground truth.**
  - A rules document states the judgement in prose and is committed with the suite.
  - An agent in a separate session, which sees only the rules document, the world and the fixture and not the judgement code, drafts each case's answer with its working.
  - A person reviews every answer and sets the labels that need a judgement of meaning:
    - which dishes are noodles;
    - "운동만": the tool call uses Board 취미, and the expected cards are the hobby Quests and the Global Events whose titles are sports, so board games drop out.
  - The suite records who drafted and who reviewed the labels. Meaning labels are the hard ones, and they are discussed with the TA as the course asks.
  - An integration test checks that the server's judgement on the world equals the labels.
- **Score.**
  - A case passes when all its assertions hold.
  - Thresholds: overall ≥ 80% and each category ≥ 70%.
  - Run 3 times and take the mean. Record the model, the limits, the commit and the date.
- **Regression.**
  - Before the router lands, P19's 62 cases run 3 times on the commit before it, with the same model and limits, and the runs are saved. They run 3 times again with the router.
  - A case newly fails when it fails in at least 2 router runs but in at most 1 baseline run. No case may newly fail.
  - The router's tags show which Feature each P19 case went to. Any case routed to 공강 is reported.

**2. The walking table, against walks.**
- **30 pairs**, committed with the walking method and, for each pair, the table's seconds and the baseline's seconds at the freeze.
  - Most are walks of 15 minutes or less. They must include the engineering hill (301동, 302동) and 관악사, plus a few longer pairs.
  - Where coverage allows, they are arranged as chains, each pair's destination the next pair's origin.
  - Calibration pairs, for later, are chosen apart from the test pairs.
  - Shuttle legs are not walked.
- **Walked after 11-01** with a stopwatch, recording only the time, the walker, the date and the time of day. A pair more than 2 minutes off gets one line on the route taken.
- **Metric:** per pair, |table − walked|. Summarised as the MAE and the share within ±2 minutes.
- **Baseline:** (straight-line distance × 1.2 + 60 m) at 1.1 m/s, on the same pairs.
- **Threshold:** at least 70% within ±2 minutes, and the table's MAE below the baseline's.

**3. The shuttle times, against held-out days.**
- **Leave-one-day-out.** Each collected day in turn is held out, and the constants derived from the other days are compared with it: 2 folds, or 3 with 10-30.
- **Ride:** the A → B rides of the held-out day against the per-band median. Baseline: along-loop distance ÷ 4.15 m/s. Metrics: MAE and the share within ±1 minute.
- **Wait:** the held-out day's Σh² / (2Σh) per stop and band against the prediction. Baseline: 3.5 minutes. Scored for 08–19 only, since after 19:00 a day has too few headways.
- **Pooling.** Errors are pooled over all folds:
  - the ride MAE is over every held-out A → B ride;
  - the wait MAE is over every scored stop-band (R11), each with equal weight.
  - A stop-band or pair-band missing from the training days is predicted with the fallback values.
- **Threshold:** the ride MAE and the wait MAE each below its baseline.
- Results come after 11-03.

### Documentation

- **ADR 0008:** the router and Features. It amends ADR 0005, which says one agent needs no orchestration of several and that each later feature has its own entry point.
- **ADR 0009:** Travel Time. It covers:
  - the OpenStreetMap pedestrian graph and the join rule;
  - SRTM elevation;
  - shuttle times derived from a few days of Dev logging, and why positions are collected there and not in a Production table;
  - that Kakao is not used for the table;
  - ODbL.
- **ADR 0010:** the meal open rule. It supplements ADR 0001.
- **GLOSSARY** gains Timetable, Class, Free Time, Restaurant, Travel Time, Shuttle Stop and Feature.
- **README** attribution: the OpenStreetMap row adds "도보 시간", and an SRTM row is added.

## Testing Decisions

- **What a good test is.** It drives the feature from outside and checks what a User or a client sees: an HTTP request and its reply, a press and what the screen shows, a command and the file it writes. It does not check internal calls, prompt wording or the model's prose.
- **Server: the existing seam, the assistant endpoint with the scripted model** (prior art: the `assistant-*` integration tests and the scripted model).
  - **The judgement, over the eval world.** One suite seeds the P4 eval world with its travel fixture. It calls each tool with the labelled arguments and checks the results against the reviewed labels: Free Time, fit, exclusions, the place mapping, Travel Times, free Friends and shared time, open Restaurants, order and start time.
  - **Separate integration tests** cover only what the world does not reach:
    - `needs`, then a departure Place or a leave-by time passed after asking;
    - the shuttle chosen only when ≥ 3 minutes faster, and not at weekends or after 21:00;
    - routing, with the real router over the scripted model, and chat as its fallback;
    - `data_collection: deny` reaching the model call;
    - the step limits;
    - a Restaurant card accepted in history;
    - the cards' 이동 시간 fields and their order across kinds;
    - the Restaurant card's Proposal, field by field.
- **The open rule** as a unit test on a committed fixture of the lines the worker parses from its saved menu pages of 2026-10-01.
- **Eval harness:** the case schema test in CI also loads the P4 suite. It checks the new fields and that every seed name exists, as it does for P19.
- **App: the existing fake-server screen tests** (prior art: the `chat-*` integration tests):
  - the 이동 시간 box in its forms;
  - the Restaurant card;
  - 파티 만들기 opening the filled form, and the form making the Quest and inviting;
  - the dining layer and the menu panel using `placeId` from the server.
- **New seam: the walking-table builder** (unit tests on small hand-made graphs):
  - the join rule (nearest + 20 m, main component only, no `sac_scale`);
  - the climb cost going up and none going down.
  - A test also checks that the committed table covers every seeded Place and Shuttle Stop.
- **New seam: the shuttle tools** (unit tests on hand-written CSV fixtures):
  - one fault-free day, on which nothing is dropped;
  - one fault fixture per rule, checking what is dropped and the reason given;
  - the leave-one-day-out score.
  - The collector is checked by hand on the Dev Server.
- **Not automated:** the real-model runs, the walks and the shuttle collection.
- **Budget.** Implementation outweighs tests. Each ticket tests the cases of what it adds, concentrated on the judgement and the cleaning rules. There are no tests of look or style.

## Out of Scope

- Friend status labels (수업 중, 공강, 오늘 수업 끝, 방해금지). The app's mock Friend status stays as it is.
- Any switch or consent for sharing Timetables, and any screen showing a Friend's Timetable.
- Highlighting Friends or Restaurants on the map, and any new map button.
- An attend button for Global Events (P5's core).
- Breakfast.
- A meal request with no Friends, or with more Friends than a Quest can hold. The card's Proposal is then not makeable as it is.
- Mentioning Friends who are not free, and explaining any excluded candidate.
- Storing off-campus items or their travel times.
- Changes to the chat's `getMenus`, to the worker's menu lines, or a seed of Restaurant hours.
- An academic calendar, holidays, 휴강 or exam weeks.
- Live positions in any judgement.
- Kakao in the table, or any comparison with Kakao.
- A grid table in place of Place × Place.
- A Production database log of shuttle positions, and real-time arrival prediction. These are the PM's later, separate work.
- The clockwise shuttle 41914.
- Calibrating the walking speed or climb before 11-01.
- An app version header, routing by version, or skipping unknown cards in the app.
- Demo Data for P4. The PM prepares it separately.
- The P22 write-up. For it, the builder's sensitivity mode re-runs the pin shift on the chosen rule. The 40 m figures stay as measured in the study.

## Further Notes

- **Technical depth** is the travel model and its validation:
  - the walking table with elevation;
  - its stopwatch evaluation against a baseline;
  - the join-rule sensitivity analysis and the grid study;
  - the shuttle's log-derived waits and rides, with the waiting-time paradox, the cleaning rules and the leave-one-day-out metric.

  The judgement and the exception rules are shown as eval cases instead.
- **Studies behind the decisions** (the PM keeps the outputs; nothing is committed by this spec):
  - **Grid study.** A grid instead of Place × Place was rejected:
    - versus the Place table, 25 m cells give an MAE of 46 s with 93% within ±2 minutes, and 50 m cells 85 s with 91%;
    - "a cell takes at most a minute to cross" fails at every size;
    - short trips come out long;
    - the table is 8–100 times larger.
  - **Join rules, with the pin-shift analysis.** The earlier 40 m rule against nearest + 20 m:

    | Rule | Unreachable pairs | 영선공장 → 우석경제관 | 10 m pin shift | 20 m pin shift |
    |---|---|---|---|---|
    | every path within 40 m | 458 (BK국제관 stranded) | 24.0 min (44 m apart) | 38.5 s | 65.1 s |
    | nearest + 20 m | 0 | 1.6 min | 26.6 s | 47.0 s |

    At a 10 m shift, 96.6% of pairs stay within ±2 minutes. These numbers came from a Python re-implementation of the builder.
  - **The shuttle pilot** (10-29): "운행 8대" included 4 cars that never moved. 신소재공동연구소 is the layover point, where cars left 5–7 minutes apart, but none left for 17 minutes. A lap took 20 minutes.
- **Known limitations:**
  - Days map to weekdays only. The shuttle treats holidays and vacations as weekdays.
  - Pre-P4 APKs fail replies that contain Restaurant cards.
  - A cell with only a heading, or a notice without ※, counts as open.
  - The feed's stop changes only within about 30 m of the stop, and our pipeline adds up to 25 s of lag (seen at 302동 on 10-29), so logged arrivals are that late.
  - The feed can still be wrong on some days (on 10-28 running buses were missing and others frozen). The cleaning rules reduce this but do not remove it.
  - A running car that leaves the feed at a parking stop makes waits about 0.6 minutes long. A duplicated car id counts ride samples twice.
  - The shuttle metric measures how consistent the logged days are with each other, not real rides, over only 2–3 days that one week's events or weather may bias.
  - The fallback wait of 3.5 minutes holds only when at least 3 cars are actually moving. On 9-30 only 2 of 6 moved.
  - A Friend's item without a Place makes their Travel Time unknown.
- **P5 touch points**, flagged for the PM to settle with 함재현:
  - If P5 is a Feature, the router chooses among three, and the router becomes shared.
  - The harness changes (per-case now, Restaurant cards, `text.absent`, normalisers) serve both.
  - "Can this User enter this Quest" (full, already asked, `SHARED_QUEST_HELD`) is the same predicate as P5's candidate filter.
  - Attending Global Events belongs to P5.
  - `findFreeTimeEvents`' fit judgement can serve P5's "reachable events".
- **P07 (input that learns) works on the same files in parallel.**
  - Its branches change the Feature definition, the adapter, the request DTO and the shared resolvers and `proposeQuest`. P4 tickets rebase on whichever lands first.
  - Its grey suggestions read Timetables with a free rule of their own ("free when no Class covers now"). Once P4 lands, the two should share P4's Free Time function. That is for the PM to settle with P07.
- **Departures from the boards:**
  - The 공강 파티 board's sentence about excluded parties is dropped.
  - Board ①'s "김민수님은 이 시간에 안 돼요" is dropped, and its "30분" is 15 minutes.
  - Chips name Friends as stored ("이민수"), not by given name.
- **Privacy policy.** Its body is still a placeholder. When it is written, it must say that a User's Timetable is open to their Friends: the Assistant uses it to tell Friends when the User is free.
- **Outside P4, not fixed here:** GLOSSARY's Demo Account entry still mentions a Meetup.
- **Dates:**
  - 10-30: the collector and the shuttle tools, if possible.
  - 11-01: implementation of both scenarios and the P8 freeze of everything under the evaluation plan; the HE APK is due at 23:59.
  - 11-02 and 11-03: shuttle collection.
  - After 11-01: the walks. After 11-03: the shuttle results.
  - Improvements follow in P11 and the design write-up in P22.
- **A ticket order that keeps a working Assistant at each step:**
  1. The router and the 공강 Feature, with `getMyDay` and walk-only `findFreeTimeEvents` on a fixture.
  2. The walking-table builder and its seed.
  3. 공강 파티 cards with the 이동 시간 box.
  4. The Restaurant seed, the open rule and `placeId`.
  5. `findFreeFriends`, `findMealRestaurants`, the Restaurant card and 파티 만들기.
  6. Shuttle travel with the fallback values.
  7. The collector and the shuttle tools.
  8. The P4 eval suite, its world and labels, and the P19 baseline runs.
  9. ADRs, GLOSSARY and attribution.

  The frozen items land before 11-01.
- The decision record of this spec, as questions and answers, is kept outside the repository in the author's notes.
