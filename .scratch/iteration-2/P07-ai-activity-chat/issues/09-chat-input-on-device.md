# 09: The chat's input on a phone: it holds still, rises over the keyboard, and lets the keyboard go

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: None (can start immediately)

## What to build

Ticket 01 made the main screen's AI input the chat's input, but nothing ran on a phone. 01's own comments say so: "Whether the keyboard covers the input bar on iOS is unseen; the main screen has no keyboard avoidance." On a phone, three things are wrong:

1. **The input bar shakes.** With nothing touched, the bar above the bottom tabs jumps up and down without stopping.
2. **The keyboard covers the input.** Pressing the bar opens the chat and the keyboard, and the bar stays behind the keyboard.
3. **The keyboard cannot be put away.** Pressing or dragging the chat does nothing to the keyboard, and closing the sheet leaves it up.

This ticket fixes all three. It changes nothing in what the chat shows or how it answers.

### What was found (2026-10-19)

The findings come from reading the code and the session that built 01. They were not checked on a phone.

**1. Shaking: most likely a feedback loop in the field's height.**
- `mobile/src/screens/main/ai-input.tsx`, `onContentSizeChange`: the field sets its own `height` from `contentSize.height + 2 * FIELD_PADDING` and passes that height back to its own `style`. Each change lays the field out again, and that fires `onContentSizeChange` again.
- On Android (RN 0.86, Fabric) the reported `contentSize` may already include the padding, or may follow the field's current height. Either way the height can swing between two values.
- `height > AI_FIELD` also switches the bar's radius between 28 and 22, so the swing shows in the corners too.
- The same height goes through `onHeight` to `MapBottom`'s `inputHeight` (`map-bottom.tsx`), and from there to the sheet's `under` (`chat-sheet.tsx`). `under` is the bubbles' `paddingBottom`. While the sheet is open, each change also runs `ChatBubbles`' `onContentSizeChange` → `scrollToEnd` (`chat-bubbles.tsx`).
- This is a hypothesis, and it was not confirmed on a phone. The fix below does not depend on it: whatever the cause, it leaves no path by which the height can feed back into itself.

**2. Keyboard covers the input: nothing moves for it.**
- `AiInput` is `position: 'absolute'` at `bottom: AI_INPUT.bottom` (12, `layout.ts`) inside `OverMap`, with no keyboard handling.
- Expo 57 runs Android edge to edge, so the window no longer shrinks for the keyboard (`adjustResize`).
- In 01's session, the first version had its own input inside the sheet, wrapped in a `KeyboardAvoidingView` for iOS only. Matching the MainChat frame later took that input out and made the main screen's bar the chat's input. The `KeyboardAvoidingView` went with it, and nothing replaced it.
- The onboarding already listens to the keyboard: `useKeyboardShown` in `mobile/src/screens/onboarding/reveal.tsx`. `react-native-keyboard-controller` is not installed.

**3. No way to put the keyboard away.**
- Both chat `ScrollView`s in `chat-bubbles.tsx` (`ChatEmpty` and `ChatBubbles`) have `keyboardShouldPersistTaps="handled"` and no `keyboardDismissMode`.
- In `useChatSheet` (`chat-sheet.tsx`), `close`, `showLayer`, `openEvent` and `openQuestPost` only `setShown(false)`. The field keeps the focus, so the keyboard stays up over the map.

### Suggested direction

- **Height:** let the field grow natively with `minHeight: AI_FIELD` and `maxHeight: 120` instead of a `height` set from `onContentSizeChange`. Report the bar's real height to `onHeight` from its `onLayout`, rounded, and ignore changes under 1. Keep the radius switch, keyed off the reported height.
- **Keyboard height:** one hook gives the keyboard's height (0 while it is down), from `Keyboard` `keyboardDidShow`/`keyboardDidHide`, or `keyboardWillShow`/`keyboardWillHide` on iOS. It could be `useKeyboardShown` generalised and moved to `src/hooks/`. While the keyboard is up, `MapBottom` lifts `AiInput` (a new `bottom` or `lift` prop) and the sheet's `under` by the keyboard's height less what already lies under the bar: the bottom tabs and the bottom safe area.
- **Putting it away:**
  - add `keyboardDismissMode="on-drag"` to both chat `ScrollView`s
  - pressing an empty part of the sheet or the conversation calls `Keyboard.dismiss()`, while buttons and cards still work on the first press
  - closing the sheet in any way (close button, Android back, map button, event card, Quest card, Proposal made or 수정) calls `Keyboard.dismiss()`

Fix the shaking by structure instead of first catching the loop on a phone: nothing sets the field's height from `onContentSizeChange`. The field grows natively between `minHeight` and `maxHeight`, and the bar's height comes from the outer bar's `onLayout`, rounded, with changes under 1 ignored. What that height sets, the corners and the sheet's `under`, does not change the bar's size, so no loop can form whatever the cause. Jest does not lay out a `TextInput`, so it cannot reproduce the shaking. The keyboard work has a clear cause and can be built directly.

## Acceptance criteria

- [ ] **The bar holds still.**
  - On an Android phone, with the main screen open and nothing touched, the AI input does not move for a minute, with the sheet closed and open.
  - It still grows from 40 to 120 as lines are added, and shrinks back after sending.
- [ ] **The input rises over the keyboard.**
  - Pressing the bar opens the chat, and the bar sits right above the keyboard, whole and visible.
  - The last bubble, or the empty chat's last example, stays clear of the bar while the keyboard is up.
  - When the keyboard goes down, the bar returns to its place above the bottom tabs.
- [ ] **The keyboard can be put away.**
  - Dragging the conversation, or pressing an empty part of the sheet, puts the keyboard down, and the sheet stays open.
  - Pressing an example, a card's button or the send button works on the first press while the keyboard is up.
  - Closing the sheet in any way puts the keyboard down.
- [x] **Tests:**
  - with the keyboard shown at a height (a mocked `Keyboard` event), the AI input's bottom and the sheet's `under` rise by that height less what lies under the bar, and return when it hides
  - closing the sheet calls `Keyboard.dismiss`
  - the chat `ScrollView`s dismiss on drag
  - the existing `main-chat-test.tsx` and `main-controls-test.tsx` pass
- [ ] Checked on an Android phone, and on iOS if one is at hand. Write what was and was not checked under `## Comments`.

## Comments

### Result (2026-10-19)

App only; the server is unchanged, and so is what the chat shows and how it answers.

- **Holding still:** `screens/main/ai-input.tsx`.
  - The field has no `height` and no `onContentSizeChange`. It grows natively between `minHeight: 40` and `maxHeight: 120`, and scrolls past that.
  - The outer bar's `onLayout` gives the bar's height, rounded, and a change under 1 is ignored (`useBarHeight`). That height goes to `onHeight` and switches the radius from 28 to 22 once it is over `AI_INPUT.height` (50, one line).
  - What it sets (the corners and the sheet's `under`) does not change the bar's size, so no loop can form, whatever the cause on the phone. The cause was not confirmed on a phone.
  - `onHeight` now gives the bar's height (50 for a line), not the field's (40). The sheet's `under` is `AI_INPUT.bottom + lift + bar height + 32`: 94 with the keyboard down, 2 more than before because the bar's 1-point borders now count.
- **Keyboard height:** `hooks/use-keyboard-height.ts`, `useKeyboardHeight(inset)`, generalised from onboarding's `useKeyboardShown`. `useKeyboardShown` lives there too now, and `onboarding/foot.tsx` imports it from there.
  - It listens to `keyboardWillShow`/`keyboardWillHide` on iOS and `keyboardDidShow`/`keyboardDidHide` on Android.
  - **Android leaves out the bottom safe area.** RN 0.86's `ReactRootView` reports `ime.bottom − systemBars.bottom`, while iOS counts from the screen's bottom. So on Android the hook adds the bottom inset back, and the result is the keyboard's reach above the screen's bottom on both.
  - Onboarding's foot now hides on iOS's `keyboardWillShow` rather than `keyboardDidShow`, so slightly earlier. Android is unchanged.
- **The lift:** `MapBottom` (`map-bottom.tsx`), `useKeyboardLift`: `max(0, keyboard reach − tabBarHeight(bottom inset))`.
  - `tabBarHeight` is new in `shell/layout.ts`: `NAV_HEIGHT + navPaddingBottom(inset)`, the same parts `TabBar` lays itself out with.
  - That is the whole navigation including the bottom safe area, so the safe area is subtracted once, as part of the tab bar, not a second time.
  - `AiInput` takes `lift` (its `bottom` is `12 + lift`). The sheet gets the input's top (`inputTop`) in place of its height.
- **Putting it away:**
  - Both chat `ScrollView`s have `keyboardDismissMode="on-drag"` and keep `keyboardShouldPersistTaps="handled"`.
  - The sheet's root is now a `Pressable` (`accessible={false}`) whose press calls `Keyboard.dismiss()`. Buttons, examples and cards are deeper responders, so they still take their own presses. The ScrollView's own `'handled'` dismissal still works where it can; this one also covers the header and the case where the ScrollView has no keyboard metrics.
  - `useChatSheet`'s `close` calls `Keyboard.dismiss()`, and every way of closing goes through it: the close button, Android back, a map button, an event card, a Quest card (via the new `useLeaving`), and a Proposal made or 수정 (via `useProposalMaking(close)`).
- **No new library.** `react-native-keyboard-controller` is not installed.

Tests:

- New `__tests__/support/keyboard.ts`: `showKeyboard`/`hideKeyboard` emit `keyboardWillShow`/`keyboardWillHide` on `DeviceEventEmitter`, which `Keyboard` listens through. The tests' phone is iOS with no bottom inset, so the lift for a keyboard of 336 is 336 − 80 = 256. The file also has `quietDismiss` (a `Keyboard.dismiss` spy) and `expectContentUnder`.
- `main-controls-test.tsx`, 5 new tests:
  - The bar's `bottom` and the empty chat's `paddingBottom` rise by 256 and come back on hide.
  - The bubbles' `paddingBottom` rises too.
  - An example sends on its first press with the keyboard up.
  - Android back closes the sheet and dismisses.
  - Both ScrollViews have `on-drag`, and a map button closes the sheet and dismisses.
- `main-chat-test.tsx`, 2 new tests: the close button dismisses, and a press on an empty part of the sheet dismisses and leaves it open. The existing `toHaveStyle({ height: 40 })` became `minHeight: 40`.
- Taking `Keyboard.dismiss()` out of `close` fails 3 of these tests (close button, back, map button).
- Both files pass, 36 tests. The full mobile suite (`--maxWorkers=3`): 141 of 143 files passed. `party-find-mock-test` (260 s) and `friends-add-test` timed out under load, and both pass when rerun alone (27 tests).
- `oxlint --type-aware` and `prettier --check` are clean. `tsc` reports only the two known typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.
- Jest ran under Homebrew's `node@24` (`.nvmrc`'s 24). The default `node` 26 fails to start on this Mac because it is missing `libsimdjson`.

Not checked:

- Nothing ran on a phone. The first-press behaviour with the keyboard up is tested only through RNTL's responder model, not native touch.

### To check on a phone (2026-10-19)

On Android, and on iOS if one is at hand:

1. **Holds still:** on the main screen with nothing touched, the AI input does not move for a minute, with the sheet closed and with it open. Watch the corners too.
2. **Grows and shrinks:** type several lines. The bar grows from one line up to 120 and then scrolls, the corners go from 28 to 22, and after sending it goes back to one line.
3. **Over the keyboard:** pressing the bar opens the chat, and the bar sits right above the keyboard, whole. Try both gesture navigation and 3-button navigation on Android, since the Android lift adds the bottom inset back.
4. **Clear of the bar:** with the keyboard up, the empty chat's last example and the last bubble stay clear of the bar.
5. **Back down:** when the keyboard goes down (drag, the system's back or hide key), the bar returns to 12 above the tabs.
6. **Putting it away:** dragging the conversation, or pressing an empty part of the sheet or its header, puts the keyboard down and the sheet stays open.
7. **First press:** with the keyboard up, an example, a card's button (event, Quest, Proposal 만들기/수정, map button) and the send button each work on the first press.
8. **Closing:** each way of closing the sheet puts the keyboard down: ✕, Android back, a map button, an event card, a Quest card, a Proposal made, 수정.
9. **Onboarding:** on iOS, the foot's buttons still hide while the keyboard is up and come back when it goes down.

### Agent usage (2026-10-19)

- Agent time: about 35 minutes in one session, no subagents (an estimate). About 11 minutes of it was waiting on the full mobile suite.
- Tokens: about 5.8M input, of which 5.68M were cache reads, 114k cache writes and under 1k uncached; and 48k output. The figures come from the session's transcript up to the write-up and leave out the commit.
