# 48: A band past midnight keeps its end after its start

Parent: P01 ticket 44 (the band's hour marks), whose preview build showed it.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an OTA update.

## What was wrong

- On the phone, a study answer in the evening at a place open to 01:00 ("19:15–01:00 · 5시간 45분", range 19:00–01:00): a press on the end handle collapsed the span to a lump at the bar's left, while the head kept its words.
- `onBandDay` puts a "HH:MM" clock on the band's start day. The end handle's clock, "01:00", landed on 11/28 01:00, before the start. Every place that writes a clock back on the band's day had the same fault: the red parts of busy stretches under a fixed end, the band moved whole, the folded track's ends, the span previewed while picking people, and the band redrawn for an asked window (`answer-frame.ts` had its own copy).
- A handle's drag that ended without being let go, as when the card's scroll took the touch, still asked for a recalculation, at a place the finger never let go.
- While an end was held, the head rewrote only a meal's or a meet's length ("식사 26분"). A study place's "5시간 45분" and a meal's "식사 1시간 12분" kept the Plan's length while the bar drew another. When shortened, the head dropped neither.

## What changes

- A clock before the range's start and no later than its end goes on the next day, when the range runs past midnight. The band's own start and end stand in for a range where a caller has none.
- Places that know the time in milliseconds write it as it is (`bandTimeAt`), with no clock in between: the band moved whole, the folded track, the picking preview.
- No handle and no whole move lets a time go past the last step before the band's day ends (23:55 on a 5-minute band). A dropped time is sent as a clock, and the main server reads it on the band's day, so 00:30 after midnight would read as that morning's and the recalculation would find no time (#769's review). An end already past midnight, pressed where it is, stays. Reading a clock after midnight on the server is left for a ticket of its own: each kind reads the window's clocks in its own places.
- A handle's drag that ends any other way than let go puts the end back and asks for nothing (`onFinalize`).
- While an end is held, the head says the length the bar draws, in the words the Plan said it in ("4시간 15분", "식사 19분"). When shortened, it drops a study place's length first, as it does a meal's.

## Acceptance criteria

- [x] A clock of a range past midnight before its start is on the next day; from its start on, and in a band within one day, on the band's day. (`band-past-midnight`, new; fails on Main.)
- [x] The red part under an end fixed after midnight, the band moved over midnight, the folded track's end after midnight, the picking preview ending after midnight, and the band redrawn for an end asked after midnight. (New; each fails on Main.)
- [x] The end handle pressed where it is stays at the bar's right end with the band's words. Dragged back before midnight, the head says "19:15–23:30 · 4시간 15분". A cancelled drag goes back and asks for nothing. (`time-band-past-midnight`, new; fails on Main.)
- [x] An end dragged past midnight stops at 23:55 and is let go there; a seat's end stops at 23:55 before a 24:00 close; the band moved whole starts no later than 23:55; an end the last drop would leave under 15 minutes stays. (New; each fails at the PR's first head.) An end past midnight pressed where it is stays. (New; passes on both.)
- [x] A meal's held words and a let-go drag are unchanged. (`time-band-words`, unchanged.)
- [ ] On the phone, in the preview build.
- [x] No native file changes; lint, format and types pass for all of `mobile`.
