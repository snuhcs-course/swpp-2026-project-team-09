# 02: The study answer's shape: StudyInput, Plan.study, and the capability

Parent: [P10 spec](../spec.md)
Status: ready-for-human
Blocked by: nothing

## What to build

- In `dto/plan-input.dto.ts`, `PlanInput` gains `StudyInput` (`kind: 'study'`), with its zod schema in `planInputSchema`. In `dto/answer.dto.ts`, `Plan` gains the optional `study` and `AnswerReply` its `choosable`. Both are exactly as in the spec.
- `CLIENT_CAPABILITIES` gains `study-plan`.
- A fixture holds one whole reply, as the app's mock data does for meals: four buildings, 관정 bookable, one with hours unknown, one restricted dropped and one closed. It is `main-server/test/fixtures/study-answer.ts`, a TypeScript object typed as `AnswerReply`, so `tsc` checks it against the types, and a unit test checks its rules. The app session copies it for its mock.
- The request context's `conditions` take a `study` input already, since an app showing a study answer sends it back with every follow-up. The model reads it as `[Plan on screen: {…"kind":"study"…, "numbered": […]}]`.
- Until ticket 03 answers it, `POST /assistant/answers` refuses a `study` input with 422.
- The mobile types are the app session's to add.

## Acceptance criteria

- [x] The recalculation schema takes a `study` input and refuses a bad one: an unknown `what`, two people, an area turned over, or a key it does not have. (Unit tests.)
- [x] The fixture is an `AnswerReply`, checked by `tsc`. Every plan has `study`, only 관정관 has `book` and `liveSeats`, the known-open plans come before the unknown, and it is `choosable`. (Unit tests.)
- [x] The study plan on screen is given to the model with its numbered places. (Unit test.) A recalculation of it answers 422. (Integration test.)
- [x] Nothing else changes on the wire for a request without `study-plan`.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 30 minutes of one session, with the P10 spec and tickets (PR 620). An estimate.
- Tokens: not measured apart from the session's other work that night.
