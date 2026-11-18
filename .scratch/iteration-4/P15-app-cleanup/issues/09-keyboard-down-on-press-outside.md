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

- [ ] On the everyday map with the AI input's keyboard up, a press on the map's ground, on a marker, on a row of the friend list or of the Quest list, and on the zoom control each puts the keyboard down, and nothing else happens: no card opens and the camera does not move.
- [ ] A drag on the map with the keyboard up puts the keyboard down and does not pan the map.
- [ ] After that, the same press opens the card or moves the map as it always does.
- [ ] A press on the field, on the send button, on "이전 답" and on an example does what it does today.
- [ ] In the answer frame with the keyboard up, a press on the map above the card puts the keyboard down and does nothing else. The card's own buttons, "답 닫기" and "새 대화" do what they do today.
- [ ] Words written before the keyboard went down are still in the field, and are sent by the send button.
- [ ] Tests, by ADR 0007: the main screen's integration tests check, on the everyday map and in the answer frame, that a press outside the bar while the keyboard is up asks for the keyboard to go down and selects nothing, and that the bar's own buttons and the examples still work. That the keyboard really goes down, and that a drag does not pan the native map, is checked by hand on an Android emulator with a build that holds the native map, which is an integration check by the ADR; the check is recorded under this ticket's Comments. iOS is not checked here: no iOS build is made for it.
- [ ] The other screens with a field are walked by hand on the emulator, and any place where the keyboard cannot be put down is listed under this ticket's Comments. None is fixed in this ticket.
