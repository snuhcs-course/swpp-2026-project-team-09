# 07: The 행사 tab's rows and the timetable grid

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately).

Native files: none. Releases: an app OTA update only.

## What happens now

- 행사 row (`screens/events/event-row.tsx`, sizes in `design-system/tokens.ts`):
  - The date column is 72 wide with a 34pt bold day, a 13pt month/weekday line, then a 1px rule.
  - The title is 20pt bold, `numberOfLines={ROW_LINES}` (2), and so is the time·place line.
  - The ☆ 즐겨찾기 star (`favorite-toggle.tsx`) is navy when on.
- 내 정보 timetable (`screens/me/week-grid.tsx`, range from `features/timetable/adapter.ts`):
  - The range is 09–22, widened to fit any class, at 36pt per hour.
  - 8 hours show, and the rest scrolls inside the card with fades at the edges.
  - Hour labels are bare numbers ("9"). Solid lines mark the hour and fainter lines the half hour.
  - Days run 월–금, extended to 토/일 when needed, with today in bold navy.
  - Blocks have radius 6, are coloured from `classColors`, and carry a white 11pt name and room.

## What to build

Follow the changelog's § 2 and § 3 (`references/changelog-11-24.md`) and the canvas boards Events and Profile (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>):

- 행사 row:
  - The day number goes from 34 to 24, and the date column from 72 to 60.
  - The title is one line, cut with "…".
  - The star stays navy. The tab's filter is already word tabs.
- Timetable:
  - The default range is 09–21, still widened to fit any class.
  - The whole range shows without scrolling inside the card. The grid is about 416 high for 09–21, and the hour height follows from it. The fades go.
  - Hour labels are two digits ("09" … "21").
  - The grid has an outer border, lines between days and a light grey day header.
  - Each hour has a solid line and each half hour a light dotted line.
  - The gaps and the grey rounded ground go. Blocks are square-cornered and fill their column.
  - Today stays marked.

## Must not break

- Pressing a 행사 row still opens its detail, and the star still toggles.
- The timetable still shows every class, including on 토/일 and outside 09–21.
- Tests: `events-tab`, `events-recruiting`, `me-week-card` (`.integration`), `features/events-adapter.unit`, and the timetable adapter's tests.

## Acceptance criteria

- [ ] A 행사 title is one line. (`events-tab`, which fails before the change.)
- [ ] The timetable labels "09" to "21" and does not scroll inside its card; a class at 21:30 still shows. (`me-week-card`, which fails before the change.)
- [ ] "Before" and "after" emulator screens of the 행사 tab with a long title and of 내 정보's timetable go in the pull request.
- [ ] No native file changes; lint, format and types pass on the app.

## Comments
