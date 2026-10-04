# 11: Class Quests

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests for Global Events and their Sub Quests), 10 (Timetable)

## What to build

A User's Quest list shows today's classes beside the stored Quests, so that one list shows the day. A Class Quest is computed from the timetable each time the list is read and is never stored. It has the shape of a stored Quest, with one Sub Quest that carries the class's time today and its Place.

## Acceptance criteria

- [ ] The Quest list returns a Class Quest for each of the User's classes held on today's weekday, by the date in Asia/Seoul. Where the semester's first or last day is set, a day before the first or after the last has no Class Quests.
- [ ] A Class Quest has the shape of a stored Quest: the course name as its title, the User as its only Holder, and one Sub Quest with today's start and end of the class, the class's Place and its room. It is marked as a Class Quest, so that the app can show it with an icon of its own.
- [ ] The Sub Quest of a Class Quest ends by time, as any Sub Quest with an end time does. A Class Quest whose class is over is left out of the list.
- [ ] Nothing is stored for a Class Quest. It cannot be dropped, given a Sub Quest or used as a Party's mark, and each of these is refused.
- [ ] A change to the timetable shows in the next read of the list.
- [ ] Main server tests at the API, with the clock set by the test: a class today in the list beside a stored Quest, a class on another weekday absent, a day outside the semester, a class of several weekdays on each of its days, a class after its end, and each refused action.
- [ ] The main server's README records how a Class Quest is computed and what it cannot do.
