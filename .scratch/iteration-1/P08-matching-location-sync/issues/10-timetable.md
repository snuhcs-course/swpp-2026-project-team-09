# 10: Timetable

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User's timetable is kept on the main server as the User's classes. A class is a course name and one or more times, each with a weekday, a start, an end, an optional Place and an optional room, so that a course held on Monday in one room and on Wednesday in another is one class with two times. The User reads the timetable, adds, replaces and deletes a class, resets the timetable when a semester ends, and is told when classes overlap without being stopped.

Ticket 11 makes Class Quests from the classes. A later task of the app builds the timetable screens on these routes.

## Acceptance criteria

- [ ] A User's timetable is the User's classes and nothing else: no semester's days and no record of the timetable itself. Reading it returns the classes, each with its times and the classes it overlaps. A User without classes reads an empty timetable.
- [ ] A class has a course name of 1 to 30 characters and from 1 to 10 times. A time has a weekday from Monday to Sunday, a start and an end time of day in Asia/Seoul written `HH:MM` with the end after the start, an optional Place from the list of Places and an optional room of 20 characters at most; an empty room is no room. A class has no professor's name. A Place the list does not hold is refused.
- [ ] Each class and each time has an identifier of its own. Replacing a class gives its times new identifiers.
- [ ] Two times of one class that share a weekday and cross each other are refused. Two that touch are accepted.
- [ ] The classes are read in the order of their first time in the week, and a class's times in the order of the week, Monday first, then by start.
- [ ] A User adds a class, replaces a class whole with its times, and deletes a class. Adding requires the key described in P04.
- [ ] A User resets the timetable, which deletes every class of the User and answers the same when there were none. It needs no key.
- [ ] A User holds at most 15 classes, however many times they have. An add past the limit is refused with a code. The count and the insert happen in one transaction that locks the User's row, so that several first adds of one User at the same moment each succeed, and adds at the same moment stop at the limit.
- [ ] Two classes overlap when a time of one and a time of the other share a weekday and each starts before the other ends; times that touch do not overlap. An overlapping class is accepted. The answer to an add or a replacement names the classes the class overlaps, and reading the timetable names them for each class.
- [ ] Only its owner reads or changes a class. Another User's class is answered as not found, as an unknown class is, before anything else about the request is checked, so that replacing it is not found whatever the body holds.
- [ ] One migration, dated after the latest migration on the main line, creates the classes and their times.
- [ ] Main server tests at the API: an empty timetable; a class of several times added, replaced and deleted; a time without a Place; a reset with classes and without; each invalid field, among them no times, 11 times, an end not after the start and an unknown Place; an empty room stored as none; two crossing times of one class refused and two touching ones accepted; an overlap between classes on one of several times, and touching times that do not overlap; an add past the limit refused; several first adds of one User at the same moment; adds at the same moment at the limit; another User's class on replacing, with an invalid body and with an unknown Place, and on deleting; adding without the key refused; and a repeated key that leaves one class and answers the same twice.
- [ ] The main server's README records the timetable routes, a class's fields with their limits, the limit of 15 classes, how an overlap is reported, and the refusals with their codes.
