# 11: 오늘 shows the User's 관정도서관 bookings as seat tickets, which can be cancelled or returned

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [10](10-today-tab.md), which makes the 오늘 page.

Native files: none. Server: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-28: the AI books 관정도서관 seats and group study rooms; 오늘 should show those bookings in their own section, drawn as the AI's answer draws them. Positions are as of `origin/5.0/Main` 9ea45c14.

- The library is reached only from the phone, through the hidden web view's session (`library/client.ts`, `library/library.ts`). `LibrarySessionProvider` is mounted app-wide (`app-providers.tsx:41`); `useLibrarySession()` gives whether the User is logged in and `logIn`. The main server knows no booking number and no seat.
- The bookings are read with `getMyBookingList`. `library/cards/bookings.ts` holds the periods, which booking can be cancelled (STATUS 1, 2) or returned (3), and the order and words of 내 예약's rows.
- Every booking is drawn as the seat card's ticket (P01 ticket 15): "✓ 예약됨 · 오늘 07:00–13:00" or "사용 중 · 13:00까지", the room, and "좌석 8001번" or "방 G411" (`screens/main/library/bookings-cards.tsx`). 내 예약 (`MyBookingsCard`, :249) shows each with its line, the confirm time and "예약 취소 ›", or "반납 ›", whose act is the red main button beside the AI input (`use-confirming.ts`).
- A booked seat is also a Quest the User holds alone (`takenAlone`), its id kept on the phone by the booking's BSEQNO (`library/seat-stays.ts`). So it is a row of 오늘 일정 too.
- A turn the app asks itself, answered without the model, goes through the chat's `askApp` (`features/assistant/use-chat.ts:181-188`), as a tap on a map mark does.

## What was decided

On 2026-11-28 the user chose: bookings in their own section, the tickets as 내 예약 draws them, a press on one goes to the AI's 내 예약, and 취소 and 반납 are possible from 오늘.

## What to build

- **예약**: a section of 오늘 between 오늘 일정 and 지난 알림.
  - It lists the bookings of today to three days on that are booked or in use, seats and rooms, soonest first, with `bookings.ts`'s rules. Each is the ticket 내 예약 draws (a shared ticket component if it is not one yet), with its line under it: the confirm time and "예약 취소 ›", or "반납 ›".
  - It is read once each time 오늘 comes to the front, never polled. While it is read, the section keeps its place with no loading mark of its own, as the seat card's rule is.
  - With none: the section is hidden.
  - Not logged in, or the session ended: one line, "관정도서관에 로그인하면 예약이 보여요", with 로그인 (`logIn`). After a login the section reads again.
  - A read that fails: "예약을 불러오지 못했어요" with 다시 시도.
- **A press on a ticket** goes to the map with the AI raised and adds an app-asked turn "내 예약" whose reply is the 내 예약 card, built on the phone with no model call.
- **"예약 취소 ›" or "반납 ›"** does the same with that booking's act already armed: the red main button (예약 취소 / 반납하기) beside the input acts, as in 내 예약. Nothing is sent from 오늘 itself.
- **No booking twice**: while the 예약 section lists the bookings, a seat's stay Quest (an id among `seat-stays.ts`'s) leaves 오늘 일정. When the section cannot read them (logged out, failed), the Quest stays in 오늘 일정, so nothing is lost.
- **A room's 파티** stays in 오늘 일정, as it is a 파티 (who meets, when, its room), and its room stays a ticket in 예약 (decided 2026-11-28). The 파티's row says its room after its place, "· 관정 G411", so the two read as one plan. The phone knows which 파티 a room was booked for by the booking's BSEQNO (`library/room-bookings.ts`); a room it cannot match adds nothing to the row.
- The mock build's library data (`api/mock/data/library.ts`) serves the section.

## Must not break

- 내 예약, the cancel and return cards and their red button, as P01 ticket 15 built them. P01's open tickets also change `bookings-cards.tsx`; merge `5.0/Main` first.
- No library call while 오늘 is not in front; no write without the red button.
- Tests: `answer-frame-library-bookings`, `answer-frame-library-seat-stay`, `answer-frame-library-seat-ticket`, `library-login-*` (`.integration`), and the `library-*` unit tests such as `library-cards` and `library-after-booking`.

## Acceptance criteria

- [ ] 오늘 lists a booked seat and a booked room as tickets, soonest first, and hides 예약 with none. (Integration test over the mock library, which fails before the change.)
- [ ] A 파티 with a booked room reads "· 관정 {room}" in 오늘 일정, and the room's ticket is in 예약. (Integration test.)
- [ ] Logged out, 예약 is one line with 로그인; the seat's stay Quest stays in 오늘 일정. Logged in, it leaves 오늘 일정. (Integration test.)
- [ ] "예약 취소 ›" opens the map with 내 예약 and the cancel armed; the red button cancels, and back on 오늘 the ticket is gone. (Integration test.)
- [ ] The section logged in, logged out and with a seat in use, on a phone with the mock build; the screens go to the user before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
