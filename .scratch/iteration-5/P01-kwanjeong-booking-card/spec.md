# P01: Booking a 관정도서관 seat through the AI chat

Status: ready-for-agent

## Problem Statement

On 2026-11-21 the owner asked for two things about booking a 관정도서관 seat through the AI chat ("관정도서관 7층 노트북존 예약해줘"):

1. The book card fills a time by itself, and the User could change it only with another chat message ("오후 두시부터 여섯시까지 해줘").
2. The seat picture opened by 다른 자리 고르기 could not be zoomed. Its seat numbers showed as "7..", so the User could not tell whether they had pressed the seat they wanted, or whether the card's new seat was the one they pressed.

The screenshot with the request came from an app that was older than Iteration 4's P15 ticket 57 (merged on 2026-11-18, published to the phones on 2026-11-20). Ticket 57 had already added a time band to the card, renamed the button 자리 선택하기, and made the seat picture zoom to 4 times. An emulator check of `5.0/Main` on 2026-11-21 found that the time band does what item 1 asks. Item 2 was still short in two ways:

- A seat's number is cut ("72...") at every zoom, the largest included. So is the picked seat's number, so it cannot be matched against "7233번 선택".
- 확대 and 축소 zoom from the picture's top-left corner. At 4 times the view shows an empty corner of the room.

## Solution

- Item 1, the time: nothing more is needed. The time band of P15 ticket 57 changes the start and end on the card.
- Item 2, the seat picture: [01 — whole seat numbers, and a zoom that stays where the User looks](issues/01-seat-numbers-and-zoom.md).
- Reported on 2026-11-22, the login: [02 — a login page that fits the phone, and no login ID in the AI input](issues/02-library-login-screen.md).
- The study-seat answer on the map, against the answer screen's redesign: [03 — the study-seat answer in the meal answer's shape](issues/03-study-seat-dock.md).

## Out of Scope

- The time band's rules (opening hours, 30-minute steps, length limits), which stay as P15 ticket 57 set them.
- The room book card (스터디룸, 스튜디오), which has no seat picture.
