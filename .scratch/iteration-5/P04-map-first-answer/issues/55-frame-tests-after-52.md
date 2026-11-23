# 55: Three of the frame's tests follow the answer screen as it is after ticket 52

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Tests only.

## What happens now

The nightly-level run on 5.0/Main 42bbd4258 (run 45124581910) fails in three of the frame's tests. In each, the test is old and the code is right:

1. `answer-frame-giving-way`, "the map's credit … back above the AI input after ✕ for a User in no Party": the credit's bottom is 200, the test expects 150.
   - After ✕ the conversation is kept, so the 이어서 chip stands over the input, and the credit stands 8 above whatever stands at the left above the input (`underCredit`, "never an empty place"). One 34-high thing there puts the map's inset at 112 against 62 (`main-layout.unit.test.ts`).
   - The test was written for nothing open. It fails just before ticket 52 too.
2. `answer-frame-proposal-edit`, "keeps the conversation and the Proposal … without making": no button named `답 닫기`.
   - The test leaves the Proposal's edit form, a screen pushed from the right, by its app bar's "뒤로". Ticket 52's sweep of "뒤로" to "답 닫기" took this press too, by mistake.
3. `answer-failure-and-waiting`, "keeps the card as high as the reply before while the next one is on its way": no `minHeight` in the content's `contentContainerStyle`.
   - Since ticket 52 the card is laid out once and moved, and its height is its content's, measured on the parts under its top's padding. The held height is the parts' least height (420 less the padding's 12), set from their layout, not from the scroll's content size.

## What to build

- (1) expects the credit above the 이어서 chip after ✕, and checks that the chip is there.
- (2) leaves the form by "뒤로" again.
- (3) lays the parts out, and expects their least height while the next reply is on its way.

## Acceptance criteria

- [x] The three tests pass, with no change to the app's code. (Integration tests.)

## Comments

### Agent usage (2026-11-23)

- Agent time: about 30 minutes in the map-first-answer session (an estimate). No subagents.
- Tokens: an estimate: output about 15k; input about 8M, almost all cache reads.
