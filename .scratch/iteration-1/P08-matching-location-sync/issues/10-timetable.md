# 10: Timetable

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User's timetable is kept on the main server: the semester's first and last day and the classes. The User adds a class with its name, weekdays, times, Place and room, edits it and deletes it, and is told when a class overlaps another without being stopped. The app's timetable screens (P06) read and change it, and ticket 11 makes Class Quests from it.

The shape is the one the app's timetable screens hold, so that the app's adapter needs no translation.

## Acceptance criteria

- [ ] A User has one timetable. Reading it returns the semester's first and last day, either of which may be missing, and the classes. A User without a timetable reads an empty one.
- [ ] A User sets and clears the semester's first and last day. A last day before the first is refused.
- [ ] A class has a course name of 30 characters at most, one or more weekdays from Monday to Sunday, a start and an end time of day with the end after the start, a Place from the list of Places and an optional room of 20 characters at most. A Place the list does not hold is refused.
- [ ] A User adds, edits and deletes a class. Adding requires the key described in P04.
- [ ] A class that shares a weekday with another and crosses its time is accepted, and the answer names the classes it overlaps. Reading the timetable says for each class which others it overlaps.
- [ ] Only its owner reads or changes a timetable: another User's class is answered as not found.
- [ ] Main server tests at the API: an empty timetable, the semester's days and their refusal, a class added, edited and deleted, each invalid field, an overlap on one of several weekdays, another User's class, adding without the key refused, and a repeated key that leaves one class and answers the same twice.
- [ ] The main server's README records the timetable routes, the fields with their limits and how an overlap is reported.
