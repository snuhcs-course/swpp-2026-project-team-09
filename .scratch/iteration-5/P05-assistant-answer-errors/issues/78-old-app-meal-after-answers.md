# 78: For an app before `answers`, a meal sets out from another answer of the message before it

Parent: [P05 spec](../spec.md). Follows ticket 76, which pinned "아침 7시에 도서관 갔다가 점심" on `5.0/Main`.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server. It reaches the installed apps with the server's Release, before the app says `answers`.

## The fault

The user's phone on 2026-11-28 at about 01:20, an app that does not say `answers`: "아침 7시에 도서관 갔다가 점심" got one lunch answer planned from nowhere, and words saying the server did not know where he starts. For such an app, a meal set out only from a booking of the same message (`bookingSteps`), never from another answer of it, so the study place before lunch did not count.

## What changes

- `mealStartAfter` (`chat/chat-steps.ts`) takes one rule for every app: `mealAfterSteps` (`steps/all-steps.ts`). A meal sets out from the step before it among the message's bookings and answers. If an item of the User's day lies between that step's end and the meal, it sets out from no step, as for an app that says `answers`.
- For an app before `answers`, the chain is the asker's own (`source: 'asker'`), which such an app reads; an app that says `answers` keeps `source: 'step'`.
- `afterStepsShown` (`steps/plan-steps.ts`) had no other caller and is gone.

## What changes for the installed apps

Only where the meal sets out from. They still get one answer, the last, and no steps.

- "아침 7시에 도서관 갔다가 점심": lunch sets out from the study place, not before the stay ends (10:00), and the model is told where.
- "점심이랑 저녁 짜줘": dinner sets out from lunch's Restaurant after lunch, unless an item of the day lies between, as an app that says `answers` already has it.
- A seat booked before a meal: as before.

## Acceptance criteria

- [x] From an app before `answers`, the lunch after a study place sets out from it when the stay ends, chained as the asker's own; it fails before the change. (Integration test, `assistant-study-then-meal`.)
- [x] Still one answer, no steps, for such an app. (Same test file.)
- [x] An app that says `answers` chains as before. (Integration tests, `assistant-steps-chain`, `assistant-several-answers`, `assistant-steps-follow-ups`, `assistant-plan-steps`.)

## Comments
