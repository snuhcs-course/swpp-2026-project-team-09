# 03: The AI chat keeps scrolling

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: 02

## What to build

In the AI chat sheet on the main screen, the conversation sometimes stops scrolling. Dragging does nothing until the sheet is closed with ✕ and opened again. After this ticket, the conversation scrolls whenever it is dragged, however the keyboard has gone up and down.

### What is known

The User has seen it after the keyboard went up or down, but there is no certain pattern. The cause is not known, so diagnose first: reproduce it on the phone, find the cause, and fix that cause, not a guess.

Suspects from reading the code (plan item 1):
- **The scroll to the end.** The conversation scrolls to its end, animated, whenever its content size changes. The room kept below the last bubble follows the keyboard's lift, so the keyboard going up or down changes the content size and starts that scroll. A drag puts the keyboard down, so a scroll to the end can start while the finger is still dragging.
- **The pressable around the sheet.** The whole sheet is a pressable that puts the keyboard down, and it wraps the conversation's scroll view (added by P07-09). It does not block the native scroll by its settings. It is still the newest thing between the finger and the scroll.

### Why after 02

02 may change how the keyboard's height reaches the chat. Diagnose this on the keyboard handling that ships, so the fix is not undone.

### Keep

The chat keeps showing its newest bubble when an answer arrives. The keyboard still goes down on a drag or a press on an empty part of the sheet, as P07-09 made it.

## Acceptance criteria

- [ ] **Cause found.** Under `## Comments`, write the steps that reproduced the freeze on the phone, the cause, and how it was confirmed. If it could not be reproduced, say so, and say what was changed and why.
- [ ] **It keeps scrolling.**
  - On an Android phone, the conversation scrolls by dragging after each of these, repeated several times:
    - the keyboard going up and down,
    - dragging with the keyboard up,
    - sending messages,
    - receiving long answers and answers with cards,
    - opening and closing a card's sheet.
  - Closing and reopening the sheet is never needed to scroll again.
- [ ] **Keep what works.**
  - A new answer brings the newest bubble into view.
  - A drag or a press on an empty part of the sheet puts the keyboard down.
  - The cards' buttons work on the first press.
- [ ] **Tests:** a test that fails before the fix and passes after it, at the level where the cause lives, for example that a keyboard change alone does not scroll the conversation while the User is dragging. The existing main-chat and main-controls tests pass.
- [ ] Checked on an Android phone with the reproduction steps above. Write what was and was not checked under `## Comments`.

## Comments
