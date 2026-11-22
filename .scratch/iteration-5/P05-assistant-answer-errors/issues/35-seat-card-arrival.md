# 35: A filled seat's card carries the arrival it was filled from

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server. The library session's app PR reads the new keys when they are there.

## What happens now

The study-seat answer fills a seat's start from when the User arrives at 관정관 (`seat-arrival.ts`).

- `shownBooking` gives the model the arrival `{ at, from, walkMinutes }` and `leaveBy`.
- The card the app draws gets only a note in words, such as "14:05 도착에 맞춰 최대 시간으로 채웠어요".
- So the app cannot say, on the map or in its sentence, why the seat starts when it does, nor when to leave for what follows.

## What to build

A `book` card for a seat whose start the server filled gets two optional keys. The shape is the one the orchestrator set; the library session's app PR reads it. Both come from what `seat-arrival.ts` already knows.

- `arrival: { at, walkMinutes, from }`:
  - `at`: when the User reaches 관정관, HH:MM as the card's other times are written.
  - `walkMinutes`: the walk there.
  - `from`: the label of the Place they set out from, as the app calls it (`24동`). When the time counts from the end of the Class the User is in, that Class's Place is the one set out from.
  - When the arrival is before the space opens, the card's `start` is the opening, and `at` stays the real arrival.
  - Left out when where the User sets out from is not known, the seat then being filled from now.
- `leaveBy`: HH:MM, when to leave 관정관 for the first item that starts before the booking ends, or null when none does.
- Both are left out when the User gave the start, and on any card that is not a filled seat.
- The note in words stays.
- A released app ignores both. Its guard checks only the fields it knows, and `withLibraryDefaults` drops the rest.
- The README's library card fields name both.

## Case table

Wednesday 2026-11-04. 24동 is 4 minutes on foot from 관정관.

| Row | When asked | Card | Where tested |
| --- | --- | --- | --- |
| 1 | 13:50, free now, the location at 24동 | `arrival` `{ at: 13:54, walkMinutes: 4, from: 24동 }`, `leaveBy` 15:56 for the 16:00 Class | `seat-card-arrival.unit.test.ts`; `assistant-library-seat-arrival.integration.test.ts` |
| 2 | 13:40, in a Class at 24동 until 13:50, the phone elsewhere | `arrival` `{ at: 13:54, walkMinutes: 4, from: 24동 }` | `seat-card-arrival.unit.test.ts` |
| 3 | 06:30, at 24동, before the 07:00 opening | `arrival.at` 06:34, the card's `start` 07:00 | the same file |
| 4 | no location and no item before | no `arrival`: filled from now | the same file |
| 5 | 관정관 not among the Places, or no label for the Place set out from | no `arrival` | the same file |
| 6 | nothing follows before the booking ends | `leaveBy` null | the same file (`bookCard`) |
| 7 | the User gave the start | no `arrival` and no `leaveBy` | the same file (`bookCard`); `assistant-library-seat-arrival.integration.test.ts` ("a named start") |

## Acceptance criteria

- [x] Rows 1 to 5 are unit tests that fail before the change, which had no `cardArrival`. Rows 6 and 7 are on `bookCard`.
- [x] The design example's card carries `arrival` and `leaveBy`, and a card with a named start carries neither.
- [x] The test schema for library cards takes the two optional keys.
- [x] The README names both.
- [ ] Eval: not run. No eval case reads a card's keys, and the run needs the team's model key, which this worktree does not have.
- [x] Lint, format and types of the main server pass.

## Comments
