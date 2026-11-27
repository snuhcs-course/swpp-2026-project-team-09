# 76: "아침 7시에 도서관 갔다가 점심" is two steps, and lunch sets out from the study place

Parent: [P05 spec](../spec.md). The user's phone on 2026-11-28 at about 01:20, far from campus (preview build, Production server): "아침 7시에 도서관 갔다가 점심" got one meal answer, no steps, and words saying the server did not know where he starts. It is the study + meal case of several requests, the one he wants working first.
Status: ready-for-human
Blocked by: nothing. The app shows two answers once it says `answers` (P03 tickets 21 and 22).

Native files: none. Releases: the main server; this PR adds a test only.

## What is true on `5.0/Main` (with P05 tickets 73 and 74)

- **An app that says `answers`:** two answers (study, then lunch) and two steps.
  - Lunch sets out from the study place, not before the stay there ends, already while the model plans it: `planMeal` reads the study answer of the same message (`mealAfterSteps`).
  - So the model is told lunch sets out from the study place's building, and has no reason to say it does not know where the User starts.
  - This holds when the model calls `planStudy` before `planMeal`, as `STEPS_RULES` tells it. Called the other way round, lunch is planned again after the run and the reply adds one sentence for it (P05 ticket 74, G5).
- **An app before it:** one answer, lunch, and no steps, as before.

## Acceptance criteria

- [x] From an app that says `answers`: two answers and steps ① study ② lunch, and lunch chained from the study place and its end. (Integration test, `assistant-study-then-meal`.)
- [x] The model is given the lunch as setting out from the study place's building. (Integration test.)
- [x] From an app before it: one answer, lunch, no steps. (Integration test.)

## Comments
