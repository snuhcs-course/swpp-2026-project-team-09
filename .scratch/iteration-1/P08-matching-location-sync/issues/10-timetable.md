# 10: Timetable

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User's timetable is kept on the main server: the semester's first and last day and the classes. The User adds a class with its name, weekdays, times, Place and room, edits it and deletes it, and is told when a class overlaps another without being stopped. The app's timetable screens (P06) read and change it, and ticket 11 makes Class Quests from it.

The shape is the one the app's timetable screens hold, so that the app's adapter needs no translation.

## Acceptance criteria

- [x] A User has one timetable. Reading it returns the semester's first and last day, either of which may be missing, and the classes. A User without a timetable reads an empty one.
- [x] A User sets and clears the semester's first and last day. A last day before the first is refused.
- [x] A class has a course name of 30 characters at most, one or more weekdays from Monday to Sunday, a start and an end time of day with the end after the start, a Place from the list of Places and an optional room of 20 characters at most. A Place the list does not hold is refused.
- [x] A User adds, edits and deletes a class. Adding requires the key described in P04.
- [x] A class that shares a weekday with another and crosses its time is accepted, and the answer names the classes it overlaps. Reading the timetable says for each class which others it overlaps.
- [x] Only its owner reads or changes a timetable: another User's class is answered as not found.
- [x] Main server tests at the API: an empty timetable, the semester's days and their refusal, a class added, edited and deleted, each invalid field, an overlap on one of several weekdays, another User's class, adding without the key refused, and a repeated key that leaves one class and answers the same twice.
- [x] The main server's README records the timetable routes, the fields with their limits and how an overlap is reported.

## Comments

### Decisions (2026-10-04)

- No timetable types exist in `mobile/` or on the P06 branches; P06 describes the shape in words only. The fields follow those words: `semesterFirstDay` and `semesterLastDay` (`YYYY-MM-DD` or `null`), and `classes`, each with `id`, `courseName`, `weekdays` (`monday` to `sunday`, Monday first), `startTime` and `endTime` (`HH:MM`), `placeId`, `room` (or `null`) and `overlaps` (`[{ id, courseName }]`).
- Routes: `GET /timetable`; `PATCH /timetable` with either day, `null` clearing it, answering the whole timetable; `POST /timetable/classes` with `@Idempotent({ required: true })`, answering 201 with the class; `PUT /timetable/classes/:id` with the whole class; `DELETE /timetable/classes/:id`, answering 204.
- Refusals: 400 with a message that starts with the field, as the profile's. A last day before the first, the stored one included: `semesterLastDay: must not be before semesterFirstDay`. An unknown Place: `placeId: no Place of the list has this id`. Another User's class, or an unknown one: 404. A class id that is not a UUID: 400. Adding without a key: 400 `IDEMPOTENCY_KEY_REQUIRED`.
- Overlap: two classes share a weekday and each starts before the other ends. A class that starts as another ends does not overlap it.
- Tables: `timetables` (one per User, unique `user_id`, `semester_first_day` and `semester_last_day` as `date`) and `timetable_classes` (`timetable_id`, `course_name`, `weekdays` as the enum array `weekday[]`, `start_time` and `end_time` as `HH:MM` text, `place_id` referencing `places`, `room`). Migration `20261004120000_add_timetables`.
- For ticket 11: `TimetableModule` exports `TimetableService`, and `timetableOf(userId): Promise<TimetableDto>` gives the semester's days and the classes in the form `GET /timetable` answers. `Weekday` is the Prisma enum from `src/generated/prisma/client.js`.
