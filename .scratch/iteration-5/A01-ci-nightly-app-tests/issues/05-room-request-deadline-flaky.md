# 05: room-request-deadline.integration.test.ts fails beside the other room-request files

Parent: [A01 spec](../spec.md)
Status: needs-triage
Blocked by: None

## What happens

`main-server/test/room-request-deadline.integration.test.ts` fails 2 tests when it runs in parallel with the other
room-request files, on two workers. It fails the same way on the base of PR 647 (e9b394fea), so the cause is not
PR 647. It passes alone.

## The cause, as far as ten minutes tell

- The file's own header says it: every room file shares one database, and any read applies the deadlines of every
  request by its own file's clock.
- This file keeps its clock before Wednesday 2026-11-04 20:00, the other files' deadline. It counts on every other
  room file reading at Wednesday 10:05.
- Three files now read room requests at a later clock:
  - `study-group-answers.integration.test.ts` (P10 ticket 07): a room request at a clock in 2087;
  - `room-request-answers.integration.test.ts` (P10 ticket 08): 2026-11-27;
  - `study-room-window.integration.test.ts`: 2026-11-27.
- When one of them reads while this file's requests stand, it applies their deadlines, and this file's asked
  companions go out early.
- Not checked: whether it is a port or the seed. Shared rows plus each file's own clock explain both failures.

## What to build (not now)

One of these, to choose:
- keep every room-request file's clock before the deadline file's;
- or scope the deadline sweep a read does to the reader's own requests;
- or give the room-request files their own database;
- or run them in one worker.

## Acceptance criteria

- [ ] The room-request files pass together on two workers, three runs in a row.
