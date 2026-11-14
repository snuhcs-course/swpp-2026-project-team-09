# 04: The Assistant reads Friends only through the one view

Parent: [P01 spec](../spec.md) ("The Assistant")
Status: ready-for-agent
Blocked by: 01, and the Friend view of the invitations package

## What to build

Every tool of the Assistant that reads something about a Friend, a position, a building or a Timetable label, reads it through the one server function that sets the level from the viewer and the Friend. Nothing the Assistant says or draws about a Friend goes beyond what the asker's map shows.

## Acceptance criteria

- [ ] The meal plan reads a Friend's position and level through the Friend view, in the one place that reads it through today's switches.
- [ ] Each tool that returns anything about a Friend has a test that it reads through the Friend view: with the view answering "Timetable only", the tool's result and the reply hold no position and no building beyond the Timetable's.
- [ ] A plan's scene marks a Friend by the level the view gave: exact, the building, or the Timetable.
- [ ] No tool imports the position store or the visibility rule directly.

## Comments
