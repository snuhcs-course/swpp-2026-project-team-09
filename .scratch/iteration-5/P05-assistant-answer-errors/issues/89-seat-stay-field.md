# 89: A Quest says whether it is a seat's stay

Parent: [P05 spec](../spec.md). Follows [ticket 88](88-solo-quests-gather.md): every Quest taken alone gathers by a later invitation but a seat's stay. The app's room must tell the one that still refuses 수정 and an invitation, and QuestDto sent `takenAlone` alone.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server; the app reads the field in its own PR. No migration: `quests.seat_stay` exists.

## What changes

- **The field.** `QuestDto` carries `seatStay: boolean`. It is `true` for a booked seat's stay at 관정관 (`POST /library/seat-stays`, the stored `quests.seat_stay`) and `false` for every other Quest, a Class Quest's included.
- **Where it shows.** Every answer that carries a Quest has it: `GET /quests`, a Quest read (the room's), a seat's stay made, a Plan made, and the rest. All are built by `toQuestDto` or `toClassQuestDto`, which spread both flags from `aloneOf`.
- **Docs.** The README's Quest fields say what it means.
- **Installed apps** check a Quest's known fields and pass an extra one, so they are unaffected.

## Tests

- `seat-stays.integration`: a seat's stay made carries `seatStay: true`, and so does it among the User's Quests (new). 5 of 5.
- `solo-quests.integration`: a Quest made alone carries `seatStay: false`. 11 of 11.
- `class-quests.integration`, `quests.integration` and `own-quests.integration`: a Class Quest and a 파티 carry `seatStay: false`. 14, 14 and 19.
- Before: 6 failed (no field).
- `plans-alone-guards` 7 passes. main-server's lint, types and format pass, on the head with `5.0/Main` merged in after #789.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 25 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 88.
