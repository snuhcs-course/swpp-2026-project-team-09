# 02: The study answer's shape: StudyInput, Plan.study, and the capability

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Blocked by: nothing

## What to build

- In `dto/plan-input.dto.ts`, `PlanInput` gains `StudyInput` (`kind: 'study'`), with its zod schema in `planInputSchema`. In `dto/answer.dto.ts`, `Plan` gains the optional `study` and `AnswerReply` its `choosable`. Both are exactly as in the spec.
- `CLIENT_CAPABILITIES` gains `study-plan`.
- A fixture holds one whole reply, as the app's mock data does for meals: four buildings, 관정 bookable, one with hours unknown, one restricted dropped and one closed. It lives at `main-server/test/fixtures/study-answer.json`, and a unit test checks it against the types. The app session copies it for its mock.
- The mobile types are the app session's to add.

## Acceptance criteria

- [ ] The recalculation schema takes a `study` input and refuses a bad one (an unknown `what`, two people, a malformed area).
- [ ] The fixture parses as an `AnswerReply`, and every plan has `study`.
- [ ] Nothing else changes on the wire for a request without `study-plan`.
