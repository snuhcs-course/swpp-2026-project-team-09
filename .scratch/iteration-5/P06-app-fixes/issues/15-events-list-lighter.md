# 15: 행사's list: no 다가오는 행사 heading, smaller type, time and place on their own lines, titles up to two lines, and no source line

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, in their notes on the 파티 and 행사 tabs: "행사 다가오는 행사 문구 삭제, 시간이랑 장소, 아이콘(눌렀을때 올라오는 팝업의 아이콘)을 두고 다른 줄로 나누기, 제목과 시간/장소 글씨 크기가 여전히 큼.."

On 2026-11-27 the user settled the screen on wireframes (`references/15-1-events-list-wireframe.webp`):
- Columns: the list now, one line of title, and titles up to two lines. **Two lines was chosen.**
- "행사제목은 Bold로 유지", "날짜 칸에 날짜도 Bold 유지", "행사 사이 위아래 여백 12".
- The 관련 행사 picker shares the styles ("9번 목록과 공용스타일을 맞출거야"), and only the styles: the picker's other changes wait for its own item.
- The row's source line goes, as on the sheet in ticket 14.
- The tab's title stays as it is (another item).

Positions are as of `origin/5.0/Main` 2934be94 (ticket 14's spec lines come before these), under `mobile/src/`.

- **The heading.** "다가오는 행사" is a header `Text` at the top of the list's scroll (`screens/events/events-screen.tsx:49-51`), in `eventText.heading` (16 Bold).
- **The row.** `EventRow` (`screens/events/event-row.tsx`) shows its parts in two columns:
  - the date column: the day in `eventText.day` (24 Bold, line height 30), the month and day word in `eventText.dayLine` (13 Medium), `DATE_WIDTH` 60;
  - the body:
    - the source, when known;
    - the title in `eventText.title` (20 Bold, line height 28, `TITLE_LINES = 1`);
    - "hours · place" as one `Text` in `eventText.line` (15 Medium, line height 22, `ROW_LINES = 2`, no icons);
    - the party line (`PartyLine`: `users` 18, `eventText.partyFind` 15 SemiBold, or `eventText.party` 15 Bold on a light blue pill when 파티 recruit, `chevronRight` 16, `LINE_HEIGHT` 40);
    - the 내 파티 mark.
  - `ROW_PADDING` is 22. The day is lowered or raised by the source line's height (`DAY_DROP`, `SOURCE_STEP`) to stand level with the title.
  - The source never shows in the build that asks the main server (see ticket 14: `serverClient` spreads `mockClient`'s announcers).
- **Shared styles.** The 관련 행사 picker in the 파티 form (`screens/party/form/event-field.tsx`) uses `eventText.dayLine`, `title`, `line` and `source` for its rows.
  - Its day spreads `eventText.day` but overrides the size with its own `DAY` (24 / 30, `:209`).
  - Its rows keep one line for the title and one for "time · place" (`numberOfLines={1}`).
- **PR #636 (ticket 14), open while this is written,** changes the same `eventText` (the sheet's `sheetTitle`, `value`, `description`) and makes `MineMark` private to `event-row.tsx`. The two touch different keys and lines.

## What to build

1. **No 다가오는 행사 heading.** The list starts with its first row. `eventText.heading` goes if nothing else uses it.
2. **The row's parts**, as the wireframe's third column:
   - Date column: the day 22 Bold (line height 28), the month and day word 12 Medium (line height 16), the column 56 wide. The day stands level with the title's first line.
   - Title: 16 Bold (line height 23), **up to two lines**, then "…".
   - Time on its own line: `clock` 14 and the hours, 13 Medium (line height 18), in the line's present colour.
   - Place on its own line, under the time: `pin` 14 and the place, 13 Medium, up to two lines. An event without a place has no place line.
   - Party line: 13 (SemiBold for 함께 갈 파티 찾기, Bold for 모집 중인 파티 n), `users` 15 and `chevronRight` 14. The recruiting pill stays, sized to the smaller words, and the touch area stays 48 high.
   - The row's top and bottom padding is 12.
   - The 내 파티 mark, ☆, the press on the row (the detail sheet) and on the party line (the recruiting sheet), and the focus tint stay as they are.
3. **No source line in the row**, and no lowering or raising of the day for it.
4. **Shared styles.** The new sizes go into the shared `eventText` styles (`day`, `dayLine`, `title`, `line`, `party`, `partyFind`), not into numbers in the row.
   - The picker's day drops its own size override (`DAY` in `event-field.tsx`), so that the picker takes the shared day, month line, title and line sizes.
   - Nothing else of the picker changes: its row padding, date column width, one-line title and line, source line, words and the 오늘 / 내일 day words.
5. **No words change**, apart from the heading that goes. The day words stay 오늘 / 내일 / weekday as now.
6. The tab's bar (title and 🔍) and the filters stay as they are.

## Must not break

- A push notice that opens the 행사 tab at an event: the list scrolls to the row and tints it (`use-focus.ts`, rows' `onLayout`).
- The filters, the search, and their empty states.
- The row's press (the detail sheet), the party line's press (the recruiting sheet), ☆ favorites, the 내 파티 mark.
- The 파티 form's 관련 행사 picker: choosing an event, its rows' layout with the new sizes.
- Tests: `events-tab`, `events-recruiting`, `event-favorites`, `events-party-form` (`.integration`), and those `git grep` finds for `EventRow`, `eventText`, `다가오는 행사` and `event-field`.

## Out of scope

- The tab's title size and the gap under it (another item).
- The picker's own changes (two-line titles, separate time and place lines, a sheet with 추가, its source line), for its own item.
- The detail sheet (ticket 14).

## Acceptance criteria

- [ ] The list has no 다가오는 행사 heading. (App integration test, which fails before the change.)
- [ ] A row shows a long title on up to two lines, the time and the place on their own lines with their icons, and no source line even for an event with an announcer. (App integration test, which fails before the change.)
- [ ] The shared styles have the agreed sizes (day 22 Bold, month line 12, title 16 Bold, line 13 Medium, party 13), and the row's padding is 12. (Test, which fails before the change.)
- [ ] The 관련 행사 picker's rows use the shared sizes, its day included, and keep their own layout otherwise. (Test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build.
- [ ] No native file changes; lint, format and types pass on the changed files.

## Comments
