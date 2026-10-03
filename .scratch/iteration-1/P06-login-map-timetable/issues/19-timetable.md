# 19: Timetable

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 15 (내 정보 screen), 18 (Choosing a Place: the list and its search)

## What to build

A User records their classes: sets the semester's first and last day, adds a class with its weekdays, times, Place and room, edits and deletes it, and is warned when two classes overlap. 내 정보 shows the week. The screens are the frames `Timetable`, `TimetableEmpty`, `TimetableClassForm`, `TimetableOverlap` and `TimetableOverlapList`, and the timetable card of `Profile`.

The timetable is fake, holding what the spec lists under "What the fakes hold", until ticket 23 connects it to the main server.

## Acceptance criteria

- [ ] The timetable card on 내 정보 draws Monday to Friday from the timetable. "직접 입력" opens the timetable screen; "이미지로 불러오기" and "빈 시간 말하기" show the "준비 중이에요" toast.
- [ ] The timetable screen shows the semester's first and last day and the classes, listed by their earliest weekday and then by start time, with the frame's empty state when there are none.
- [ ] A changed day is saved at once. A last day before the first day is refused with the frame's message.
- [ ] The class form takes a course name of 30 characters at most, one or more weekdays from Monday to Sunday, a start and an end time in steps of 5 minutes, a Place from the list of Places and an optional room of 20 characters at most.
- [ ] Save is enabled once the name, a weekday, both times with the end after the start, and the Place are there. An end that is not after the start shows the frame's message.
- [ ] A class that shares a weekday with another and crosses its time shows the frame's warning in the form, naming each such class, and can still be saved. In the list each overlapping class carries the badge "겹침".
- [ ] Editing opens the form filled in, with "삭제". Deleting asks first with the frame's dialog.
- [ ] Each change shows the frame's toast.
- [ ] Adding a class carries an `Idempotency-Key`, and its button is disabled while the request is pending.
- [ ] Jest tests: the empty state, a class added and shown on the card, the save button's conditions, the semester's days refused, an overlap in the form and in the list, an edit, a delete with its confirmation and its cancel, and the key on adding.
