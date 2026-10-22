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

## Review (함재현, PR #115)

Approved, with these added (separate commits, tests first):

1. Weekend columns: `DAY_LETTERS` becomes 월–일 and `toWeekBlocks` keeps Saturday and Sunday times. The grid shows
   토 (and 일) only when a class falls on it (토 with 일 when only Sunday has one, so the week stays in order), the same
   idea as widening the hours.
2. Nested scrolling: the grid scrolls inside 내 정보, which scrolls too. `nestedScrollEnabled` stays for Android;
   the grid does not bounce or over-scroll (`bounces={false}`, `overScrollMode="never"`), so a swipe at its top or
   bottom does not stretch it. iOS has no scroll chaining between nested scroll views in React Native, so handing a
   swipe over to the page at the edge needs a check on a phone.
3. "More hours" cue: a fade from `color.surface` to transparent (an SVG gradient, 24 high) over the grid's bottom
   while hours are hidden below, and over its top once scrolled down.
4. Opening position: when today has a class that has not ended, open at the current hour, or at that class's start
   when it is already running; otherwise at the week's earliest class; otherwise at 09:00.
5. Tests: a class starting at 08:00 widens the start to 08; a Saturday class shows in a 토 column; the opening rules.

### Second review (independent, PR #115)

1. Re-open on a version switch: the hours opened from `onContentSizeChange`, which does not fire when another
   version has the same range. They now open on the first layout and in an effect on the opening and on the
   classes' signature (their days and hours), so another version opens again after the User scrolled, and a
   refetch of the same classes does not move them. Programmatic scrolls only update the fades.
2. Re-render per scroll frame: only `hiddenAbove` and `hiddenBelow` are kept in state, and the days and hours
   are memoised.
3. The opening reads the time once per opening (memoised with the classes), not on every render.
4. A block's line is `text.micro.lineHeight`; insets and offsets are named; the label column and the fade are
   `space[6]`; the styles' comment names `surfaceSubtle` as a surface token.
5. A block under 45 minutes drops its vertical padding, so a 30-minute class shows a line.
6. A time across midnight (23:00–01:00) stays left out: the main server keeps only `HH:MM` from 00:00 to 23:59
   with the end after the start, so it cannot come. Tested, with a 24:00 and a 23:59 end ending the week at 24.
7. The fades' gradient ids come from `useId`.
8. The hour labels read as "9시" to a screen reader.

Tests added: the version-switch re-open (a spy on `ScrollView.prototype.scrollTo`), a Sunday class showing 토 and
일, a 24:00 end, a time across midnight.

## Comments

### Agent usage (2026-10-22)

- Agent time: about 4 hours in all, an estimate, most of it waiting on three full runs of the mobile suite (about
  30 minutes each) and Metro bundling for the web screenshots.
- Tokens: not measured exactly; roughly 0.3M input (most of it cache reads, cache writes a small share) and about
  60k output, in one agent session without subagents.
