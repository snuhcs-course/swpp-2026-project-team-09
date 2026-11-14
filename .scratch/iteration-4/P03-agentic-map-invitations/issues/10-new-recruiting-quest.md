# 10: A new recruiting Quest planned on the map, and made

Parent: [P03 spec](../spec.md) ("Events and recruiting Quests answered on the map": the contract and "A new recruiting Quest")
Status: ready-for-agent
Blocked by: 09

## What to build

When no party fits, or the User presses "새로 모집", the Assistant plans a new recruiting Quest: the Place of the event or of the activity, the earliest time everyone of the Plan can be there rounded up to ten minutes (or the time the User said), the Friends free then, and each person's way. `POST /plans` makes it: posted for recruiting, with its steps, and an invitation for each Friend of the Plan. This is row "4. 행사" boards 같이 8 to 11 and row "5. 파티" boards 모집 4 to 5 and the rule board (the time and place said). The app's contract, check, and stored copy follow; the screen does not.

## Acceptance criteria

- [ ] `NewQuestInput` joins the union of `PlanInput`; the recalculation plans it, and `POST /plans` makes it.
- [ ] The Place: the Global Event's; else the Place the User said; else the Place where the recruiting Quests of the same activity meet when they all meet at one; else the answer asks for it.
- [ ] The time: the one the User said, as said; else the earliest everyone of the Plan can be there, rounded up to the next ten minutes (13:54 → 14:00; 지은 arriving 14:01 → 14:10; 17:02 → 17:10).
- [ ] The Friends free at that time who hold no Quest for the same Global Event are listed with their day's line ("지은 · 13:50 38동 수업 끝"). Following the design, for an activity they are in the Plan first (6.4), and for a Global Event they are offered (6.3). Removing them opens the spots to the public.
- [ ] The steps: with invited Friends who meet the asker there, "14:10 유상, 지은: 문화관 앞에서 만나기", then, for a Global Event, "15:12까지 채용박람회 · 301동으로 나서기"; for an activity, one step at its Place and time. Each person's part says when they set out and how.
- [ ] `POST /plans` posts it as an Open Quest on the Board the request names (Hobby when none, Career for a Global Event of that kind as the recruiting search maps it), capacity 4 or the number of people when more, with the steps and the invitations. For a Global Event it is the asker's Quest for that event, replacing one they held alone, and refused with 409 when they hold a Shared Quest for it. An invited Friend counts once they accept.
- [ ] A tool `planNewQuest` joins the events chat with what the User said (the activity's words, a Global Event, a Place, a time, Friends), and gives the model the Plan in words.
- [ ] The design's examples: row 4 (the job fair: 14:00 with nobody, 14:10 with 지은, steps as above), row 5 (badminton: 17:10 at the gymnasium with 서준 first, who sets out 16:56), and the rule board ("저녁 7시 301동 근처 탁구": 19:00 near 301동, as said).
- [ ] Unit tests of the time and the Place with their boundaries (an arrival on a ten-minute mark, a minute after, a Friend who arrives later than the asker, a time said), and integration tests of the tool, the recalculation, and the making.
- [ ] The app declares `NewQuestInput`, checks it, and stores a copy of the main server's real answer for the row 5 example.

## Comments
