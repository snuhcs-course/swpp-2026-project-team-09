# 04: The time to leave stays in the list

Parent: [P05 spec](../spec.md) ("The notification service", "Further Notes")
Status: ready-for-agent
Blocked by: 01 and 02. The invited User's part is blocked by the invitations package's own way of an invitee (P03, ticket 02) and is built once that is merged.
Native files: no

## What to build

The Leader of a party made from a Plan sees in "알림" when to set out for it: "12:18 나설 시각" with "학생회관식당까지 걸어서 15분" under it, from the moment the party is made. Once the time has come the row reads "지금 나서요". The row goes when the party ends. Nothing rings a phone yet: until a kept Notification is sent at its time, the list is where the time to leave stands.

An invited User gets the same row, with their own time and walk, when they accept. That part is built once the invitee's own way is merged.

## Files

Change (main server):
- `main-server/src/notifications/notification.ts`: a third kind, `leave-by`, with the Quest's id, the name of the Place to go to, and the walking minutes; a Notification's words gain the title it has while its time is still to come.
- `main-server/src/notifications/notification-words.ts`, `notification-store.ts`, `notifications.service.ts`, and `dto/notification.dto.ts`: the words of the kind, the stored field, and `ahead` in the answer of `GET /notifications`.
- `main-server/src/plans/plans.service.ts` and `plans.module.ts`: the Leader's time to leave is scheduled once the party is made. Package C's files: change only these lines.
- `main-server/src/quests/leader.service.ts`: ending a Quest cancels its Holders' time to leave. Package C's file: change only these lines.
- `main-server/README.md`: the kind joins the table of kinds.

Change (app):
- `mobile/src/api/waiting-types.ts` and `server/waiting-answers.ts`: `ahead` in a kept Notification, a text or null, and absent from an older server.
- `mobile/src/features/notifications/adapter.ts` and `mobile/src/screens/me/notifications-screen.tsx`: a row shows `ahead` as its title while its time is after now, and the kind `leave-by` has the clock icon.

## Behaviour

- **The kind `leave-by`.** Facts: the party's Quest, the name of the Place the Plan is at, and the User's walking minutes. Its time is when the User sets out. Title once the time has come: "지금 나서요". Title before it: "<HH:MM> 나설 시각", the time in Korea. Line: "<Place>까지 걸어서 <N>분". It opens the party's card, and a User has one for a party.
- **`GET /notifications`** gains `ahead`: the title while the time is still to come, or null for a kind that has none. The service still reads no clock: the phone shows `ahead` while the Notification's time is after its own now.
- **The Leader.** When `POST /plans` has made the party, the Leader's `leave-by` is scheduled for the time the Leader's part of the Plan sets out, with the Plan's Place and the Leader's walking minutes. None is scheduled when the Leader's starting Place is unknown or the walk is 0 minutes. It is scheduled after the transaction, is not awaited by the route's answer, and a failure is logged as a warning.
- **Ending.** When the Leader ends the Quest, the `leave-by` of every Holder of it is cancelled.
- The Notification holds the User's own time and walk only, never another person's.
- A walk alone is not in this ticket: nothing makes a Plan for one person into something kept yet. When it is, the design's rule holds: a walk alone of less than 5 minutes schedules none.

## Must not change

- The answers and status codes of `POST /plans` and of every other route, and the existing signals.
- `main-server/prisma/schema.prisma`.
- The words and ids of the kinds `accepted` and `declined`.

## Acceptance criteria

- [x] Making a party from the design's example with 민수 and 지은 (Tuesday 11:50) keeps one `leave-by` for the Leader: time 12:18, title "지금 나서요", `ahead` "12:18 나설 시각", line "학생회관식당까지 걸어서 15분", and `url` `/main?card=party:<questId>`. Nobody else has one.
- [x] Making a party from the example with 민수 alone keeps the Leader's at 12:12 with the line "302동식당까지 걸어서 3분".
- [x] A Leader whose starting Place is unknown, or who does not walk, has none, and `POST /plans` answers as before.
- [x] `POST /plans` answers as before when the keeping fails, and a warning is logged.
- [x] Ending the Quest removes the Leader's `leave-by`.
- [x] `accepted` and `declined` answer `ahead` null.
- [x] Unit tests of the words: both titles and the line, at a time whose minutes need a leading zero.
- [x] The app, unit tests: a row whose time is after now has `ahead` as its title, one whose time has come has the title, and a Notification without `ahead` has the title.
- [x] The app, integration test: "알림" shows "12:18 나설 시각" with its line, and a press opens the party's card.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `main-server/` and `mobile/`.

## Comments

### Decisions (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **`ahead` is kept with the Notification** and answered by `GET /notifications`. A Notification kept before this change reads it as null.
2. **The phone decides which title shows.** `ahead` shows only while the Notification's time is strictly after the phone's now; at the time itself the row reads "지금 나서요".
3. **The Leader's time to leave** is the time the Leader's part of the Plan sets out, read from the Plan that `POST /plans` has just calculated again. No Notification is kept when that part has no time, no walk, or a walk of 0 minutes.
4. **Ending the Quest** cancels the time to leave of every Holder the Quest had, from the Holders the ending already reads.
5. **The kind's look in the app**: the clock icon on the navy round. A kind the app does not know keeps the calendar.
6. **An older main server** sends no `ahead`: the answer's check takes a missing one as none.
7. **The two warnings**, when keeping or cancelling fails, are "The Leader's time to leave was not kept" and "A Holder's time to leave was not cancelled", each with the error.

### Checked by hand (2026-11-15)

The design's worked example on the seed's walking table (Tuesday 11:50, the asker's Class in 301동 just ended), through `POST /plans` and `GET /notifications` of the started server:

- with 민수 and 지은: the Leader's Notification is at 12:18, "12:18 나설 시각" before it and "지금 나서요" from it, with "학생회관식당까지 걸어서 15분";
- with 민수 alone: at 12:12, with "302동식당까지 걸어서 3분";
- a Leader whose Class is in the Restaurant's own building, and one with no Class before lunch and no position, have none.

### Agent usage (2026-11-15)

Up to the opening of the pull request. One implementing subagent (Opus 5.5) wrote the main server's part and then the app's.

- Agent time: about 20 minutes, an estimate from the transcript's timestamps.
- Tokens: output 67,584; input 16,820,811, of which 16,636,360 were cache reads, 184,237 cache writes, and 214 uncached. Without cache reads: 252,035.
