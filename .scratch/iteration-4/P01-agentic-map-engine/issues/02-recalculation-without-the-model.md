# 02: Recalculation without the model

Parent: [P01 spec](../spec.md) ("Recalculation", "The contract")
Status: ready-for-agent
Blocked by: 01

## What to build

A User drags the time band of a Plan, removes a Friend's chip, or adds one, and the app sends the changed `PlanInput` to the main server, which answers with a new `AnswerReply` at once. The language model is not called, and the User's daily messages are not counted.

## Acceptance criteria

- [x] An endpoint takes a `PlanInput` and the asker's location and answers with an `AnswerReply`, through the same service the Assistant's tool calls.
- [x] The same input gives the same answer as the Assistant's tool gave.
- [x] **The window.** `window.from` and `window.until` bound when everyone is together: the Plan starts no earlier than `from` and ends no later than `until`. When not everyone can be there from `from`, the Plan starts when the last of them arrives, and the answer says who that is and when. When someone must leave before `until`, the Plan ends then, and the answer says who and when.
- [x] **The fixed Place.** With `placeId` set, only the Restaurants at that Place are planned, and the answer says so when none is open there.
- [x] **Constraints.** `from` replaces where a person sets out from (basis `chosen`), `notBefore` moves when they are ready, and `leaveBy` when they must leave. Only constraints the asker set are accepted.
- [x] An input whose first person is not the asker, a person who is not the asker's Friend, and a date out of reach are refused.
- [x] The scripted model of the tests is never called by the endpoint, and the count of the User's messages does not change.
- [x] Unit tests for the window, the fixed Place, and each constraint, with their boundaries; integration tests for the endpoint and its refusals.
- [x] The app's client has the call, and its mock answers from a copy of a real answer.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The endpoint** is `POST /assistant/answers`, with the body `{ input, location }`, and it answers an `AnswerReply`. It goes through the service the Assistant's tool calls, never through the model, and it does not count the User's daily messages.
2. **The window narrows the meal's window.** A Plan that starts later than the User's start says what holds it: the person whose own arrival is the latest (of two who merge, the one who reaches the Merging Point later), or the meal's own serving time when the meal is not served yet. A Plan that ends before the User's end says who must leave first, or when the meal stops being served. When both apply, the line says the start.
3. **Several constraints of one kind on a person**: the last `from`, the latest `notBefore`, and the earliest `leaveBy` hold.
4. **A fixed Place with no open Restaurant** gives no Plan, with the reason `no-fit` and the line "그곳에는 여는 식당이 없어요".
5. **Refused with 400**: a body of another shape, a window whose start is not before its end, a first person who is not the asker, a person who is not the asker's Friend, the same User twice, a date before today or more than a week ahead, a constraint whose source is not the asker, and a Place that does not exist.
6. **The chips say what the User fixed**: the until chip reads the User's end when it is earlier than both the asker's next item and the end of the meal's serving time, and the origin chip names a chosen Place.
7. **A Friend who is ready later than their Class ends** keeps the Class's end in their line of the basis, followed by the time from which they can come ("민수 12:15 302동 수업 끝 · 12:20부터 가능").
8. **The time band reaches out** to the half hours around a fixed window, so that the handles the User dropped stay inside it.
9. **The app** has `recalculateAnswer(input, location)`. Its mock does not calculate: it answers with the copy of the real answer, holding the input it was given.

### Checked by hand (2026-11-14)

The worked example of the design's section 6.1 under conditions, on the seed's walking table (Tuesday 11:50):

- with both Friends and the window ending at 12:50: 3식당 12:31 to 12:50 (19 minutes), 학생회관식당 12:33 to 12:50 (17), and 자하연식당 12:35 to 12:50 (15), in that order;
- with 민수 and the window starting at 12:40: 학생회관식당 12:40 to 12:59 (19) and 자하연식당 12:40 to 12:55 (15); 3식당, 301동식당, and 302동식당 are dropped;
- with 민수 ready no earlier than 12:20: 302동식당 12:20 to 12:43 (23), 301동식당 12:23 to 12:45 (22), and 학생회관식당 12:38 to 12:59 (21) with the meeting at 301동 at 12:23;
- with 민수 and the asker leaving by 12:30: 302동식당 12:15 to 12:30 (15) alone fits;
- with 민수 and the asker setting out from 학생회관: 학생회관식당 12:32 to 12:59 (27), with no meeting.

### Agent usage (2026-11-14)

Up to the review's fixes. The same session as ticket 01, with three more subagents for this ticket (the implementation, a two-axis review, and the review's fixes).

- Agent time: about 27 minutes, an estimate from the transcripts' timestamps.
- Tokens: output 148,798; input 57,155,971, of which 56,645,163 were cache reads, 510,520 cache writes, and 288 uncached. Without cache reads: 659,606.

