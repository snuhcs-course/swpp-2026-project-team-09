# 10: Timetable

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User's timetable is kept on the main server as the User's classes. A class is a course name and one or more times, each with a weekday, a start, an end, an optional Place and an optional room, so that a course held on Monday in one room and on Wednesday in another is one class with two times. The User reads the timetable, adds, replaces and deletes a class, resets the timetable when a semester ends, and is told when classes overlap without being stopped.

Ticket 11 makes Class Quests from the classes. A later task of the app builds the timetable screens on these routes.

## Acceptance criteria

- [x] A User's timetable is the User's classes and nothing else: no semester's days and no record of the timetable itself. Reading it returns the classes, each with its times and the classes it overlaps. A User without classes reads an empty timetable.
- [x] A class has a course name of 1 to 30 characters and from 1 to 10 times. A time has a weekday from Monday to Sunday, a start and an end time of day in Asia/Seoul written `HH:MM` with the end after the start, an optional Place from the list of Places and an optional room of 20 characters at most; an empty room is no room. A class has no professor's name. A Place the list does not hold is refused.
- [x] Each class and each time has an identifier of its own. Replacing a class gives its times new identifiers.
- [x] Two times of one class that share a weekday and cross each other are refused. Two that touch are accepted.
- [x] The classes are read in the order of their first time in the week, and a class's times in the order of the week, Monday first, then by start.
- [x] A User adds a class, replaces a class whole with its times, and deletes a class. Adding requires the key described in P04.
- [x] A User resets the timetable, which deletes every class of the User and answers the same when there were none. It needs no key.
- [x] A User holds at most 15 classes, however many times they have. An add past the limit is refused with a code. The count and the insert happen in one transaction that locks the User's row, so that several first adds of one User at the same moment each succeed, and adds at the same moment stop at the limit.
- [x] Two classes overlap when a time of one and a time of the other share a weekday and each starts before the other ends; times that touch do not overlap. An overlapping class is accepted. The answer to an add or a replacement names the classes the class overlaps, and reading the timetable names them for each class.
- [x] Only its owner reads or changes a class. Another User's class is answered as not found, as an unknown class is, before anything else about the request is checked, so that replacing it is not found whatever the body holds.
- [x] One migration, dated after the latest migration on the main line, creates the classes and their times.
- [x] Main server tests at the API: an empty timetable; a class of several times added, replaced and deleted; a time without a Place; a reset with classes and without; each invalid field, among them no times, 11 times, an end not after the start and an unknown Place; an empty room stored as none; two crossing times of one class refused and two touching ones accepted; an overlap between classes on one of several times, and touching times that do not overlap; an add past the limit refused; several first adds of one User at the same moment; adds at the same moment at the limit; another User's class on replacing, with an invalid body and with an unknown Place, and on deleting; adding without the key refused; and a repeated key that leaves one class and answers the same twice.
- [x] The main server's README records the timetable routes, a class's fields with their limits, the limit of 15 classes, how an overlap is reported, and the refusals with their codes.

## Comments

### Decisions (2026-10-06)

- Routes, all under `timetable/classes`: `GET` answers the classes; `POST` adds one with `@Idempotent({ required: true })` and answers 201 with it; `PUT /:classId` takes the whole class and answers 200 with it; `DELETE /:classId` answers 204; `DELETE` (no id) resets and answers 204, also without classes, and needs no key. A class id that is not a UUID gets 400.
- Answer of a class: `{ id, courseName, times: [{ id, weekday, startTime, endTime, placeId, room }], overlaps: [{ id, courseName }] }`. `weekday` is `monday` to `sunday`, the times `HH:MM`, `placeId` and `room` `null` when absent. `GET` answers an array of these, `[]` without classes. The body of an add or a replacement is the same without the identifiers and `overlaps`; `placeId` and `room` may be left out.
- Order: classes by their first time in the week (weekday, then start, then id); times by weekday, then start. `overlaps` follows the timetable's order.
- Refusals: 400 with a message that starts with the field for a body that does not match; two crossing times of one class name the later one, `times.2: Invalid time: crosses times.1 on the same weekday`. `PLACE_NOT_FOUND` 404 for a Place not in the list (the shape of `src/quests/refusals.ts`, reused). `TIMETABLE_FULL` 409 for an add past 15 classes. `CLASS_NOT_FOUND` 404 for an unknown class or another User's. Adding without a key: 400 `IDEMPOTENCY_KEY_REQUIRED`.
- Ownership: a replacement first updates the course name where the class is the User's, which finds and locks it, and refuses with `CLASS_NOT_FOUND` before the Places are checked. The body's shape is validated by the framework before the handler runs, for any class, so a body that does not match gets the same 400 for another User's class as for an unknown one; it tells nothing about the class.
- Limit: an add locks the User's row with `UsersService.lock`, counts the classes, checks the Places and inserts the class with its times, in one transaction.
- Tables: `timetable_classes` (`id`, `user_id` referencing `users`, `course_name`; index on `user_id`) and `class_times` (`id`, `class_id` referencing `timetable_classes` with `ON DELETE CASCADE`, `weekday` as the enum `weekday`, `start_time` and `end_time` as `HH:MM` text, `place_id` optional, referencing `places`, `room` optional; index on `class_id`). A replacement deletes the class's times and inserts new ones. Migration `20261004270000_add_timetables`.
- For ticket 11: `TimetableModule` exports `TimetableService` with `classesOf(userId: string, db?: Prisma.TransactionClient): Promise<StoredClass[]>`, the User's classes, each with `times` in the order of the week and each time's `place` (the whole `places` row or `null`) and `room`, and `isClassOf(userId: string, classId: string): Promise<boolean>`. `StoredClass` and `CLASS_INCLUDE` are in `src/timetable/dto/timetable.dto.ts`; `Weekday` is the Prisma enum from `src/generated/prisma/client.js`.

### Agent usage (2026-10-04)

- Agent time: about 17 minutes, an estimate: the implementing agent about 14 minutes, and a Standards reviewer and a Spec reviewer about 2 minutes each at the same time. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the three agents' transcripts:
  - Input: 17,384,747, of which 16,990,909 were cache reads, 393,614 cache writes and 224 uncached.
  - Output: 33,538, a lower bound, since the transcripts record only part of the output of most steps.

### Agent usage (2026-10-06)

- Agent time: about 11 minutes, an estimate: one agent that reworked the ticket for classes with their times. The session that ran it is not counted here.
- Tokens, counted from the agent's transcript:
  - Input: 9,508,667, of which 9,349,597 were cache reads, 158,930 cache writes and 140 uncached.
  - Output: 15,671, a lower bound, since the transcript records only part of the output of most steps.
