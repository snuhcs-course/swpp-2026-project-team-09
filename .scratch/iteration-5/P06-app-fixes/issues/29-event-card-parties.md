# 29: The map's event card leads to the 파티 recruiting for it

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- The map's event card says "같이 갈 파티 N개 모집 중", but its button "같이 갈 사람 찾기" opens a blank 파티 form (`mobile/src/features/map/event-cards.ts`, `mobile/src/screens/main/main-screen.tsx`).
- The 행사 tab, for the same event, first opens its recruiting sheet (`mobile/src/screens/events/recruiting-sheet.tsx`).

## What to build

- With one or more 파티 recruiting, the card's button opens the same recruiting sheet over the map, and a row opens its 모집글. With none, the form as now.

## Must not break

- The 행사 tab's sheet; the card's other lines.
- Tests: app `map-event-*` (`.integration`).

## Acceptance criteria

- [ ] The button opens the recruiting sheet when there are 파티, the form when none. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
