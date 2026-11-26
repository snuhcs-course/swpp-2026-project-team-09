# 09: Each group room kind carries its library space, for the phone to read free rooms

Parent: [P10 spec](../spec.md) § With Friends
Status: ready-for-human
Blocked by: 07

## What to build

The app session, building the group card, found a gap. To read free rooms on the phone (which room, and how many of
each kind) it needs each room kind's library space. A sector may hold several kinds (4층's 14103), so it needs the
kind's room numbers too.

- `GroupRoomKind` (on `study.group.room` and each of `study.group.rooms`) gains `space`: the `LibraryCardSpace` the
  library cards already carry, `cardSpace(room, room.seatNos)` from the catalogue. It holds `roomNo`, `sectorNo`, the
  kind's `seatNos`, `hours`, and `minMinutes`, `maxMinutes` and `stepMinutes`.
- The change is additive. No prompt or tool changes.

## Acceptance criteria

- [x] The group answer's room and every kind carry their library space; 4F-group-6's is sector 14103 with its 24 room
  numbers. (Unit test, `study-group.unit.test.ts`.)
- [x] The `STUDY_GROUP_*` fixtures carry the same spaces as the catalogue gives. (Unit test,
  `study-reply-shape.unit.test.ts`, which compares each fixture space with `cardSpace` from the catalogue.)
