# 35: Every sheet slides down when it closes, and closes by a tap on its handle, a tap above it, or a swipe down from anywhere on it, never while its list is scrolled

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
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
   - on release it goes the way the finger was moving: moving down, it slides down and closes; moving up, it springs back and stays open, however far it went. Released at rest, it closes past about a quarter of its height or 120 points, whichever is less, and otherwise springs back (changed after the phone check, below).
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

- [x] A closing sheet slides down with its last content still in it, also when the caller drops its content on close. (App integration test, which fails before the change.)
- [x] A tap on the handle bar closes the sheet, and so does a tap on the scrim. (App integration test; the handle tap fails before the change.)
- [x] A swipe down from the sheet's text or footer closes it when the finger lets go moving down, or at rest past the threshold. Let go moving up, it springs back, however far it went; it never closes while the finger is down. A press on a button inside is still a press. (Gesture unit test; the let-go by direction fails before the phone check's change.)
- [x] A list in a sheet takes no touch of its own scroll view; the list's swipe scrolls it and tells the moments a native scroll tells, so the time wheel still stops on a row. (Gesture unit test, which fails before the phone check's change.)
- [x] Inside a list scrolled away from its top, a swipe down scrolls the list and never closes the sheet, even when the list reaches its top during that swipe. A new swipe from the top closes. (Test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- **Lists in sheets scroll by their swipe, not natively** (since the phone check, below). `SheetScrollView` sets its scroll view's `scrollEnabled={false}` and puts the list's own pan on it (`design-system/sheet-list-pan.ts`). The sheet's own pan waits for that pan (`blocksExternalGesture` through a ref), so it never acts on a touch that lands in a list. The list's pan reads the list's offset in `onBegin`, at touch-down, and that decides the whole gesture: it pulls the sheet, or it scrolls the list with Reanimated's `scrollTo`, and a let-go runs the list on (`withDecay`), as the answer card's drag scrolls its content.
- **A swipe from a list at its top pulls the sheet only when the finger first goes down.** Going up first scrolls the list for the whole gesture. Outside lists the sheet follows the finger either way, never above its place.
- **Numbers.** A let-go faster than 100 points a second up or down goes that way (`MOVING`); slower is at rest, where it closes past a quarter of its height or 120, whichever is less. A drag starts at 8 points and gives way sideways at 16. The spring back is the answer card's settle spring (stiffness 400, damping 40, no overshoot).
- **Lists in sheets do not bounce or stretch past their ends** (`bounces={false}`, `overScrollMode="never"`). A list the swipe does not scroll stays where it is, so a pull from its top leaves it at its top.
- **The pull is a Reanimated translation on a view around the sheet**, on top of `useSlide`'s slide, which is unchanged. A swipe close slides on from where the finger let go. The scrim fades as the sheet is pulled down.
- **While it slides out the sheet takes no touches**, so a second tap cannot call `onClose` again, and the screen under it can be used at once.
- **A sheet whose caller keeps it open springs back after a swipe.** 시간표 읽기 does this, and so does the tutorial while it checks 관정.
- **The handle bar is a `Pressable` with no accessibility element of its own.** The scrim's "{label} 닫기" stays the screen reader's close, and no test finds two buttons of that name.
- **The old handle drag is gone:** 48 from the handle row, measured when the touch ended. Its unit test now taps the handle. The swipe tests are in `bottom-sheet-swipe.unit`.
- **시간 고르기 stays mounted so that it can slide.** `PickTimeSheet` takes `offer | null`. It moved from `ReplyPicks` to the end of `OpenAnswer` in `answer-frame.tsx`, outside the turn's bubbles, so it also slides down when a picked time is sent.
- **In the tests the slide's animation ends within a few frames.** So the integration test checks the closing sheet right after the tap (the 모집글 was already empty there before the change), then that it is gone.
- **A list in a sheet may not take a screen reader's scroll actions**, as with the answer card's content, since its scroll view is not scrollable by touch. Not checked with TalkBack.
- **Not covered by tests:** Android's touch dispatch. The tests send the gesture handler's events straight to the gestures, so they cannot show a native view taking the touch; they check instead that no scroll view in a sheet can (`scrollEnabled` false). Only the phone check shows the touch itself.
- **Ticket 34's sheets** (장소, 친구 초대) should use `SheetScrollView` for their lists when they merge `5.0/Main`.

## Changed after the phone check (2026-11-28)

The user checked the release build of fbc41534 on their phone. Two things changed, in new commits on the pull request.

1. **A swipe on the body did not close the sheet.** The handle's swipe followed the finger, but a swipe that started on the text did nothing.
   - The cause, from the code: the sheets the user tried keep their text in a `SheetScrollView`. On Android, a native scroll view that starts its scroll asks its parents not to take the touch (`requestDisallowInterceptTouchEvent`), and the gesture handler's root then cancels every running gesture. The answer card's drag (`card-drag.ts`) and the seat picture (P01 ticket 11) met the same thing on this phone and stopped letting their scroll views take the touch.
   - `Gesture.Native()` around the scroll view, with the list's pull beside it, should have kept the scroll inside the gesture handler, and the tests passed. But they send the handler's events straight to the gestures, past Android's touch dispatch, so they could not show it. It was not proven on a device, and whether the native gesture or the list's pull went missing there is not known.
   - The fix takes the native scroll out of the touch: a list in a sheet sets `scrollEnabled={false}`, and its own swipe scrolls it (`sheet-list-pan.ts`), as the answer card's drag does. That swipe also tells `onScrollBeginDrag`, `onScrollEndDrag` and `onMomentumScrollEnd` as a native scroll tells them, and runs a list with `snapToInterval` to the row its speed points to, so 시간 고르기's wheel still stops on a row and its button still waits. `Gesture.Native()` is gone.
   - The sheet's own swipe now stands on a Reanimated view that it moves, as the answer card's does, instead of on React Native's `Animated.View` inside a moved view. The slide stays on `useSlide`, on the view around it.
2. **The let-go goes the way the finger moves.** A pull down and back up still closed, because a let-go past the threshold closed whichever way the finger was going. Now, let go moving up (faster than 100 points a second), the sheet springs back and stays open, however far it went; moving down, it closes; at rest, the old threshold decides. Nothing closes the sheet while the finger is down; that was so before too.
3. **Checks.** The four new gesture unit tests fail on fbc41534's sheet sources and pass now. `bottom-sheet-swipe.unit` and `bottom-sheet.unit` pass, 18 tests. Ten integration files that open the changed sheets were run, 86 tests: `sheet-slide-down`, `event-detail-sheet`, `events-recruiting`, `party-find-sheet`, `party-post`, `answer-pick`, `answer-picking-sheet`, `tutorial-sheet`, `party-form-edit` and `events-party-form`. All pass but one: `events-recruiting`'s "opens the edit form of the Quest the User holds alone for the event" does not find the header 모집글 수정. It fails the same way on fbc41534's sources, run alone, so it is not this change's. Whole-app `tsc` and `oxlint --type-aware` pass.

## Comments

### Nightly CI (2026-11-28)

[Run 46030608879](https://github.com/snuhcs-course/swpp-2026-project-team-09/actions/runs/46030608879), started by hand on 15814997, runs the whole app integration suite: 2,644 of 2,649 tests pass, in 344 of 349 suites. The new and the sheet suites pass there. Four of the 5 failures fail the same way on `5.0/Main`'s own sources (c1291274): `answer-frame-library-room-reports`, `library-sign-out`, `timetable-class-slots` and `notifications-join-requests`. The fifth, `main-chat`, timed out.

### Agent usage (2026-11-28)

Estimates. Agent time is this session's wall clock from its start to this entry, about 3 hours. About 55 minutes of it went to local Jest runs, slowed by a new worktree's cold cache and another session's Jest on the same machine. About 70 minutes went to waiting for the nightly CI run. About 1 hour was the work itself. No subagents. Tokens are counted up to this entry, so this commit and the pull request's last edit are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 35 (tests first, `sheet-pull`, `SheetScrollView`, `BottomSheet`, the six scrolling sheets, two merges of `5.0/Main`, checks, the nightly CI run and its failures on `5.0/Main`) | about 3 hours | 57,995,901 | 57,645,559 | 349,934 | 408 | 168,931 |

Without cache reads, the input is 350,342.

### Agent usage (2026-11-28, after the first entry)

Estimates, in the same session, counted from the first entry (17:18 UTC) to this one, so this commit's push and the pull request's edit are left out. About 15 minutes went to the third merge of `5.0/Main` and its checks, and about 45 minutes to the phone check's two changes, their tests and these notes: about 1 hour of agent time. The time spent waiting for ticket 34's Jest and for the phone check is not counted. No subagents.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 35, the third merge and the phone check's changes (the list's swipe in `sheet-list-pan`, the let-go by direction, tests, ticket and pull request) | about 1 hour | 33,962,200 | 33,611,668 | 350,306 | 226 | 188,073 |

Without cache reads, the input is 350,532. With the first entry, the ticket took about 4 hours of agent time and 91,958,101 input tokens (700,874 without cache reads), with 357,004 output tokens.
