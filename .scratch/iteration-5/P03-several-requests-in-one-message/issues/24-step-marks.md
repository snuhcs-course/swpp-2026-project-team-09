# 24: The steps' marks take their answer's own colour

Parent: [P03 spec](../spec.md). Builds on #726 (P01 ticket 41), the one table of each kind's colour (`kindTone`).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an app OTA update; nothing changes on screen beyond #726.

## Why

The user, on 2026-11-28, about the steps' marks drawn in one gold-brown: "각자에 맞는 색상을 사용해야지. 공용 컴포넌트를 안썼나 보네." #726 made every mark, the steps' included, read one table of each kind's colour (`answerTone`, `stepTone`). This ticket pins that a step's mark is the same answer's colour alone, and puts the user's three choices for the steps' marks in one function each. He will decide them from use.

## What changes

- `features/assistant/steps-scene.ts`: `stepDrafts` reads the two choices that are not colours:
  - Choice 1, what a seat's or a room's round holds, was decided by the user on 2026-11-28 ("가안이 좋아보여"): every step's round holds its kind's icon, never a number (ticket 26, which removed `bookingStepHolds`).
  - `stepMarkRole(step)`: choice 3, how a step's round is drawn. Every step done is solid, as a pick, the chosen one or not; a step not done is grey.
- Choice 2, a room's step in the study colour as a seat's, is #726's table (`answerTone('room')`).

## The three choices

| # | Choice | Built as | The other way |
| - | ------ | -------- | ------------- |
| 1 | A seat's or a room's step mark | decided (ticket 26): its kind's icon, the book, with no number; every step's round holds its kind's icon | — |
| 2 | A room's step colour | study, as a seat's | the default navy |
| 3 | The steps not chosen | solid, as every step done | soft, as one answer's other candidates |

## Acceptance criteria

- [x] A step of each kind (meal, study, events, Quests, a new Quest, meet) takes the colour of the same answer's own pick drawn alone; a seat's step the study colour; a step not done is grey by its role. (Unit test, `features/step-marks`.)
- [x] The three choices, one function each. (Unit test, `features/step-marks`.)

## Comments
