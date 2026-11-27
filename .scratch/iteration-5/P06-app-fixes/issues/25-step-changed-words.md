# 25: A changed step says which 파티 and when, and 지금 나서요 is kept again

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: 26 (the date words).

Native files: none. Releases: a main server Release.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- A step changed in the room or by the Assistant tells every other Holder "<이름>이 일정을 바꿨어요" / "14:10 정문 앞에서 만나기" (`main-server/src/notifications/notification-words.ts`, `stepLine` and `memberWords`): no 파티 title and no date. It rings.
- The same change forgets every Holder's 지금 나서요 (`main-server/src/quests/step-told.ts`, `tellStepChanged`), and none is kept again, so after a change nobody is told when to set out.
- The way to keep one exists: an invited User's time to leave is worked out from their Timetable when they accept (`main-server/src/plans/invitee-time-to-leave.service.ts`, `timeToLeave`).

## What to build

- Words: "<파티 제목> · <이름>이 일정을 바꿨어요" / "<날짜 시각> <단계>로 바뀌었어요" (the date words of ticket 26; a cancelled step as now).
- After the change, each Holder's 지금 나서요 is kept again for the steps as they are, by the same Timetable rule as an accepted invitation's (decided 2026-11-27: the Timetable, not the live position). A Holder whose way cannot be worked out (no Place with a position, no start known from the Timetable) gets none, as today.

## Must not break

- The one who changed the step is not told of their own change.
- A Plan's Leader's time to leave, kept when a Plan becomes a 파티.
- Tests: main server `sub-quests`, `step-told`, `notification-words` (`.unit` / `.integration`).

## Acceptance criteria

- [ ] The words name the 파티 and the date. (Unit test.)
- [ ] After a change, each Holder whose way is known has one 지금 나서요 at the new time. (Main server integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
