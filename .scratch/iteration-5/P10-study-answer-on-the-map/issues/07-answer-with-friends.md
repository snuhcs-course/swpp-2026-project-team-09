# 07: The study answer with Friends: a 관정 group study room at everyone's free time

Parent: [P10 spec](../spec.md) § With Friends
Status: ready-for-agent
Blocked by: 02, 03

## What to build

- A study input with Friends (2 to 8 people) answers one plan, `관정관`, a 관정 group study room. The input alone stays 03's.
- **The time** is today's `pickStudyTime`, read as `proposeStudyRoom` reads it:
  - everyone's items of the day;
  - the room kind's hours, in 30-minute steps;
  - the walks to and from 62-1;
  - `window` as bounds, and `minutes` as the length (180 by default).
- **The room kind** is `studyRoomFor`'s, or `chosen.roomSpaceId` while it fits. `study.group.rooms` lists every kind with `fits` and its reason.
- `parts` has each person with their `arrivalsOf` arrival, and `band.lanes` everyone's busy time.
- **2 or 3 people:** `moreNeeded`, no `key`; the sentence is "그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요."
- **No plan:** `no-shared-time` when nobody can be together for 30 minutes; `no-fit` above 8 or with no room for the head count, in today's words.
- **A day past the booking window** (up to 14 days): `opens`, and a `key` ending in `:wait`.
- **The words:** one sentence ("네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요."); the wordless net makes it too.
- **The recalculation** with Friends added or removed reruns it. With all Friends removed, the input is 03's answer alone again, with `chosen.seatSpaceId` and `window` kept.

## Acceptance criteria

- [ ] 4 people with free time tomorrow afternoon get one plan at the pick `pickStudyTime` gives, in the room `studyRoomFor` gives, with a `key` that `POST /library/room-requests` accepts. (Integration test.)
- [ ] 3 people get `moreNeeded: 1` and no `key`; 9 get `no-fit`; people with no common 30 minutes get `no-shared-time`. (Unit tests.)
- [ ] A day 5 days ahead gets `opens` and a `:wait` key. (Unit test.)
- [ ] Removing every Friend gives the answer alone, with the seat space chosen before. (Integration test.)
