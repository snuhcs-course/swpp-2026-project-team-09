# 14: "여기로" takes a meal's Plan as a Quest held alone, and a booked seat is one too

Parent: [P05 spec](../spec.md) ("Notifications", "The seat card"); the glossary's Quest ("held by one or more Users"); the design's 6.1 "Alone" 4, 6.2 (the seat, alone), and the rule that a walk alone gets a leave-by push only when it takes 5 minutes or more; boards AmHungry s1 to s5, AmCant n10, n12, n13, n15, AmFrame f3, AmStudy a1, a3b and a6. P03 ticket 15 (package C) makes a Plan for one person into a Quest at `POST /plans`; this ticket is the meal's button in the app and the seat.
Status: ready-for-agent
Blocked by: P03 ticket 15 (`POST /plans` for one person, its `alone` reply, the taken card, the `takenAlone` column with `ALONE_CAPACITY`, and the `leave-by` Notification's `toward`)
Native files: no

## What to build

Everything a User does alone can be a Quest held by that User alone. A meal's Plan for the User alone has "여기로", which makes it into that Quest; the card then says where the User goes and whether they will be told when to leave, with "다시 고르기" and "닫기". A seat booked at 관정관 is held the same way, from the booking's start to its end, with the time to leave for the next class ("15:56 나설 시각"). Neither is a 파티.

## Behaviour

- **The button.** A meal's Plan whose people are the User alone has "여기로" as its main button, where a Plan with a Friend has "이대로 초대". It is the same press: `POST /plans` with the conditions on screen and the Plan, one Idempotency-Key per Plan, the push sheet asked once the Quest is made, and a Plan that changed recalculated (409 `PLAN_CHANGED`).
- **The card after it** is package C's taken card (P03 ticket 15): the reply's two lines, "**학생회관식당**으로 가요" or "**301동식당**에서 먹어요", then "12:45에 나설 시각을 알려 드릴게요" or why no leave-by is kept. "다시 고르기" drops the Quest with its leave-by and shows the Plan again; a press after it makes a new Quest. "닫기" guides the User to the Restaurant when they walk there, as a Lookup's "길 안내" does, and only closes when they are there already.
- **A seat's stay.** Once 예약하기 booked a seat on the library's site, the phone sends `POST /library/seat-stays` with the space and the time. The main server makes the Closed Quest "관정 7층 7A 열람실 2 구역", taken alone (`takenAlone`) with capacity 1, and one Sub Quest at 관정관 for the booking's time, and keeps a `leave-by` Notification for the next item.
- **The seat's leave-by** is for the first item of the User's day that starts during the stay at a Place other than 관정관, at its start minus the walk from 관정관: "지금 나서요", "8동까지 걸어서 4분", "15:56 나설 시각". None is kept when that time has passed or comes before the stay starts.
- **What the seat sends.** The space, the date, the start and the minutes. The seat and the booking number stay on the phone, as every library reply does.
- **A failure** of the stay's request never undoes the booking or changes its done message: the seat stays booked, with no Quest.

## Files

- Main server, new (package D's `src/library/`): `seat-stays.controller.ts`, `seat-stays.service.ts`, `seat-stays.module.ts`, `seat-leave-by.ts`, `dto/seat-stay.dto.ts`; registered in `app.module.ts`. Tests: `test/seat-leave-by.unit.test.ts`, `test/seat-stays.integration.test.ts`. README: "A seat's stay".
- App: "여기로" in `screens/main/answer/main-buttons.tsx` and `plan-card.tsx`; the seat's call in `screens/main/library/use-seat-stay.ts` and `book-seat-card.tsx`; `makeSeatStay` in `api/seat-stay-types.ts`, `api/client.ts`, `api/server/seat-stay-client.ts`, `api/mock/seat-stays.ts`. Tests: `__tests__/answer-here-alone.integration.test.tsx`, `__tests__/answer-frame-library-seat-stay.integration.test.tsx`.
- Not here, package C's (P03 ticket 15): `use-plan-invitation.ts` (`again`), `taken-card.tsx`, the answer frame's choice of it, `plan-quest-types.ts` (`alone`), and everything in `main-server/src/plans/` and `src/quests/`.

## Must not change

- `main-server/src/plans/` and `main-server/src/quests/`, which are package C's.
- A Plan with a Friend and "이대로 초대"; the seat card's booking and its done message.
- Native files and the schema.

## Acceptance criteria

- [x] **s2 → s4**: a Plan alone at 학생회관식당 ("배고파", 301동 at 11:50, 13:00 수업 at 24동) has "여기로"; pressing it sends `POST /plans` and shows "**학생회관식당**으로 가요" / "수업까지 1분이라 나설 알림은 없어요" with "다시 고르기" and "닫기".
- [x] **s1 → s4b**: at 301동식당 the card says "**301동식당**에서 먹어요" / "12:45에 나설 시각을 알려 드릴게요".
- [x] "다시 고르기" sends `DELETE /quests/:id` and shows the Plan again; a press after it sends a new key; "닫기" guides the User to the Restaurant when they walk there.
- [x] The push sheet is asked for at "여기로", and a Plan with a Friend still has "이대로 초대".
- [x] **a1 → a6**: a seat in 7A 열람실 2 구역 from 14:00 with 철학개론 at 16:00 in 두산인문관 makes the Quest at 관정관 and a `leave-by` at 15:56 ("8동까지 걸어서 4분"); none with nothing during the stay; a room is refused with `NOT_A_SEAT`.
- [x] After 예약하기 the phone sends the space and the time, never the seat or the booking number; a failure leaves the booking and its done message.
- [x] The screens are run on an Android emulator by taps ("배고파" above the input, 민수 taken out of the chips), and the pull request carries s4 and s4b. The seat changes no screen (its done message is as it was, and booking a real seat is not done for a test); its Quest and leave-by are shown by the integration test over the database.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass in both projects; and no native file changed.

## Comments

### Decisions for review (2026-11-16)

The rule's eight decisions (`solo-quests/rule.md` of the orchestrating session) hold; these are the details this ticket decided.

1. **The parked decision 1 is reversed.** It said nothing is made of a Plan alone but its leave-by, because a Quest for one person would show among the User's parties. The glossary already says a Quest is held by one or more Users, and the user asked on 2026-11-16 that everything done alone can be a Quest. `POST /plans/alone`, `DELETE /plans/alone` and the `leave-alone` kind of the parked branch are gone; package C's `POST /plans` makes the Quest.
2. **"여기로" is the press of "이대로 초대"** (`usePlanInvitation.invite`): one request with its key, the push sheet, and the `PLAN_CHANGED` handling, rather than a second hook that would drift from it.
3. **The card's lines are the main server's** (`alone.lines` of the reply, package C's), as every answer's words are; the app draws them and does not word them again.
4. **A seat's Quest has its own route, `POST /library/seat-stays`**, in package D's `src/library/`, not `POST /plans`: a seat has no Plan, the phone alone books it on the library's site, and the Quest is made only after that booking succeeded. It uses `QuestsService.createWithSubQuest` and changes none of package C's files.
5. **It sends the space and the time only.** The seat and the booking number stay on the phone, as the done message's test already requires (`expectNothingOfTheLibrarySent`), so the Quest is titled by the room, "관정 7층 7A 열람실 2 구역".
6. **It is marked `takenAlone`, with capacity 1**, as package C makes a Plan taken alone: the column, not the capacity or the count of Holders, keeps it out of every list and count of parties, and the capacity keeps anyone else from entering.
7. **A seat's leave-by is kept whatever the walk.** Board a6 keeps "15:56 나설 시각" for a walk of 4 minutes. The 5-minute rule is for a walk alone from a meal or an event, where the User sets off at once; at a seat the User is studying and needs the reminder. It uses the Quest's `leave-by` kind, so 알림 and the push read as the Leader's do.
8. **The next item** is the first that starts during the stay at another Place than 관정관, read before the stay is stored so that the stay is not its own next item. An item at 관정관 needs no walk and is skipped.
9. **The stay's request runs beside the done message.** Board a4 shows no leave-by in it, so the message is not held for the main server, and a failure leaves the booking as it is.
10. **No made-Quest flag.** The flag of a Quest made from a Plan is about the Friends' answers, so package C keeps none for a Quest taken alone, and the seat follows. It is on the everyday map as the User's own Quest with a Place, worded "퀘스트" with 길찾기, and in 알림 through its leave-by. The plan line above the input stays out (rule 8).
11. **Cancelling or returning the seat** does not end its Quest in this ticket; it ends at the booking's end as other Quests do. Ending it there needs the booking's time matched to the Quest, which is a follow-up.

### Agent usage (2026-11-16)

The rework of this ticket on 2026-11-16 (the parked branch's first build is not counted here). Estimates from the session transcript, gaps of 5 minutes or more left out:

- Agent time: about 54 minutes, in one session (package D's), no subagents.
- Tokens: output 178,884; input 99,163,287, of which 98,684,087 cache reads, 478,590 cache writes and 610 uncached.
