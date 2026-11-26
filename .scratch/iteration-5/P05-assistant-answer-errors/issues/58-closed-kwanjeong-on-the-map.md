# 58: 관정 closed for today is drawn on the map as a grey place with why

Parent: [P05 spec](../spec.md); ticket 57 (PR 618) and the user's choice (2026-11-26 night): after closing, 관정 is drawn as a Restaurant with no menu is (P04 ticket 59), a grey mark with "오늘 23:00 닫음 · 내일 07:00부터", the one sentence, and no main button
Status: ready-for-human
Blocked by: nothing (ticket 57 merged)

Native files: none. Releases: the main server. Today's app already draws it.

## What changes

- The closed refusal of `showLibrarySeats` and `findLibraryFreeSlots` (ticket 57) also draws 관정 as a place with why. It is a `place` Lookup (`library/closed-today.ts`, where `closedToday` and `closedWords` move) with:
  - one `dropped` mark at 관정 (62-1), tagged "관정도서관 · 오늘 23:00 닫음 · 내일 07:00부터", the hours from the catalogue;
  - `fact: true` and no actions, so there is no main button.
- Today's app draws a `dropped` place as a grey dot with its tag, so no app change is needed. It reaches phones with the main server.
- The rule: when `findLibrarySpace` gives a space `closedToday` and the question is about today, the model calls `showLibrarySeats`, which answers `closedToday` and draws it.
- Not built: an offer of study places open now (it needs the opening hours in `findStudyNearby` first, P10 ticket 06), and an offer of tomorrow's seats (seats are booked on the day only).

## Acceptance criteria

- [x] At 23:37, `showLibrarySeats`'s reply carries that Lookup. (Integration test.)
- [x] Today's app draws that scene as one grey `dropped` mark with its tag and no pick. (App unit test, no app change.)
- [x] README; whole lint, format and types of the main server; the library integration files run locally.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 15 minutes of one session, done on ticket 57's branch after its approval and moved here when 57 merged without it. An estimate.
- Tokens: within ticket 57's session; not measured apart.
