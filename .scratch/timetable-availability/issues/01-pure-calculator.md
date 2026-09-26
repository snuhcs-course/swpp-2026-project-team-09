# Pure timetable availability calculator

Status: ready-for-human
Type: task

## Scope

Implement only a pure timetable calculator and tests for the agreed weekly Asia/Seoul profile timetable. No endpoint, database, dependency or policy changes. Coordinator integrates with latest timetable/quest snapshots under user locks.

## Implemented contract

`main-server/src/modules/availability.ts` exports `AvailabilityInterval` (`startsAt: Date`, `endsAt: Date`), `TimetableAvailability`, `getTimetableAvailability(timetable: unknown, from: Date, to: Date)`, and `overlaps(a, b)`.

All intervals are half-open. Window must be positive and at most 31 elapsed days; timetable permits at most 100 weekly entries. Invalid dates/ranges/entry timing/timezone throw RangeError; non-object timetable throws TypeError. No input mutation or private class metadata in output.

Result fields: `configured`, `coverage`, `busy`, `free`. Missing timetable or null semester with empty entries is unconfigured, with no inferred free time. A configured empty timetable has free time only within inclusive semester dates intersected with the explicit requested window. A window outside the semester is configured but has no coverage/free/busy. Busy intervals are clipped, sorted, and merged, including adjacency. Free intervals complement busy intervals only inside coverage; no claims are made about other calendars or quests. Caller decides policy for manual selection when unconfigured.

Native Intl converts Seoul wall time independently of process timezone. Local 24:00 is next midnight; semester end date is inclusive. Nonexistent local times at historical timezone transitions are rejected rather than guessed.

## Validation

Six focused node:test tests pass: Seoul UTC/date rollover, Monday/Sunday weekday mapping, semester clipping and 24:00, year rollover, adjacency/overlap merging, half-open boundaries and millisecond precision, missing vs empty vs uncovered semester, invalid input and resource bounds, metadata omission and no mutation. Pending coordinator review/integration.
