# 05: Close the keyboard before the time sheet

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Titles of Quests for a Global Event), as both change 파티 만들기

## What to build

Pressing `언제` closes the keyboard before the time sheet opens, so the sheet is never behind the keyboard. It applies to 파티 만들기 and to the Sub Quest form in the room.

## Acceptance criteria

- [ ] In 파티 만들기, pressing `언제` while a text field has focus dismisses the keyboard and then opens the time sheet.
- [ ] The room's Sub Quest form does the same.
- [ ] Screen tests check that the keyboard is dismissed when `언제` is pressed; the existing form tests pass unchanged.

## Check on a phone

- [ ] Typing in `제목` and then pressing `언제` shows the whole time sheet with no keyboard over it, on Android and iOS.
