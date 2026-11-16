# 15: A Plan taken alone is a Quest held alone ("여기로")

Parent: [spec](../spec.md) ("A Plan taken alone"); the user's request of 2026-11-16 ("혼자하는 모든 것들도 퀘스트화 할 수 있어야해. 예를 들면 혼자 밥 먹는거 혼자 공부하는 거 혼자 행사 가는 것 등"); the glossary's Quest ("held by one or more Users"); the design's 6.1 Alone 4 and 6.3 Alone 2 to 4; boards AmHungry s1 to s5 and AmEvent a1 to a5.
Status: ready-for-human
Blocked by: nothing (starts from `4.0/Main` after the Release `snunow/all/26.11.16-1`)
Native files: no

## What to build

A Plan the User takes becomes a Quest held by the people in it; with one person it is a Quest held by that User. `POST /plans` takes a Plan for one person and makes a Quest the asker holds alone, with its leave-by. In the app, an events Plan gets "여기로", and the card after it says where the User goes and whether they will be told when to leave, with "다시 고르기" and "닫기".

Package D builds on this: the meal's "여기로" (P05-14, reworked onto `POST /plans`) and the seat's Quest.

## Behaviour

- **Server.**
  - `POST /plans` takes an events Plan, or a meal's or a meet's whose people are the asker only. It plans again as before, finds the Plan by id and start, and makes a Quest taken alone (`takenAlone: true`): Closed, capacity 1, on no Board, held and led by the asker alone.
    - A meal's Quest has the Plan's steps.
    - An event's Quest points at the Global Event, in place of a Quest the asker held alone for it.
  - It keeps the leave-by and answers the Quest with `alone: { lines, remindAt }`. `invitations` and `askLevels` are empty.
  - `PLAN_ALONE` is gone.
- **The leave-by** is the `leave-by` Notification, for the first walk of 5 minutes or more whose time is still ahead: to the Plan's Place, or else on from it to the next item. Its words name the next item ("13:00 수업에 맞아요.") and say a shuttle ride as one.
- **Giving it up.** "다시 고르기" is `DELETE /quests/:questId`, which ends the Quest and its leave-by. The Plan's card shows again, and "여기로" makes another.
- **Not a 파티.**
  - 내 파티 leaves it out, and the Quest list and the everyday map call it a 퀘스트.
  - It is in no recruiting list and invites nobody.
  - A Friend going alone to an event is still a candidate of a new party for it.
- **The app.**
  - An events Plan's buttons are "여기로" (main), "같이 갈 파티", and "새로 모집".
  - "여기로" posts the Plan as "이대로 초대" does and asks about push.
  - The card after it is the taken card. "닫기" starts the route guidance to the Place, or only closes when the User is there.

## Acceptance criteria

- [x] **Meal (s4b, s5).** `POST /plans` for the asker alone at 301동식당 makes a Quest taken alone (`takenAlone`, capacity 1) with "301동식당에서 먹어요" / "12:45에 나설 시각을 알려 드릴게요". Its leave-by row reads "지금 나서요 · 24동까지 걸어서 15분" and opens `party:<questId>`.
- [x] **Meal (s4).** At 학생회관식당: "학생회관식당으로 가요" / "수업까지 1분이라 나설 알림은 없어요", and no leave-by.
- [x] **Job fair (Alone 3).** Taking the job fair makes a Quest held alone for the Global Event, with "채용박람회에 가요" / "15:12에 나설 시각을 알려 드릴게요" and "301동까지 걸어서 18분".
- [x] **Concert (Alone 2).** Taking the concert keeps the leave-by for 17:42 by shuttle.
- [x] **The same event again, and a party held.** Taking the same event again leaves one Quest and one leave-by. A Shared Quest held for it refuses with 409 `SHARED_QUEST_HELD`.
- [x] **다시 고르기 and others.** "다시 고르기" (`DELETE /quests/:questId`) ends the Quest and its leave-by. A Friend's recruiting list of the event leaves the Quest out. A Friend holding the event alone is a candidate of a new party.
- [x] **App.** "여기로" on the job fair sends the Plan to `POST /plans` with a key and shows the taken card.
  - "닫기" starts the guidance to 문화관.
  - "다시 고르기" sends `DELETE /quests/:id`, shows the Plan again, and the next "여기로" sends a new key; its failure keeps the card and says so.
  - The push sheet shows after "여기로".
- [x] 내 파티 leaves out a Quest taken alone. The Quest list and the map card call it a 퀘스트. A 비공개 파티 held alone so far, and one the form made with capacity 1, keep their words.
- [x] The mock answers an events Plan taken alone, and its `dropQuest` ends the Quest it made.
- [ ] The screen is run on the Android emulator by taps, and the pull request carries the taken card.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass in both projects; no native file changed. The schema gains one column, `quests.taken_alone`, by an additive migration.

## Comments

### Decisions for review (2026-11-16)

Rules 1 to 8 are the orchestrating session's (`solo-quests/rule.md`). They are kept as written, except where a reason follows.

1. **One rule.** A Plan the User takes becomes a Quest held by the people in it, and with one person a Quest held by that User. `PLAN_ALONE` is gone, and there is no `POST /plans/alone` and no `leave-alone` kind.
2. **What it covers**: a meal alone, an event alone (the Quest points at the Global Event), a study seat alone (package D), and any other Plan kind shown for one person. A meet always has a Friend: its input refuses one person before `POST /plans` sees it.
3. **How it is taken**: "여기로", the main button of a Plan for one person. Package D does a seat's Quest at the booking.
4. **Not a 파티**: in no list or count of parties, not posted, and no one else is signalled. It shows where the User's own plan shows: its card on the everyday map, and 알림 through its leave-by.
5. **Its leave-by** uses the Quest's own `leave-by`. *Changed for the event:* the rule said "when to leave for the event". The design's 6.3 has both cases. Alone 3 and 4 notify at 15:12 to leave the job fair for the 15:30 Class. Alone 2 says the company session at 4 minutes "sends no notification", meaning one would be sent for a longer way there. So one rule serves the event and the meal: the first walk of 5 minutes or more whose time is still ahead, to the Place, else on to the next item. For "배고파" now this is exactly s4 and s4b. For an event under way it is the walk on to the Class. For an event later in the day it is the way there.
6. **Giving it up**: "다시 고르기" ends the Quest with its leave-by and returns to the Plan. A Quest alone whose time passed ends as other Quests do.
7. **The released app keeps working.** 1.0.2 never sends a Plan taken alone. Should it read one, it lists the Quest as one it holds alone, its map card and leave-by as for any Quest, and nothing changes shape: the reply of `POST /plans` and every Quest only gain a key (the app's checks read named fields and let others through), and the Notification kind is the existing `leave-by`.
8. **Not in this patch**: adding a Friend to a Quest taken alone, a way taken alone, the plan line above the input, and the other gaps of `gaps-1116/`.
9. **A column of its own marks a Quest taken alone**: `Quest.takenAlone` (`taken_alone`, false by default, by an additive migration) and `QuestDto.takenAlone`. The orchestrating session's correction of rule 4 (22:05) rules out the Holders' count, which a recruiting Quest posted with no Friend and a 비공개 Quest whose invitations wait or were all refused share. Capacity 1 alone was my first mark, but it cannot decide either: the party form allows capacity 1, and a Class Quest has it. The Quest also has capacity 1 (`ALONE_CAPACITY`), so no one else enters it (`QUEST_FULL`). A booked seat's Quest (package D) sets both. Quests a User attended alone before this ticket keep their words.
10. **The reply** is today's `PlanQuestDto` with `alone: { lines, remindAt }` for a Plan taken alone, and without the key for a Plan with a Friend. The lines are the main server's, as every answer's words are.
11. **"다시 고르기" is the existing `DELETE /quests/:questId`**, which already cancels the Holder's leave-by. The app drops the idempotency key of that Plan, so the next "여기로" makes another Quest rather than replaying the first.
12. **Taking an event again** replaces the Quest held alone for it, by the one-Quest rule for a Global Event, and cancels its leave-by. Holding a 파티 for the event refuses with 409 `SHARED_QUEST_HELD`. Each "여기로" on a meal makes its own Quest, as each "이대로 초대" does.
13. **The leave-by's words** gain two optional facts: `toward` (the next item, "13:00 수업에 맞아요.") and `by: 'shuttle'` ("셔틀로 18분"). Its card stays `party:<questId>`, which selects the Quest's map card, worded as a 퀘스트.
14. **Entering a Shared Quest** for a Global Event deletes the Quest held alone for it, as before, and now cancels that Quest's leave-by.
15. **A Friend going alone to an event is a candidate** of a new party for it, as entering leaves the Quest held alone (`holderIdsFor(id, false)` leaves out Quests held alone).
16. **"여기로" takes "길 안내"'s cell** on an events Plan and is the main one. Three equal cells fit; four would not. The taken card's "닫기" starts the same guidance, as board Alone 3 guides after "여기로". A Plan where the User already is only closes.
17. **In the app**, 내 파티 leaves out a Quest taken alone. The Quest list's kicker and label and the map card's sub-label say "퀘스트". The phone keeps no made-Quest flag for it, as that flag counts invited Friends. The toast for a Quest taken while the answer changed is "여기로 정했어요", and a failed "여기로" says "답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요", since it invites nobody.
18. **The push sheet** is asked after "여기로", as after "이대로 초대" and "이대로 모집".
19. **The mock** answers an events Plan of its stored answer taken alone with a reply worked out by hand from the main server's rule (job fair 15:12, concert 17:42, company session none), and its `dropQuest` ends the Quest it made. The meal's mock is package D's.
20. `QuestsService.columnsOf` moved to `quests/sub-quest-columns.ts`, unchanged, to keep `quests.service.ts` under the 300-line limit.
