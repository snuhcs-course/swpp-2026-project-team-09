# 10: A new recruiting Quest planned on the map, and made

Parent: [P03 spec](../spec.md) ("Events and recruiting Quests answered on the map": the contract and "A new recruiting Quest")
Status: ready-for-agent
Blocked by: 09

## What to build

When no party fits, or the User presses "새로 모집", the Assistant plans a new recruiting Quest: the Place of the event or of the activity, the earliest time everyone of the Plan can be there rounded up to ten minutes (or the time the User said), the Friends free then, and each person's way. `POST /plans` makes it: posted for recruiting, with its steps, and an invitation for each Friend of the Plan. This is row "4. 행사" boards 같이 8 to 11 and row "5. 파티" boards 모집 4 to 5 and the rule board (the time and place said). The app's contract, check, and stored copy follow; the screen does not.

## Acceptance criteria

- [x] `NewQuestInput` joins the union of `PlanInput`; the recalculation plans it, and `POST /plans` makes it.
- [x] The Place: the Global Event's; else the Place the User said; else the Place where the recruiting Quests of the same activity meet when they all meet at one; else the answer asks for it.
- [x] The time: the one the User said, as said; else the earliest everyone of the Plan can be there, rounded up to the next ten minutes (13:54 → 14:00; 지은 arriving 14:01 → 14:10; 17:02 → 17:10).
- [x] The Friends free at that time who hold no Quest for the same Global Event are listed with their day's line ("지은 · 13:50 38동 수업 끝"). Following the design, for an activity they are in the Plan first (6.4), and for a Global Event they are offered (6.3). Removing them opens the spots to the public.
- [x] The steps: with invited Friends who meet the asker there, "14:10 유상, 지은: 문화관 앞에서 만나기", then, for a Global Event, "15:12까지 채용박람회 · 301동으로 나서기"; for an activity, one step at its Place and time. Each person's part says when they set out and how.
- [x] `POST /plans` posts it as an Open Quest on the Board the request names (Hobby when none, Career for a Global Event of that kind as the recruiting search maps it), capacity 4 or the number of people when more, with the steps and the invitations. For a Global Event it is the asker's Quest for that event, replacing one they held alone, and refused with 409 when they hold a Shared Quest for it. An invited Friend counts once they accept.
- [x] A tool `planNewQuest` joins the events chat with what the User said (the activity's words, a Global Event, a Place, a time, Friends), and gives the model the Plan in words.
- [x] The design's examples: row 4 (the job fair: 14:00 with nobody, 14:10 with 지은, steps as above), row 5 (badminton: 17:10 at the gymnasium with 서준 first, who sets out 16:56), and the rule board ("저녁 7시 301동 근처 탁구": 19:00 near 301동, as said).
- [x] Unit tests of the time and the Place with their boundaries (an arrival on a ten-minute mark, a minute after, a Friend who arrives later than the asker, a time said), and integration tests of the tool, the recalculation, and the making.
- [x] The app declares `NewQuestInput`, checks it, and stores a copy of the main server's real answer for the row 5 example.

## Comments

### Decisions (2026-11-15)

- `NewQuestInput` names either a Global Event, with no title and no Place, or a title and a Place, else 400; its people carry no constraints, and the people are refused as a meal's are (the asker first, each once, only the asker's Friends). It gains an optional `board`.
- The Place comes from the tool, never from the recalculation: the Global Event's (its point mapped to a Place, as ticket 08 does); else the Place the User said; else, from the ids `searchRecruitingQuests` returned, the Place of the step each is judged on (ticket 09), when they all meet at one. Otherwise `planNewQuest` answers `needs-place`, and the model asks. The input then holds that Place, so a recalculation plans the same.
- The Place is called by the Global Event's own words, else by the Place's name, as the Quest's Sub Quest will show it ("체육관", and "제1공학관" for a Place said as 301동).
- The time is the one said; else the earliest every person of the Plan can be at the Place, each from the first stretch of Free Time still on then, by the faster of walking and the shuttle, rounded up to the next ten minutes; for a Global Event that has not started, no earlier than its start. An activity with no time said on a day other than today has no "earliest": the tool answers `needs-time` and the recalculation refuses it with 400.
- The second line says whose arrival set the time ("13:54에 도착해서 14:00에 모여요", "지은이 14:01에 도착해서 14:10에 모여요"); there is none when the time was said or is the event's start. The first line is "**14:10 문화관** · 4명 공개 모집", the capacity the making will post.
- The stay ends at the earliest of the Global Event's end (30 minutes after its start when it has none) and every person's leave-by; an activity, which has no end of its own, lasts 30 minutes, as a Sub Quest with no end is busy, unless someone must leave sooner. With the asker busy at the time, or no minute together, there is no Plan: "그 시간엔 모일 수 없어요", reason `no-fit`.
- Each person's way is from the stretch of Free Time the time lies in: set out as late as still has them there, or as soon as free when they cannot make it. Friends' origins come from their Timetable alone: positions are left to the Friend view, which is not on this branch.
- The steps: with Friends, "유상, 지은: 문화관 앞에서 만나기" (the asker and every Friend of the Plan, since all meet at the Place at the time), then the event step or the activity step, both at the time and the Place. The event step is "15:12까지 채용박람회 · 301동으로 나서기" when the asker's leave-by ends the stay ("15:12까지 채용박람회" when the next item has no Place), and the event's title otherwise; the activity step is its title. Every step runs from the time to the Plan's end, since a meeting step that ended where the next starts would end as it starts.
- The Friends who could come are the asker's other Friends who hold no Quest for the Global Event and are in Free Time at the time, with their day's line: "지은 · 13:50 38동 수업 끝", or "15:00 수업 전까지 비어 있어요", or "일정이 없어요".
- For an activity the tool puts the Friends free then into the Plan when the User named none, at most three so that the Quest stays at four, by planning once, taking them, and planning again; the recalculation plans exactly the people it is given, so removing them opens the spots and lists them again as Friends who could come. For a Global Event they are only offered.
- A Plan's id is its Place's id; it has no `meeting` (everyone meets at the Place); the person chips are a meal's.
- `POST /plans` plans the input again through the dispatcher the recalculation uses and takes the Plan by id and start (409 `PLAN_CHANGED`). It posts an Open Quest on the input's Board (Hobby when none), capacity 4 or the people when more, the asker its only Holder, with the Plan's steps and an invitation for every Friend of it in the same transaction, and tells them after the commit as a meal's making does. A Plan with no Friend is made, with no invitation.
- For a Global Event the Quest is made with `QuestsService.createForGlobalEvent`, which now takes extra steps after the attending one, with the asker's row locked first, after `freeForSharedQuest`: a Quest the asker held alone for the event is replaced, and a Shared Quest refuses with 409 `SHARED_QUEST_HELD`. The Board comes from the model, which picks `career` for a job fair as the recruiting search's Boards name it.
- The model is told the Plan's title, place, start, stay, each person's set-out time, minutes, and way, the capacity, and the names of the Friends who could come.
- The app's stored copy is the main server's answer over the integration stage with the design's shuttle, to "새로 모집" after a search for badminton, asked on Thursday 2026-11-19 at 16:45, with the asker's id renamed to that of `meal-answer.ts`.

### Agent usage (2026-11-15)

Built with ticket 09, where the agent time and the tokens of both are recorded.
