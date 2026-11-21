# 28: A kept Quest says where it is on the map

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server, then the app (P04) reads the field.

## What happens now

The app is to mark the place of a Quest already set on the map, such as "잡힌 점심 12:16", apart from a plan's candidates. A kept Quest names its place only in words (`place: string | null`), so the app cannot mark it.

## What to build

- Every kept Quest the app reads has `point: PlacePoint | null`, the same shape as a Plan's `place` (`{ placeId, label, latitude, longitude }`): `planSet`, each of `related`, and the day Lookup's `kept`.
- It is its first step's Place. It is null when that step has no Place, or only words for one.
- The model is not told it: coordinates stay on the server, as for every other answer.
- Released apps are unaffected: their guard for a kept Quest checks only the fields it knows (`isKeptQuest` at `snunow/all/26.11.22-6`).

## Acceptance criteria

- [ ] A meal's `planSet` and a meeting in `related` each carry the point of the Place of the Plan they were made from (`assistant-related-quests.integration.test.ts`, which failed before the change).
- [ ] A day Lookup's `kept` carries its point, and null for a place given only in words (`day-kept-quests.unit.test.ts`, which failed before the change).
- [ ] Lint, format and types of the main server pass.
