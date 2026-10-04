# 11: Class Quests

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests for Global Events and their Sub Quests), 10 (Timetable)

## What to build

A User's Quest list shows today's classes beside the stored Quests, so that one list shows the day. A Class Quest is computed from the timetable each time the list is read and is never stored. It has the shape of a stored Quest, with one Sub Quest that carries the class's time today and its Place.

## Acceptance criteria

- [x] The Quest list returns a Class Quest for each of the User's classes held on today's weekday, by the date in Asia/Seoul. Where the semester's first or last day is set, a day before the first or after the last has no Class Quests.
- [x] A Class Quest has the shape of a stored Quest: the course name as its title, the User as its only Holder, and one Sub Quest with today's start and end of the class, the class's Place and its room. It is marked as a Class Quest, so that the app can show it with an icon of its own.
- [x] The Sub Quest of a Class Quest ends by time, as any Sub Quest with an end time does. A Class Quest whose class is over is left out of the list.
- [x] Nothing is stored for a Class Quest. It cannot be dropped, given a Sub Quest or used as a Party's mark, and each of these is refused.
- [x] A change to the timetable shows in the next read of the list.
- [x] Main server tests at the API, with the clock set by the test: a class today in the list beside a stored Quest, a class on another weekday absent, a day outside the semester, a class of several weekdays on each of its days, a class after its end, and each refused action.
- [x] The main server's README records how a Class Quest is computed and what it cannot do.

## Comments

### Decisions (2026-10-04)

- **Mark**: every Quest that `GET /quests` and `GET /quests/:questId` answer carries `classQuest: boolean`, `true` for
  a Class Quest only. `QuestDto` has the field, and `toQuestDto` writes `false`.
- **Identifier**: a Class Quest's `id` is its class's id (`timetable_classes.id`), and its one Sub Quest takes the same
  id. It is a UUID, so it passes the routes' id checks, and it differs from every stored Quest's id.
- **Shape**: `{ id, title: courseName, globalEvent: null, holders: [the User], subQuests: [{ id, attending: false,
  title: courseName, startsAt, endsAt, place: { placeId, label, latitude, longitude }, completion: 'by_time',
  cancelled: false, done: false, ended }], classQuest: true }`. The times are today's date in Asia/Seoul with the
  class's `HH:MM` at +09:00, as instants.
- **Room**: in the Sub Quest's place `label`, after the Place's name (`<name> <room>`); the Place's name alone when the
  class has no room. No field is added to the Sub Quest.
- **Order**: the stored Quests in creation order, then the Class Quests by start time. A Class Quest whose class is
  over is left out, as any Quest whose Sub Quests have all ended is.
- **Refusals**: `CLASS_QUEST` 409 on `DELETE /quests/:questId` and `POST /quests/:questId/sub-quests` for the id of any
  of the User's classes, held today or not. Another User's class id is `QUEST_NOT_FOUND`. The other Quest routes
  (`GET /quests/:questId`, editing, cancelling and marking a Sub Quest done) answer `QUEST_NOT_FOUND` for a Class Quest.
- **Party's mark**: this part of the criterion is met by ticket 05, which takes as a Party's mark only a stored Quest
  the creator holds. A Class Quest's id has no `quest_holders` row, so it is refused there.
- **Code**: `ClassQuestsService` (`src/quests/class-quests.service.ts`, provided by `QuestsModule`, not exported):
  `todayFor(userId, now): Promise<QuestDto[]>` builds the Class Quests from `TimetableService.timetableOf`, and
  `refuseChange(userId, questId)` throws `CLASS_QUEST`. `QuestsService.list` appends `todayFor` before leaving out
  ended Quests, and `drop` and `addSubQuest` call `refuseChange` first. `QuestsModule` imports `TimetableModule`.

### Agent usage (2026-10-04)

- Agent time: about 11 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 7,969,524, of which 7,821,586 were cache reads, 147,804 cache writes and 134 uncached.
  - Output: 18,779, a lower bound, since the transcript records only part of the output of most steps.
