# Fix: timetable grid to 22:00, with visible hour lines

Status: in progress (branch `2.0/fix-timetable-grid` from `2.0/Main`)

## What assumes the old range

The week grid is the 시간표 card on 내 정보 (`Profile` frame), not the `/me/timetable` list.

- `mobile/src/features/timetable/adapter.ts`: `FIRST_HOUR = 9`, `LAST_HOUR = 18`; `toWeekBlocks` clips every time to
  09–18, so a class at 19:00 is dropped and one ending at 18:30 is cut.
- `mobile/src/screens/me/week-card.tsx`: `GRID_HEIGHT = 216` for 09–18, `HOUR_HEIGHT` from it, labels only at
  9, 11, 13, 15, 17 (so the grid looks like it ends at 17), block `top`/`height` from `FIRST_HOUR`.
- Not affected: the class form's hour pickers already offer 00–23 (`class-fields.tsx`); overlap checks and the
  `/me/timetable` list work on clock strings, not on the grid range; OCR has its own grid.
- Tests: `__tests__/me-test.tsx` and `__tests__/me-versions-test.tsx` count `class-block`s and check colours by
  label; the mock classes are all inside 09–17, so the counts stay.

## New range and scrolling

- Default range 09:00–22:00 (`FIRST_HOUR = 9`, `LAST_HOUR = 22`). The range widens to whole hours when a class starts
  earlier or ends later (within 00–24), so no class is cut; blocks are no longer clipped.
- Hour height 36 (two 14-line rows fit in a one-hour block). The grid body scrolls inside the card in a window of
  8 hours (288); the day header stays above it. Nested scrolling is enabled for Android.
- It opens scrolled to the hour of the earliest class of the week (clamped to the end), or to 09:00 with no classes.

## Grid lines and type (tokens only)

- Hour lines: 1 px `color.border` (#E2E5EC), the design system's divider token.
- Half-hour lines: 1 px `color.surfaceSubtle` (#F5F6F9), fainter.
- Day columns: 1 px vertical `color.border` lines; the grid sits on `color.surface` inside a `color.border` outline
  with `radius.md`, replacing the grey rounded columns.
- Hour labels (9 … 21) in a narrow left column, top-aligned to each hour row: `text.caption` in `color.inkMuted`,
  tabular. Day headers 월–금: `text.caption`, today `font.bold` in `color.snuBlue` (unchanged).
- Blocks keep their class colours and `radius.sm`, fill the column with a 1-point inset, name and room in
  `text.micro` on `color.onPrimary`.

## Tests and screenshots

- Unit tests for the adapter: a 19:00–21:00 class is kept whole; a class ending 22:30 widens the range to 23;
  the default range is 9–22.
- `me-test`: a 19:00–21:00 class is drawn; the existing counts and colours still pass.
- Run typecheck, lint, the timetable/me Jest tests, then the whole mobile suite (`--maxWorkers=2`).
- Web render (Expo web + headless Chromium, 390×844) of 내 정보 with the mock classes plus a temporary
  19:00–21:00 class (not committed), before and after, plus the grid scrolled to the evening:
  `fix-timetable-grid-before.png`, `fix-timetable-grid-after.png`, `fix-timetable-grid-after-scrolled.png` in
  Downloads.
