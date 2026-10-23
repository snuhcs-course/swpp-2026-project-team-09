# 02: Every input rises above the keyboard

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Almost everywhere in the app, pressing a text field brings the keyboard up over that field. The field and whatever is typed stay hidden behind the keyboard. After this ticket, wherever the User types, the field is above the keyboard while the keyboard is up. The rest of the screen gives way to the keyboard without jumping, and everything returns to its place when the keyboard goes down.

### Why it happens

Expo 57 runs Android edge to edge, so the window no longer shrinks for the keyboard. Only two places respond to it:
- the onboarding, with a `KeyboardAvoidingView`,
- the main screen's AI input, lifted by `useKeyboardHeight` (P07-09).

The full-screen panel and the bottom sheet, which hold most of the app's inputs, do nothing for the keyboard.

### Suggested direction

- Solve it once, in the shared pieces most inputs live in: the full-screen panel, with its footer, and the bottom sheet. Then go through every input and fix what the shared fix does not reach.
- Building on the existing `useKeyboardHeight` and adding `react-native-keyboard-controller` are both open. Pick one and say why under `## Comments`.
  - A new native dependency needs a new dev build, which is fine at this stage.
  - If a shared mechanism replaces `useKeyboardHeight`, the main screen's AI input moves to it too and must still rise as it does now.
- A form whose 52 primary button stands in a footer keeps that button reachable above the keyboard. Alternatively, the body scrolls so that the focused field is in view. Choose per screen and keep it consistent.

### Inputs to go through

Plan item 5 has the full list with where each lives:
- 파티방's chat input and its plan form,
- 파티 만들기 / 모집글 수정 and the form's tag field,
- the form's sheets with a search: 행사, 친구 and 게시판,
- the place picker,
- 친구 추가 (친구 ID),
- 친구 관리's search,
- the friend panel's search,
- the 행사 tab's search,
- 파티 → 찾기's search,
- 시간표 version rename, which sits in the week card's version list, a `Modal` of its own and not in the full-screen panel, so the shared fix does not reach it and it is checked on its own,
- 수업 추가 / 수정,
- the onboarding,
- the AI input.

A field near the top of its screen may never be covered. Check it, and record it as checked, not changed.

## Acceptance criteria

- [x] **Every input stays in view.**
  - On an Android phone, for each input in the list above, pressing the field brings the keyboard up with the field fully visible above it.
  - The field stays visible while typing several lines where the field allows them.
- [x] **Forms stay usable.**
  - In 파티 만들기, 수업 추가 / 수정 and 친구 추가, with the keyboard up, the focused field is in view, and the form's primary button can be reached without putting the keyboard down first, or right after it goes down.
- [x] **Sheets.** In a bottom sheet with a search, such as the party form's 행사, 친구 and 게시판 sheets, the search field and the first results stay above the keyboard.
- [x] **Room chat.** In 파티방, the chat input sits right above the keyboard, and the latest message stays in view.
- [x] **No regressions.**
  - The main screen's AI input still rises above the keyboard and returns, as P07-09 made it.
  - The onboarding still works.
  - When the keyboard goes down, every screen returns to its place without a jump.
- [x] **Tests:**
  - with the keyboard shown at a height (a mocked keyboard event), the full-screen panel's footer and the bottom sheet's content rise by that height, and return when it hides
  - the room chat's input rises the same way
  - the existing main-chat, onboarding, party-form and timetable tests pass
- [x] Checked on an Android phone: every input in the list, each marked changed or checked as already fine. Also checked on iOS if one is at hand. Write what was and was not checked under `## Comments`.

## Comments

### Keyboard mechanism (2026-10-22)

Built on `useKeyboardHeight`. `react-native-keyboard-controller` was not added.
- The two shared pieces only need the keyboard's height:
  - `FullScreenPanel` ends at the keyboard's top, so its footer stands right above it and the body gets shorter.
  - `BottomSheet` stands on the keyboard.
- The tests already fake the keyboard through `__tests__/support/keyboard.ts`. With the existing hook, no native module, jest mock or new dev build is needed.
- The AI input (`map-bottom.tsx`) and the onboarding are untouched. Ticket 03 is diagnosed on the AI input as it lifts today.
- What it costs:
  - Android tells of the keyboard only once it is up (`keyboardDidShow`/`keyboardDidHide`). The footer and sheet move just after the keyboard, not with it, as the AI input already does.
  - Scrolling the focused field into view is our own small hook (`hooks/use-reveal-focused.ts`). It measures the focused input against the scroll view's content and scrolls it above the shortened view:
    - when the view shrinks for the keyboard,
    - when the content grows (a multiline field, or a message sent), unless the User dragged the field out of view to read. It follows again once a drag leaves the field in view.

Per-screen choice:
- A form with a 52 primary button in the footer (파티 만들기 / 모집글 수정, 수업 추가 / 수정) keeps the button right above the keyboard, and the body scrolls the focused field into view.
- Screens without a footer button only scroll the field into view.
- The room is the one exception (`footerHidesForKeyboard`):
  - its footer's 나가기 / 파티 없애기 gives way while the keyboard is up,
  - so the chat input stands right above the keyboard, with the latest message over it.
  - It gives way for every field in the room, the plan form's too. The plan form's own 취소 / 추가 are inline under its fields, and the footer's danger button is not needed while typing.

### Result

| Input | File | Result |
| ----- | ---- | ------ |
| 파티방's chat input | `screens/room/room-screen.tsx` (+ `design-system/full-screen-panel.tsx`) | Changed: the panel ends at the keyboard, the footer gives way, the input is scrolled into view and kept there as messages are added |
| 파티방's plan form | `screens/room/plan-form.tsx` | Changed by the shared fix (panel). File not touched. The focused field is scrolled into view; 취소 / 추가 are reached by scrolling the body |
| 파티 만들기 / 모집글 수정, its fields and tag field | `screens/party/form/party-form-screen.tsx`, `party-form-fields.tsx`, `tag-field.tsx` | Changed by the shared fix (panel). Files not touched. The footer button stands above the keyboard; the focused field (the tag field too, the last one) is scrolled into view |
| Form's 행사 picker search | `screens/party/form/event-field.tsx` (`EventPicker`, a `FullScreenPanel`, not a sheet) | Checked, not changed: the search is at the top; the shared fix shortens the list under it |
| Form's 친구 search | `screens/party/form/friend-picker.tsx` (inline in the form, not a sheet) | Changed by the shared fix (panel). File not touched |
| Form's 게시판 sheet search | `screens/party/form/board-sheet.tsx` | Changed by the shared fix (`design-system/bottom-sheet.tsx`). File not touched |
| Place picker | `screens/places/place-picker.tsx` | Checked, not changed: the search is in the panel's `under`, at the top |
| 친구 추가 (친구 ID) | `screens/friends/add-screen.tsx` | Changed by the shared fix (panel). File not touched |
| 친구 관리's search | `screens/friends/friends-screen.tsx` | Checked, not changed: in the panel's `under`, at the top |
| Friend panel's search | `screens/main/friend-panel.tsx` | Checked, not changed: at the top of the side panel |
| 행사 tab's search | `screens/events/events-bar.tsx` | Checked, not changed: in the tab's top bar |
| 파티 → 찾기's search | `screens/party/find-tab.tsx` | Checked, not changed: first in the tab's list, under the official banner |
| 시간표 version rename | `screens/me/version-menu.tsx` (+ new `screens/me/menu-lift.ts`) | Changed: the list stands in a `Modal`, placed once under the trigger, so nothing else reaches it. While the current version is renamed and the keyboard would cover its row, the list goes up so the row stands 16 above the keyboard, never over the status bar. With up to 10 versions the row can reach well below the keyboard's top. `version-rename.tsx` not touched |
| 수업 추가 / 수정 | `screens/timetable/class-form-screen.tsx` | Changed by the shared fix (panel). File not touched. 저장 stands above the keyboard |
| Onboarding | `screens/onboarding/onboarding-screen.tsx` | Checked in code, not changed: it keeps its own `KeyboardAvoidingView` and revealer. It still needs the device check on Android edge to edge |
| Toasts while typing (from the review of #119) | `design-system/toast.tsx` | Changed: while the keyboard is up, a toast stands on it, still clear of what its screen claims (a form's footer, which rises above the keyboard; a tab's navigation, which only puts it higher). Before, every toast shown while typing sat behind the keyboard, such as 파티방's "메시지를 보내지 못했어요" |
| AI input | `screens/main/map-bottom.tsx` | Not changed: still lifted by `useKeyboardHeight` |

### What was and was not checked (2026-10-22)

Checked by the agent:
- New tests, with a mocked keyboard event:
  - `__tests__/design-system/full-screen-panel-test.tsx`: the panel ends `KEYBOARD` above the bottom and the footer stays; it returns when the keyboard hides; `footerHidesForKeyboard` puts the footer away and back.
  - `__tests__/design-system/bottom-sheet-test.tsx`: the sheet stands `KEYBOARD` high and returns.
  - `__tests__/room-keyboard-test.tsx`: the room ends at the keyboard, its footer gives way and the chat input stays.
- `__tests__/hooks/use-reveal-focused-test.tsx`, with a faked focused field: the field is scrolled 16 above what is seen, counting the scroll offset; nothing moves for a field already in view, outside the content, or with the keyboard down; it follows the content's growth, but not after the User drags the field away, until a drag leaves it in view.
- `__tests__/design-system/toast-test.tsx`: the toast stands `KEYBOARD` + the claimed 65 + 24 high while the keyboard is up, and returns.
- `__tests__/menu-lift-test.ts`: the version list goes up just enough for a low row, not for a high one or with the keyboard down, and never over the status bar.
- `pnpm lint`, `pnpm typecheck` (with the locally generated `expo-env.d.ts` and `.expo/` moved aside) and `pnpm format:check` pass.
- The whole mobile suite (`jest --maxWorkers=2`): 147 suites, 1294 passed, 1 todo. That includes main-chat, onboarding, party-form and timetable.

Not checked by the agent:
- Every device check on an Android phone, and on iOS. The person checks them on the phone once, after every P20 ticket is in.
- That `measureLayout` and `scrollTo` behave on a device as the faked field does in `useRevealFocused`'s test.
- The version list's lift: `measureInWindow`, the window's height and the keyboard's height must agree on a device, inside the `Modal`.
- Whether the footer and sheet moving just after the keyboard on Android reads as a jump.

### Agent usage (2026-10-22)

- Agent time: about 40 minutes over one session, the full test run's ~9.5 minutes included. Time waiting for the person is not counted. This is an estimate.
- Tokens, estimated from the session's context growth because the session has no exact counter (no subagents were used):
  - input: about 3.0M, of which about 2.85M were cache reads and about 0.12M cache writes, about 30k uncached,
  - output: about 30k.

### Agent usage (2026-10-23)

The round answering the review of #119.
- Agent time: about 60 minutes in one session, two runs of the whole suite (~18 and ~15 minutes) included. Time waiting for the person is not counted. This is an estimate.
- Tokens, estimated from the session's context growth because the session has no exact counter (no subagents were used):
  - input: about 5.2M, of which about 5.0M were cache reads and about 0.15M cache writes, about 30k uncached,
  - output: about 35k.

### Phone check (2026-10-23)

Checked by the person (Jaehyun0320) on an Android phone, a Galaxy S22 (SM-S901N), and reported as passing. The build was a debug build of all six P20 branches merged on `origin/2.0/Main` (a local branch, not pushed), against the servers in Docker with the demo profile. Not checked on iOS.

- **Checked on the phone:** every input in the list stays above the keyboard. That covers the forms' fields and primary buttons, the party form's sheets with a search, 파티방's chat input, the 시간표 version list and the onboarding (a new User on the Docker servers). The AI input still rises and returns, and screens return to their place when the keyboard goes down.
- **Not checked:** iOS.
