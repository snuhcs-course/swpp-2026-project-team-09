# 07: How many minutes, and whether I will be late

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 06

## What to build

The User asks "24동까지 몇 분? 늦나" or "9시 수업인데 늦나". The Assistant answers on the map with the way, when to set out, and whether they make it. If they will be late, it says by how much (wireframe row 7, boards q2, q3, and q15; design section 5, questions 10 and the off-campus rule).

## Acceptance criteria

- [ ] The way's deadline is the time the User named ("2시까지"); else, when the Place is that of the User's next item today, that item's start. Without either, there is no deadline (ticket 06).
- [ ] Tuesday 12:40 at building 301, next Class 13:00 in building 24: "24동까지 걸어서 **15분**" / "**12:45**에 나서면 13:00에 맞아요", the band from 12:45 to 13:00 ("12:45 나서기 · 걸어서 15분"), a flag "12:45 나서기" at the start, and a leave-by notification at 12:45 as the main action.
- [ ] The same at 12:50: "지금 가도 **13:05** 도착" / "5분 늦어요", the band from 12:50 to 13:05, a flag "13:05 도착 · 5분 늦어요" at the Place, the basis open on the reason, and route guidance as the main action.
- [ ] Asked with no Place ("늦나", "다음 수업까지 몇 분?"), the way goes to the User's next item today that has a Place; with none, the tool answers none.
- [ ] From off campus (the User's location outside the campus boundary), the way is counted from the main gate, and the location is not used: Wednesday 08:35, Class 09:00 in building 24, "정문을 **08:50**까지 지나면" / "09:00 수업에 맞아요", with the basis saying that the location off campus was not used.
- [ ] Unit tests for the deadline, the leave-by time, and lateness at the boundaries (on time to the minute, one minute late); integration tests at the endpoint with the scripted model.

## Decisions (2026-11-15)

1. **The chips** add the deadline: "13:00 수업까지" for a Class, "13:00까지" for another item or a time the User named; and "정문에서" off campus.
2. **The band** runs from the half hour at or before the earlier of now and the leave-by time, to the half hour at or after the deadline or the arrival, whichever is later, with the User's lane holding their items in that range. Its stretch runs from the leave-by time (now, when late) to the deadline (the arrival, when late).
3. **The leave-by notification** (`remind`) is offered only when the leave-by time is still ahead and the walk takes 5 minutes or more (design section 5, Notifications). Otherwise route guidance is the action. Sending the notification is package D's: the Lookup only says when.
4. **Lateness** is counted from now, rounded up to the whole minute, plus the way's minutes. A plan keeps no margin before a Class (design section 5, Depth and measures).
5. **The tool's input** gains `by` (HH:MM), the time the User named. `to` may be left out for the next item.
6. **Off campus** means outside the campus boundary the server already reads (`CampusBoundary`). The main gate is the Place "서울대 정문". With no location and no Class that ended today, the tool answers none (ticket 06).

## Comments
