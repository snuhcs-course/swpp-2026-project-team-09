# A04: The app's UI and usability polish

Status: ready-for-agent

## Problem Statement

The app's screens have grown one ticket at a time, and they no longer read as one design. On 2026-11-24 the user reworked the design canvas (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>, a copy dated 11.24) and listed what changed in `references/changelog-11-24.md` (in Korean, kept as received). The main complaints it answers:

- **The Assistant's map-first answer** covers the map with solid white panels, chips and cards, so the answer hides the very map it is drawn on.
- **The 파티 tab** packs too much into each card. A 내 파티 card carries a kind pill, a status badge, an event badge, faces and a "다음 일정" box. A recruit card carries a "파티" badge, a body preview and "자세히 ›". Someone else's activation takes a whole navy band. The 파티 form's fields are hard to scan without icons, and its 관련 행사 picker looks unlike the 행사 tab.
- **The filter chips** (bordered pills with a ✓) look heavier than the plain word tabs the 행사 tab already uses.
- **The map's marks** are loud: solid-coloured dots and heavy pins, quest rows told apart by blue and orange, a pink "학" pin for restaurants, and a "가까이 보기" button on every far-away card.
- **The 행사 tab's** date column is large and long event titles wrap to two lines.
- **The 내 정보 timetable** scrolls inside its card and does not read as a timetable grid.

The canvas does not match the app one to one. It holds screens the app no longer has (Legacy*, the P15 "before" screens), shows features differently, and draws some things the app never built. So the changelog sets the scope, and the canvas only shows how each item should look.

Every item was checked against `origin/5.0/Main` b2e5323b on 2026-11-25.

## Solution

Seven tickets. They are split so that no two of them change the same source file. 01, 04, 05 and 07 start at once; 02, 03 and the glass parts of 06 wait for 01.

1. [**The glass layer.**](issues/01-glass-layer.md) A shared "glass layer" in the design system draws a translucent surface at one of a few fixed levels. The design system's documentation gets a "glass layer" section, so later Assistant screens are built the same way.
2. [**The Assistant's map-first answer on glass.**](issues/02-assistant-answer-on-glass.md) The time bar, the bottom card and bar, the caption, the numbered candidate flags and their labels, the walk-minute chips and the food-kind chips move onto the glass layer.
3. [**Blur behind the glass.**](issues/03-blur-behind-glass.md) Check on an Android emulator whether a real blur works over the Kakao map. If it does, add it inside the glass layer and make it a native Release. If it does not, Android keeps the translucent glass.
4. [**The 파티 tab.**](issues/04-party-tab.md) Thin 내 파티 cards with a quieter activation mark, simpler recruit cards with two ways to the Boards, icons on the 파티 form's fields, and a 관련 행사 picker shaped like the 행사 tab.
5. [**Filter rows as word tabs.**](issues/05-filter-rows-as-word-tabs.md) The shared filter row draws plain word tabs instead of bordered pills. This changes the 내 파티 filter, the friend panel's filter and the Quest screen's filter at once.
6. [**The map.**](issues/06-map.md) One navy for quest rows, told apart by icon. Glass icon tags for the map's 행사, 파티 and 퀘스트 marks. New restaurant and study-space pins and layer colours. A glass friend panel. No "가까이 보기".
7. [**The 행사 tab and the timetable.**](issues/07-events-and-timetable.md) A smaller date column and one-line titles on the 행사 tab, and a ruled 09–21 timetable grid on 내 정보.

How the work runs:

- The "before" screens are captured once on the Android emulator with the mock build, into `references/`, before the tickets start.
- Each ticket is built straight from the changelog and the canvas. When a call can only be made by looking at a screen, the ticket shows the user a mock-up and asks before going on.
- Each pull request carries "after" screenshots from the emulator. The user decides from them, before merging, whether anything changes.
- When all are merged, one comparison page shows every area as "now | after", with a line on what changed.

## User Stories

The glass layer and the Assistant

1. As a User reading the Assistant's answer, I want its bars, cards and chips to let the map show through, so that I still see where things are while I read.
2. As a User, I want the text on glass to stay as readable as it is today, so that the see-through look costs me nothing.
3. As a User, I want the navy main buttons ("여기로", "일정에 넣기", "완료") to stay solid, so that the action to take still stands out.
4. As a User, I want the Assistant's full-screen white pages, such as the chat's first screen, to stay solid white, since there is no map behind them.
5. As a User, I want the numbered candidates on the map smaller and see-through, so that they cover less of the campus.
6. As a User, I want the chosen candidate to keep its gold number and label, so that I always see which place is chosen.
7. As a User, I want the food-kind choice (전체 / 한식 / 양식 …) as word tabs, like the other filters.
8. As a developer building a later Assistant screen, I want one glass layer with named levels, so that a new panel matches the others without copying numbers.
9. As a developer, I want the glass rules written down beside the design system, so that I know which level a panel, an inner chip or a map chip takes.

Blur

10. As a User on a phone that can blur, I want the glass to blur the map behind it, so that text on it never runs into the map's lines.
11. As a User on a phone where the blur does not work over the map, I want the glass still to look right, translucent, and never blank or black.

The 파티 tab: 내 파티

12. As a User, I want each 내 파티 card one line high, with its title, its member count, and "when · where" below, so that I see more of my 파티 at a glance.
13. As a User, I want "장소 미정" where a 파티 has no place yet.
14. As a Leader of a recruiting 파티, I want its count to read "3/8명", so that I see how far recruiting has come.
15. As a Leader, I want the red circle that counts waiting join requests to stay on the card, so that I know when someone is waiting for my answer.
16. As a User, I want 공개 and 비공개 told apart by a small grey icon with "공개" or "비공개" under it, not by the card's colour.
17. As a User who activated a 파티, I want it to keep its navy border and stay at the top under "활성화 중".
18. As a User whose Friend activated a 파티 I am in, I want a single line "활성화 중 · 김민준" with a red blinking light, instead of a navy band.
19. As a User who declined that activation, I want the line to read "활성화 중 · 참여 안 함", with a way still to join.
20. As a User, I want 거절 as small grey text and 참여 as a white outlined button, so that the two weigh what they mean.
21. As a User who turned on the phone's reduce-motion setting, I want the red light to stay still.
22. As a User, I want the 전체 / 비공개 / 공개 filter as word tabs.

The 파티 tab: 찾기

23. As a User, I want a "전체 게시판 ›" button beside "모집 중인 파티", so that I can reach every Board from the top.
24. As a User, I want a card under the recommended posts that reads "식사 · 진로 · 취미 · 공연 모집글 N개 둘러보기", so that I find the Boards when I reach the end of the list.
25. As a User, I want recruit cards without the "파티" badge, the body preview and "자세히 ›", so that each card is short.
26. As a User, I want a recruit card's count ("3/8명") at the end of its faces line.
27. As a User, I want a recruit card's time and place on one line, cut with "…" when the place is long.
28. As a User, I want a recruit card's photo smaller and beside the title and time, so that the card stays low.
29. As a User, I want a recruit card linked to a 행사 to keep the 행사 badge, as the only badge on top.

The 파티 tab: 파티 만들기

30. As a User making a 파티, I want a navy icon beside each field's name, so that I find a field at a glance.
31. As a User picking a 관련 행사, I want the picker titled "관련 행사 고르기", with a grey rounded search field and rows shaped like the 행사 tab's, so that the same 행사 looks the same everywhere.
32. As a User, I want the picked 행사's row shown in light blue with a navy check.

Filters

33. As a User, I want every filter row (내 파티, the friend panel, the Quest screen) as plain words, the chosen one on light blue in bold navy, so that filters look as light as the 행사 tab's.
34. As a User relying on a screen reader, I want the chosen filter still announced as selected once its ✓ is gone.
35. As a User picking interests, tags or friends, I want those picking chips to keep their look, since they choose things and do not filter a list.

The map

36. As a User, I want quest rows in one navy, a person icon for 공개 and a lock for 비공개, so that the colours stop competing.
37. As a User, I want the map's 행사, 파티 and 퀘스트 marks as light glass tags with a coloured line icon, so that the map stays readable under them.
38. As a User zooming in, I want a mark to grow from a small round to a larger round to an icon with its name, at the zoom levels the map already uses.
39. As a User, I want a chosen mark ringed in navy.
40. As a User, I want quest pins on the map a little see-through, with a lighter border and shadow.
41. As a User with the 식당 layer on, I want restaurants as a coral pin with a white fork and knife and a small tail.
42. As a User with the 공부공간 layer on, I want study spaces as a sky-blue pin with a white book and a small tail, and their clusters as a light sky circle with the count.
43. As a User, I want a study space I cannot use still shown greyed, as today.
44. As a User, I want the layer buttons in the same colours as their pins.
45. As a User opening the friend panel, I want it see-through over the map, its footer joined to it, and "친구 추가" on glass.
46. As a User, I want the "친구 N" and "활성 파티" buttons to stay solid navy, so that I find them at once.
47. As a User, I want the card a map mark opens without "가까이 보기"; I zoom by hand, and the card's main button still takes me there.

The 행사 tab and the timetable

48. As a User, I want the 행사 tab's date column narrower and its day number smaller, so that titles get more room.
49. As a User, I want each 행사 title on one line, cut with "…", so that every row is the same height.
50. As a User, I want the 즐겨찾기 star to stay navy when on, as today.
51. As a User, I want my timetable to show 09 to 21 at once, every hour labelled "09", "10" … "21", without scrolling inside the card.
52. As a User with a class outside 09–21, I want the grid widened to fit it, as today.
53. As a User, I want the timetable drawn as a ruled grid: an outer border, lines between days, a light grey day header, a solid line each hour and a dotted line each half hour.
54. As a User, I want classes as square blocks that fill their day's column.

## Implementation Decisions

Scope

- The changelog sets the scope; the canvas only shows how an item looks. Where a canvas screen's layout, structure or behaviour differs from the app's, the app's stays.
- Items the app already has are recorded under Further Notes and get no work.

The glass layer and the Assistant (tickets 01 and 02)

- One design-system component draws a glass surface. A caller names a level and never gives numbers. The levels come from the changelog's § 5-1:
  - **panel**: outer bars, bottom sheets and cards over the map, about 50% white, a thin light line along the top, and blur when ticket 03 adds it.
  - **inner**: chips, boxes, white buttons and light coloured chips inside a panel, 80% white.
  - **field**: grey input fields inside a panel, navy at 5%.
  - **map chip**: small chips standing on the map itself (walk minutes, candidate tags, route time chips), 60% white.
  - **dark chip**: the black time and place chips ("10:45 301동"), navy-black at 48%.
- Never glass: navy main buttons, and full-screen white pages. The changelog states both.
- The component is shown in the design-system catalogue screen, like the other shared components.
- The documentation's design-system section gains a "glass layer" part: the levels, what takes each, what never takes glass, and that a new Assistant panel uses the component.
- The Assistant's map-first answer follows § 5-2 and § 5-3 wherever the app has the element. The numbered flags shrink by area to 75% (navy 20→17, gold 30→26) and turn see-through (navy 67%, gold 70%). Dimmed candidates get a light see-through round with a grey number. The time bar is glass at 42% with a thin see-through track. The chosen row's beige turns light and see-through.
- The design-system map pin's head (80%) and its name label (glass) are part of ticket 06, which owns the pin.
- When ticket 02 is done, the P04 spec (the map-first answer) gets one line saying new panels use the glass layer. The line is agreed with P04's owner first.

Blur (ticket 03)

- The open question is whether a blur works over the Kakao map on Android. The Android map is a native GL view, and Android blur works by redrawing the views behind it, which may not include that view. On iOS the system blurs at compositing, so it works there.
- Check first: add the blur dependency in a local development build and look at a glass panel over the map on the emulator.
- If it works: the blur goes inside the glass layer only, at the panel level. `version` is raised and a native Release is made, as `infra/production/README.md` § The Production APK describes. Testers reinstall the APK, and the iPhone build is redone by hand.
- If it does not work on Android: Android keeps the translucent glass. iOS may still blur, as decided then.
- No call site changes in either case.

The 파티 tab (ticket 04)

- 내 파티 card:
  - One line high: the title, then the count on the right, then "when · where" below, taken from the next step as today. "장소 미정" when there is no place.
  - Gone from the card: the kind pill, the status badge, the event badge, the faces and the "다음 일정" box.
  - The count reads "3/8명" while recruiting, otherwise "N명". Pending sent invitations are not shown on the card; they stay visible inside the 파티.
  - The red circle counting waiting join requests stays.
  - Both kinds get a white card with a grey border. The kind is a grey drawn icon (two people for 공개, a lock without a keyhole for 비공개) with a small "공개" or "비공개" under it, centred on the card's height.
  - Own activation keeps the navy border and its place in the "활성화 중" group.
  - Another's activation is one line, "활성화 중 · {name}", with a red blinking light, and the navy band goes. After declining, the line reads "활성화 중 · 참여 안 함". 거절 is small grey text and 참여 a white outlined button. The "활성화 중" group header gets the red light too. Reduce-motion stops the blinking.
- 찾기:
  - "전체 보기 ›" becomes a rounded "전체 게시판 ›" button. A light navy card under the recommended posts also opens the Boards, with a clipboard icon and "식사 · 진로 · 취미 · 공연 모집글 N개 둘러보기". The names are the app's four Boards and N is the total open posts.
  - The recruit card loses the "파티" badge, the body preview and "자세히 ›". The count moves to the end of the faces line. Time and place share one line, cut with "…". The photo is 52 and centred beside the title and time lines. Vertical padding shrinks. A 행사 badge, when there is one, is the only badge on top.
  - The "관심 없음" and "참여하기"/"참여 신청" buttons stay.
- 파티 form: each field's name gets a navy icon, as in the changelog's § 1-4 table. 태그, which the table does not name, gets none.
- 관련 행사 picker: titled "관련 행사 고르기", with a grey rounded search field and rows shaped like the 행사 tab's (date column, rule, host, bold one-line title, "time · place"). The picked row is light blue with a navy check. The picker's existing tabs stay.

Filters (ticket 05)

- Only the shared filter row changes look. The bare chip used for picking (interests, tags, the friend picker, card choices) keeps its pill. This keeps the change to filter rows, which is what the changelog's § 1-2, § 4-2 and § 6 name.
- Chosen filter: a light blue (blue100) fill with bold navy text. The rest: grey text with no border and no ✓.
- The chosen filter stays selected for accessibility.
- The 행사 tab's own filter already looks like this and is left alone.
- The share-scope track (시간표만 / 지금 있는 건물 / 정확한 위치) is a segmented track, not chips, and is left alone.

The map (ticket 06)

- Quest rows, both in the map's Quest list and on the Quest screen: one navy icon round, a person icon for 공개 and a lock for 비공개, and near-black words above. The blue and orange tones go.
- Map marks for 행사, 파티 and 퀘스트 become glass tags. Each has a line icon in its kind's colour (행사 navy calendar, 파티 orange people, 퀘스트 brown flag) on a 14% tint of that colour.
  - The three zoom levels the map already has (overview, pins, names) show a small round, a larger round, and the icon with a name pill.
  - The chosen mark gets a navy border and ring.
  - The count badge stays as the app draws it.
- Quest pins on the map go to about 70% opacity, with a lighter white border and shadow.
- The pin's head is 80% and its name label is glass, using ticket 01's layer.
- 식당 pin: a 22 coral (#EE6A4C) round, a white fork and knife, and a triangular tail. The look comes from the canvas, drawn by us, using no other app's images.
- 공부공간 pin: a 22 sky (#3A9AE6) round, a white book, and a triangular tail. Its cluster is a light sky see-through round with the count in a sky round. The grey "cannot use" variant stays.
- The layer buttons take the new pin colours: 식당 coral, 공부공간 sky. 셔틀 stays as it is.
- Friend panel:
  - 80% glass.
  - The footer (공유 설정 / 친구 추가) loses its white ground and joins the panel.
  - "친구 추가" is a glass button, and so is each friend row's calendar ("파티 만들기") button.
  - These parts wait for ticket 01.
- "친구 N" and "활성 파티" stay solid navy.
- The marker card loses "가까이 보기" everywhere.

The 행사 tab and the timetable (ticket 07)

- 행사 row: the day number goes from 34 to 24 and the date column from 72 to 60. The title is one line, cut with "…".
- The star stays navy, as today.
- Timetable:
  - The default range is 09–21, still widened to fit any class.
  - The whole range shows without scrolling inside the card. The grid is about 416 high for 09–21, and the hour height follows from it.
  - Hour labels are two digits ("09").
  - The grid has an outer border, lines between days and a light grey day header.
  - Each hour has a solid line and each half hour a light dotted line.
  - The gaps and the grey rounded ground go. Blocks are square-cornered and fill their column.

## Testing Decisions

- No new seam. Each ticket uses the screen-level integration tests that already render its screen over the mock server, and the design-system unit tests for shared components.
- Tests check what a User reads or does on the screen: text, labels, accessibility state, what can be pressed. Colours, opacity and sizes are not tested; a test that restates them only copies the code. The look is checked by the pull request's "after" screenshots.
- The tests per ticket:
  - **01**: the design-system catalogue test lists the glass layer.
  - **02**:
    - The food-kind chips' chosen tab is still selected for accessibility.
    - The map-first answer's tests (the answer-frame family) keep passing.
    - Any test that finds an element by a look this ticket changes is updated to find it the new way.
  - **03**: no automated test. The emulator check's result and screens go in the ticket.
  - **04**:
    - The 내 파티 tests: a card reads "3/8명" while recruiting and "N명" otherwise, the request circle shows its count, another's activation reads "활성화 중 · {name}", and after declining "활성화 중 · 참여 안 함".
    - The 찾기 and Boards tests: both entries open the Boards, and the card has no body preview and no "자세히 ›".
    - The 파티 form tests: the picker's title and choosing a 행사.
  - **05**: the chip and chip-row unit tests. The chosen filter is still selected for accessibility, and no ✓ is drawn.
  - **06**:
    - The main card test: no "가까이 보기".
    - The layers and friend panel tests keep passing.
    - The map pin unit test: quest rows say 공개 or 비공개 through their icon's label.
  - **07**:
    - The 행사 tab test: a title is one line.
    - The 내 정보 week card test: 09 to 21 are labelled, and nothing scrolls inside the card.
- Prior art: the 파티 tests (`party-mine`, `party-mine-activation`, `party-find`, `party-boards`, `party-form*`), `events-tab`, `me-week-card`, `main-card`, `layers`, `friend-panel`, `catalogue`, and the design-system `chip`, `chip-row` and `map-pin` unit tests.
- Only the changed files' tests and those `git grep` finds run locally, with typecheck, lint and format. CI runs the whole suite.

## Out of Scope

- **The 셔틀 layer (§ 4-7).** Its canvas screen was drawn from an older capture to match the app, not as a redesign.
- **"Hand edits to the main map's style"** that the changelog left out of its list. They are unknown.
- **The 행사 star in yellow (§ 2).** The star stays navy.
- **Things the canvas draws that the app does not have:**
  - a duration on recruit cards ("약 40분");
  - private-schedule pins on the map;
  - a filter on the map's Quest list;
  - chips for the share scope;
  - café, convenience-store and other restaurants in the 식당 layer;
  - a dining cluster.
- **Legacy\* screens and the P15 "before" screens.**
- **P06's held tickets.** 01 (the map's lists go), 04 (the bottom tabs) and 05 (the User's own marker) stay in P06 and their spec is not changed. Ticket 06 here does not run at the same time as P06-05, as both change the map pin.
- **Changes to the Assistant's behaviour.** Ticket 02 changes only how its screens look. The Assistant's flows keep changing under P04, and the glass layer and its documentation are how those later screens get the same look.

## Further Notes

Order and conflicts:

- 01, 04, 05 and 07 start together. 01 is small and goes first.
- 02, 03 and ticket 06's glass parts (the friend panel, the pin head and label) build on 01. Ticket 06's other parts do not wait.
- No two tickets change the same source file:
  - 01: the design system's new glass file.
  - 02: the Assistant's answer screens and the design-system map-answer parts.
  - 03: the package manifest and app config, and the inside of the glass layer.
  - 04: the 파티 screens.
  - 05: the shared chip and filter row.
  - 06: the main screen outside the answer, the map, and the design-system map pin parts.
  - 07: the 행사 screens and the week grid.
- Each may touch the documentation and the catalogue, so each merges `5.0/Main` before its pull request.
- Ticket 03 changes the app's native files. Its pull request raises `version`, and nothing else rides with it.

Every changelog item and where it went:

| Changelog item | Where |
|---|---|
| 1-1 내 파티 카드 | Ticket 04 (sent invitations left off the card; the request circle kept) |
| 1-2 내 파티 분류 | Ticket 05 |
| 1-3 찾기 | Ticket 04 ("약 40분" is not in the app) |
| 1-4 파티 만들기 | Ticket 04 |
| 2 행사 탭: 별 | Already a star; stays navy (out of scope) |
| 2 행사 탭: 날짜·한 줄 | Ticket 07 |
| 2 행사 탭: 걸러보기 | Already word tabs |
| 3 시간표 | Ticket 07 |
| 4-1 퀘스트 | Ticket 06 |
| 4-2 분류 칩 | Ticket 05 (the Quest list on the map has no filter; the share scope is a track) |
| 4-3 버튼·패널 | Ticket 06 (the "약속 잡기" button is each friend row's "파티 만들기" calendar button) |
| 4-4 지도 위 표시 | Ticket 06 (no private-schedule pin on the map; the count badge kept) |
| 4-5 식당 레이어 | Ticket 06 (already 학식 only; no dining cluster) |
| 4-6 공부공간 레이어 | Ticket 06 (already a book icon, no 도/라/검) |
| 4-7 셔틀 레이어 | Out of scope |
| 5-1 ~ 5-5 유리 | Tickets 01, 02 and 03; the map pin's head and label in 06 |
| 6 P15-4 친구 패널 칩 | Ticket 05 |
| 6 이미지·폰트 | Canvas only |

References:

- The canvas: <https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>. The boards to read are Party, Events, Profile, Main, ZoomCards, P15-04-after-panel, Mf5Kit and Mf5Row-meal. Each ticket names the ones it needs.
- `references/changelog-11-24.md`: the changelog as received.
- `references/before/`: the "before" screens. They were captured on 2026-11-25 from the mock build (`5.0/Main` ef2223aa) on the Android emulator. Each file name starts with its ticket's number:
  - 02: the Assistant's answers to "배고파", "뭐 먹을까" (with the list and food-kind chips), "공부할 자리", and an answer about 채용박람회 (time bar, gold flag and label).
  - 04: 찾기, 내 파티 (own activation), the 파티 form and the 관련 행사 picker.
  - 05: the Quest screen. The friend panel's filter is in 06's friend panel shot.
  - 06: the map at three zoom levels, the layers, the 식당 and 공부공간 layers, a marker card with "가까이 보기", and the friend panel.
  - 07: the 행사 tab and 내 정보's timetable.
- Not in the mock's default state, so not captured: another User's activation band (04), a long 행사 title (07), a dimmed candidate and a black time and place chip (02). Each ticket captures them if it can reach them.
