# 02: Recalculation without the model

Parent: [P01 spec](../spec.md) ("Recalculation", "The contract")
Status: ready-for-agent
Blocked by: 01

## What to build

A User drags the time band of a plan, removes a Friend's chip or adds one, and the app sends the changed `PlanInput` to the main server, which answers with a new `AnswerReply` at once. The language model is not called, and the User's daily messages are not counted.

## Acceptance criteria

- [ ] An endpoint takes a `PlanInput` and the asker's location and answers with an `AnswerReply`, through the same service the Assistant's tool calls.
- [ ] The same input gives the same answer as the Assistant's tool gave.
- [ ] **The window.** `window.from` and `window.until` bound when everyone is together. A person who cannot be there for the whole of a fixed window stays in the plan, and their lane and the answer's lines say from when to when they can be there.
- [ ] **The fixed place.** With `placeId` set, only the Restaurants at that Place are planned.
- [ ] **Constraints.** `from` replaces where a person sets out from, `notBefore` when they are ready, and `leaveBy` when they must leave. Only constraints the asker set are accepted.
- [ ] An input whose first person is not the asker, a person who is not the asker's Friend, and a date out of reach are refused.
- [ ] The scripted model of the tests is never called by the endpoint, and the count of the User's messages does not change.
- [ ] Unit tests for the window, the fixed place and each constraint, with their boundaries; integration tests for the endpoint and its refusals.
- [ ] The app's client has the call, and its mock answers from a copy of a real answer.

## Comments
