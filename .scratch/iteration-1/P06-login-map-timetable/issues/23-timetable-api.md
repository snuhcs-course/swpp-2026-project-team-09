# 23: Server: the timetable API

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server stores one timetable per User and serves it to its owner alone, so that the app's timetable (ticket 19) stops being fake and P08 can derive Class Quests from it. 윤유상 builds it. The shape below is what the app's fake uses; the final shape is the server's to decide, and ticket 27 adapts the app.

A class holds several weekdays with one time, as the wireframes show. The first spec, and P08 after it, gave a class one weekday.

## Acceptance criteria

- [ ] A timetable holds the semester's first and last day, either of which may be missing, and the classes.
- [ ] A class holds an identifier, a course name of 30 characters at most, one or more weekdays from Monday to Sunday, a start and an end time of day with the end after the start, a Place's identifier and a room text of 20 characters at most, which may be empty.
- [ ] Reading the timetable, setting the semester's days, adding a class, changing a class and deleting a class are separate requests, each with a User's access token.
- [ ] A last day before the first day is refused, and so is a Place that does not exist.
- [ ] Overlapping classes are accepted.
- [ ] Adding a class without an `Idempotency-Key` is refused, as P04 describes.
- [ ] A User reads and changes only their own timetable.
- [ ] The change is recorded as a migration, and every record is identified by a UUID.
- [ ] Tests at the API level against a real database: owner-only access, the validation of days and times, an overlapping class accepted, and adding without a key refused.
- [ ] The main server's README records the routes and their answers. P08's spec is told that a class holds several weekdays.
