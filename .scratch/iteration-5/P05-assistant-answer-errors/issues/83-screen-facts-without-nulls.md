# 83: The plan on screen leaves an unset condition out, and every planning tool takes its own line back

Parent: [P05 spec](../spec.md). Follows ticket 82 (PR 756): after a meal's answer, "6천원 이하로" was refused because the model copied the [Plan on screen] line's nulls into planMeal.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only.

## What changes

- **The line:** `planFacts` (`context-lines.ts`), which writes both [Plan on screen] and [Another step on screen], leaves out a field whose value is null: an unset start, end, place, length, event, title or time, and `plan` when no plan is open. The rules tell the model to give a planning tool the conditions on screen as they are, and the line now holds only values a tool takes. No rule reads a null from the line.
- **The tools:** ticket 82's `repairToolCall` already reads a null the model gives as left out, for every tool. This ticket removes the nulls where the model reads them.

## The class

The new test feeds each kind's line back to its planning tool: planMeal, planMeet, planStudy, planEvents, planQuests and planNewQuest.

- **Before:** each tool refused its own line, all six of them. That is the user's refusal, reproduced without a log.
- **After:** each takes its line as it is.

## Tests

- `main-server/test/screen-facts-tools.unit.test.ts` (new, 6 tests). For each kind, a plan on screen with every condition that can be unset left unset (all but what the kind always holds: a meet's Friend, 파티's list, a new 파티's title). The line holds no null, and the tool's input takes the line's values. Before: 6 of 6 failed.
- The lines pinned with nulls now read without them:
  - unit: `assistant-context-lines` 11/11, `several-answers-reply` and `study-reply-shape`;
  - integration: `assistant-plan-changes` 11/11.

## Acceptance criteria

- [x] The tests above pass. So do `plan-follow-up-rules` (unit), and `assistant-plan-changes-guards` and `assistant-follow-up-nulls` (integration), each run once.
- [x] main-server's lint, types and format pass.

## Comments

The reply that apologised left the old answer on screen. By today's rules that is the designed screen:

- An answer on screen stays under a reply in words alone (P04 ticket 46).
- It leaves only when a request ends with none (`endsWithNone`, tickets 55 and 79).
- A tool error is no "none": no tool presented anything, so the reply was words alone.

Reported, not changed.

### Agent usage (2026-11-28)

- Agent time: about 25 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 82 and P01-46.
