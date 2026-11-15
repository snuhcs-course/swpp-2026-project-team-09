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

- [x] Unit tests of the pick with expected values worked out by hand: the design's Thursday example (15:30 to 18:30; stays 180, 86, 180, and 89 minutes; three or more together for 175), a day on which one person cannot stay 30 minutes (not offered), a tie on the shortest stay decided by the total, an item in the middle of a booking (the longest stretch is the stay), and a booker who would arrive 61 minutes late (not offered).
- [x] Integration test with the scripted model: the tool shows one room card with the picked day, start, and 180 minutes, the companions, and a note for each person.
- [x] A named day and a named length are used as said.
- [x] A date outside the window makes a request without a room, schedules the Notification for 09:00 three days before, and the room card opens from it once the window holds the date.
- [x] Without the `answer` capability the Assistant asks for the day and the time as today, and the instructions and tools equal today's.
- [x] No test calls the language model; nothing under `main-server/eval/` changes.

## Comments

### Decisions (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **The tool** `proposeStudyRoom` is the answer-drawing chat's only. It takes the Friends' ids, a date or a period
   (`from`, `to`, at most 7 days from today), and the minutes (180 unless said). Each person's day is read as the meal
   Plan reads it; the walks to and from 관정관 come from the Travel Time provider.
2. **The room** is the smallest group study room whose minimum and maximum hold the people, the 4th floor first: 4 to 6
   people get the six-person room, 7 or 8 the eight-person room; fewer than 4 or more than 8 are refused.
3. **A person's note** reads "<name> <arrival> 도착" when they come from an item that ends at most 60 minutes before the
   start, and "<name> <start>부터" otherwise, with " · <until>에 먼저 나서요" when they leave before the end. The booker
   is "나". A Friend's name reaches the model only inside the tools' data label, as in the other tools.
4. **A booking after the window** carries `:wait` at the end of its card key. The making of a room request then skips
   only the window's refusal, up to 14 days ahead ("그룹스터디룸은 14일 뒤까지만 미리 정해 둘 수 있어요").
5. **"예약 창이 열렸어요"** (kind `room-window`) is kept for the booker at 09:00 on the day the window opens for the date,
   with "<M월 D일> 09:00 예약 창 열림" before then and the line "<요일> <start>–<end> 스터디". It goes when the request
   ends before then.
6. **The waiting card in the app** reads no rooms, gathers the consents, shows "<M월 D일> 09:00 예약 창이 열리면 예약할
   수 있어요", and keeps 예약하기 unavailable until the window holds the date.
7. **Opening it again.** The phone that made the request keeps the Quest, the request, and the card; when the
   Notification's address opens that party, the chat opens with "예약 창이 열렸어요" and the card, bound to the request.
   Another phone, or the same phone after its storage is cleared, opens the party's card only: finding the request
   from its Quest would need a route of the main server.
8. **The kinds' look in 알림**: `room-declined` the person and `room-agreed` the people on the invitation's tone,
   `room-ending` the clock on the navy round, `room-window` the calendar on the request's tone.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5) built the main server's part; the app's part was built by ticket 06's app
subagent and is counted there.

- Agent time: about 83 minutes, an estimate from the transcript's timestamps; much of it was waiting for the shared
  test lock.
- Tokens: output 164,618; input 48,306,157, of which 47,905,449 were cache reads, 400,386 cache writes, and 322
  uncached. Without cache reads: 565,326.
