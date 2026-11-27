# 71: The seat test pins the tool inputs from before a Class could be left out of a seat

Parent: [P05 spec](../spec.md). Found on 2026-11-27: `5.0/Main`'s full push CI has been red since #689 (ticket 70) merged, at 331adc64e and bb4b860dd (run 46007177155).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: nothing; a test alone changes.

## What failed

`main-server/test/assistant-library-seat-arrival.integration.test.ts` > "An app that does not draw answers" > "is given the same tool inputs as an app that draws answers…": `proposeLibraryBooking`'s schema for an app that draws answers, without `askedToBook`, had `skipClasses` and `attendClasses` more than the schema of an app that does not. PR CI runs no integration files, so #689 never ran it.

## Cause

The test was out of date, not the code. #689 added `...skipParameters` to `answeringInput` alone (`src/assistant/library/propose-library-booking.ts`), because only an app that draws answers gets a seat for today without a start filled from its day; an app that does not is refused one. Its `input` is the same as before #689, and `withLeftOut` (`leaveClassesOut`, `LEFT_OUT_RULES`) sits behind `drawsAnswers` in `chat/chat-assistant.ts`, so installed old apps are served as before.

## Fix

The test's helper takes `askedToBook`, `skipClasses` and `attendClasses` out of the answering schema, expects all three there, and compares the rest with the old app's schema.

| | Was | Now |
|---|---|---|
| What an app that draws answers has beyond an old app's seat inputs | `askedToBook` | `askedToBook`, `skipClasses`, `attendClasses` |
| The old app's `proposeLibraryBooking` inputs | as before #689 | unchanged |

## Sweep

Read for tests that pin a tool's parameter schema or the tools and rules given per capability against #689's changes: `assistant-refusals`, `assistant-way`, `assistant-day`, `assistant-interests`, `assistant-meal-plan`, `assistant-meal-skip-class`, `assistant-menu`, `assistant-friend-lookup`, `assistant-same-name-friends`, `assistant-which-friend`, `assistant-plan-changes-guards`, `assistant-quest-way`, `assistant-study-room`, `assistant-study-plan`, `assistant-study-area`, `assistant-study-group`, `assistant-events`, `assistant-proposals` (integration); `assistant-study-group-rules`, `assistant-study-plan-rules`, `assistant-meal-wish-rules`, `assistant-friend-question`, `assistant-context-lines`, `assistant-cached-prefix`, `eval-p6-suite` (unit). None compares an input schema; the tool lists compare drawing apps with drawing apps or use `arrayContaining`. None would fail the same way.

## Acceptance criteria

- [x] `assistant-library-seat-arrival.integration` passes (10 tests), run once locally.
- [x] main-server's lint, types and format pass.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 15 minutes, an estimate, one session.
- Tokens: not measured in the session; roughly input 0.6M, mostly cache reads, and output 10k, an estimate.
