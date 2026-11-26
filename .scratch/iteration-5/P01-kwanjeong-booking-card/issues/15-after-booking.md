# 15: After a booking: booked, return, cancel, and 내 예약 as the seat ticket

Parent: [P01 spec](../spec.md); the after-booking design of 2026-11-27 (boards 1–7) and the library faults of that day (faults 1 and 4, the phone side)
Status: ready-for-agent
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

- After 예약하기 the app adds "✓ 예약했어요" with a booking-number row, a kiosk paragraph, a return paragraph, 좌석 현황 보기, a 길 안내 pill, and 확인 beside the input.
- The kiosk time is the moment 예약하기 was pressed + 30 minutes. A seat booked at 01:20 for 07:00 says "01:50까지", while the library returns a no-show at its start + 30 (fault 4).
- "반납해줘" on a seat booked but not yet confirmed at the 좌석배정기 (STATUS 1 or 2) says "지금 사용 중인 좌석이 없어요". It does not offer to cancel the seat (fault 1).
- The cancel and return cards list rows with 취소하기/반납하기 and 그만두기 as pills. The Assistant's words above them point at the card.
- 내 예약 lists every booking of the period with a state badge: returned, cancelled and no-show ones too.

## What changes

- **One ticket.** Every booking is the seat card's ticket, at its size.
  - Booked or in use: on a light sky ground, the border a step lighter. The left label reads "✓ 예약됨 · 오늘 07:00–13:00" or "사용 중 · 13:00까지"; the value is the room; the right cell is "좌석 8001번", or "방 G411" for a room.
  - Ended here: grey, "취소됨" or "반납함".
  - Its cells open nothing.
- **The done message (board 1).** The ticket, booked, with one faint line: "07:30까지 좌석배정기에서 확인해요" and "예약 취소 ›" at its right.
  - With the walk known: "07:21 출발 · 07:30까지 좌석배정기 확인", "지금 출발 · …" within 5 minutes, or "07:30까지 좌석배정기에 닿기 어려워요".
  - A booking on another day says its day, and no walk.
  - The main button beside the input is 가는 길 while the booking is on the map and the route guidance can start; there is none off campus.
  - The booking number, the paragraphs, 좌석 현황 보기, the 길 안내 pill and 확인 are gone. ✕ closes the answer.
  - It speaks for the seat card it booked: that reply shows nothing more, before or after a cancel, on the map or not, and takes no room over the ticket, which stands whole at the card's low step.
- **Cancelling from the done message (boards 4 and 5).** "예약 취소 ›" turns the main button into 예약 취소, drawn in red. Nothing is sent until it is pressed. Then:
  - the ticket greys and "예약을 취소했어요." says so;
  - the seat-stay Quest ends;
  - the map's mark goes, with the seat card's outcome set to cancelled.
- **The confirm time (fault 4).** It is the booked start + 30 minutes (`kioskDeadline(start)`).
  - After the booking the phone reads the day's bookings once (at most 4 seconds) for the new booking's `USESTART`, matched by its number, and takes it over the start sent.
  - When the two differ, one more faint line says "도서관이 정한 시작: 17:10".
- **The return card (boards 2 and 3).**
  - A seat in use is its ticket, with 반납하기 beside the input.
  - With none in use but a seat booked (STATUS 1 or 2), the card says "아직 쓰기 전이라 반납 대신 예약을 취소할 수 있어요." over its ticket, with 예약 취소 beside the input (fault 1).
  - With neither: "지금 예약이나 사용 중인 자리가 없어요."
- **The cancel card (board 4).** The ticket, with 예약 취소 in red beside the input.
  - Several are chosen from by pressing a ticket.
  - With none: "취소할 예약이 없어요."
  - There is no 그만두기.
- **내 예약 (boards 6 and 7).**
  - Only the bookings booked or in use show, soonest first, each with its line: the confirm time and "예약 취소 ›", or "반납 ›" for one in use.
  - The link makes the main button that act. Otherwise the main button is 가는 길 to 관정관.
  - With none: "지금 예약이나 사용 중인 자리가 없어요."
  - A period that ended before today still lists all its bookings, greyed with the site's state.
- **Whose words.** Every sentence on these cards is the app's. The Assistant's words are not shown above an Assistant reply that holds only cancel, return or 내 예약 cards: it never sees the bookings, and its words could only point at the card. The app's own words over such a card stay, such as a room report's.

Not in this ticket: the server's side of faults 1 and 3 (the return tool and the rules for "반납 됐어?"), fault 2 (the card's changes reaching the model), and a room booking's done message, which keeps its rows.

## Acceptance criteria

- [x] The confirm time is the booked start + 30: booked at 01:20 for 07:00 gives 07:30, and a `USESTART` read back wins, with its line. (Unit and integration tests, red first.)
- [x] The return card offers 예약 취소 for a seat booked and not yet confirmed (STATUS 1 or 2). (Unit and integration tests, red first.)
- [x] The done message is the booked ticket with its line, 가는 길 beside the input, and none of the removed parts. (Integration test.)
- [x] The booked ticket is the card's first part, whole at the low step, and the reply's words do not come back after a cancel. (Integration test, red first; found on the emulator.)
- [x] "예약 취소 ›" sends nothing; 예약 취소 cancels once, greys the ticket, and takes the map's mark away. (Integration test.)
- [x] The cancel and return cards act from the main button, without the Assistant's words or 그만두기. (Integration tests.)
- [x] 내 예약 shows only bookings booked or in use, a past period's as they ended, and one sentence with none. (Unit and integration tests.)
- [ ] On the user's phone: boards 1–7.

## Comments
