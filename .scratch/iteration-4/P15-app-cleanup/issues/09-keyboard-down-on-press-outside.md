# 09: A press outside the AI input puts the keyboard down

Parent: [P15 spec](../spec.md), item 9; found by 김태현 using the Production app on 2026-11-18, and the cause read in the code of `4.0/Main` at `6c935797`; no board on the team canvas, since nothing new is drawn (decided by 김태현 on 2026-11-18)
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none. #359 (P15-53, 안진영, a draft) changes the same files of the main screen's bottom: tell 안진영 before starting, as the spec's rule on shared files asks

## What is on screen now

- A press on the AI input of the everyday map raises the keyboard, and the examples ("배고파" and the others) stand above the input.
- The keyboard goes down only when a message is sent. Enter does not put it down: the input takes several lines, and Enter starts a new one.
- While the keyboard is up, a press on the map, a marker, a row of a list or the zoom control does what it does at any other time: a card opens, the map moves. The keyboard stays up over it.
- On Android the phone's own back, or the keyboard's own key, puts it down. On iOS nothing does but sending.
- The answer frame has the same input ("이어서 말하기"), so the same holds there: a press on the map above the card leaves the keyboard up. A press on an empty part of the card puts it down; ✕ and back close the frame and put it down.
- **The cause.** Nothing was built for it. The input is a bar that floats over the map, outside any scrolling area, so nothing puts the keyboard down for a press beside it. The app asks for the keyboard to go down in two places only: on a send, and when the answer frame is closed.

## What changes

- While the AI input has the keyboard, a press anywhere on the screen outside the keyboard and outside the input's bar puts the keyboard down, and does nothing else. No card opens, no row is chosen, the map does not move.
- A drag that starts there does the same: the keyboard goes down, and the map does not pan.
- This holds on the everyday map and in the answer frame.
- These still do what they do today, since they belong to the input:
  - the bar itself: the field, the send button and "이전 답";
  - the examples above the bar, whose press sends the example;
  - in the answer frame, the card and everything in it, and the pill's "답 닫기" and "새 대화".
- The words written so far stay in the field, and the bar keeps the height they need.
- Once the keyboard is down, the next press does what it always does.

## What stays as it is

- A send puts the keyboard down, and Enter starts a new line.
- What gives way while the keyboard is up (the 새내기 튜토리얼's start button, the first run's card and line, the line of a made Quest) and what comes back when it is down.
- Android's back and the keyboard's own key.
- Every other screen with a field. Read in the code and not run: most of them put the keyboard down for a press on an empty part of their scrolling area, and none was found where sending is the only way out. They are not changed here; see the last criterion.
- No native file changes, so the change ships over the air.

## Acceptance criteria

- [x] On the everyday map with the AI input's keyboard up, a press on the map's ground, on a marker, on a row of the friend list or of the Quest list, and on the zoom control each puts the keyboard down, and nothing else happens: no card opens and the camera does not move.
- [x] A drag on the map with the keyboard up puts the keyboard down and does not pan the map.
- [x] After that, the same press opens the card or moves the map as it always does.
- [x] A press on the field, on the send button, on "이전 답" and on an example does what it does today.
- [x] In the answer frame with the keyboard up, a press on the map above the card puts the keyboard down and does nothing else. The card's own buttons, "답 닫기" and "새 대화" do what they do today.
- [x] Words written before the keyboard went down are still in the field, and are sent by the send button.
- [x] Tests, by ADR 0007: the main screen's integration tests check, on the everyday map and in the answer frame, that a press outside the bar while the keyboard is up asks for the keyboard to go down and selects nothing, and that the bar's own buttons and the examples still work. That the keyboard really goes down, and that a drag does not pan the native map, is checked by hand on an Android emulator with a build that holds the native map, which is an integration check by the ADR; the check is recorded under this ticket's Comments. iOS is not checked here: no iOS build is made for it.
- [x] The other screens with a field are walked by hand on the emulator, and any place where the keyboard cannot be put down is listed under this ticket's Comments. None is fixed in this ticket.

## Comments

### Notes from the implementation (2026-11-18)

- **The scrim.** While the keyboard is up, `MapBottom` draws a transparent scrim over the whole stage (`keyboard-scrim.tsx`, "키보드 내리기"). It comes after the everyday map's own bottom and before the answer frame, the examples and the AI input, so the map, its markers, the two lists, the zoom control, an open card, "활성 파티" and the 편의기능 button lie under it, and the bar, the examples and the frame's card and pill stand over it. It goes once the keyboard is down, so the next press reaches what is under it.
  - It puts the keyboard down as the touch starts (`onPressIn`), so a drag does so too and never becomes a pan. It also does so on `onPress`, since a screen reader's double tap sends only that.
  - For a screen reader it is one button over the whole stage while the keyboard is up, so nothing under it can be reached until "키보드 내리기" is pressed. That is the same rule a sighted User gets (from 안진영's review).
  - It follows the keyboard, not the AI input's focus, as the examples already do. The other fields of the main screen open over it (the friend panel's search is a side panel over the whole screen), so this changes nothing for them.
  - It covers the stage, which starts under the status bar. On Android the system's status bar takes the touches in its strip, so no press reaches the map there. On iOS a press in that strip would; iOS is not checked here.
- **Two places that took the press over the scrim.** Both were found by the reviews and confirmed on the emulator, then fixed.
  - The line under the examples, "대화 내용은 AI 제공자에게 전송돼요", took the press and left the keyboard up. It now stands in a View with `pointerEvents: 'none'` (`asked-examples.tsx`), so a press reaches the scrim. The examples are drawn only while the keyboard is up, so the scrim is always under them. Giving the `Text` itself `pointerEvents: 'none'` did not work on Android.
  - The answer pill's words and icon took the press and left the keyboard up. While the keyboard is up, the pill's View now takes the responder and puts the keyboard down (`answer-pill.tsx`). ✕ stands deeper and keeps its press; "새 대화" is beside the pill.
- **Where each criterion is checked:**
  - The everyday map: `main-keyboard-down.integration.test.tsx`. With the keyboard up, the scrim fills the stage and is drawn over the map, a marker, a row of each list and the zoom control (`drawnOver` reads the drawing order, since the tests' renderer lays nothing out). A press on it asks for the keyboard to go down, opens no card and leaves the address at `/main`. With the keyboard down there is no scrim, and a marker opens its card. Moving the scrim above the input made the "drawn over" tests fail.
  - The bar, the examples and "이전 답": the same file. They are drawn over the scrim, an example sends, and "이전 답" shows the hidden frame. The line under the examples lets a press through.
  - The answer frame: the same file. The scrim is drawn over the map and under the card, the pill and the bar. A press on it keeps the frame, a press on the pill's words puts the keyboard down while it is up and does nothing while it is down, and "답 닫기" and "새 대화" do what they did.
  - The words: the same file. Written words stay after a press on the scrim and are sent by the send button.
- **Shared files.** #359 (P15-53, 안진영, a draft) also changes `main-screen.tsx` and `map-bottom.tsx`. This ticket leaves `main-screen.tsx` alone and adds two lines to `map-bottom.tsx`. #359 adds a guide over the whole map; when the two meet, that guide has to stand under or over the scrim on purpose.

### Hand check on an Android emulator (2026-11-18)

**Setup:** emulator `sdk_gphone64_arm64` (Medium_Phone AVD), the app's debug build 1.0.3 with the native map module, its bundle from Metro, against the app's own mock data (no server address, no Google client ID). The AVD has a hardware keyboard, so "show the on-screen keyboard with a hardware keyboard" was turned on. Whether the keyboard is up was read from the system (`dumpsys input_method`, `mInputShown`). Whether the camera moved was read by comparing the screenshots' pixels in a band across the map. A card was read from the screenshot and the screen's view tree.

- **The scrim is there:** with the keyboard up, the view tree has the button "키보드 내리기" at `[0,63][1080,2169]`, over the map's `SurfaceView` and under the bar.
- **The everyday map, the keyboard up:** a press on the map's ground (three times, and twice more after a fresh start of the app), a long press, a press 0.8 s after the keyboard came up, a press on 김민준's marker, on the friend list's row, on the Quest list's row "저녁 약속" and on the zoom control's "+" each put the keyboard down. No card opened, no room opened, and the camera did not move: no pixel changed in the band. On this phone the zoom control lies mostly under the keyboard; its top edge, still above it, was pressed.
- **A drag on the map, the keyboard up:** the keyboard went down and the map did not pan (no pixel changed).
- **The same press after:** with the keyboard down, the press on 김민준's marker opened 김민준's card, and the same drag panned the map (58,513 pixels changed).
- **The input's own parts, the keyboard up:** a press on the field kept the keyboard up. A press on "오늘 볼 만한 거 있어?" and on "배고파" sent them. "이전 답" showed the hidden frame again and kept the keyboard up. A press on the line under the examples first left the keyboard up; after the fix it puts the keyboard down, and the camera does not move.
- **The answer frame, the keyboard up:** a press and a drag on the map above the card put the keyboard down, the frame stayed with its full card, and the map did not move. "답 닫기" closed the frame and put the keyboard down. "새 대화" forgot the conversation and showed 되돌리기; it puts the keyboard down itself, as before (`forget-with-undo.ts`). A press on the pill's words first left the keyboard up; after the fix, a press on its words or its icon puts the keyboard down and keeps the frame, and ✕ still closes it.
- **The words:** "C hello" written in the field stayed after a press on the scrim, and the send button sent it: the pill and the card show "C hello".
- **One press that went wrong, once.** The very first press on the map's ground of the session put the keyboard down and also opened 63동's card, so it reached the map's touch watcher (`use-map-tap.ts`). It came right after the hardware-keyboard setting was changed while the app ran, and in the same run the field would not bring the keyboard back until the app restarted. It did not come back in nine later presses on the ground, two of them from a fresh start, nor in any press or drag above. Its cause is not known.

### Other screens with a field, walked on the emulator (2026-11-18)

Each field was focused, then a part of the screen with nothing on it was pressed. Android's back always puts the keyboard down, so it is not counted.

| Screen | Field | A press on an empty part |
|---|---|---|
| 행사 | 행사 검색 | of the list: down |
| 파티 › 찾기 | 파티 검색 | of the page: down |
| 파티 만들기 | 제목, 본문, 어디서 | of the form: down. Of the header: stays up |
| 프로필 편집 | 이름, 관심사 | between the cards: down |
| 지도 › 친구 패널 | 이름, 학과 검색 | of the list: down. Of the panel's header: stays up |
| 친구 추가 | 친구 ID | of the page: down |
| 파티 방 | 파티에 메시지 보내기 | of the page or of the chat: down |
| 수업 추가 | 과목명, 강의실 | of the form: down |
| 장소 선택 (from 수업 추가) | 건물 이름, 동 번호 | of the header: stays up. A drag on the list scrolls it with the keyboard up, and a press on a row picks the place. The keyboard's search key puts it down |
| 친구 관리 | 친구 검색 | of the list: down. Of the header: stays up |
| 시간표 › 버전 › 이름 바꾸기 | 시간표 이름 | outside the menu: down, and the menu stays |
| 파티 만들기 › 관련 행사 | 행사 검색 | of the list: down. Of the header: stays up |
| 파티 만들기 › 친구 초대 | 친구 검색 | of the form: down |
| 파티 만들기 › 게시판 (sheet) | 게시판 검색 | of the sheet's header: stays up, and its rows pick a board. The keyboard's search key puts it down. The scrim closes the sheet |
| 파티 만들기 › 태그 › 직접 입력 | 태그 | of the form: down |
| 파티 방 (Leader) › 일정 추가 | 내용, 어디서 | of the room: down |

- **Where the keyboard cannot be put down by a press on the screen:**
  - 장소 선택: nothing on the screen puts it down. Its own search key and the back button do.
  - The 게시판 sheet of 파티 만들기: nothing inside the sheet puts it down. Its own search key does, and a press on the scrim closes the sheet. When the sheet closes, Android gives the focus back to the form's field that had it before, so the keyboard can come back for that field; a press on the form then puts it down.
  - Neither is fixed here.
- **Not run: the room request's dialog** (`room-consent.tsx`, 학적상 이름 and 학번). The mock's inbox is always empty, so it cannot be opened without a server. Read in the code: it is a `Modal` whose scrim is a plain `View` with no scrolling area, so a press beside its fields would likely leave the keyboard up. Back hides the keyboard first, before it closes the dialog.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out, up to the fixes for the first reviews:

- Agent time: about 110 minutes, in one session (Opus 5.5). Three subagents ran inside it: two reviewers (about 8 minutes) and one that found the way to the last fields (about 2 minutes). Most of the time was the emulator check and the walk of the other fields. The ticket itself was written in an earlier session, not counted here.
- Tokens: output about 230,000. Input about 101.5 million: 100.8 million cache reads, 0.74 million cache writes and about 850 uncached.
