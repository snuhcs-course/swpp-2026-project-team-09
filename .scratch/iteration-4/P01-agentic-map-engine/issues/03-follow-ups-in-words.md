# 03: The Assistant changes a Plan from words

Parent: [P01 spec](../spec.md) ("The Assistant", "The contract")
Status: ready-for-agent
Blocked by: 02

## What to build

While a Plan is on the screen, the User says "지은이도 불러 줘", "민수는 빼고", or "12:30까지만", and the Assistant answers with the Plan recalculated under the changed conditions. The model reads the conditions on screen from the request context, changes only what the User said, and says in one line what changed.

## Acceptance criteria

- [ ] The request context's `conditions` and `planId` reach the model as a line that names the Plan on screen, as a Proposal shown is given back today.
- [ ] The meal tool takes the conditions back with a change: a Friend added or removed, a time the User fixed, or a Place the User fixed.
- [ ] A tapped Place or Friend in the request context is used as "여기" and "이 사람" of the question.
- [ ] The Assistant's other answers that involve a Place (where a Place is, the minutes to a Place, a menu) return a map scene in the new shape for an app with the `answer` capability.
- [ ] Integration tests with the scripted model for each change and for the tapped context. No evaluation suite is added, and the engine is not run against a question set (the spec's Testing Decisions).

## Comments
