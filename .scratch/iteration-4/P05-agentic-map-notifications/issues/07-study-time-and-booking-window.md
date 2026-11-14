# 07: The Assistant picks a study group's time, and a plan outside the booking window waits for it

Parent: [P05 spec](../spec.md) ("Part 2", "The study group's time and the booking window")
Status: ready-for-agent
Blocked by: 05 (a Notification sent at its time) and 06
Native files: no

## What to build

A User whose app draws answers says "민수, 지은, 서준이랑 이번 주에 스터디" and gets a filled booking card for a 관정 group study room, without naming a day, a time, or a room. For a day more than three days ahead the invitations and consents are gathered first, and on the day the booking window opens the booker is told and gets the filled card.

## Behaviour

- **A tool of the chat that draws answers** takes the Friends, and what the User said of the day (a date, a week, or nothing: the days of the booking window) and of the length (three hours unless said).
- **The pick.** For each day and each start on a half hour within the room's hours: a person can be in the room from the booking's start, or after an item of theirs from its end plus the walk from its Place to 관정관, and must leave before their next item, at its start minus the walk. Their stay is the longest single stretch of that inside the booking. A booking leaves nobody out when every stay is at least 30 minutes. Among those the one whose shortest stay is longest wins, then the larger total of stays, then the earlier day and start. A booking in which the booker arrives more than one hour after its start is not offered. No booking that leaves nobody out gives the answer that says so.
- **The room** is the smallest group study room size whose minimum and maximum hold the people, on the 4th floor, then the 2nd.
- **The answer** shows today's room booking card for the first pick, with a note for each person ("지은 15:19 도착 · 16:56에 먼저 나서요"), and tells the model the picks of the other days.
- **Outside the window.** For a date after the booking window the tool shows a card that makes the room request without a room check of the window: the request is kept with its date, start, and length, the invitations and consents are gathered, and a Notification "예약 창이 열렸어요" is scheduled for 09:00 on the day the window opens for that date, with the line "<day> <start>–<end> 스터디". The booking card opens from it.
- The design's example, Thursday of the example week: 서준 arrives 14:54, 지은 15:19 and leaves at 16:56, the booker 15:29, 민수 17:01; the pick is 15:30 to 18:30.

## Acceptance criteria

- [ ] Unit tests of the pick with expected values worked out by hand: the design's Thursday example (15:30 to 18:30; stays 180, 86, 180, and 89 minutes; three or more together for 175), a day on which one person cannot stay 30 minutes (not offered), a tie on the shortest stay decided by the total, an item in the middle of a booking (the longest stretch is the stay), and a booker who would arrive 61 minutes late (not offered).
- [ ] Integration test with the scripted model: the tool shows one room card with the picked day, start, and 180 minutes, the companions, and a note for each person.
- [ ] A named day and a named length are used as said.
- [ ] A date outside the window makes a request without a room, schedules the Notification for 09:00 three days before, and the room card opens from it once the window holds the date.
- [ ] Without the `answer` capability the Assistant asks for the day and the time as today, and the instructions and tools equal today's.
- [ ] No test calls the language model; nothing under `main-server/eval/` changes.

## Comments
