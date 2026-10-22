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
- [x] **Tests:** a test that fails before the fix and passes after it, at the level where the cause lives, for example that a keyboard change alone does not scroll the conversation while the User is dragging. The existing main-chat and main-controls tests pass.
- [ ] Checked on an Android phone with the reproduction steps above. Write what was and was not checked under `## Comments`.

## Comments

### Diagnosis and fix (2026-10-22)

**Not reproduced on a device.** No phone was at hand during this ticket. The device checks wait until every P20 ticket is done (after 06). The cause below is the suspected cause. It comes from React Native 0.86's own source and is pinned by a jest test of the responder negotiation. It was not seen on a phone.

**Suspected cause: the `Pressable` around the whole sheet, not the scroll to the end.**
- On Android, a React view that is the current JS responder intercepts every later move of the touch from the views inside it:
  - `JSResponderHandler.onInterceptTouchEvent` returns `view.id == currentJSResponder` for every event but `ACTION_UP`.
  - `SurfaceMountingManager.setJSResponder` records the responder whether `blockNativeResponder` is set or not, so the Pressable's `false` does not help.
  - The intercepted scroll view gets `ACTION_CANCEL` and does not scroll.
  - `ReactScrollView` itself never checks the JS responder. Only a responder *around* it can take the drag from it.
- The sheet's `Pressable` (`ChatSheet`, added by P07-09) was such a view, around the conversation's `ScrollView`.
- Who takes a touch on a bubble depends on the keyboard (`ScrollView._handleStartShouldSetResponder`). With `keyboardShouldPersistTaps="handled"`, the scroll view claims the touch only while `_keyboardIsDismissible()`: a focused input and a keyboard that is up.
  - **Keyboard up:** the scroll view is the responder. It scrolls, and `on-drag` puts the keyboard down.
  - **Keyboard down:** the touch bubbles past the scroll view to the sheet's `Pressable`, which becomes the responder and takes every later drag.
- This fits the report:
  - It stops after the keyboard goes down.
  - Closing with ✕ and reopening fixes it, because reopening means pressing the AI input, which brings the keyboard up again.
  - It happens only "sometimes" because a quick flick can cross the touch slop before the JS grant reaches the UI thread.
- The other suspect, the animated `scrollToEnd` on a content-size change, can at most pull the view to the end once per keyboard change. It cannot explain a freeze that lasts until the sheet is reopened, so it was left as it is.

**How it was pinned:** `__tests__/main-chat-scroll-test.tsx`, test "leaves a touch on a bubble with the keyboard down to the scroll view or what is inside it".
- It opens the chat, gets one answer and puts the keyboard down.
- It then runs React Native's start-responder negotiation over the host tree for a touch on the answer's text: capture from the root down, then bubbling back up, through the views' own `onStartShouldSetResponder(Capture)` props.
- It expects the view that takes the touch to be the conversation's scroll view or inside it.
- Before the fix, the sheet (`chat-sheet`) takes it, and the test fails. After the fix, it passes.
- The test checks the JS side: which view becomes the responder. The native intercept that follows is read from React Native's source, not run.

**Fix:**
- `screens/main/chat-sheet.tsx`: the sheet is a plain `View` and takes no touch. Only the header is a `Pressable` that puts the keyboard down. ✕ and 새 대화 still take their own presses.
- `screens/main/chat-bubbles.tsx`: in `ChatBubbles` and `ChatEmpty`, what the scroll view holds is wrapped in a `Pressable` (`Dismissing`, `accessible={false}`, press → `Keyboard.dismiss()`), inside the scroll view and filling it (`flexGrow: 1`).
  - A press on an empty part of the conversation still puts the keyboard down, also when the scroll view has no keyboard metrics.
  - A drag scrolls, because the native scroll view stands above that `Pressable` and intercepts first.
  - Bubbles' buttons, cards and examples are deeper responders and still take the first press. No chat card has a scroll view of its own.
- Unchanged: `keyboardDismissMode="on-drag"`, `keyboardShouldPersistTaps="handled"`, the `scrollToEnd` on content-size change, `useKeyboardHeight` and the AI input's lift.

**Tests:**
- New `__tests__/main-chat-scroll-test.tsx`, 3 tests:
  - the pinning test above,
  - a press on a bubble puts the keyboard down and the sheet stays,
  - a press on the header (not on its buttons) puts the keyboard down.
- `main-chat-test.tsx`: "puts the keyboard down with a press on the sheet that nothing in it takes" now presses the empty chat's greeting instead of the sheet's root, which no longer takes presses.
- `main-chat-test.tsx`, `main-controls-test.tsx` and the six `chat-*` card tests pass: 72 tests.
- The full mobile suite (`--maxWorkers=2`, once): 147 of 147 files and 1293 tests passed (1 todo).
- `pnpm lint` and `pnpm format:check` are clean. `pnpm typecheck` is clean with the locally generated `expo-env.d.ts` and `.expo/` moved aside. With them in place it reports only the known typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.

**Not checked:**
- Nothing ran on a phone. The intercept is read from React Native's Android source, and the first press of cards and buttons is tested only through RNTL's responder model.
- "Cause found" is left unticked. The ticket asks for steps that reproduced the freeze on the phone, and the native half of the cause was not seen running.

### To check on the phone (after ticket 06)

On Android, repeat each several times, and try to scroll the conversation by dragging after each:
1. Before the fix, to confirm the cause: put the keyboard down (drag, back key or hide key), then drag the conversation slowly. It should not move. A quick flick may still move it.
2. The keyboard going up and down.
3. Dragging with the keyboard up.
4. Sending messages.
5. Receiving long answers, and answers with cards.
6. Opening and closing a card's sheet (an event card's 파티 찾기/모집 or AI 매칭, a Quest card's join).
7. Closing and reopening the sheet is never needed to scroll again.

Also check what must keep working:
- A new answer brings the newest bubble into view.
- A drag, a press on an empty part of the conversation, and a press on the header put the keyboard down, and the sheet stays.
- The cards' buttons, the map buttons, 다시 시도 and the examples work on the first press, with the keyboard up and down.

### Agent usage (2026-10-22)

- Agent time: about 25 minutes in one session, no subagents (an estimate). About 11 minutes of it was the full mobile suite. The time spent waiting for the User's decision on the fix is left out.
- Tokens: about 5.64M input, of which about 5.51M were cache reads, 125k cache writes and about 100 uncached; and 48k output. The figures come from the session's transcript up to this write-up and leave out the commit and the PR.
