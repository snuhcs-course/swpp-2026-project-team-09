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
  - its room number:
    - the booking phone reads it from the booking it keeps (`keepRoomBooking`, by bseqno);
    - any other phone finds the booking in the library's own list (getMyBookingList) by date, start and kind, and reads the room's name;
    - when neither can be read, the right cell shows the label "방" with no value, never a guess;
    - the ticket takes the room from a source given to it, so that the server can be another one later. The room is not added to the server's `…/result` report: the user decides whether the Friends see it through our server;
  - "16:00까지 들어가지 않으면 취소돼요.";
  - "예약 취소", today's cancel (`roomCancelCardOf`).

## How it is built

- **The booking:** `bookRoom` (`book-room-card.tsx`) is today's booking, lifted out of the room card so that both use it; the room card's `sendBooking` calls it.
  - The group card books through `useWrite` with the card's confirmed press (M4).
  - Its done message is added to the chat (`cardActions.library.addOwn`), as a room card's is.
  - After the booking, the answer frame shows that done message, P01 ticket 15's booked ticket with its "예약 취소 ›". No booked face of its own is drawn on the group card.
- **The room and the words** (`use-group-booking.ts`, `study-group-booking.ts`):
  - the kind's rooms are read again when the card shows;
  - `roomOnReady` keeps the room sent while it is free, else takes the kind's first free one and says so;
  - `noRoomOf` gives the next free time and its words, and `againWords` the button's;
  - `readyLineOf` gives the line, and `waitWords` the booking window's sentence.
- **The main button** (`study-group-act.ts`): 예약하기, "로그인하고 예약" (the login, then the booking), "예약 창이 열리면 알려 드려요" dimmed, and "… 다시 묻기". The last takes the request back, then asks the answer again from that start once the answer is let go.
- **The ticket:** `RoomTicket.kindHeld` keeps the kind and opens only the room once everyone has consented.
- **The booked room's number on another phone** comes with ticket 13, which rebuilds the answer from the request.

## Acceptance criteria

- [x] `STUDY_GROUP_READY`: "모두 동의했어요" and "예약하기". Pressing it checks each companion, books G412 with the four members and reports the booking. (Integration test with the fake library.)
- [x] The room taken meanwhile: the kind's first free room is booked and the line says so. (Unit test of `roomOnReady`.)
- [x] No room free: the sentence and the nearer time's button. (Unit tests of `noRoomOf` and `mainOf`; the asking again is the card's.)
- [x] Logged out: the line says the login ended and the button is "로그인하고 예약". (Unit tests; the login then the booking is the button's press.)
- [x] A `:wait` key: the window's sentence and the dimmed action. (Unit tests.)
- [x] Booked: the done message, P01 ticket 15's booked ticket, "G405 예약되었어요!". (Integration test.)
- [ ] The booked room's number comes from the kept booking, else from the library's list by date, start and kind; with neither, "방" stands alone. (Integration test.)
- [ ] Pictures at 1.0 and 1.3 of the ready, booked and declined cards before merge.
- [x] Whole lint, format and types.

## Comments
