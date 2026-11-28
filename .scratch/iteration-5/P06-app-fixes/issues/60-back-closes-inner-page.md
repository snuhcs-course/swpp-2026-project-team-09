# 60: Android's back closes a page drawn inside a screen, as its ‹ does

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

The user on 2026-11-28, on a Samsung phone: "파티 만들 때, 관련 행사 고르기를 들어갔다가 핸드폰 자체의 뒤로가기를 누르면 아예 파티 탭까지로 뒤로가지네."

- **The picker.** 관련 행사 고르기 (`mobile/src/screens/party/form/event-field.tsx`) is a `FullScreenPanel` drawn inside the 파티 form, not a screen of the stack. Its ‹ goes back to the form.
- **The fault.** Nothing took Android's back while it was open, so the back went to the stack and closed the whole form with what was typed.
- **A second copy.** The timetable's 장소 선택 (`places/place-picker.tsx`) is the same kind of page and took the back with its own `useBackToClose`.

## What to build

`FullScreenPanel` takes `inner`. Android's back then does what its ‹ does (`useBackToClose` on `leave.onPress`), before the screen under it leaves. A sheet opened over it, registered later, closes first. Both inner pages use it; the place picker drops its own handler.

## Checked

| Inner page or overlay                                                | Was                        | Now                                            |
| -------------------------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| 파티 form → 관련 행사 고르기                                         | back closed the whole form | back closes the page, the form keeps its words |
| Timetable class form → 장소 선택                                     | own `useBackToClose`       | `FullScreenPanel inner` (same behaviour)       |
| An event's sheet over 관련 행사 고르기                               | (back closed the form)     | back closes the sheet, then the page           |
| Every `BottomSheet` (the form's 친구 초대, 장소, 날짜·시간, …)       | closes first               | unchanged                                      |
| 행사 / 파티 header search open (`TabScreen`)                         | closes the search first    | unchanged                                      |
| 친구 panel (`SidePanel`)                                             | closes first               | unchanged                                      |
| Dialogs and Modals (dialog, seat picker, version menu, room consent) | `onRequestClose`           | unchanged                                      |
| Assistant's answer card, help bubble, tutorial list                  | `useBackToClose`           | unchanged                                      |
| Tab tour                                                             | back skips it              | unchanged                                      |
| Map place picker (`/place-map`)                                      | a screen of the stack      | unchanged                                      |

## Acceptance

- [ ] Back on 관련 행사 고르기 returns to the form with its words (integration test, failing before).
- [ ] Back closes an event's sheet over the page first, then the page (integration test, failing before).

## Comments
