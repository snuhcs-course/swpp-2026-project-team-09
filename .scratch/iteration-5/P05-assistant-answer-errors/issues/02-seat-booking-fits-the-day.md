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

- The booking keeps the longest length from the arrival, as the design has it ("Books a 관정 seat for the longest time from my arrival, reminds me of … the leave-by time"). With a leave-by time, the words add how to end the booking then: "11:00 일정이라 10:54엔 나서요. 13:00까지 쓰지 않으면 카드에서 끝 시간을 당겨요."
- An arrival before the room opens is said as the opening ("07:00 열 때부터예요"), in the words, the card's note and the arrival the model is given.
- The words give both the arrival and the start when they differ ("08:13에 도착해 08:30부터예요").
- A length or an end the User named is kept as it is.

Left for the product owner: ending the filled booking at the leave-by time instead of filling the longest length. It would change the design.

## Acceptance criteria

- [x] At 04:34 the words and the note give the opening, not 04:40. (Unit test, fails before the fix.)
- [x] An arrival at 14:01 gives "14:01에 도착해 14:30부터예요". (Unit test, fails before the fix.)
- [x] With a leave-by time, the words say how to end the booking then. (Unit and integration tests.)
- [x] With no item after it, the longest length is still filled. (Unit test.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 5 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 20k; input 7.0M, of which 6.9M cache reads, 48k cache writes and 58 uncached. No subagents.
