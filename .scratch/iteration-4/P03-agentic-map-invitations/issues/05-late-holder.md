# 05: A late Holder reports the minutes, and a decline is kept

Parent: [P03 spec](../spec.md) ("A late Holder", "The schema", "Members and the signals of an answer")
Status: ready-for-agent
Blocked by: 02, 03, and the push tokens' migration being on the iteration branch (the order of schema changes)

## What to build

A Holder who is late reports the minutes. The Quest keeps them on the Holder, the Holder is answered with their own way as it now is, and the other Holders are told the minutes and the arrival that follows. The same migration keeps a decline, so that a Quest lists who declined.

## Acceptance criteria

- [x] One migration, made from the schema on the iteration branch at that moment: `quest_holders.late_minutes` and the table `quest_declines`.
- [x] `POST /quests/:questId/late` takes `{ minutes, location }`, `minutes` a whole number from 1 to 120. Only a Holder of the Quest reports; a later report replaces the minutes.
- [x] The reply is the Holder's own way: they set out `minutes` later than their way without the lateness has them set out, worked out again from then, from the location given, with the Quest's own Sub Quests left out of their day.
- [x] The other Holders are told with `late` and `{ questId, userId, minutes, arriveAt }`, and every Holder with `quests-changed`. No signal holds a position or a Place of the late Holder.
- [x] A Quest's members list a late Holder as `late` with the minutes.
- [x] A decline deletes the invitation, as today, and is kept as a row of its own. The User is listed among the Quest's members as `declined`, after the invited. The row goes when the User is invited again or enters the Quest.
- [x] Integration tests: the report and its signals, a second report, a User who is no Holder, minutes out of range, the members after a decline, an invitation sent again after a decline, and a room request's invitations answered as before.
- [x] The app's contract has the reply and the signal, the client has `reportLate(questId, minutes, location)`, and its mock answers from a stored copy of a real reply.

## Comments

### Decisions (2026-11-14)

- The lateness is added to when the Holder's way on time has them set out, so a Holder who would leave with time to spare still arrives the minutes late (지은 out at 12:28 for 5 minutes, 5 minutes late, arrives at 12:38). The way is then worked out again from that moment with the same rules, so a Holder who was going by the Merging Point always loses it: they reached it exactly at its start before.
- A report on a Quest with no step ahead that has a time and a Place of the list is refused with 409 `QUEST_NOT_GATHERING`, before the minutes are kept, since there is no way to answer with.
- The minutes are checked by the database as well (`quest_holders_late_minutes_check`, 1 to 120), as the capacity is.
- A Holder's own minutes are never cleared by the server: a later report replaces them, and they go with the Holder's row when the Holder drops the Quest. Nothing turns a Holder back to `accepted` yet.
- The report takes no Idempotency-Key: a repeat replaces the minutes with the same number, and only sends the signals again.
- A decline replaces an earlier decline of the same User for the Quest by deleting it and writing a new row in the same transaction as the invitation's deletion, so `declined_at` is the database's time of the last decline.
- The declined are listed after the invited by `declined_at`, then by id.
- The reading of a Quest's steps, a User's day, the phone's location, and the Places moved from the card's service to `plans/own-way-reader.service.ts`, which the card and the late report both call.
- The existing test "leave out a User who declined" in `quest-members.integration.test.ts` now expects the User listed as `declined`, which this ticket asks for.
- The app's mock answers with the main server's reply for 민수 5 minutes late, copied from a run on 2088-10-05 with the day moved to 2026-11-17 and 민수's id set to the one the invitation card's copy has, so the two copies tell one story.
- In the app, the `late` signal fetches only the Quests again (the members change); the listener in `live/late-reports.ts` passes on a payload only with all four fields of their types. The set of listeners and the reading of a payload's text fields moved to `live/listeners.ts`, which the invitation answers and the late reports share.
- The app's check of a late report's reply is the card's check of a way, with no way (null) refused, since a report is always answered with one.
