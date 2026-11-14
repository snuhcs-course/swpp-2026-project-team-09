# 05: A late Holder reports the minutes, and a decline is kept

Parent: [P03 spec](../spec.md) ("A late Holder", "The schema", "Members and the signals of an answer")
Status: ready-for-agent
Blocked by: 02, 03, and the push tokens' migration being on the iteration branch (the order of schema changes)

## What to build

A Holder who is late reports the minutes. The Quest keeps them on the Holder, the Holder is answered with their own way as it now is, and the other Holders are told the minutes and the arrival that follows. The same migration keeps a decline, so that a Quest lists who declined.

## Acceptance criteria

- [ ] One migration, made from the schema on the iteration branch at that moment: `quest_holders.late_minutes` and the table `quest_declines`.
- [ ] `POST /quests/:questId/late` takes `{ minutes, location }`, `minutes` a whole number from 1 to 120. Only a Holder of the Quest reports; a later report replaces the minutes.
- [ ] The reply is the Holder's own way: they set out `minutes` later than their way without the lateness has them set out, worked out again from then, from the location given, with the Quest's own Sub Quests left out of their day.
- [ ] The other Holders are told with `late` and `{ questId, userId, minutes, arriveAt }`, and every Holder with `quests-changed`. No signal holds a position or a Place of the late Holder.
- [ ] A Quest's members list a late Holder as `late` with the minutes.
- [ ] A decline deletes the invitation, as today, and is kept as a row of its own. The User is listed among the Quest's members as `declined`, after the invited. The row goes when the User is invited again or enters the Quest.
- [ ] Integration tests: the report and its signals, a second report, a User who is no Holder, minutes out of range, the members after a decline, an invitation sent again after a decline, and a room request's invitations answered as before.
- [ ] The app's contract has the reply and the signal, the client has `reportLate(questId, minutes, location)`, and its mock answers from a stored copy of a real reply.

## Comments
