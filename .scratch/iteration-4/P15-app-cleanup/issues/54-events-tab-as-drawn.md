# 54: The 행사 tab as drawn

Parent: [P15 spec](../spec.md), item 54; asked by the owner on 2026-11-18 ("행사 탭을 읽기 쉽게, 지금 와이어프레임대로"), after a phone photo of the tab: long titles and places run over several lines, and a card without the "같이 갈 파티" badge leaves an empty band above its title. The team canvas's boards in the row at y = 2892: `Events` (the target: "행사 · 새 디자인 (날짜 열 · 출처 · 제목 · 시간·장소 · 모집 중인 파티/함께 갈 파티 찾기 · 북마크) · 행을 누르면 자세히"), `EventsDetail` (the sheet a pressed row opens) and `EventsCode` (the tab as built in 4.0, the before).
Status: ready-for-human
Owner: AhnJinYoung
Blocked by: none. It builds on #348 (P06-07), merged, which gave the tab its empty state.

No native file is touched, and nothing on the main server: the change reaches phones with an OTA update.

## What is on screen now

The `EventsCode` board and `src/screens/events/`:

- The app bar "행사" with the search, and under it the design system's `Chip`s "전체", "오늘", "이번 주", "파티 모집 중" on the grey ground.
- One white card per event, 12 apart (`event-item.tsx`). Its top row holds "같이 갈 파티 {n}개" and "내 파티" badges at the left, and the source and the ☆ "즐겨찾기" at the right. When the event has neither badge, the top row still takes its height: the empty band of the owner's photo.
- The title (18 semibold), then the time ("오늘 18:00–20:00") and the place on two lines with icons. None is cut, so a long title or place runs over many lines.
- Two buttons: "자세히", which opens the event's page in the browser (left out without one), and "파티 찾기/모집", which opens the sheet of the 파티 for the event.
- Opened at one event (`/events?focus=<id>`), the card gets a navy border and a glow for 2.6 s.
- Empty: #348's "여기서는 학교 행사를 모아 볼 수 있어요" with "파티 찾기" without any event, and "검색 결과가 없어요" when a filter or a search leaves nothing.

## What changes

Against the `Events` board (the list) and the `EventsDetail` board (the sheet):

- **The ground.** Under the app bar the tab is white, and the events are rows divided by a line, not cards.
- **The filters.** The same four, in the same order, drawn as the board's text tabs: 40 high, 16 wide padding, radius 12, 16-point words; the chosen one bold in navy on a light blue, the others medium in muted ink with no fill.
- **"다가오는 행사"**, a bold 16-point heading in muted ink, between the filters and the list.
- **A row**, 22 above and below, a line under it:
  - **The date column**, 72 wide: the day of the month in 34 points ("18"), and under it "{M}월 · 오늘", "{M}월 · 내일" or "{M}월 · {요일}" in 13 points, on one line, level with the title whether a source is over it or not. Then a thin vertical line, 16 before the text.
  - **The day shown, the rule for a running event**: an event that has begun and not ended (its start at or before now, its end after now, in Korea's time) shows today in the date column; any other event shows its start's day. So under 오늘 an exhibition until 11월 30일 shows today, not its past first day, and a night across midnight (22:00–02:00) shows today after midnight. An event without an end is never running: it shows its start. The time·place line already says until when, "11월 30일까지" for an event over a period (the app's form for periods), and the sheet's "언제" says the same.
  - **The source** in 13-point muted ink, when the app knows it.
  - **The title**, bold 20 points. At most 2 lines, cut with "…".
  - **Time and place on one line of words**, "18:00–20:00 · 301동 대강당", in 15 points: the hours alone, since the date column says the day ("11월 30일까지" for an event over a period). At most 2 lines, cut with "…". The place is left out when the event has none.
  - **The party line**, 8 under it: "모집 중인 파티 {n}" in bold navy on light blue when a recruiting Quest the User can join is gathering for the event, else "함께 갈 파티 찾기" in ink with no fill; each with the people icon before and › after. A press opens 파티 찾기/모집, as the card's button did. It is drawn 40 high, as the board draws it, and its touch area reaches `size.touchMin` (48) by `hitSlop`; so do the filters'.
  - **"내 파티"** beside the party line, the design system's `Badge` in the friend tone without an icon, as the old card's badge was, when the User holds a Quest for the event with others or open to them, closed ones too (not one taken alone).
  - **The bookmark** at the top right of the row (44 square, 24-point mark): filled navy when the User keeps the event, an outline in muted ink when not. Its name is "관심 행사에 추가" or "관심 행사에서 빼기". A press does what ☆ did: `PUT` or `DELETE /global-events/:id/favorite`.
  - The badge "같이 갈 파티 {n}개" and the buttons "자세히" and "파티 찾기/모집" are gone from the row, and "내 파티" moves to the party line's row. The badges' place over the title, and its empty band, go with them. 자세히 is now two presses: the row, then 원문 보기.
  - **A press anywhere else on the row opens the detail sheet.**
- **Opened at one event**, the row is marked with a light blue ground for 2.6 s, in place of the navy border.
- **The detail sheet** (`EventsDetail`), a bottom sheet over the tab:
  - The source, "내 파티" as on the row, the title in bold 22 points (`text.titleLg`, whole, not cut), and the bookmark at the right.
  - A grey box with rows of an icon, a key and its value: "언제" with the full time ("오늘 18:00–20:00"), "어디" with the whole place.
  - The event's description.
  - "🌐 원문 보기" (outlined), which opens the event's page in the browser, and the navy "파티 찾기/모집", or "모집 중인 파티 {n} · 찾기/모집" when a recruiting Quest the User can join is gathering, counted as on the row. The latter closes the sheet and opens 파티 찾기/모집.
- **Empty after a filter**: "해당하는 행사가 없어요", as the board says it. After a search it stays "검색 결과가 없어요".

## What stays as it is

- The app bar "행사", the search and how it matches (title, place, description), and ✕ "검색 닫기".
- What each filter keeps. "파티 모집 중" keeps the events with a recruiting Quest the User can join, as before: those whose party line says "모집 중인 파티". The User's own 파티 is not one (a 비공개 one with a Friend recruits nobody).
- The count of 파티: "모집 중인 파티 {n}" counts what the map card's "같이 갈 파티 {n}개 모집 중" and the chat card's "같이 갈 파티 {n}개" count, `recruitingCounts` of `GET /quests/recruiting` (Open or Approval Quests the User does not hold), so the same event shows the same number on every screen. The sheet 파티 찾기/모집 lists the User's own Quest as well, as before.
- The rule for "내 파티" with no recruiting 파티: the row says "내 파티" and its party line still offers "함께 갈 파티 찾기", as the old card kept "파티 찾기/모집" on every event, its own 파티 or not.
- #348's empty state without any event.
- The sheet 파티 찾기/모집 and what its rows and "+ 파티 모집" do.
- The chat's event cards (`event-item.tsx`), which another board draws, and the map's card with its ☆: only the 행사 tab changes.
- Kept events: the app has no list of them on 내 정보 (the board's "관심 행사" screen is not built), and this ticket adds none.

## Does the API give what the boards show?

| On the board | From |
| --- | --- |
| Day, month, 오늘/내일/요일, hours | `startsAt`, `endsAt` of `GET /global-events` |
| Source ("컴퓨터공학부 공지") | the app's own list of announcers, as now; none for most events |
| Title, place, description | `GET /global-events` |
| 원문 보기 | `sourceUrl`; the button is left out without one, as 자세히 was |
| Count of 파티 | `GET /quests/recruiting`, as the map card and the chat card count it |
| "내 파티" (not on the board) | the User's own Quests of `GET /quests` |
| Kept or not | `favorite` of `GET /global-events` |
| **분류 tabs 진로 / 이벤트 / 축제** | **nothing**: a Global Event has no category |
| **"대상" (who may come)** | **nothing**: a Global Event has no audience |

The two missing parts are left out (see "Differences from the boards"). Giving them would need a column on `GlobalEvent`, its reading by the collectors' model, a migration and a main-server Release: a ticket of its own, if the owner wants it.

## Differences from the boards

- No 분류 tabs (진로 / 이벤트 / 축제) under the app bar, and no "대상" row in the sheet: the server has neither (above).
- The board's weight 800 is drawn in Pretendard Bold: the app loads Regular, Medium, SemiBold and Bold only.
- The board does not limit the title's or the time·place line's lines. They are cut at 2 lines each so that a long real title or place stays one short row, the owner's complaint; every example on the board fits in 2, and the sheet shows them whole.
- The sheet's description can be a whole collected post, so the sheet's top part scrolls with the buttons kept under it.
- The board draws no mark of the User's own 파티. One is kept, "내 파티" beside the party line and in the sheet, because the old card had it and the count no longer includes the User's own 파티: without it, a User whose only 파티 for an event is a 비공개 one would see nothing of it on the tab. It sits on the party line's row, so no band returns above the title.
- The board's light blues #E3EAFB (the chosen filter, "모집 중인 파티") and #F1F4FB (a row opened from elsewhere) are drawn in `color.blue100` (#DDE4F6) and `color.blue50` (#EEF2FB), a step of the design system's from each. Only #3A4060, the time·place line's and the description's ink, which lies between `ink` and `inkMuted`, stays a new token (`eventTone.words`). The sheet's title is `text.titleLg`, which equals the board's size.

## Acceptance criteria

- [x] Each event is a row whose date column shows the day of the month and "{M}월 · 오늘", "{M}월 · 내일" or "{M}월 · {요일}", then the source when known, the title, and "{hours} · {place}" on one line of words.
- [x] The title and the time·place line are each limited to 2 lines, cut with "…", tested with "제147회 규장각 콜로키엄 | 147th Kyujanggak Colloquium" and "서울대학교 규장각한국학연구원(103동) 1-44호 & Zoom 온라인 회의실(전날 이메일로 접속 안내 예정)".
- [x] No row has the badge "같이 갈 파티 {n}개" over its title, nor the buttons "자세히" or "파티 찾기/모집".
- [x] The party line says "모집 중인 파티 {n}" for an event with recruiting Quests the User can join, the same number as the map card and the chat card, and "함께 갈 파티 찾기" otherwise; its press opens 파티 찾기/모집 for that event. Tested: the User's own 비공개 파티 only → not counted, not under 파티 모집 중, "내 파티" shown; recruiting Quests of others → counted; both → the others counted and "내 파티" shown.
- [x] "내 파티" is shown beside the party line and in the sheet when the User holds a Quest for the event with others or open to them, and not for a Quest taken alone.
- [x] The date column shows today for an event that has begun and not ended, and its start's day otherwise, unit-tested at the edges: starting today, starting this minute, ended yesterday, ending this minute, a night across midnight before and after midnight, and a time when Korea's day differs from UTC's.
- [x] The day is level with the title with a source over it and without one.
- [x] The filters and the party line keep their drawn 40-point height and reach a 48-point touch area by `hitSlop`.
- [x] The bookmark, named "관심 행사에 추가" or "관심 행사에서 빼기", keeps or drops the event at once against the main server, and turns back with the toast when it refuses.
- [x] A press on a row opens the detail sheet: source, title, bookmark, "언제" and "어디", the description, "원문 보기" (opening `sourceUrl`, left out without one) and the party button, which opens 파티 찾기/모집.
- [x] The filters keep the same events as before this ticket (the first version of this branch let "파티 모집 중" also keep an event with only the User's own 파티; that is undone), and a filter that leaves nothing says "해당하는 행사가 없어요"; a search that finds nothing says "검색 결과가 없어요"; no event at all shows #348's empty state.
- [x] "다가오는 행사" heads the list.
- [x] `/events?focus=<id>` marks the row for 2.6 s.
- [x] The chat's event cards and the map's card are unchanged, their tests passing.
- [x] No native file and no main-server file changes.
- [x] Tests, by ADR 0007: the date words and the counts are unit-tested with the adapter (`events-adapter`, `event-date`); the tab, the row, the bookmark, the sheet and the filters are tested by the integration tests that render the app over the fake main server (`events-tab`, `event-favorites`, `events-recruiting`).

## Open questions for the owner

1. The 분류 tabs (진로 / 이벤트 / 축제) and "대상": should the server read a category and an audience for each event? That is a server change and a Release, its own ticket.
2. Line limits: 2 lines for the title and 2 for time·place. Fewer or more?
3. ~~An event over a period that began before today: the date column shows its first day.~~ Answered in review: it shows today while the event runs (the rule above). Say if the last day is wanted instead.
4. **The bookmark "관심 행사" or the star "즐겨찾기"?** The tab draws the board's bookmark named "관심 행사", while GLOSSARY.md defines a Favorite Event as starred (☆) and lists "Bookmark" under Avoid, 관심 elsewhere in the app is a watched interest that notifies, and the map card, the chat card and the failure toast say ☆ 즐겨찾기. The tab's toggle takes its icon and its names from one constant, `EVENTS_TAB_LOOK` in `favorite-toggle.tsx` (now `BOOKMARK`), so either answer is one small commit:
   - (가) **The star and "즐겨찾기" on this tab too**: set `EVENTS_TAB_LOOK = STAR` in `favorite-toggle.tsx`, and update this ticket's and `mobile/README.md`'s lines on the bookmark. Nothing else changes; the tests read the names from the constant.
   - (나) **The bookmark and "관심 행사" everywhere**: the map card's and the chat card's toggle (`FavoriteToggle`'s default look, `STAR`, so `BOOKMARK` becomes the default) and a grouped pin's ★ row, the toast "즐겨찾기를 바꾸지 못했어요" (`use-favorite.ts`), GLOSSARY.md's Favorite Event entry and its Avoid list ("Bookmark"), the README, and the tests that name 즐겨찾기 (`event-favorites`, `answer-frame-event-cards`).
5. The board's "관심 행사" screen (kept events, from 내 정보) is not in the app. Is it wanted?

## Comments

### Notes from the implementation (2026-11-18)

- Built: `event-row.tsx` (the row), `event-detail-sheet.tsx` (the `EventsDetail` sheet), the filters as the board's text tabs and "다가오는 행사" in `events-bar.tsx` and `events-screen.tsx`, a `bookmark` look for `favorite-toggle.tsx`, and in the design system the icons `bookmark` and `globe` and the tokens `eventTone` (the board's #3A4060, #E3EAFB and #F1F4FB, which no token named) and `eventText` (its text sizes).
- `event-item.tsx` stays as the chat's event card: its board is not this one. Its test in `answer-frame-event-cards` now checks the tab's row marked with the light blue ground, as the tab draws it.
- The party count is the recruiting Quests plus the User's own Quests for the event, as the sheet's rows are, so "파티 모집 중" now also keeps an event where only the User's own 파티 is. The board's filter does the same.
- The sheet's buttons are the app's `Button` (size lg), whose radius and outline are the design system's, a little off the board's 14 and #C9CEDA.
- Status is `ready-for-human`: the phone check and the before/after pictures are left to a person, since no emulator or browser could run here. Screens to look at are listed in the PR.
- The local Jest runs were slow under the machine's load. A test that passes alone took up to 3 minutes and timed out at the default 60 s when two files shared the workers. Each touched file was run alone with a longer timeout, and all passed.

### Notes from the review (2026-11-18)

fyoon46's review at `295175ac`, answered on the branch:

- The count is back to the recruiting Quests the User can join, as the map card and the chat card count them, and 파티 모집 중 follows it, as before this ticket. The earlier note above, that the count adds the User's own Quests and the filter keeps an event with only them, is replaced by this. The User's own 파티 is "내 파티" beside the party line and in the sheet, the old card's badge.
- The bookmark stays as drawn until the owner answers open question 4. `EVENTS_TAB_LOOK` holds the tab's icon and names in one place.
- The date column shows today for a running event (open question 3, answered in review).
- The day is level with the title with and without a source: lowered by 18 under a source's line, raised by that line and its gap without one.
- The filters and the party line keep their 40 drawn and reach 48 by `hitSlop`.
- `eventText.sheetTitle` is gone for `text.titleLg`; `eventTone.chosen` and `eventTone.marked` are gone for `color.blue100` and `color.blue50`; the new files name the board's off-grid measures as constants.
- `globe` stays under its name; #359 adds the same drawing as `web`, and whichever of the two PRs merges second renames to the first's.
- Merged `4.0/Main` (P15-52) in: `spec.md` kept both items, 52 then 54.

### Agent usage (2026-11-18)

Estimates. No transcript tooling was at hand, so these come from the session's own view of its work:

- Agent time: about 1 hour 25 minutes in one Opus 5.5 session (14:15–15:40 KST), most of it waiting on Jest under load. No subagents.
- Tokens: output about 45,000. Input about 9 million: about 8.5 million cache reads, 0.45 million cache writes, and a few thousand uncached.

### Agent usage (2026-11-18, review round)

Estimates, from the session's own view of its work (no transcript tooling at hand):

- Agent time: about 55 minutes in one Opus 5.5 session answering the review, a third of it waiting on Jest under the memory cap. No subagents.
- Tokens: output about 30,000. Input about 4 million: about 3.8 million cache reads, 0.2 million cache writes, and a few thousand uncached.
