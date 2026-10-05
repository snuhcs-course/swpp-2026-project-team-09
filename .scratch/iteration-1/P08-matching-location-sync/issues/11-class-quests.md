# 11: Class Quests

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them), 10 (Timetable), 14 (Quest: requests, invitations and the Leader's controls)

## What to build

A User's Quest list shows today's classes beside the stored Quests, so that one list shows the day. A Class Quest is computed from the timetable each time the list is read, and nothing is stored for it. It has the shape of a stored Quest, with a Sub Quest for each of the class's times today that carries the time's start, end, Place and room.

Since nothing is stored, a Class Quest takes no part in what Users do with stored Quests: it is never dropped, given a Sub Quest, joined, led or given a Party, and each route that tries is refused.

## Acceptance criteria

- [x] The Quest list returns a Class Quest for each of the User's classes that has a time on today's weekday, by the date in Asia/Seoul, every week. The Class Quests follow the stored Quests, in the order of their first start today.
- [x] A Class Quest has the shape of a stored Quest: the course name as its title, no Global Event, the User as its only Holder, no Leader, capacity 1 and Join Policy Closed. It is marked as a Class Quest, and a stored Quest is marked as not one, so that the app can show it with an icon of its own.
- [x] A Class Quest has one Sub Quest for each of the class's times today, in the order of their starts, titled with the course name, with today's start and end of that time as instants and completion by time. The Sub Quest's place is the time's Place, with the room after the Place's name in the label. A time without a Place gives a Sub Quest without a place, and its room is not shown.
- [x] The Quest's identifier is the class's, and a Sub Quest's is its time's.
- [x] A Sub Quest of a Class Quest ends by time, as any Sub Quest with an end time does. A Class Quest whose Sub Quests have all ended is left out of the list, as any Quest is.
- [x] Reading one Quest by its identifier answers a Class Quest as the list does, ended or not, on a day its class has a time. On another day the identifier is answered as an unknown Quest.
- [x] Nothing is stored for a Class Quest. A change to the timetable shows in the next read.
- [x] For the identifier of any of the User's classes, whether it has a time today or not, these routes refuse with a code of its own for a Class Quest, and nothing changes: dropping the Quest; adding a Sub Quest, and editing, cancelling and marking done one of its Sub Quests; joining; asking to join; each of the Leader's controls: changing the settings, handing over the role, removing a Holder, and listing, accepting and declining requests to join; and inviting.
- [x] For the identifier of another User's class, each of these routes answers as it does for a Quest the User does not hold: as an unknown Quest.
- [x] Opening a Party for a Class Quest is answered as for an unknown Quest, since it is no stored Quest the opener holds (ticket 05).
- [x] A Class Quest is never in the list of recruiting Quests, for all Global Events or for one.
- [x] Main server tests at the API, with the clock set by the test: a class with a time today in the list after a stored Quest; a class without a time today absent; a class with two times today as one Class Quest with two Sub Quests in the order of their starts; the same class on another of its weekdays; a time with a Place and a room, with a Place only, and without a Place; a Class Quest left out once its Sub Quests have ended; reading one by itself today and on another day; a change to the timetable in the next read; each refused route for the User's own class, with a time today and without; each route for another User's class; opening a Party for it; and the list of recruiting Quests without it.
- [x] The main server's README records how a Class Quest is computed, its shape and identifiers, and what it cannot do with each route's answer.

## Comments

### Decisions (2026-10-06)

- **Mark and shape**: every Quest that `GET /quests` and `GET /quests/:questId` answer carries `classQuest: boolean`,
  `false` for stored Quests (`toQuestDto`). A Class Quest is `{ id, title: courseName, globalEvent: null, leader: null,
  capacity: 1, joinPolicy: 'closed', holders: [the User], subQuests, classQuest: true }`; `QuestDto.leader` is
  `HolderDto | null`, `null` for a Class Quest only. Each Sub Quest is `{ id, attending: false, title: courseName,
  startsAt, endsAt, place, completion: 'by_time', cancelled: false, done: false, ended }`, the times today's date in
  Asia/Seoul with the time's `HH:MM` at +09:00, as instants. `place` is the time's Place with the label
  `<Place name> <room>`, or the name alone without a room, and `null` for a time without a Place.
- **Identifiers**: the Quest's `id` is the class's (`timetable_classes.id`), each Sub Quest's its time's
  (`class_times.id`). Both are UUIDs and pass the routes' id checks.
- **Order**: the stored Quests in creation order, then the Class Quests by their first start today (class id on a
  tie), each with its Sub Quests by start. Ended ones are left out with the stored Quests' rule.
- **Reading one**: `GET /quests/:questId` answers a Class Quest, ended or not, on a day its class has a time, and
  `QUEST_NOT_FOUND` on another day.
- **Code**: `ClassQuestsService` (`src/quests/class-quests.service.ts`, a provider of `QuestsModule`, not exported;
  `QuestsModule` imports `TimetableModule`): `todayFor(userId, now)`, `todayOne(userId, questId, now)` and
  `refuse(userId, questId, db?)`, which throws `CLASS_QUEST` 409 when the identifier is one of the User's classes
  (`TimetableService.isClassOf`, which now takes an optional transaction).
- **Where the refusal is checked**: only once no stored Quest answered the identifier, where each route first looks
  its Quest up, so stored Quests are served as before:
  - `QuestsService.inQuest` (its `holderIn`): `DELETE /quests/:questId`, `POST /quests/:questId/sub-quests`,
    `PUT` and `DELETE /quests/:questId/sub-quests/:subQuestId`, `POST .../done`.
  - `LeaderService.ledBy`: `PATCH /quests/:questId`, `PUT /quests/:questId/leader`,
    `DELETE /quests/:questId/holders/:userId`, `GET /quests/:questId/join-requests`,
    `POST /quests/:questId/join-requests/:id/accept` and `.../decline`, `POST /quests/:questId/invitations`.
  - `RecruitingService.enter`: `POST /quests/:questId/join`.
  - `JoinRequestsService.ask`: `POST /quest-join-requests` with the class's `questId`.
- **Each route's answer**: for the User's own class, held today or not, 409 `CLASS_QUEST` on all of the routes above,
  and nothing changes. For another User's class, each answers as for a Quest the User does not hold: 404
  `QUEST_NOT_FOUND` on all of them (joining and asking with the "no such Quest takes this User" message).
- **Party and recruiting**: no code of their own. `POST /parties` with a Class Quest's `questId` answers 404
  `QUEST_NOT_FOUND`, since it is no stored Quest the opener holds, and the list of recruiting Quests reads stored
  Quests only. Ticket 14's Comments say its routes answer a Class Quest as an unknown Quest; that held before this
  ticket, and those routes now answer `CLASS_QUEST` for the User's own class as listed above.
- No migration.

### Agent usage (2026-10-04)

- Agent time: about 11 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 7,969,524, of which 7,821,586 were cache reads, 147,804 cache writes and 134 uncached.
  - Output: 18,779, a lower bound, since the transcript records only part of the output of most steps.
