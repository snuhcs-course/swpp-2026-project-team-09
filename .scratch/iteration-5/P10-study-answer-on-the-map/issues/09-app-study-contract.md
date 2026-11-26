# 09: The app reads a study answer with Friends

Parent: [P10 spec](../spec.md) § With Friends; designs `notes-ko/handoff/group-study-design` and `group-study-resume` (approved 2026-11-27)
Status: ready-for-human
Blocked by: 07 (server, PR 643) for the fixtures it copies

Native files: none. Releases: an app OTA update, with nothing new on screen: the app does not yet send `study-group` (ticket 16).

## What happens now

The app has no study Plan. `PlanInput` (`mobile/src/api/assistant-types.ts`) has no `StudyInput`, and `Plan` has no `study`.

`isInput` (`mobile/src/api/server/plan-inputs.ts`) accepts only meal, events, quests, new-quest and meet. A reply with a study input therefore fails `isAnswerReply`, and the whole reply is refused (`assistant-client.ts`).

## What to build

- **Types**, the server's own shapes (`main-server/src/assistant/dto/study-plan.dto.ts`, `plan-input.dto.ts`, PR 643):
  - `StudyInput`: `kind: 'study'`, `date`, `what`, `people`, `together`, `window`, `area`, `minutes`, `chosen {seatSpaceId, roomSpaceId}`.
  - `Plan.study`: `PlanStudy` with `spaces`, `book`, `liveSeats` and `group?`.
  - `StudyGroup`: `room`, `rooms[]` with `fits` and `reason`, `people`, `moreNeeded`, `key`, `useDescOptions`, `opens`, `request`.
  - `RoomRequestState`: `id`, `status`, `consented`, `asked`, `waiting`, `moreNeeded`.
- **Parsers:** `isInput` and `isPlan` accept them. Each field is checked as the server sends it, and a group with a missing or wrong field fails the reply as any other bad Plan does.
- **Kind tables:** `hasPeople`, `windowOf`, `withPerson`, `withoutPerson`, `withBound`, `withStart` (`features/assistant/plan-input.ts`), `addNameOf` (`screens/main/answer/who-words.ts`, "같이") and `bandIsFixed` (`row-four-inputs.ts`) know `study`, so the meal's picker and recalculation take a study input unchanged. Removing a person keeps `together` as it is (the server keeps a together answer at `moreNeeded 3`).
- **Fixtures:**
  - The server's `STUDY_ANSWER` and the four `STUDY_GROUP_*` are copied as JSON, with their dates and names, into the mock's data (`mobile/src/api/mock/data/study-*.json`), checked as replies when loaded (`study-group-answers.ts`).
  - The mock's recalculation answers a study input from them: the answer to send for four people, the one short of one otherwise.
  - The mock answers the words "같이 공부할 자리 있어?" only from ticket 11 on, once the app draws the answer.
- `ANSWER_CAPABILITIES` is unchanged.

## Acceptance criteria

- [x] Each of the five fixtures is accepted by `isAnswerReply`, its Plan keeping `study.group` whole. (Unit test.)
- [x] A group without `key`, with a `moreNeeded` that is not a number, or with an unknown request `status` fails the reply. (Unit test.)
- [x] Adding, removing and windowing a study input through the plan-input helpers keeps its `together`, `chosen` and `minutes`. (Unit test.)
- [x] `ANSWER_CAPABILITIES` has neither `study-group` nor `study-plan`. (Unit test.)
- [x] The mock's recalculation of a study input answers the room to send for four people and the one short of one for three. (Unit test.)
- [x] Whole lint, format and types.

## Comments

### Agent usage (2026-11-27)

- **The plan of tickets 09 to 16:** about 15 minutes in the p04-58 session, from 18:55 UTC to the plan sent, an estimate. Three subagents read the designs, the server's shapes, and the app's room flow and meal parts: 118k, 223k and 260k tokens in all, by their reports, with no split of the cache.
  - The session's tokens: input 62 uncached, with cache reads 8,919,447 and cache writes 69,985; output 35,284.
- **This ticket:** about 12 minutes, from 19:09 UTC to the pull request, an estimate. No emulator.
  - Tokens: input 66 uncached, with cache reads 14,259,245 and cache writes 65,991; output 33,237.
