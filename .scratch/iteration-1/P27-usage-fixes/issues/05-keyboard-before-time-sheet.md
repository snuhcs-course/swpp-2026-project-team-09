# 05: Close the keyboard before the time sheet

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: 04 (Titles of Quests for a Global Event), as both change 파티 만들기

## What to build

Pressing `언제` closes the keyboard before the time sheet opens, so the sheet is never behind the keyboard. It applies to 파티 만들기 and to the Sub Quest form in the room.

## Acceptance criteria

- [x] In 파티 만들기, pressing `언제` while a text field has focus dismisses the keyboard and then opens the time sheet.
- [x] The room's Sub Quest form does the same.
- [x] Screen tests check that the keyboard is dismissed when `언제` is pressed; the existing form tests pass unchanged.

## Check on a phone

- [ ] Typing in `제목` and then pressing `언제` shows the whole time sheet with no keyboard over it, on Android and iOS.

## Comments

- Both forms share `WhenField` in `mobile/src/screens/room/plan-form.tsx`. Pressing it now calls `Keyboard.dismiss()` before it opens the sheet, so one change covers 파티 만들기 and the room's Sub Quest form. The meetup form's own `언제` is outside this ticket and was not changed.
- New screen tests: `party-form-test` (`언제` › closes the keyboard before the time sheet opens) and `room-plan-test` (the Leader's 일정 form, 언제). Each spies on `Keyboard.dismiss`, checks that it ran once and before the sheet was shown, and then checks that the sheet opens. Each sits in its own `describe` block because lint caps a function at 50 lines.
- No existing test was changed.

### Agent usage (2026-10-09)

- Agent time: about 35 minutes (the implementer) in the resumed session (2026-10-08 to 09), an estimate. Much of it was spent waiting for the shared test slot while the Mac was short on memory. The earlier session, which was force-quit, is not counted: its usage was lost.
- Tokens: about 108 thousand in all, all subagents: the implementer (72 thousand). The subagent reports give only totals, so input and output, and the cache reads and writes, cannot be shown separately. Included is a ninth of the shared code review and review fixes (about 36 thousand tokens and 2.5 minutes). The orchestrator's own tokens are not counted.
