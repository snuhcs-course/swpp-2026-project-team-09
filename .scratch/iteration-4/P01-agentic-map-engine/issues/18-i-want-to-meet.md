# 18: "만나고 싶다": when two are free, and where they meet

Parent: [P01 spec](../spec.md) ("The contract", "The gathering calculation"); package B's row 6 (P02 tickets 24 and 25)
Status: ready-for-agent
Blocked by: 17 (the contract's `plan` action)

## What to build

"민수랑 만나고 싶어", or the "만나고 싶다" button on a Friend's card, shows on the time band when the two are both free and draws a meeting place on the map. The place is chosen where the time together is longest, as a meal's is, from the places people gather and the two people's buildings (row 6, boards a5 and a6; design section 5). The band's busy stretches say what they are ("302동 수업", "수업", "일정"), so that a dragged band shows whom it clashes with.

## Acceptance criteria

- [x] `MeetInput` (`kind: 'meet'`, the date, the people, the window, and the Place) joins `PlanInput` on both sides. `PlanAnswersService` plans it, and `POST /assistant/answers` recalculates it.
- [x] The candidates are the Restaurants open that day, the libraries of the study-space list, 학생회관, and the two people's buildings.
  - Each person sets out by the gathering's rules. A Friend seen through the Timetable only sets out from the building where their Class ends; one with no position is counted without a walk.
  - The time together runs from the latest arrival to the earliest leave-by.
- [x] The answer is an `AnswerReply`, worded and drawn as a meal's, and each Plan has its `title` and `subQuests` (the meeting).
  - a5: 302동 앞 12:15–12:43, 28 minutes, then 301동 앞, 27.
  - a6, from 14:00: 신양학술정보관 앞 14:00–15:20, 80 minutes, then 학생회관, 73. (On the real walking table 302동 앞 comes first; see Comments.)
- [x] A `planMeet` tool joins the chat for an app with the capability `meet`, and `context-lines.ts` writes a meet on screen as it writes a meal.
- [x] `TimeBand.lanes[].busy[].label?` on both sides: "302동 수업" for a Class with a Place, "수업" without one, "일정" for a Sub Quest. Every Plan's band gets it.
- [x] Unit tests on the worked examples; integration tests at the endpoint and the recalculation.

## Decisions (2026-11-15)

1. **The contract** is the one in package B's seams note, sections "만나고 싶다" and "A busy stretch's words".
2. **The shortest time together** that counts is 15 minutes, as a meal's.

## Comments

### Decisions taken in the build (2026-11-15)

1. **The places and their names** (`gathering/meet-gathering.ts`, `meetingPlaces`). Each Place is a candidate once, under the first name it gets, in this order: the building each person sets out from for the stretch ("302동 앞", by its number), 학생회관 (by its name), every building of the study-space list (`GET /study-spaces`, by the Place's name: "신양학술정보관 앞"), then the Restaurants with a lunch or a dinner menu that day (by their keys). So 302동식당 is "302동 앞" when someone sets out from 302동, and 학생회관식당 is "학생회관". "The two people's buildings" are the Places they set out from for the stretch (their origins), not where they are now: at 14:00 the User sets out from 24동, not 301동.
2. **A meet lies between 09:00 and 22:00** of its day, narrowed by the window the User fixed. Without these hours a later day's meet would start at 00:00.
3. **No merging point.** Everyone walks to the place on their own (`gather`'s new `merging: false`). Meeting on the way would be the meet itself, and the building one sets out from is already a candidate. With merging, a5's 신양학술정보관 앞 counted 26 minutes for a pair who had been together since 12:18.
4. **At most five Plans**, the longest first, as a meal's answer has about as many. With every library, a5 has twelve Plans; the reply was 146 KB and the map held eleven numbered marks. Dropped places stay as a meal's (in a5: SK경영관 앞, 사회과학관 앞, 생명공학연구동 앞, and 국제대학원2 앞).
5. **A fixed start is a chip of the new kind `from`** ("14:00부터"), which takes the place of the end chip unless the User fixed an end too. Ticket 25's a6 draws it; no other kind fits.
6. **The words.** Lines: "**{HH:MM} {place}**에서 만나요" / "{HH:MM}까지 함께 {N}분이에요". The basis is a meal's (each Friend's start and leave-by, the User's way there and on). No "…에야 도착해요" line: the first line already says when everyone is there. Title and Sub Quest: "{place}에서 만나기". The place's flag: "{HH:MM} 만남". No plan: "같이 비는 시간이 없어요", or "함께 15분 이상 있을 수 있는 곳이 없어요" (with a fixed Place, who stays there shortest and why, as ticket 19 words it).
7. **The band** runs from the half hour at or before the later of now and 09:00 to the half hour at or after the later of half an hour past the Plan's end and the end of the last item in anyone's day, so that it covers the stretch it can be dragged over (a5 and a6: 12:00–18:30). Its text is "{start}–{end} · 함께 {N}분".
8. **A meet has the asker and at least one Friend**; one without a Friend is refused with 400.
9. **The busy labels** are on every Plan's band (meals, events, recruiting Quests, and meets), and on a menu Lookup's, which is its meal Plan's band. The way and shuttle Lookups' bands are left without them.
   - A Friend's lane shows a Sub Quest as "일정", with no name or Place. A meet's band runs to the end of anyone's last item, so it shows a Friend's busy stretches for the afternoon, where a meal's showed about an hour. They are kept: they are the other side of the free time together that the answer already states, and the gathering already counts them.
10. **The app does not send `meet` yet**: `ANSWER_CAPABILITIES` stays as it is, as with `events`, until the screen draws a meet (P02-24). The mock answers a meet's recalculation with the a5 copy and has no words for "만나고 싶어" in the chat, as the server gives `planMeet` only to an app that sends `meet`.
11. **A meet's people are read as a meal's**: `MealPlanService.friendsOf`, `peopleOf`, `refuseUnknownPlaces`, `placeIdAt`, and `placeOf` are now public and `MeetPlanService` calls them, so every Friend is read through the Friend view in one place. `StudySpacesModule` exports its service.
12. **The chat**: `planMeet` and `MEET_RULES` are added after the meal's (and the events') tools and rules; without `meet` the prompt and the tools are as before. The model gets the place's name, clock times, minutes, and names.

### Differences from the boards (on the seed's walking table)

- **a5**: the first two Plans are the board's (302동 앞 12:15–12:43, 28 minutes; 301동 앞 12:18–12:45, 27). Three more follow, "1/5" in place of "1/2": 유회진 학술정보관 앞 12:19–12:46, 신양학술정보관 앞 12:25–12:52, and 학생회관 12:32–12:59, all 27 minutes, ordered by the earlier start. Four places are dropped and drawn faded. A candidate's mark reads its name alone ("301동 앞"), as a meal's, not "301동 앞 · 함께 27분".
- **a5's basis** reads "민수 12:15 302동 수업 끝 · 15:30에 나서요", "301동 → 302동 앞 걸어서 3분", and "302동 앞 → 24동 걸어서 17분, 그래서 12:43에 나서요", not "민수 수업이 12:15에 302동에서 끝나요" and "24동까지 302동에서 17분, 301동에서 15분". There is no shuttle line: the gathering walks. The card's third line ("내가 3분 걸어가요 · 12:43에 나서요") is in the basis.
- **a6** (from 14:00): 302동 앞 comes first, 14:07–15:30, 83 minutes: 민수's own building, where 민수 stays until the 15:30 Class while the User walks 17 minutes from 24동. Then 유회진 학술정보관 앞 14:04–15:26 (82), 제1공학관 앞 14:05–15:27 (82), 신양학술정보관 앞 14:00–15:20 (80, the board's first), and 제3학생식당 앞 14:00–15:15 (75). 학생회관 (73, the board's second) is not among the five; 중앙도서관 관정관 앞 (74) is also longer. The board left 민수's building and the other libraries out of a6.
- **a6's lines** end "에서 만나요" (the board: "에서"), and its basis is a meal's, not "나는 13:50에 24동 수업이 끝나요" and "학생회관은 민수가 17분 걸어 73분이에요". The chips match ("24동에서", "14:00부터", "민수"), and 민수 is drawn from the Timetable at 302동.

### Agent usage (2026-11-15)

- Agent time: about 1 hour 15 minutes, an estimate from the session transcripts: the build about 53 minutes, a review of the diff about 12, and the coordinating session about 8 (writing the ticket, the review's fixes, the Main merge, and the pull request; part of that stretch went to other pull requests).
- Tokens, subagents included:
  - Input: 662 uncached, plus 90,092,557 cache reads and 727,497 cache writes.
  - Output: 293,222.
