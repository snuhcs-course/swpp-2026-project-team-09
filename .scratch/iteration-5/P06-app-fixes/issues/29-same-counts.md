# 29: One count for one thing on every screen

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- An event's recruiting count: the 행사 row counts others' 파티 only, while its sheet's head counts the User's own and ended ones too (`mobile/src/features/events/adapter.ts`, `mobile/src/screens/events/recruiting-sheet.tsx`).
- A 파티's size: its activation's map card says "파티 · 2/8명" (activation members over a capacity the app always opens with as 8, `mobile/src/screens/room/use-room-actions.ts`, `capacity: 8`), the room says "3/4명" (Holders over the Quest's capacity).
- Sharing: the 활성 파티 button leaves the User out ("1명 공유 중"), the room counts them ("2명이 서로 위치를 공유하고 있어요").

## What to build

Decided on 2026-11-27:
- An event's recruiting count is the 파티 the User could enter: others', with a place left, not ended. Row, sheet and map card alike.
- A 파티's size is its Holders over the Quest's capacity, on the map card too; an activation opens with the Quest's capacity (check the main server's other uses of `Party.capacity` first).
- A sharing count includes the User, on the button as in the room.

## Must not break

- The activation's own limits; the recruiting sheet's rows.
- Tests: the counts' tests (`.integration`).

## Acceptance criteria

- [ ] The same thing gives the same number on each screen. (App integration tests, which fail before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
