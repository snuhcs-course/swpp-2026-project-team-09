# 43: A time card's range runs from now to the place's closing

Parent: ticket 17 (the seat card's range, from now to closing).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: a main-server deploy.

## What was wrong

- A study answer at 01:10 drew its band over 01:00–05:00. Its range ran from an hour before the span, or now when later, to half an hour past it, so moving the start to 07:00 meant dragging to the edge, letting go, and dragging again.
- The range was worked out in eight places, each a near-copy of the same arithmetic (`halfHoursAround` with `BAND_BEFORE_MS`/`BAND_AFTER_MS`).

## What changes

- One function, `bandRange` (`free-time/band-range.ts`), gives the range of every band a drag moves.
  - Today it runs from now, floored to the half hour, or from the place's opening when that is later. On another day it starts at the opening, or an hour before the span when the opening is not known.
  - It ends at the place's closing.
  - It is at most 16 hours long, as the seat card's 관정관 day (07:00–23:00).
  - It never ends past 23:30 of its day. The app puts a dropped time on the band's own day, and the main server reads a corrected window's clocks on the input's date, so 24:00 would read as 00:00 of that day.
  - It always holds the span whole, and the window the User fixed.
- The place's hours, by kind:
  - a study plan: its first space's (the opening at now, or at the day's start on another day, and the close at the arrival);
  - a study together: the group rooms';
  - a meet: the day's meeting hours (09:00–22:00);
  - an answer without a plan: the meet's day hours, the group rooms', or none for a study.
- A meal's range is left as it was, from an hour before the span to half an hour past it, until it is decided whether the one rule changes what a meal shows.
- A band whose time is fixed is not dragged. Its range stays around its span (`fixedRange`): an event's, and so a party's and a new party's. A way's and a shuttle's keep their own range (setting out to the deadline) and share the rounding.

## Acceptance criteria

- [x] The range by partition: a place with hours, its opening later than now, a 24-hour place, the day's last half hour, a span outside the hours, a window held, another day with and without an opening, and a fixed band. (Unit test, new; fails on Main.)
- [x] The answers' tests whose exact ranges change are updated, each failing on Main.
- [x] An event's band is unchanged.
- [x] No native file changes; lint, format and types pass on the main server.

## Comments
