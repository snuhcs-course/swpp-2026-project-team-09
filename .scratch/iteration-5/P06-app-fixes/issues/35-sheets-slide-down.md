# 35: Every sheet slides down when it closes, and closes by a tap on its handle, a tap above it, or a swipe down from anywhere on it, never while its list is scrolled

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-27, with no wireframe:
- "팝업창들이 올라올때 부드럽게 올라오고(이건 아마 지금 적용이 되어있는듯), 내려갈때 부드럽게 내려가게 하려고 하거든?(지금은 툭 없어짐)"
- "팝업창 올라온거 제일 위에 가로로 생긴 바를 터치하면 내려가도록 + 그 위 빈공간을 터치해도 내려가도록 + 그냥 팝업창 뜬 곳의 어디든지부터 시작해서 아래로 스와이프하면 내려가도록. 대신 이거는 팝업창에 스크롤하는 부분이 있어서 해당 스크롤이 최상단이 아니면 내려가면 안돼, 또 최상단이 아닐때 스와이프를 시작해서 최상단에 도달했더라도, 시작한 지점이 최상단이 아니라면 내려가면 안돼."
- The Assistant's answer sheet has a similar drag, as a reference.
- The user checks it on the phone. The pull request carries no screen recording.

Positions are as of `origin/5.0/Main` da4f5da0, under `mobile/src/`.

- **One sheet for all.** Every sheet that rises from the bottom is `BottomSheet` (`design-system/bottom-sheet.tsx`): 찾기's 모집글 (`screens/party/post-sheet.tsx`), the event detail (`screens/events/event-detail-sheet.tsx`), 파티 찾기/모집 (`recruiting-sheet.tsx`), every `ConfirmSheet` (`screens/room/confirm-sheet.tsx`: 파티 없애기, 나가기, 활성화 and the others), 참여 확인 (`join-sheet.tsx`), 날짜·시간 (`screens/date-time-sheet.tsx`), 시간 고르기 (`screens/main/answer/pick-time-sheet.tsx`), 게시판 고르기, the Friends' sheets, the tutorial, 시간표 읽기 and the push ask.
- **It does slide out.** `useSlide` (`design-system/use-slide.ts`) runs 280 ms out and keeps the sheet drawn until it ends. But most callers empty the sheet the moment it closes, as `PostSheet` does with `{questId === null ? null : <SheetBody …/>}`. The content vanishes at once and only an empty top slides down, which reads as "툭 없어짐".
- **How it closes now:**
  - a press on the scrim;
  - Android's back (`useBackToClose`);
  - a drag of 48 or more that starts on the handle row (`useDragDown`, measured only when the touch ends; the sheet does not follow the finger).
  - There is no tap on the handle and no swipe from the rest of the sheet.
- **Scrolling inside sheets.** Several sheets hold a vertical `ScrollView`: the 모집글, the event detail, 파티 찾기/모집, the tutorial, and the hour and minute lists of 날짜·시간, which open scrolled to the chosen value. `pick-time-sheet.tsx` holds a time wheel. 날짜·시간 also holds a sideways row of days.
- **The reference.** The Assistant's answer sheet drags on the UI thread with `react-native-gesture-handler` and `react-native-reanimated` (`screens/main/answer/card-drag.ts`, `card-motion.ts`):
  - a drag starts past 8 points, so that a press stays a press (`PAN_STARTS`);
  - a sideways move gives way to a row that scrolls sideways (`SIDEWAYS`).
  - It differs on one point: it hands a drag over from scrolling to moving the card in the middle of one gesture. This ticket must not do that.
- The centre `Dialog` (`design-system/dialog.tsx`), the full-screen `Modal`s (seat picker, room consent, the version menu, the library login) and the Assistant's answer sheet are not `BottomSheet`. They are left as they are.

## What to build

All in `BottomSheet` and what it offers, so that every sheet gets it at once.

1. **Sliding down.**
   - Every close slides the sheet down and fades the scrim, as the open does but reversed (280 ms, `useSlide`).
   - While it slides out, the sheet keeps showing the content it last had, even when its caller has already passed none (a closing `open`, or children that went `null`).
   - The phone's reduce-motion setting keeps closing at once, as now.
2. **A tap on the handle bar closes the sheet.** The bar's touch row (the top 24) takes a press as a close. A press is a touch that moves less than the drag threshold.
3. **A tap above the sheet closes it**, as the scrim does now.
4. **A swipe down from anywhere on the sheet closes it:**
   - on the handle, a header, the text, the footer's buttons, or inside a list (rule 5);
   - the sheet follows the finger down while it moves (never up past its place);
   - on release it slides down and closes when it went past a threshold, about a quarter of its height or 120 points, whichever is less, or when the release is a downward flick. Otherwise it springs back.
   - A press stays a press: buttons and rows inside still take taps, and a drag starts only past about 8 points.
   - A mostly sideways move gives way to what scrolls sideways (the days row of 날짜·시간, chip rows).
5. **Lists inside: decided where the finger lands, for the whole gesture.**
   - A swipe that starts inside a vertical scroll area (a `ScrollView`, a list, a wheel) can close the sheet only if that area was at its very top when the finger went down.
   - If the area was not at its top, that gesture only scrolls the area, even after it reaches the top. Only a new swipe that starts at the top closes.
   - A swipe that starts outside any scroll area (the handle, a header, the footer) closes regardless of where the lists are.
   - The same rule holds for the hour and minute lists of 날짜·시간 and for the time wheel: they open scrolled, so a swipe on them scrolls them.
   - How a sheet's scroll areas tell `BottomSheet` where they are (for example a `BottomSheet`-aware scroll view that the sheets above use instead of `ScrollView`) is decided while building. Every sheet listed above that scrolls must use it.
6. **Kept as they are:**
   - Android's back;
   - the keyboard's lift of the sheet (`useKeyboardHeight`);
   - the 90% height;
   - the accessibility labels ("{label} 닫기" on the scrim);
   - what each sheet's `onClose` does.
   - Each close way calls `onClose` once.

## Must not break

- Every sheet above opens and closes as its screen expects, with its buttons and rows still pressable.
  - 찾기's 모집글: 참여 신청, 관심 없음, 신청 취소, and its scrolling text.
  - The event detail: ☆ and 원문 보기, and its party button or 이 행사 추가.
  - `ConfirmSheet`'s confirm and 취소.
  - 날짜·시간's day row, hour and minute lists, and 완료.
  - 시간 고르기's wheel.
- A sheet over a sheet, as 행사 고르기's detail over the 파티 form.
- The keyboard inside a sheet: search fields and the 직접 입력 of 장소 in ticket 34.
- Tests:
  - `bottom-sheet`'s own;
  - those that close a sheet by its scrim or handle (`git grep -l "sheet-handle\|닫기\" "` among the tests);
  - the event detail, post sheet, confirm sheet and date-time sheet tests.

## Out of scope

- The centre `Dialog`, the full-screen `Modal`s, and the Assistant's answer sheet.
- How each sheet looks.
- Ticket 34 adds sheets (장소, 친구 초대) on `BottomSheet`. They get this behaviour by using it. If 34 lands first, its scroll areas use this ticket's scroll view; if this lands first, 34 adopts it when merging `5.0/Main`.

## Acceptance criteria

- [ ] A closing sheet slides down with its last content still in it, also when the caller drops its content on close. (App integration test, which fails before the change.)
- [ ] A tap on the handle bar closes the sheet, and so does a tap on the scrim. (App integration test; the handle tap fails before the change.)
- [ ] A swipe down past the threshold, or a flick, from the sheet's text or footer closes it. A short one springs back. A press on a button inside is still a press. (App integration or gesture unit test, which fails before the change.)
- [ ] Inside a list scrolled away from its top, a swipe down scrolls the list and never closes the sheet, even when the list reaches its top during that swipe. A new swipe from the top closes. (Test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build.
- [ ] No native file changes; lint, format and types pass on the changed files.

## Comments
