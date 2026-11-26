# 84: Each candidate's minutes left out on its own

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: 83 (the candidate's capsule).

Native files: none. Releases: an app OTA update.

## What happens now

Where room is short, a candidate's minutes are left out by rank (P04 ticket 13). Once one candidate in view has no room, every candidate after it loses its minutes too, whatever room it has.

With the capsule of ticket 83, which takes only the round's right or left, this happens often. On the crowded mock's first board, 3, 5, 6, 8 and 9 are all bare because 3 had no room. At the emulator's first view of "뭐 먹을까", 3 has a Friend's face at its right and the next Class at its left, and 4 loses its minutes with it.

## What to build

The user's decision (2026-11-26): other candidates keep their minutes ("다른 것의 시간을 바로 알 수 없는 단점이 있어 유지"), so each meal candidate loses its minutes on its own, only where they have no room.

- The order of placing stays: nearer numbers get room first.
- Only the rule that every later candidate loses its minutes once one has none is dropped, for a meal candidate's minutes.
- An answer's name tags without menus keep ticket 13's rule.

## Acceptance criteria

- [ ] At the emulator's first view of "뭐 먹을까", 3식당 (4) keeps "19분" at its right though 학생회관식당 (3) has no room.
- [ ] A candidate without minutes keeps its numbered round.
- [ ] The name tags of an answer without menus are still left out from the lowest rank upward.
