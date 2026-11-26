# 17: The seat answer's time card shows the rest of the day

Parent: [P01 spec](../spec.md); the time-card range decision of 2026-11-27 ("바꾸기")
Status: ready-for-agent
Blocked by: P01 ticket 14 (#637), which draws the booking in the meal's time card

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

A seat answer's time card runs over the room's whole day, 07:00–23:00. An hour is 6% of the track, and at 22:00 the band sits at its right end with its two handles on top of each other. In the afternoon, half the track is hours gone by, which 관정 never books: it books today's seats only from now on.

## What changes

- **The range.** Today it runs from now floored to the hour to the closing time.
  - At 14:20 it is 14:00–23:00, and at 09:10 it is 09:00–23:00.
  - It keeps at least 4 hours by starting earlier: at 22:10 it is 19:00–23:00.
  - It never starts before opening, nor after the band's own start.
  - Another day keeps opening to closing.
- **Set once.** The range is that of the moment the answer came, and stays while the card is open.
  - A new answer sets it anew: the card is keyed by the booking's place.
  - Across an hour boundary the range does not move; the line of now moves right.
  - The earliest start follows the real now, as before (`limitsOf`): a handle or a whole move never reaches a start gone by. A start that went by while the card was open is refused at 예약하기, as it already was (`SLOT_PASSED`).
  - A start before now was not possible before this change either: `earliest` is the next half hour of now.
- **The handles.** Each is 16 points wide. A band narrower on the track than the two handles is measured by the track's width, and has them drawn outside it: the start's left of the band, the end's right of it. Under 32 points they go outside; from 32 they stay on the ends. Before the track is measured they stay on the ends. The rule is in the time band itself, so a meal's band that narrow gets it too.

Not in this ticket: the band's height and the handles' use, which stay as they are.

## Acceptance criteria

- [x] The range at 09:10, 14:20 and 22:10, before opening, and on another day. (Unit tests, red first at the three times.)
- [x] The range stays that of the moment the answer came, while the line of now moves on. (Unit test.)
- [x] Handles are drawn outside a band of 31 points, and on the ends of one of 33. (Unit test.)
- [x] On the map, the booking's card runs from 16:00 at 16:00 to 23:00. (Integration test.)
- [ ] On the user's phone: at night the band is wide enough to hold, and in the morning a one-hour band has its handles outside.

## Comments
