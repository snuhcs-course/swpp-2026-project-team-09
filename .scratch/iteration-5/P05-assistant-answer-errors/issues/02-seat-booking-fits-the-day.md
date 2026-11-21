# 02: A seat booking fits the User's day

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server.

## What happens now

When the User names no length, the seat's time is filled by the main server (`library/seat-arrival.ts`):

- The booking runs for the longest length allowed (6 hours) from the arrival, and never ends at the User's next item. With a 파티 at 11:00 the answer said "07:00~13:00 예약" and, from the same item, "10:54에는 나서야".
- The arrival is now plus the walk, with no floor at the room's opening, so at 04:34 the answer said "04:40에 도착해요".
- The words give the arrival ("08:13에 도착하면 돼요") while the booking starts at the next 30-minute step (08:30).

## What to build

- With a next item today, the filled booking ends at the latest step at or before the leave-by time for that item, and is never longer than the longest length allowed.
- An arrival before the room opens is said as the opening ("07:00 열 때부터"), and the booking starts at the opening.
- The words give both the arrival and the start when they differ ("08:13 도착, 08:30부터").
- A length or an end the User named is kept as it is.

## Acceptance criteria

- [ ] With an item at 11:00 and a 6-minute walk, a seat filled at 07:00 ends by 10:30. (Unit test, fails before the fix.)
- [ ] At 04:34 the booking starts at the room's opening and the words do not give 04:40. (Unit test, fails before the fix.)
- [ ] An arrival at 08:13 gives words with both 08:13 and 08:30. (Unit test.)
- [ ] With no item after it, the longest length is still filled. (Unit test.)
- [ ] Lint, format and types of the main server pass.

## Comments
