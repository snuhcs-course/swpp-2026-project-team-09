# 04: The Assistant reads Friends only through the one view

Parent: [P01 spec](../spec.md) ("The Assistant")
Status: ready-for-agent
Blocked by: 01, and the Friend view of the invitations package

## What to build

Every tool of the Assistant that reads something about a Friend (a position, a Place, or a Timetable label) reads it through the one server function that sets the level from the viewer and the Friend. Nothing the Assistant says or draws about a Friend goes beyond what the asker's map shows.

## Acceptance criteria

- [x] The meal Plan reads a Friend's position and level through the Friend view, in the one place that reads it through today's switches.
- [x] Each tool that returns anything about a Friend has a test that it reads through the Friend view: with the view answering "Timetable only", the tool's result and the reply hold no position and no Place beyond the Timetable's.
- [x] A Plan's scene marks a Friend by the level the view gave: exact, the Place they are in, or the Timetable.
- [x] No tool imports the position store or the visibility rule directly.

## Comments

- Built with the invitations package's ticket 04 (`P03-agentic-map-invitations/issues/04-friend-view.md`), which holds the tests.
- The third box is met for the two levels that exist today: a Plan's scene marks a Friend `exact` only when the view gave `exact`, and `timetable` otherwise. The mark of the building level, a change of `answer.dto.ts` and the app, comes with the per-Friend levels.

### Decisions (2026-11-14)

- "No tool imports the position store or the visibility rule" covers the location sharing service too, and every file under `src/assistant/`, not only the tools. A unit test (`test/assistant-friend-reads.unit.test.ts`) fails when one does.
- A tool that reads only the names of Friends (the resolver, `proposeQuest`, `findFreeFriends`, `findMealRestaurants`, the library booking) reads them through the view too, and each has a "Timetable only" test beside its other tests. The test for `findFreeFriends` and `findMealRestaurants` is in a file of its own, `assistant-free-time-friends.integration.test.ts`, on the stage of the other 공강 tool tests, because the meals file is at the lint's line limit.
