# 26: 관정관 opened from a study answer is the framed seat answer

Parent: [P10 spec](../spec.md). Found on the user's phone on 2026-11-27, with #685 against the real server: "왜 관정 도서관을 클릭하면 채팅 카드에도 시간 축이 존재하지?" 관정관 opened from the list showed the top time card ("22:05–23:00 · 55분"), and under it the chat's old seat card whole: its own slider, "22:30–23:00 · 30분", the ticket, and 예약하기 / 예약 안 함. There were two time axes that disagreed, and a second pair of buttons. The seat answer asked directly ("관정 열람실 자리 있어?") has one time card on top, the ticket in the card, and 예약하기 as the main button.
Status: ready-for-human
Blocked by: nothing (tickets 19 and 22 are merged). #685 (ticket 23) waits on this.

Native files: none. Releases: an app OTA update.

## What changes

- 관정관 opened from a study answer is the booking on the map, as the seat card a reply gives alone is (`studyBookingOf` beside `shownBookingOf`, `features/assistant/booking-scene.ts`; `useStudyBooking` in `chat-sheet.tsx`). The same parts then follow, with no copy:
  - the top time card is the booking's bar (`BookingBar`), the one axis, with the library's steps, lengths and hours;
  - the card holds today's `BookSeatCard` in its on-map form: the ticket, with no slider (`bandOnBar`) and no 예약하기 / 예약 안 함 pair (`OfferButtons` is drawn only off the map);
  - 예약하기 stands in the main button's place (`bookingActionOf`), and books what the top card shows.
- The opened place keeps its reply's words, which hold the ticket. A booking on the map alone otherwise says its own sentence in their place (`dockedBubble` in `answer-frame.tsx`).
- Its head line says the way there alone ("걸음 14분"), so the top card is the one time.
- Back to the list, the booking leaves the map, and the study answer's own band and marks return.

## Where else a bubble-era library card is drawn inside the answer frame

| Place | Its own band or button pair | Now |
|---|---|---|
| 관정관 opened from a study answer | both | the framed seat answer's parts (this ticket) |
| A seat card the reply gave alone | none on the map | unchanged: this is the shared form |
| A seat card that is one of several requests | its own band in the card | unchanged: the bar holds the steps (P04 ticket 09) |
| A seat card in a reply that also draws a Plan or a Lookup, without steps | both | unchanged; noted. No such reply is known in use |
| A room card (스터디룸, 스튜디오, `BookRoomCard`) | both | unchanged: rooms are not on the map |

## Acceptance criteria

- [x] 관정관 opened from the list: one time card on top, the ticket with no slider, no 예약 안 함, 예약하기 beside the input, and its head says the way alone. (Integration test, failing before the change.)
- [x] The booking sent to the library is the top card's time, moved there. (Integration test, failing before the change.)
- [x] Another place still opens its spaces. (Integration test.)
- [ ] Emulator pictures at font scale 1.0 and 1.3.
- [x] No native file changes; lint, format and types pass on the app.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 20 minutes, an estimate, in one session.
- Tokens, estimated as this ticket's share of that session: input 42M, of which 42M cache reads, 0.07M cache writes and under 1k uncached; output 37k.
