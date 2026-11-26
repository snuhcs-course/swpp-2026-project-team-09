# 16: 관련 행사 고르기: one list without 진로 / 이벤트 / 축제, rows like 행사's, and an event chosen only from its sheet

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, in their notes on the 파티 tab's form: "관련행사 고르기 했을때 UI 말도 안되게 못생김, 오늘 내일 말고 요일로 통일, … 이런거 너무 별론데, 일단 눌렀을때 바로 추가되는게 아니라 행사탭처럼 아래서 위로 팝업 하나띄워주고, 추가 버튼을 따로 두고 추가했으면 좋겠음. (진로/이벤트/축제 이건 누가 나누는거지? 이런 섹션은 행사 탭에조차도 없는데)".

On 2026-11-27 the user settled it on wireframes (`references/16-1-event-picker-wireframe.webp`). Its columns are: now, the list, a press, and a press on the event already chosen.
- "탭 없애버리고 하나의 목록으로 그냥 두자".
- The rule that sorts events into 진로 / 이벤트 / 축제 goes with its code: "쓸모도 없어보이고, 파티는 어차피 사용자가 게시판을 정하고, 태그 달리는게 정확하지도 않은데 심지어 쓰는 곳도 거의 없잖아".
- The day words stay 오늘 / 내일 / weekday; the note's weekday-only idea was dropped.
- A press on the event already chosen shows "선택됨", not pressable.
- The rows' padding becomes 12, as the 행사 list's (also raised in PR 638's review).

Positions are as of `origin/5.0/Main` bbe4cad9, under `mobile/src/`.

- **The picker.** `EventPicker` (`screens/party/form/event-field.tsx:143`) shows:
  - the tabs 진로 / 이벤트 / 축제 (`SegmentedTabs`, `:148`, opening at the chosen event's kind or 진로);
  - the search (`:150`), which covers all events;
  - one tab's events (`Events`, `:68`, filtered by `eventKindOf` at `:77`).
  - A row (`PickerRow`, `:106`) shows the date column, the title on one line and "time · place" on one line (`numberOfLines={1}`). `ROW_PADDING` is 22 and `DATE_WIDTH` 72 (`:208-209`).
  - The text styles are the shared `eventText`, which ticket 15 made smaller.
  - A press picks the event at once (`onPick`, `:93-94`). The chosen row is light blue with a navy check.
- **The kinds.** `features/party/event-kinds.ts` guesses an event's kind from its title and description with regular expressions:
  - 축제 for 축제 / 페스티벌 / 대동제;
  - 진로 for 설명회, 채용, 취업, 커리어, 진로, 대학원, 인턴, 멘토링, 면접, 자소서, 직무, 연합전공, 전공;
  - 이벤트 for the rest.
  - It was a stopgap from PR 92 (2026-10-18), since a Global Event has no kind. It misfiles often: a 환경대학원 colloquium is 진로 by its place.
  - It is used only in the 파티 form:
    - the picker's tabs;
    - the chosen-event box's small line above the title (`sourceLine`, `:44`, "진로 · {source}"; the server build has no source);
    - `eventTagsOf` in `features/party/making.ts:128`, which adds 진로 / 축제 and words like AI or 채용 to a party's tags when an event is picked.
  - These tags are kept on the phone only. No screen, server or Assistant code reads the kind. The 파티 boards' 진로 is another thing, which the User picks.
- **The sheet.** `EventDetailSheet` (`screens/events/event-detail-sheet.tsx:129`, props `event`, `onClose`, `onParty?`) is the 행사 tab's and the room's detail sheet (tickets 13 and 14). Its foot is 원문 보기 when there is a source URL, and the party button when `onParty` is given. The shared `BottomSheet` grows with its content up to 90% of the screen.

## What to build

1. **One list.** No tabs. All events in the 행사 list's order (by date), with the search as now. The picker opens at the top. The 행사 search hint stays.
2. **Rows like the 행사 list's** (ticket 15):
   - the title on up to two lines;
   - the time on its own line with `clock` 14;
   - the place on its own line with `pin` 14, up to two lines, and no place line when there is none;
   - the row's top and bottom padding 12.
   - The date column keeps its width. The chosen row keeps its light blue and navy check. Its words and day words do not change.
3. **A press opens the event's detail sheet** (`EventDetailSheet`, the ticket-14 look) over the picker. Its foot:
   - **원문 보기**, when the event has a source URL, as everywhere;
   - **"이 행사 추가"** with `plus` in the key colour. Pressing it picks the event as a row's press does now, and returns to the form;
   - for the event already chosen, a disabled **"선택됨"** with `check` in grey instead, which takes no press.
   - There is no party button here. `EventDetailSheet` learns to take this foot button, and the 행사 tab and the room keep theirs.
4. **The kinds go.**
   - Delete `features/party/event-kinds.ts` and every use: the tabs, `sourceLine`'s kind, and `eventTagsOf` in `withEvent`.
   - The chosen-event box then shows no small line above the title. Its source part never had words in the server build.
   - Picking an event no longer adds tags. Tags the User adds are untouched, and so are the tags already kept on a phone.
5. No other change to the form: its 관련 행사 field, ✕ 행사 빼기, the locked state when editing, the title filled from the event.

## Must not break

- Picking an event: the form gets its title (when empty), its start and the event. Taking it away (✕) and choosing another works as before. An edit's locked event stays locked.
- The 행사 tab's and the room's sheets (party button, none in the room), ☆ favorites, 원문 보기.
- The search across all events and its empty words.
- Tests:
  - `party-form-parts`: its tab and chosen-box checks change to the one list and no kind line;
  - `events-party-form` and `party-form-edit`: their checks of event tags change to "no tags added";
  - `events-tab`, `event-detail-sheet`, `room-event`, `party-form` (`.integration`);
  - those `git grep` finds for `event-kinds`, `EventPicker`, `EventDetailSheet` and `eventTagsOf`.

## Out of scope

- The rest of the 파티 form (photo, field order, required marks, boards; another item).
- What a party's tags are used for elsewhere (찾기's order, search, 추천 이유), and the stand-in tags; the user left those for later.
- The 행사 detail sheet's look (ticket 14) and the 행사 list (ticket 15).

## Acceptance criteria

- [x] The picker has no tabs and lists every event by date; the search still finds across them. (App integration test, which fails before the change.)
- [x] A row shows a long title on up to two lines and the time and the place on their own lines with icons. (App integration test, which fails before the change.)
- [x] A press on a row opens the event's sheet instead of picking it; "이 행사 추가" picks it and returns to the form. (App integration test, which fails before the change.)
- [x] For the event already chosen, the sheet shows a disabled "선택됨" and no 이 행사 추가. (App integration test, which fails before the change.)
- [x] Picking an event adds no tags, and the chosen-event box shows no kind line; `event-kinds.ts` is gone. (App integration test, which fails before the change.)
- [x] The 행사 tab's sheet keeps its party button, and the room's sheet has none. (App integration test.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- The rows drop the announcer's line above the title, as the 행사 list's row and the wireframe draw them. The server build has no announcer anyway.
- `EventDetailSheet` takes one `action` in place of `onParty`: `party`, which the 행사 tab passes, or `add` with `chosen`, which the picker passes. The room passes none.
- The picker's rows reuse the 행사 row's time and place line (`EventFact`) and its two-line limits, now exported from `event-row.tsx`. The day drops its offset (`DAY_DROP`), since no source line sits above the title now.
- The check sits level with the title's first line (12 + (23 − 24) / 2 from the top).
- The user's phone check of 2026-11-27 changed two things after the first build:
  - The date column is 56 wide, as the 행사 list's (was 72), so the divider sits as close to the date as on the 행사 tab. This overrides "The date column keeps its width" above.
  - Only the chosen row keeps 32 on the right for its check. Unchosen rows had the same reserve, as the 행사 row keeps for its ☆, but the picker has no ☆, so their words now take the full width.
- `FormEvent` keeps its `source`, which nothing shows now. Dropping it would change the form's state code, which this ticket leaves alone.
- Tests:
  - `events-party-form`: two new tests for the sheet (it opens over the picker without choosing; 선택됨 for the chosen event). Its picking tests go through 이 행사 추가 (`pickEvent` in `support/events.ts`), and the tag check is now "no tags added".
  - `party-form-parts`: the tabs test becomes the one-list test, and the festival test checks no tags and no kind line.
  - The row test moved here from `events-party-form`, which reached lint's 300-line limit.
  - `party-form-edit`: picks through the sheet, and checks that no tags are kept.
  - After the phone check, `party-form-parts`' row test also checks the 56 date column, and a new test checks that only the chosen row keeps the right reserve. Both failed before the change.

## Comments

### Agent usage (2026-11-27)

Estimates. Agent time is the session's wall clock, from start to the pull request and from the phone-check request to the push. About 18 minutes of it were Jest runs. No subagents. The orchestrator's time writing the ticket and building onto the phone is not included. The follow-up's tokens are counted up to the writing of this entry, so its commit and push are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 16 (tests first, the one list, the sheet's foot, the kinds removed, checks, the pull request) | about 35 minutes | 10,307,237 | 10,136,513 | 170,604 | 120 | 50,315 |
| Ticket 16, the phone-check change (the 56 date column, the right reserve only on the chosen row) | about 10 minutes | 1,406,093 | 1,397,440 | 8,639 | 14 | 5,645 |
| Total | about 45 minutes | 11,713,330 | 11,533,953 | 179,243 | 134 | 55,960 |

Without cache reads, the input is 179,377.
