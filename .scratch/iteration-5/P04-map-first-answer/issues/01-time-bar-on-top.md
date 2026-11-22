# 01: The time bar under the pill

Parent: [P04 spec](../spec.md)
Status: done
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

- [x] A meal Plan for tomorrow shows the bar under the pill with "내일(수)" and the span's times, and the bottom card holds no band. (Integration test.)
- [x] Folded, the bar is one row; a tap unfolds one row per person with their names; a tap again folds it. (Integration test.)
- [x] A drag of the bar's end handle and its let-go ask for the same recalculation as before. (Integration test, moved from the card's band.)
- [x] An answer without a band shows no bar. (Integration test.)
- [x] The day words for today, tomorrow, the day after, and a later day. (Unit test.)
- [x] The camera's top padding includes the bar. (Unit test of the padding.)
- [x] The bar on a phone, folded and unfolded, with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### What was built (2026-11-21)

- The bar is `answer/time-bar.tsx`: the Plan's band with the same corrections as the card had, or a Lookup's without handles. Which band it shows comes from the same decision that picks the reply's card (`answer/reply-words.tsx`), so the bar and the card never disagree.
- The handle the "until" chip emphasises is held by the frame (`useBandFocus`), since the chips and the bar each hold their corrections.
- Folded, the lanes lie on one row (each lane keeps its own view, so the red parts while moving whole are still each person's). The ends name the busy stretch that ends last before the span and the one that starts first after it, with the person's name unless it is the User's own lane; without one, now or the range's end.
- The bar's height is told to the screen's room (`timeBarHeight`), and the camera's padding and the labels' area count it under the pill. The raised card stops under the bar.
- The day words (`koreaDayWord`) count Korea's calendar days from the band's `now`: nothing today, 내일, 모레, 어제 with the weekday, else "11/23(월)".

### Emulator check (2026-11-21)

The debug app on the shared Android emulator, with Metro from this branch in mock mode and the mock sign-in. A Friend's card, 만나고 싶다: the bar stood under the pill, folded to one row with "민수 12:15 302동 수업 끝" and "13:00 24동 수업" at its ends and the grip under it; a press on the grip unfolded the rows 나 and 민수 with 12:00 and 18:30 at the range's ends, and a press again folded it. The card below kept its chips, lines, and buttons, without a band. Korean cannot be typed through adb, so a meal asked in words was not tried on the phone; the integration tests cover it.

### Agent usage (2026-11-21)

- Agent time: about 50 minutes in one session, after the spec and tickets (an estimate from the transcript's timestamps). It covers the bar, its tests, the lint splits, and the emulator check.
- Tokens: output 69k; input 38.8M, of which 38.7M cache reads, 145k cache writes, and 244 uncached. No subagents.
