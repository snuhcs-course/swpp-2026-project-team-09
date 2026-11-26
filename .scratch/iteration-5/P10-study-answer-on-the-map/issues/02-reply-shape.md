# 02: The study answer's shape: StudyInput, Plan.study, and the capability

Parent: [P10 spec](../spec.md)
Status: ready-for-human
Blocked by: nothing

## What to build

- In `dto/plan-input.dto.ts`, `PlanInput` gains `StudyInput` (`kind: 'study'`), with its zod schema in `planInputSchema`. In `dto/answer.dto.ts`, `Plan` gains the optional `study` and `AnswerReply` its `choosable`. Both are exactly as in the spec.
- `CLIENT_CAPABILITIES` gains `study-plan`.
- `StudyInput.people` takes the asker and up to 7 Friends (1 to 8, PARTY_MAX), with `minutes` and `chosen` (2026-11-27 revision, spec § With Friends). `Plan.study` gains `group`, and the DTOs gain `RoomRequestState`.
- Fixtures hold whole replies, as the app's mock data does for meals. The app session copies them for its mock:
  - one alone answer: four buildings, 관정 bookable, one with hours unknown, one restricted dropped and one closed;
  - one with Friends ready to send: 4 people, 4층 6인실, with a `key`;
  - one gathering: `request` with 1 of 3 consents;
  - one ready: every consent in;
  - one with `moreNeeded`: 3 people, no `key`.
  They live in `main-server/test/fixtures/study-answer.ts` and `study-group-answers.ts`, typed as `AnswerReply` and checked by `tsc` and a unit test.
- The request context's `conditions` take a `study` input already, since an app showing a study answer sends it back with every follow-up. The model reads it as `[Plan on screen: {…"kind":"study"…, "numbered": […]}]`.
- Until ticket 03 answers it, `POST /assistant/answers` refuses a `study` input with 422.
- The mobile types are the app session's to add.

## Acceptance criteria

- [x] The recalculation schema takes a `study` input, alone and with Friends, and refuses a bad one: an unknown `what`, more than 8 people, a malformed area, or `minutes` out of range. (Unit tests, `study-reply-shape.unit.test.ts`.)
- [x] Each fixture parses as an `AnswerReply`, and every plan has `study`; a plan with Friends has `study.group`.
- [x] The study plan on screen is given to the model with its numbered places. (Unit test.) A recalculation of it answers 422. (Integration test.)
- [x] Nothing else changes on the wire for a request without `study-plan`.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 30 minutes of one session, with the P10 spec and tickets (PR 620). An estimate.
- Tokens: not measured apart from the session's other work that night.
