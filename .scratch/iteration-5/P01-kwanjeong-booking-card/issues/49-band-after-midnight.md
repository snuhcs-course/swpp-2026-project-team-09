# 49: A band past midnight moves

Parent: P01 ticket 48 (a band past midnight keeps its end after its start).
Status: ready-for-human
Blocked by: P05 ticket 91 on the main server (merged in #795 and released, 26.11.29-2).

Native files: none. Releases: an OTA update, after the main server of P05 ticket 91.

## What was wrong

- On the phone, Saturday 23:50, "지금 공부할 곳" gave a band wholly after midnight, "내일(일) 00:04–03:04", in a range of 23:35 to 03:30. Neither handle nor the band moved.
- #769 (P01 ticket 48) let no time go past 23:55 of the band's day. A dropped time was sent as "HH:MM", and the main server read it on the input's date, so 00:30 after midnight would have been that morning's. A band wholly after midnight lay entirely past that cap: each drag of an end went back to its own time, and the band moved whole jumped back to 23:55.

## What changes

- The main server now reads a window's hours past 23 on the next day (P05 ticket 91). So the band's handles and its whole move let a time go anywhere in the range, on both sides of midnight, and the cap is gone.
- A time let go is written as a clock on the band's day, past 23 after midnight ("24:30" for 00:30 of the next day). It is sent as a clock on the input's date (`withDropped`, `withMovedStart`, `windowClockOn`).
- The app reads such a clock back on the next day (`onBandDay`): the held handle, the clashes under a fixed end, and the band redrawn for an asked window.
- Nothing the User reads shows an hour past 23. The head's words, the handles' spoken values and the picking preview write times on their own day (`koreaClock`), and the chips come from the main server, which shows them so (P05 ticket 91).

## Acceptance criteria

- [x] A band wholly after midnight moves: each end, the whole band, and a screen reader's step. A band across midnight moves both ends past midnight. An end pressed where it is stays. (`band-after-midnight` unit, new; fails on Main.)
- [x] Over the fake main server, a band across midnight with its end let go at 00:30 asks `until: "24:30"`; moved whole past midnight it asks `from: "24:00"`; a band wholly after midnight with its start let go at 00:30 asks `from: "24:30"`. No word on screen shows an hour past 23 while the band is held. (`answer-band-after-midnight` integration, new; the three requests fail on Main.)
- [x] #769's cases that pinned the 23:55 cap now expect the time let go where it is dragged ("24:30", a seat's "24:00", a whole move past midnight). The end held at 00:30 says "19:15–00:30 · 5시간 15분" and is let go as "24:30".
- [ ] On the phone, in the preview build.
- [x] No native file changes; lint, format and types pass for all of `mobile`.
