# 13: The Tutorial Quests in order, before the next Class

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md); design section 6.5
Status: ready-for-agent
Blocked by: 12 (the contract's `order` and `steps`)

## What to build

"새내기 퀘스트 뭐부터?" orders the User's Tutorial Quests that are not completed and have a Place. The order is the one that fits them all before the next Class, and the Assistant numbers them on the map with their times. It says first what decides the order, and offers "1번부터 길 안내" (wireframe row 7, board q10; design section 6.5, steps 1 to 3).

## Acceptance criteria

- [x] A tool answers the User's open Tutorial Quests with a Place as a Lookup of kind `tutorial`:
  - the Places numbered in order, each tagged with its arrival and the quest ("13:51 보건진료소");
  - the walks between them, and on to the next Class as the next item;
  - the steps "13:51 학생회관 3층 · 보건진료소";
  - the lines: the time all are done, and the next Class;
  - "1번부터 길 안내" (`guide` to the first).
- [x] The order fits as many as can be done before the next Class, the shortest total walk first. Quests that do not fit are left out, and the basis says which, and why.
- [x] A quest whose facts say when it can be done (the student card "from the day after applying on MySNU", an office's hours) keeps its fact in the basis. A quest whose office is closed then is left out, with the reason.
- [ ] The Assistant never marks a quest done: the card's foot says "완료는 퀘스트에서 직접 눌러요" (design 6.5's rules).
- [x] Unit tests for the order with stays and walks chosen by hand; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The time spent at a quest's Place** is not in the Tutorial data. Each stop takes **10 minutes**, as board q12's "받는 데 10분" does, unless the quest's content gives its own minutes. To change it, a quest in `content/tutorial.yaml` may later gain `minutes:`. This is the one value a person should review.
2. **Only quests with a Place** are ordered (S-CARD, 천원의 식사, 분실물센터, 노트북 대여, 관정, 행정관 셔틀, …). Online quests (S/U, ChatGPT Edu, MS365) are named in one basis line as "온라인으로 할 수 있어요".
3. **The order** is the best of every order of at most five stops, a brute force: five stops make 120 orders.
4. **A quest with several Places** (S-CARD: 67동 and the bank in 4동) uses its first Place.
5. **The start** is where the User is, as for a way (ticket 06): the Place of their location, else that of their last Class today.

## Lines in other packages' files (for the app's part, after #270)

- Package B: the numbered dot of ticket 12.
- Package D's first-run files: none are needed. The first run's end (row 12) may offer the chip "새내기 퀘스트 뭐부터?"; that is D's choice, and nothing here depends on it.

## Comments

### Decisions taken in the build (2026-11-15)

1. **The quests ordered** are the User's quests not completed, `notStarted` or `started`, that have a place, in the content's order, each at its first place (decision 4). A place by number is its seed Place, walked to and drawn at the Place's point. A point is walked to from the Place it is in or the nearest within 150 m, as a way reads a location (the 행정관 셔틀 정류장 from 문화관, 97 m away), and drawn at the point. A point with no Place that near is left out as "걸어서 몇 분인지 몰라 뺐어요"; none is today.
2. **The order** (`lookup/tutorial-order.ts`) is the best of every order of at most five of those quests, searched depth first and cut where a stop would end after the deadline: with all twelve open, 95,040 orders of five. The best has the most stops, then the earliest end, then the shortest total walk with the walk on to the next item; a tie keeps the content's order. Ending first comes before walking less, so that a short walk to an office that has not opened yet, and a wait there, does not win over the stops that can be done now. Each walk is the walking table's, rounded up to the minute as a way's.
3. **Hours.** The content gave hours only in its text, where the 보건진료소's "12:00–13:30에는 진료하지 않아요" reads like an opening, so `content/tutorial.yaml` gained `visit` for the four quests whose text states hours: `note`, the line the Assistant says of when the quest can be done, and `hours`, spans "HH:MM-HH:MM" on the days listed or on every day. S-CARD: weekdays 09:00–17:50, its body's 수령 line. 분실물센터: 09:00–18:00 on every day, as the notice gives no days. 노트북 대여: weekdays 09:00–18:00. 보건진료소: Monday to Thursday 09:00–12:00 and 13:30–17:30, Friday until 16:30. `GET /tutorial` does not serve `visit`, as it does not serve `facts`. A stop starts when the User is there, or when its place opens, and ends before it closes.
4. **Left out, with why**, judged for the quest alone, after the walk to it: no time, when its arrival leaves less than a stop before the deadline and the walk on, whatever its hours; closed, when there is the time but its hours hold no stop in it; one more than five; not on the walking table; else no time, as it fits alone but not with the others. Each quest left out that has a note has it after its line in the basis.
5. **Setting out** is now rounded up to the minute, or the end of the item going on then, an item that begins within that minute counting as begun (at 12:59:30, a Class at 13:00). It is from the Place the User names (`from`), else from where a way sets out (ticket 06, `startOf`). The deadline is the User's next item of any kind, a Class or a Sub Quest with or without a Place, "17:00 수업" for a Class, with the walk on to it only when it has a Place; with none, 18:00 (decision 14).
6. **The words.** The lines "세 곳을 돌면 **14:29**에 끝나요" / "다음은 **17:00 수업** · 58동": "다음은 **15:00 수업**" for a next item without a Place, and "오늘 남은 일정이 없어요" with none. The chips "24동에서" and "17:00 수업까지". A step is the start of the stop and the Place's name with the content's floor, or a point's label, then the quest's title. The basis: "가장 일찍 끝나는 순서예요 · 58동까지 모두 걸어서 14분" ("모두 걸어서 1분" with no walk on), "한 곳에 10분씩 잡았어요", the notes of the stops in order, each quest left out as "title · 17:00 수업 전에 시간이 모자라 뺐어요" or "… 전에는 열지 않아 뺐어요" ("18:00 전에 …" with no next item), and the online quests in one line, "ChatGPT Edu 무료로 쓰기, 캠퍼스 라이선스 소프트웨어 받기 · 온라인으로 할 수 있어요".
7. **The scene.** The User at the start ("나"), each stop a `pick` numbered by `order` and tagged "13:51 서울대 보건진료소 이용", and the next item a `next` place tagged "17:00 수업 · 58동" when it has a Place. The walks are `me` routes from the start's Place, a walk of 0 minutes between quests at one Place not drawn, and the walk on, when there is one, is a `next` route. No flag and no band. A stop's point holds its Place's id, the step's words as its label, and the quest's own point.
8. **The action** is `guide` to the first stop. Nothing completes a quest, and the rules say the User completes it in the quest.
9. **No order** is answered as none: every quest with a place is completed (the online ones named), where the User sets out from is not known (the model asks, and calls again with `from`), or no quest fits (each with why).
10. **What the model is given**: where the User sets out from and what that is, each stop's time, quest, Place words, walk, and `when` (the note), when all are done, the next item (its Place and walk on null when it has no Place), `minutesPerStop`, the quests left out with why ("closed when the User could be there", "no time before the next item", or "no time before 18:00, when the order ends"), and the online ones. findTutorialOrder takes `from`, a Place that resolvePlace returned in this message or the tapped Place, refused otherwise, as findWay's. No coordinate, id, course name, or room: the Place words are the seed's name, so 노트북 대여 is at "정보화본부", not the content's label "정보화본부(102동) 101호".
11. **The rules.** `TUTORIAL_ORDER_RULES` sends "새내기 퀘스트 뭐부터?" to findTutorialOrder and a question about one quest to getTutorial, as before. A start the User names ("301동에서") or taps is resolved and given as `from`; when where the User sets out from is not known, the model asks, then calls again with it. The reply says first what decides the order, then a stop's `when`, names what was left out, and never says a quest is done.
12. **The code.** The brute force is `lookup/tutorial-order.ts` (`orderOf`, `STOP_MINUTES`, `NO_NEXT_CLOSING`), the stops and their hours `lookup/tutorial-lookup.ts` (`tutorialAnswer`), the words and the map `lookup/tutorial-words.ts`, the reads `lookup/tutorial-order.service.ts` (`TutorialOrderService`), and the tool with its rules `lookup/tutorial-order-tools.ts` (`findTutorialOrder`, `TUTORIAL_ORDER_RULES`). `WayService` lends its reads of where the User is (`located`, `gatePlaceId`, `placeIdAt`, `placeOf`). The Lookups' services reach the chat as one provider, `LookupServices`, which keeps `AssistantService`'s constructor under the lint's 50 lines.
13. **The app.** The contract and the reply check gained the kind `tutorial`. The copy `mobile/src/api/mock/data/tutorial-lookup.json` was written by the server's `tutorialAnswer` over the content, the seed's Places, and the walking table, for board q10 on Tuesday 2026-11-17 at 13:50, with the asker's id of the meal copies; the reply check passes it, and the mock answers no message with it.
14. **With no next item the order ends at 18:00** (`NO_NEXT_CLOSING`), when campus offices close, so that a stop without hours is not offered at night.

The values a person should review are decision 1's 10 minutes a stop, with whether a quest such as 관악산, 미술관, or 천원의 식사 is a stop of 10 minutes at all, and decision 14's 18:00. A quest may gain `visit.hours` (and later minutes of its own) in the content.

### Where the data differs from the boards

- The order. The walking table gives 24동 → 63동 1 minute, 63동 → 101동 7, 101동 → 67동 1, 63동 → 67동 8, and 67동 → 58동 5. The board's order, 보건진료소 → 학생증 → 분실물센터, ends at 14:30 and walks 15 minutes to the 17:00 Class; 보건진료소 → 분실물센터 → 학생증 ends at 14:29 and walks 14, so it is the order: 13:51, 14:08, and 14:19. The board's 14:04, 14:15, and 14:20 give each stop less than 10 minutes.
- The quests are called by their titles, as the Tutorial's list calls them ("서울대 보건진료소 이용", "학생증(S-CARD) 발급받기", "분실물센터 위치 알아두기"): the content has no short names such as the board's "보건진료소" or "학생증 받기".
- The seed names 67동 "NH농협두레문예관", so the step reads "NH농협두레문예관 2층", not "두레문예관 2층".
- The S-CARD's note adds its hours: "학생증은 MySNU 신청 다음 날부터 받아요 · 평일 09:00–17:50". It is in the basis, as the criteria put it; the board shows it as the card's line.
- The second line, "다음은 17:00 수업 · 58동", is not on the board, whose next Class is only its tag.
- The foot "완료는 퀘스트에서 직접 눌러요." has no field in the Lookup, and "1번부터 길 안내" is the `guide` action to the first stop: both are the app's words (below).

The tests were run on the build machine and pass: `tutorial-order.unit.test.ts` (11), `tutorial-lookup.unit.test.ts` (11), `tutorial-lookup-times.unit.test.ts` (7), the endpoint's `assistant-tutorial-order.integration.test.ts` (3) and the test of an app without `answer` in `assistant-day.integration.test.ts`, and the app's `tutorial-lookup.unit.test.ts` (1), with lint, typecheck, and format of both projects.

### For the app's part (after #270)

- The stops are places of role `pick`, which `answer-marks.ts` draws under one id, `answer:pick`: the drawing keys a numbered pick by its `order`. Quests at one Place share its point (63동 holds the 천원의 식사, the 보건진료소, and the 대학생활문화원).
- A `tutorial` Lookup's card draws the foot "완료는 퀘스트에서 직접 눌러요." and labels its guide "1번부터 길 안내"; the card draws `steps`.

### Agent usage (2026-11-15)

Left for the coordinator.
