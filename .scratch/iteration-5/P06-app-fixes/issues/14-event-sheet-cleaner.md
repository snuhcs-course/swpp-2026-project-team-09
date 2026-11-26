# 14: 행사's detail sheet: no 내 파티 or source line, no 언제 / 어디 words, smaller type, and the description spaced by its own lines

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, in their notes on the 파티 and 행사 tabs: "행사/특정행사 누름 올라오는 팝업에서도 제목을 좀더 작게, 언제/어디 글씨는 삭제(아이콘으로 인지 가능), 위에 '내 파티' 이거 뭐임? 삭제."

On 2026-11-27 the user decided the details:
- On the sheet's top slot: "팝업의 내 파티 표시는 빼는 걸로 가자, 다른 항목도 들어올 수 있는건데 조건이 안맞아서 못들어온거라면, 그것도 그냥 빼줘".
- On the sizes: "제목 21로 하고, 시간/장소 값이랑 본문은 14로".
- On the description: of three display-only ideas, only the spacing by the text's own lines. The other two were a hanging indent for bullet lines and bold "label:" prefixes; the user expected too many exceptions.

The agreed screens are `references/14-1-event-sheet-wireframe.webp` (the sheet now and as agreed) and `references/14-2-description-spacing.webp` (two real descriptions, as they are and spaced).

Positions are as of `origin/5.0/Main` 03120c8c, under `mobile/src/`.

- **The sheet's head.** `EventDetailSheet` (`screens/events/event-detail-sheet.tsx:130`, `Details` at `:47`) stacks three things in one column: the source (`:52`, `eventText.source`, 13), the 내 파티 mark (`:53`, `MineMark`) and the title (`:54`, `text.titleLg`, 22 Bold, line height 30).
  - `MineMark` (`screens/events/event-row.tsx:50`) is the list row's: a `Badge` in a box with `alignSelf: 'center'`. In the row's line that centres it vertically, but in the sheet's column it centres it across. So it floats in the middle above a title set at the left. The design's sheet (`EventsDetail`, P15-54) has no such mark.
  - The source never shows in the build that asks the main server. `serverClient` (`api/server/client.ts:69-70`) spreads `mockClient`, whose announcers (`listGlobalEventAnnouncers`) belong to the mock's events, never to a real one.
- **The facts.** `Fact` (`:33`) shows an icon (18), the words 언제 / 어디 (`eventText.key`, 14 Medium) and the value (`eventText.value`, 15 SemiBold, line height 22).
- **The description.** It is shown as one `Text` (`:64-66`, `eventText.description`, 15 Regular, line height 23), so a line break of the text is only a new line.
  - The text comes from the school's pages as scraped (`worker-server/src/event/event-page.parser.ts`, `extra-snu-page.parser.ts`): one line per line of the page, joined with `\n`, blank lines kept. The main server and the app store and show it as it is.
- **Who shows the sheet.** The 행사 tab, and the room since ticket 13 (without the party button).

## What to build

All in `EventDetailSheet`; the 행사 list's rows do not change.

1. **No 내 파티 mark and no source line in the sheet.** The title is the sheet's first line, beside ☆. The row keeps its mark (and its source line, though the server build has none).
2. **Title:** 21 Bold, line height 29. Add it as a text style in the tokens (for example `eventText.sheetTitle`), not as a number in the screen.
3. **Facts:** the icon (18, as now) and the value, without the words 언제 / 어디. The value is 14 SemiBold, line height 21. A screen reader still hears what each row is ("언제, 내일 10:00–12:00", "어디, …").
4. **Description:** 14 Regular, line height 22, in its present colour. Laid out by the text's own lines:
   - Each line of the text is its own block. Consecutive lines are 7 apart, on top of the line height.
   - One or more blank lines between two lines make a single gap of 14 instead.
   - Blank lines at the start or the end are dropped.
   - A long line wraps at the line height, with no extra space.
   - The words are not changed: no trimming inside a line, no joining, no reordering.
5. Nothing else changes: the buttons (원문 보기, the party button where there is one), ☆, the sheet's scrolling and closing, and the room's sheet without its party button.

## Must not break

- The 행사 tab's sheet: ☆ favorites, 원문 보기, the party button and the recruiting sheet it opens.
- The room's sheet from ticket 13: opens over the room, no party button.
- The 행사 list rows and their 내 파티 mark.
- Search over the description in the 행사 tab (`features/events/adapter.ts`), which reads the text, not its layout.
- Tests: `events-tab`, `event-favorites`, `room-event` (`.integration`), and those `git grep` finds for `EventDetailSheet`, `MineMark`, `언제`, `어디` and `eventText`.

## Out of scope

- The description's content: masking e-mail addresses, dropping lines that repeat the time and place, or an AI summary. The user judged these not worth it now.
- Bullet lines' hanging indent and bold "label:" prefixes.
- The 행사 list's rows (another item), and the sheet's opening and closing motion.

## Acceptance criteria

- [x] The sheet shows neither the 내 파티 mark nor the source line, even for an event of the User's 파티 with an announcer; the list row still shows its 내 파티 mark. (App integration test, which fails before the change.)
- [x] The facts show their icons and values without the words 언제 / 어디, and a screen reader still gets 언제 / 어디 with each value. (App integration test, which fails before the change.)
- [x] The title is 21 Bold, the values 14 SemiBold and the description 14 Regular. (Test, which fails before the change.)
- [x] A description with lines and blank lines shows one block per line, 7 apart, with each run of blank lines as one gap of 14, and its words unchanged. (Unit or integration test, which fails before the change.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- The title's letter spacing is -0.315, 1.5% of its size, as `text.titleLg`'s and the row title's. The ticket gave only the size and the line height.
- The 18 icon is centred on the value's first line: it drops 1.5 instead of 2, now that the line is 21 high.
- Each fact is one element for a screen reader, labelled "언제, …" or "어디, …". The value is still its own text.
- A line of white space alone counts as blank, since it has no words. `\r\n` counts as one line break. A line keeps its own spaces, at its ends too.
- A description of blank lines alone shows no description, as an empty one showed none before.
- `eventText.key` is gone with the words 언제 / 어디, its only use. `MineMark` is no longer exported, since the sheet was its only user outside the row.
- The ticket's sheet tests are in a new `event-detail-sheet.integration.test.tsx`. In `events-tab` they would have gone over the 300-line lint limit. `events-tab` now checks what a screen reader gets for 언제 / 어디 instead of the words, and no longer checks the sheet's 내 파티.

## Comments

### Agent usage (2026-11-27)

Estimates. Agent time is the session's wall clock from start to the pull request. About 8 minutes of it were Jest runs, partly in the background. No subagents. Tokens are counted up to the writing of this entry, so the commit and the pull request are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 14 (tests first, `descriptionLines`, the sheet's head, facts and type, checks) | about 15 minutes | 8,572,759 | 8,430,719 | 141,920 | 120 | 42,998 |

Without cache reads, the input is 142,040.
