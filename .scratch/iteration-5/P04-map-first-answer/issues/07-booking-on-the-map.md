# 07: A 관정도서관 booking stands on the map

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-time-bar-on-top.md) for the bar, [05](05-lookups-and-words-one-line.md) for the bottom.

Native files: none. Releases: an app OTA update only.

## What to build

A reply with a library book card is drawn on the map (board 5): a flag on 관정도서관 with the room and the seat number ("관정 7층 열람실 ›" / "7233번 14:00–16:30"), and my way there. The booking's time is on the top bar, whose handles change the start and the end as the card's band does today. The floors and rooms of the building are a chip above the input ("7층 열람실 ▾"). The button beside the input is the card's action ("예약하기", or "로그인" while logged out of the library). A tap on the flag opens the attached card with the rest of the book card (다른 자리 고르기 and the seat picture).

## What happens now

- The library card (P15 ticket 57, P01) holds the seat, a time band, 자리 선택하기, and 예약하기 in the bottom card. Nothing of it is on the map.

## What changes

- A scene made in the app for a library card whose space has a Place: the Place's position, my position, and a walk.
- The card's band moves to the top bar; its rules (opening hours, 30-minute steps, length limits) stay.
- The room switch becomes the chip; the main action the button; the rest the flag's card.
- A room book card (스터디룸, 스튜디오) gets the same flag and button; it has no seat picture.

## Must not break

- Logging in, booking, cancelling, and returning from the card (`answer-frame-library`); nothing is booked without the press.
- The seat picture's numbers and zoom (P01 ticket 01).

## Acceptance criteria

- [ ] A seat card for 7층 열람실 seat 7233 from 14:00 to 16:30: the flag's words, the bar's span, the chip, and the button "예약하기". (Integration test.)
- [ ] A drag of the bar's end changes the card's end as the band did. (Integration test.)
- [ ] Logged out, the button reads "로그인". (Integration test.)
- [ ] A tap on the flag opens 다른 자리 고르기. (Integration test.)
- [ ] The booking on a phone with the mock build, logged out of the library. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 25 minutes (an estimate; one Opus 5.5 session that also built ticket 06, split by time).
- Tokens: about 55,000 output; input about 29.5 million, of which about 29.3 million cache reads, 179,000 cache writes, and 200 uncached (the session's totals split by the same share).
