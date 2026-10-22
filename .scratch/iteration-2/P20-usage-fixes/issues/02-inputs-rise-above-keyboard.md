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
- 시간표 version rename,
- 수업 추가 / 수정,
- the onboarding,
- the AI input.

A field near the top of its screen may never be covered. Check it, and record it as checked, not changed.

## Acceptance criteria

- [ ] **Every input stays in view.**
  - On an Android phone, for each input in the list above, pressing the field brings the keyboard up with the field fully visible above it.
  - The field stays visible while typing several lines where the field allows them.
- [ ] **Forms stay usable.**
  - In 파티 만들기, 수업 추가 / 수정 and 친구 추가, with the keyboard up, the focused field is in view, and the form's primary button can be reached without putting the keyboard down first, or right after it goes down.
- [ ] **Sheets.** In a bottom sheet with a search, such as the party form's 행사, 친구 and 게시판 sheets, the search field and the first results stay above the keyboard.
- [ ] **Room chat.** In 파티방, the chat input sits right above the keyboard, and the latest message stays in view.
- [ ] **No regressions.**
  - The main screen's AI input still rises above the keyboard and returns, as P07-09 made it.
  - The onboarding still works.
  - When the keyboard goes down, every screen returns to its place without a jump.
- [ ] **Tests:**
  - with the keyboard shown at a height (a mocked keyboard event), the full-screen panel's footer and the bottom sheet's content rise by that height, and return when it hides
  - the room chat's input rises the same way
  - the existing main-chat, onboarding, party-form and timetable tests pass
- [ ] Checked on an Android phone: every input in the list, each marked changed or checked as already fine. Also checked on iOS if one is at hand. Write what was and was not checked under `## Comments`.

## Comments
