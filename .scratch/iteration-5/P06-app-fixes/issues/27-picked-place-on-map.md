# 27: A place picked on the map opens a map with its pin

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- A place picked on the map is named "지도에서 고른 위치", or "<건물> 근처" when a building is near (`mobile/src/features/places/use-place-at.ts`, `toPlaceAt`). Its point is kept: the Sub Quest stores its latitude and longitude.
- Wherever the 파티 is shown (모집글, cards, the room's 일정) only the words appear, so others cannot tell where it is.

## What to build

- A 파티's place with a position and no Place is pressable where it is shown (모집글 and its sheet, the room's 일정, the invitation card of ticket 24), and opens a small map sheet with a pin at the point and its words.
- The 근처 rule and its distance stay. A place typed as words with no position (e.g. "서울대입구") stays words and is not pressable (decided 2026-11-27).

## Must not break

- Picking a place on the map, and a Place chosen from the list.
- Tests: app `party-form-place*`, `party-post*` (`.integration`).

## Acceptance criteria

- [ ] A picked place opens a map sheet with its pin; a typed one does not. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
