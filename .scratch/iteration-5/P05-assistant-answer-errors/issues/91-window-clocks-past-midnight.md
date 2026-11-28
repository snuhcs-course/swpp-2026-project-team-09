# 91: A window's clock may run past midnight

Parent: P01 ticket 49 (a band past midnight moves), which needs it first.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server, before the app of P01 ticket 49.

## What was wrong

- On the phone, Saturday 23:50, "지금 공부할 곳" gave a band wholly after midnight, "내일(일) 00:04–03:04", and neither handle nor the band moved.
- The app lets no time go past 23:55 of the band's day (P01 ticket 48). It does this because a drop sends only "HH:MM", and the main server reads every window clock on the input's date (`onDay(date, clock)`). So 00:30 after midnight would be that morning's, and the recalculation would find no time.
- The window schema took "00:00" to "24:00" only, and refused a start after its end. A window of 23:30 to 00:30 could not be sent at all.

## What changes

- A window's `from` and `until`, as the app sends them, may be up to `47:59` (`windowClock`). An hour past 23 is the next day's, counted from the input's `date`: "24:30" is 00:30 of the next day. "23:30" to "24:30" is a window across midnight, and `from` before `until` still holds as written.
- `onDay` adds the day for an hour past 23. Every reading of a window clock goes through it, so every kind reads the time rightly at once.
- Every place that says a window clock shows it on its own day (`shownClock`): the condition chips of meals, meets, study plans and group study rooms; a study plan's line "00:30까지 52분"; a meal's eased "이후" chip; and the model's `[Plan on screen]`.
- The model's tools keep `clockTime` (up to "24:00"). The model never reads or writes an hour past 23, and a clock it writes keeps today's meaning.
- An app before P01 ticket 49 sends no hour past 23, so it keeps working.

## Acceptance criteria

- [x] "24:30" and "47:59" are read on the next day; "48:00" is refused; the model's clock still refuses "24:30". (`clocks-past-midnight`, new; fails on Main.)
- [x] A study plan asked at 23:30 to end at "24:30" ends at 00:30 of the next day, says "00:30까지", and nothing it says or draws holds an hour past 24:00. Set out from "24:30", it sets out at 00:30 of the next day. (New; fails on Main.)
- [x] The model's context reads "until":"00:30". (New; fails on Main.)
- [x] `POST /assistant/answers` answers a study input across midnight and one wholly after it with the next day's times and "00:30까지" / "00:30부터", and refuses "48:00" with 400. (`study-plan-answers`; the first two fail on Main.)
- [x] Lint, format and types pass for `main-server`; the unit tests and the affected integration files pass.
