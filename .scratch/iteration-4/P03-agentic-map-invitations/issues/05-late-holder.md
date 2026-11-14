# 05: A late Holder reports the minutes, and a declined invitation is kept

Parent: [P03 spec](../spec.md) ("A late Holder", "The schema", "Members and the signals of an answer")
Status: ready-for-agent
Blocked by: 02, 03, and the push tokens' migration being on the iteration branch (the order of schema changes)

## What to build

A Holder who is late reports the minutes. The Quest keeps them on the Holder, the Holder is answered with their own way as it now is, and the other Holders are told the minutes and the arrival that follows. The same migration keeps a declined invitation, so that a Quest lists who declined.

## Acceptance criteria

- [ ] One migration, made from the schema on the iteration branch at that moment: `quest_holders.late_minutes` and `quest_invitations.declined_at`.
- [ ] `POST /quests/:questId/late` takes `{ minutes, location }`, `minutes` a whole number from 1 to 120. Only a Holder of the Quest reports; a later report replaces the minutes.
- [ ] The reply is the Holder's own way, set out `minutes` later than they would be ready, from the location given.
- [ ] The other Holders are told with `late` and `{ questId, userId, minutes, arriveAt }`, and every Holder with `quests-changed`. No signal holds a position or a Place of the late Holder.
- [ ] A Quest's members list a late Holder as `late` with the minutes.
- [ ] A declined invitation stays as a row with the time of the decline. It is not listed among the User's invitations or the Leader's waiting ones, cannot be accepted, and is listed among the Quest's members as `declined`. Inviting the User again sends the invitation anew.
- [ ] Integration tests: the report and its signals, a second report, a User who is no Holder, minutes out of range, the members after a decline, and an invitation sent again after a decline.
- [ ] The app's contract has the reply and the signal, the client has `reportLate(questId, minutes, location)`, and its mock answers from a stored copy of a real reply.

## Comments
