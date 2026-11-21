# 01: The time bar under the pill

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What to build

The time band leaves the bottom card and becomes one white row under the question pill, as boards 1 and 4 draw it. Folded, the row shows the Plan's span over the time everyone shares, with the nearest busy edge named on each side ("13:45 수업 끝", "15:30 수업") and the span's start and end with the day word above it ("내일(수) 14:00–15:00"). A tap on the row unfolds one row per person ("나", "민수", "지은"), and a tap again folds it. The bar shows only in an answer that has a band: a Plan or a Lookup with a time. Everything else in the card stays as it is in this ticket.

## What happens now

- `PlanCard` and `LookupCard` each draw a `TimeBand` inside the bottom card, with every person's lane always open.
- The band's words say the time without a date.
- The camera fits the answer between the pill and the card (`paddingOf` in `use-answer-map.ts`).

## What changes

- A bar under the pill draws the same band, the same handles, and the same moves, folded by default. Folded, every lane's busy stretches are merged on one track; unfolded, the lanes are drawn as today.
- The day words: today none, tomorrow "내일(수)", the day after "모레(목)", the day before "어제(월)", further "11/23(월)". One helper makes them from the band's `now` and the span's start; flags and step rows use it in later tickets.
- The camera's fit counts the bar's height under the pill.
- While the keyboard is up, the bar hides, as the card's content does today.
- While the card is raised, the bar stays where it is and the raised card stops under it.

## Must not break

- A drag of a handle asks for a recalculation on let-go; moving the band whole; the ghost and 되돌리기; the red busy parts while moving; the "until" chip's focus on a handle; the screen reader's five-minute steps (`answer-band-move`).
- A Lookup's band (`answer-lookup`), the raised card (`answer-raise`), and the camera kept between answers (`answer-camera-kept`).
- An answer with no band (a place, a refusal, words) shows no bar.

## Acceptance criteria

- [ ] A meal Plan for tomorrow shows the bar under the pill with "내일(수)" and the span's times, and the bottom card holds no band. (Integration test.)
- [ ] Folded, the bar is one row; a tap unfolds one row per person with their names; a tap again folds it. (Integration test.)
- [ ] A drag of the bar's end handle and its let-go ask for the same recalculation as before. (Integration test, moved from the card's band.)
- [ ] An answer without a band shows no bar. (Integration test.)
- [ ] The day words for today, tomorrow, the day after, and a later day. (Unit test.)
- [ ] The camera's top padding includes the bar. (Unit test of the padding.)
- [ ] The bar on a phone, folded and unfolded, with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
