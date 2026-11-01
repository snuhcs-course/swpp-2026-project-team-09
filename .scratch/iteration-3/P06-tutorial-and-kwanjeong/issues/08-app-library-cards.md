# 08: App library cards: book, seats, cancel, return and my bookings

Parent: [P06 spec](../spec.md) ("App: the library cards", "Cards and the API contract")
Status: ready-for-agent
Blocked by: 04

## What to build

The chat's library cards come alive on the phone. A book card shows a real free seat or room for the asked time and books it only when the User presses 예약하기, then the done message reminds them to confirm at the kiosk and to return the seat. A seats card draws the site's seat map with the free seats lit, small in the chat and large on a tap, and tapping a free seat gives a book card for it. Cancel and return cards find the matching booking and act only on confirm; myBookings lists the User's bookings. Every failure says what happened. Nothing is ever written to the library before a confirm press.

It uses ticket 04's library client and fake library, and builds against the `library` card DTO and `clientCapabilities` fixed in the spec, mocking ticket 07's replies until it lands. Room bookings with companions are ticket 09; here a room book card books for the applicant alone. Ticket 09 also adds, to this ticket's cancel card, the report to the server when a room booked through a room request is cancelled.

## Acceptance criteria

- [ ] The app sends `clientCapabilities: ['library']` with every chat request and accepts `{ kind: 'library', id: key }` cards in the history it sends back.
- [ ] **book (seat)**, as MainChatLibReserve: loads `getSeatBookingList`; picks the named or tapped seat, else the first free (STATUS 1, USECNT 0) in label order; shows "관정관 7층 열람실 · 7193번" / "오늘 17:00–18:00", 다른 자리 고르기, 예약하기, 취소 and the notes; with no free seat "그 시간에 빈 자리가 없어요" with 좌석 현황 보기.
- [ ] **book (room)**: free rooms of the sector or equipment group whose ABLETIME covers the slot, first preselected, else the nearest free starts that day; the `useDesc` picker when unset; the 서약서 with "서약서 동의" for media rooms; 예약하기 waits for both.
- [ ] **On 예약하기** the payload equals the site's (seat: `roomNo, sectorNo, useTime, bookDate, bookTime, seatNo, sMemberJsInfo=''`; room: with `useDesc, phoneNum, eMail` from the room form and the applicant first in `sMemberJsInfo`). On `bookingResultInfo` the done message (MainChatLibReserved) is appended as the app's own bubble, not sent to the model, with the rows, the kiosk sentence for a seat, the return sentence, and 좌석 현황 보기. 취소 gives "알겠어요. 예약하지 않았어요."
- [ ] **cancel / return**: `getMyBookingList` (today − 1 to today + 3) filtered by `target` and STATUS (1–2 / 3); one row, a list, or "취소할 예약이 없어요" / "지금 사용 중인 좌석이 없어요"; the confirm sends `setCancelBooking` and shows "예약을 취소했어요" or "반납했어요. 이용해 주셔서 고마워요!".
- [ ] **seats**, as MainChatLibSeats: `area_<sector>.png` at the card's width with each seat box at scaled POSX, POSY (33×28 image px), free #F89200, taken #F3F0E6, STATUS 9 not bookable; caption with "지금 기준" and the free count; the large view (300 pt high, horizontal scroll, title, "옆으로 밀어서 보기"); tapping a free seat gives a seat book card (card's time or the next 30 minutes, 2 hours); room sectors list rooms with free slots and photos.
- [ ] **myBookings**: today − 7 to today + 3 by default, STATUS_NAME, and 취소/반납 on rows that allow it.
- [ ] **Failures** in the card exactly as the spec lists them (library message, 대학원 열람실, seat just taken with the next free seat, session ended with 로그인 and one retry, no network, no login when the card loads).
- [ ] Privacy: BSEQNO, phone, email and every library reply stay on the phone; the done message is never sent to the model; a test inspects the requests to our API mock and finds none of them.
- [ ] **M4 in CI:** in every test that drives a library card, the fake library records no write request (`setRoomBooking`, `setCancelBooking`) before the confirm press.
- [ ] Tests, named by ADR 0007, integration against the API mocks and the fake library (prior art: `chat-restaurant-card`, `chat-proposal-card`): each card kind; seat placement at scaled POSX/POSY, the tap and the large view; the seat and room payloads; the useDesc picker and 서약서 gating; the done message with the return text; each failure; session ended and the retry. Payload builders and seat scaling get unit tests.
- [ ] **Person**, on one real phone against the real site: one group-room booking with a companion in `sMemberJsInfo` (`getUserCheck`, then `setRoomBooking`) and its cancel, recorded with screenshots in the PR. The room flow was read from the site's JS, not recorded, so this is its first real check (through ticket 09's flow if it has landed; otherwise this check moves to ticket 09's).
- [ ] No native file changes beyond ticket 04's (CLAUDE.md § The app's native files).
