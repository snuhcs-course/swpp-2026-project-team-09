# 14: Booking the room once everyone has consented

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-design` 다 라 마, `group-study-resume` 5, 6, 2-2 and 3 나 다 라
Status: ready-for-agent
Blocked by: 12

Native files: none. Releases: with ticket 16.

## What to build

The booking is today's (`book-room-card.tsx`'s `sendBooking`), unchanged:

1. `checkedCompanions` (each companion through the library's getUserCheck);
2. `library.roomForm()`;
3. `library.book` (setRoomBooking);
4. `keepRoomBooking` and `reportRoomBooked`, or the failure reported.

Only the card's face is new.

- **All consented:**
  - the line "모두 동의했어요" and the main action "예약하기";
  - the ticket shows its chevrons again. The room number may change; the kind and time may not.
- **The room filled meanwhile:**
  - on opening the card the phone reads the kind's free rooms again and takes the first free one;
  - the line says "G412가 그 사이 차서 G415로 바꿨어요".
- **No room of the kind is free:**
  - the sentence "그 시간에는 빈 방이 없어요. 16:00부터는 6인실이 비어 있어요." (`nearestStarts`);
  - the dimmed ticket with "방 없음";
  - "16:00–18:00으로 다시 묻기", which asks the answer again at that time. A new time needs new consents.
- **The library is logged out:**
  - the line "모두 동의했어요 · 관정 로그인이 풀렸어요";
  - "로그인하고 예약", which opens the library login and books when it closes logged in.
- **Before the booking window** (`key` ends in `:wait`):
  - the sentence "12월 2일 방은 11월 29일 09:00부터 예약할 수 있어요." (`opens`);
  - "예약 창이 열리면 알려 드려요", dimmed. Today's window push brings the user back.
- **Booked:**
  - the booked ticket (ticket 10's option 나);
  - "16:00까지 들어가지 않으면 취소돼요.";
  - "예약 취소", today's cancel (`roomCancelCardOf`).

## Acceptance criteria

- [ ] `STUDY_GROUP_READY`: "모두 동의했어요" and "예약하기". Pressing it checks each companion, books G412 with the four members and reports the booking. (Integration test with the fake library.)
- [ ] The room taken meanwhile: G415 is booked and the line says so. (Integration test.)
- [ ] No room free: the sentence, "방 없음" and the nearer time's button, which asks again at that time. (Integration test.)
- [ ] Logged out: "로그인하고 예약" opens the login, and the booking follows it. (Integration test.)
- [ ] A `:wait` key: the window's sentence and the dimmed action. (Integration test.)
- [ ] Booked: ✓ 예약됨 on the light sky ground, the entry note and "예약 취소". (Integration test.)
- [ ] Pictures at 1.0 and 1.3 of the ready, booked and declined cards before merge.
- [ ] Whole lint, format and types.

## Comments
