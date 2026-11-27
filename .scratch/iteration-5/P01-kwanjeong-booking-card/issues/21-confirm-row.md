# 21: The confirm row [✕][red action], and Android's back in the room consent

Parent: [P01 spec](../spec.md); the user's card-screen rules of 2026-11-27, item 4 ("가-3으로 확정하면 될듯")
Status: done
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

- On the done message, "예약 취소 ›" arms a red 예약 취소 beside the input. Nothing un-arms it but the answer card's ✕, which closes the whole answer.
- On 내 예약, "예약 취소 ›" and "반납 ›" arm 예약 취소 (red) or 반납하기 (not red) the same way, and the row's choice is never reset.
- Android's back in the room-consent dialog declines the room request.

## What changes

The armed step of a destructive act in the answer card is one row beside the input (`answer/confirm-row.tsx`), choice 가-3 of the card-screen rules page:
- at the left a round grey ✕, with no words, the height of the main button, labelled for a screen reader ("취소하지 않기", "반납하지 않기");
- at the right the act's own red button over the rest of the row.

✕ steps back to the first state and sends nothing. The act stage (`act-stage.ts`) carries the step's `back`, so every armed step of a card goes through the same row:
- the done message's 예약 취소;
- 내 예약's 예약 취소 and 반납하기, both red now.

Android's back in the room-consent dialog closes it unanswered until the app opens anew; nothing is declined.

Scope, as decided: the answer card's armed steps only. Confirm sheets and dialogs stay as they are, and one-press actions stay one press.

## The survey: destructive and two-step actions in the app

| Where | Action | Now | After this ticket |
|---|---|---|---|
| Done message (`library-done.tsx`) | 예약 취소 › → 예약 취소 | Armed in the card, no way back but closing the answer | [✕][예약 취소] |
| 내 예약 (`bookings-cards.tsx`) | 예약 취소 › → 예약 취소 | Armed in the card, no way back | [✕][예약 취소] |
| 내 예약 (`bookings-cards.tsx`) | 반납 › → 반납하기 | Armed in the card, no way back, not red | [✕][반납하기], red |
| Confirm sheet (`room/confirm-sheet.tsx`) | room 나가기, 파티 없애기, 퀘스트 없애기, 활성화에서 나가기, 활성화 끄기, 모집글 없애기, 신청 취소 (post, 보낸 신청), the map's 활성 파티 leave | Two steps with a way back ("취소", scrim, back, drag) | Unchanged |
| Dialog (`design-system/dialog.tsx`) | 멤버 내보내기, 관심 없음, 로그아웃 (내 정보), 시간표 삭제, 수업 삭제, 이전 대화 모두 지우기, 친구 끊기 | Two steps with a way back ("취소", back) | Unchanged |
| Answer card | the cancel/return card's dock button, the leave row's 취소하기/나가기, invitation 거절, consent 철회, 이 대화 지우기 | One press | Unchanged |
| Party | room 신청 거절, 초대 취소, 일정 삭제, activation 거절, 받은 초대 거절, 내 파티 거절 | One press | Unchanged |
| Friends | 친구 거절, 요청 취소 | One press | Unchanged |
| 내 정보 | library 로그아웃, private zone 삭제, interest 지우기, onboarding 로그아웃 | One press | Unchanged |
| Room consent dialog (`room-consent.tsx`) | Android's back | Declines the request | Closes it unanswered until the app opens anew |

Noted, not changed: sheets and dialogs label their way back "취소", next to confirms such as "신청 취소".

## Acceptance criteria

- [x] The done message's "예약 취소 ›" stands [✕][예약 취소] beside the input; ✕ brings back "예약 취소 ›" and 가는 길, with nothing sent. (Integration test `answer-booked-on-map`, red on Main.)
- [x] 내 예약's armed 예약 취소 and 반납하기 stand with the ✕, which brings back the row's links with nothing sent; 반납하기 is red. (Integration test `answer-frame-library-bookings`, red on Main.)
- [x] Android's back in the room-consent dialog closes it without sending a decline. (Integration test `main-room-consent`, red on Main.)
- [ ] Pictures at 1.0 and 1.3: the seat cancel's confirm row and one other (내 예약's 반납하기). (Waiting on the emulator.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 13 min in the session that finished it (an estimate: active time with gaps over 5 minutes left out). The first draft of the code and tests, in a session of the account used before 2026-11-27 16:23, is not counted, as its transcript is not read here. Tokens are this session's, split by time across tickets 19, 20 and 21; pictures not yet taken.
- Tokens: input 70 uncached, with 49,900 cache writes and 6,080,000 cache reads; output 14,900. No subagents.
