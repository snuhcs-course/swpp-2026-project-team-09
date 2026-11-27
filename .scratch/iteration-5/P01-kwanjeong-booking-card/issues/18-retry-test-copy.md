# 18: The stale copy of two describes in the booking-on-map retry test

Parent: [P01 spec](../spec.md); a failure on 5.0/Main reported on 2026-11-27
Status: ready-for-agent
Blocked by: none

Native files: none. Server: none. Releases: none (a test only).

## What happens now

`mobile/__tests__/answer-booking-on-map-retry.integration.test.tsx` fails on 5.0/Main. "the booking's flag while the rooms are listed" looks for a flag starting "관정 7층 열람실 ›", the label from before P01 ticket 10.

- The file holds two copies of two describes: "the line over the ticket" and "the booking's flag while the rooms are listed".
- The first copy has the label of ticket 10 and passes.
- The second is the copy from before ticket 10, left by #627's squash merge onto #625's version of the file. Its flag case fails; its two other cases repeat the first copy's.

Cause: a PR's fault, #627's merge. The app is right; the test is not flaky.

## What changes

The second copy is removed. The file keeps one of each describe, with ticket 10's label.

## Acceptance criteria

- [x] The file passes alone (`--maxWorkers=2`): 6 tests.
- [x] No test name is repeated in the files #625 and #627 touched.

## Comments
