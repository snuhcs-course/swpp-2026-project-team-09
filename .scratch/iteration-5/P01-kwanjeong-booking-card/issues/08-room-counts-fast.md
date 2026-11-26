# 08: The room list's counts kept, shared and drawn alone, 그대로 that answers, the map's flag kept, and the calls timed

Parent: [P01 spec](../spec.md); the map of the seat card's library calls and the User's report that the room list lags and 그대로 does not respond (2026-11-26)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: the app's JavaScript only.

## What happens now

The seat card's room chip opens a list of rooms with each room's free seats. There is no count endpoint at the library, so each count is made from a sector's whole seat list: 8 `getSeatBookingList` reads at once, about 484k characters in all. The largest, 8층 노트북존's sector 18202, is 560 seats.

- Nothing is kept. Each open of the list, and each change of the time once counts were read, starts a new round of 8, and every cell goes back to "…".
- Earlier rounds go on. Two opens put 16 replies in flight, and each one is drawn when it comes.
- Each reply's seats are sorted with `localeCompare(…, 'ko', { numeric: true })` inside the comparator, which builds a collator per comparison, only to be counted.
- The counts are the card's state, so every reply draws the whole seat card again.
- 그대로 has no pressed look, unlike the chip beside it, and its target is the word with 8 pt around it. Its press only closes the list: the round goes on and keeps drawing the card after it.
- While the list is open, the card tells the map that no seat is chosen. The flag on 관정관 loses its seat number, and the map draws the flag again. It draws it once more when the list closes.
- Nothing times the library's calls, so no one knows how long they take on a real phone.

## What changes

- **Counts kept for a minute.** A sector's count for a time is kept in memory for 60 s.
  - The list opened again, or a time gone back to, shows the kept counts at once and reads nothing.
  - An older count stays on screen while it is read again. A read that fails keeps it.
  - "…" shows only for a room not yet counted for that time.
- **One read per sector and time.** A read of a sector for a time that is already on its way is shared, whoever asks.
- **Stale rounds drawn no more.** A newer round, or 그대로, ends the round on its way. What it still reads is kept for the next look and changes nothing on screen.
  - The read inside the library's web view is not cancelled: ADR 0012's call protocol stays as it is.
- **Counting without sorting.** A count filters the free seats and does not sort them. The seat order the card shows uses one `Intl.Collator('ko', { numeric: true })`, made once.
- **Counts drawn by the list alone.** The counts live in a small store the card holds (`RoomCounting`). The room list and the card's sentence read it through `useSyncExternalStore`, so a reply draws the list, not the card, the sheet or the map.
- **그대로.** It takes the chip's pressed look (opacity 0.6) and the chip's height, and its press ends the round. Nothing else of its look changes, because the chip, 그대로 and the rows are being redesigned.
- **The map's flag kept.** While the list is open, the card goes on telling the map the seat on screen, so the flag on 관정관 keeps its room and seat. 예약하기 beside the input stays disabled, and the flag's card offers no 다른 자리 고르기, so no seat is booked or picked out of sight. Another room chosen changes the flag.
- **The calls timed.** Each call through the hidden web view is noted: its endpoint, how it ended (`ok` or the error kind), the reply's size in characters, the wait for the page, and the call's own time. A development build prints it as one `[library] …` line, which the phone-preview build's Metro shows. A released app prints nothing, and nothing is sent anywhere. Nothing of what was asked or answered is in it.
- The card's own free seats, the seat picture's and the full room's swap are counted without sorting too.

Not in this ticket: counting the rooms before the list is opened, and sending the counts to the Assistant. Neither is built.

## Acceptance criteria

- [x] The list opened again within a minute shows the free seats at once and makes no new read. (Integration test, `answer-frame-library-room-chip`: 8 reads, not 15, before the change.)
- [x] Within a minute the kept counts show and nothing is asked. After a minute they show while they are read again, and a failed read keeps them. (Unit test, `room-counting`.)
- [x] A read of the same sector and time on its way is shared. (Unit test.)
- [x] Counts that arrive after 그대로 ended the round change nothing on screen, and are kept for the next look. (Unit test.)
- [x] Each count that arrives draws the list, and the card is not drawn again. (Unit test, `room-counts-hook`.)
- [x] A room's count equals its free seats, with no order needed. (Unit test.)
- [x] The flag keeps its room and seat while the list is open and after 그대로, and names the room chosen after it. (Integration test, `answer-booking-on-map`.)
- [x] A call's timing holds the endpoint, how it ended, the reply's size and the times, and nothing else; a call with no reply is noted as `network`. (Unit test, `library-hidden-transport`.)
- [ ] 그대로's pressed look and target, the list opened again within a minute, and the flag on the map, on the User's phone with a library login. (Not pictured: a small change, checked on the phone before merge.)

## Comments

### Agent usage (2026-11-26)

- Agent time: about 95 minutes (an estimate), in one session. About 20 minutes went to the map of the library calls and the anonymous check, from 21:45 KST, in turns shared with P04 ticket 94. The build, the tests and the checks took 75 minutes, from 22:14 to 23:30 KST.
- Tokens:
  - The map of the calls, in subagents: 160 input, 66,725 output; cache reads 15,598,625, cache writes 290,231.
  - The build: 316 input, 106,478 output; cache reads 67,534,411, cache writes 283,735.
