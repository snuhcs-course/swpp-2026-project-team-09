# 17: The tab bars of 파티, 행사 and 내 정보, and the friend panel's: a larger title, closer to its line

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, in their notes on the 파티 and 행사 tabs: "파티, 행사, 내정보의 최상단 각 글씨 크기를 살짝 키우고, 글씨랑 바로 아래 선 사이 간격을 좀 줄이는건 어떤가?" The same note's first part (the 파티 search beside 만들기, and 만들기's alignment) went into ticket 12.

On 2026-11-27 the user settled it on a wireframe (`references/17-1-tab-bar-wireframe.webp`, now and the change, for 파티, 행사, 내 정보 and the friend panel):
- The title becomes 25 Bold, and the gap from the title to the line under it shrinks from 13 to 7.
- The map's friend panel takes the same change, since it uses the same bar ("친구패널도 그렇게 고쳐").
- 파티's bar keeps ticket 12's decision: no magnifier in the bar. The magnifier stays at the end of 찾기's filter row, and `+ 만들기` stays centred.
- The ? help beside the titles, from the same notes, stays on hold.

Positions are as of `origin/5.0/Main` 6edb1b61, under `mobile/src/`.

- **The bar.** `AppBar` (`design-system/app-bar.tsx:57`) draws two forms:
  - A tab's, without `leave`: the title in `text.titleLg` (22 Bold, line height 30, letter spacing -0.33; `tabTitle`, `:85`), 20 from the left, 8 on the right (`tab`, `:83`).
  - A sub-screen's, with 뒤로 or 닫기: the title in 20 Bold (`subTitle`).
  - Both forms put everything in one row of `size.appBar` (56, `:82`), centred, with gaps of 4. So the title has 13 above and below, and the line (`lined`) sits under the row.
- **Who draws the tab form.**
  - `TabScreen` (`screens/shell/tab-screen.tsx:29`) draws it for 파티 (`party-screen.tsx:64`, with `+ 만들기`, a 40-high `Button`), 행사 (`events-screen.tsx:122`, with 🔍) and 내 정보 (`me-screen.tsx:191`, with the bell).
  - The friend panel (`screens/main/friend-panel.tsx:202`) draws it with `clear`, no line, the count ("친구 3") and ✕.
  - The catalogue (`catalogue/screens.tsx:50`, `:104`) shows both.
  - Icon buttons are 48 square (`IconButton`, `:22`).
- **What shares the sizes.**
  - `text.titleLg` (`design-system/tokens.ts:286`) is also used by the catalogue's headings, the consent screen, the tutorial sheet, onboarding, 파티 모집글's title and the sign-in screen.
  - `size.appBar` (`tokens.ts:89`) is also used by the sub-screen form, the consent screen, the legal screen and 행사's search bar.
- **행사's search bar.** When 🔍 is pressed, `SearchBar` (`screens/events/events-bar.tsx`) takes the app bar's place through `TabScreen`'s `bar` (`events-screen.tsx:132`). Its row is `size.appBar` high (`barRow`), with the 44-high search field and ✕.
- **Tests.** `__tests__/design-system/app-bar.unit.test.tsx` checks the two forms' parts, not their sizes. `catalogue.integration.test.tsx` lists `AppBar`.

## What to build

1. **The tab form's title:** 25 Bold, line height 32, letter spacing -0.4 (1.6%, near `titleLg`'s 1.5%), in the ink colour, with the count after it in Medium muted as now.
2. **The tab form's row:** 50 high under the phone's inset, of which the top 4 is padding. So the title has 11 above it and 7 below it to the line.
   - The title, `+ 만들기`, 🔍, the bell and ✕ stay centred on one line, with gaps of 4.
   - 20 on the left and 8 on the right stay as now.
   - The 48 icon buttons keep a 48 touch area.
3. **Only the tab form changes.**
   - The sub-screen form (뒤로 / 닫기, 20 Bold, 56 high) stays.
   - The other users of `text.titleLg` and `size.appBar` stay as they are. Don't change those tokens' values; give the tab form its own.
4. **Where it shows:** 파티, 행사 and 내 정보 through `TabScreen`, and the friend panel ("친구 n", no line), with no change of their own.
5. **행사's search bar** takes the tab form's new height (50, top 4), so the filters under it do not move when the search opens or closes. Its field and ✕ stay as now.
6. No words change. 파티's bar keeps no magnifier and a centred `+ 만들기`. No ? help.

## Must not break

- 파티: `+ 만들기` opens the 파티 form, 찾기 / 내 파티 / 초대 and their swipe, and 찾기's filter row with its magnifier.
- 행사: 🔍 opens the search field and ✕ closes it. The filters and the list keep their place.
- 내 정보: the bell, its badge and its press.
- The friend panel: the count, ✕, the search field and the chips under the title.
- Sub-screens with 뒤로 or 닫기 (e.g. 프로필 편집, 비공개 구역, 관정도서관 로그인): unchanged.
- A screen reader still reads each title as a header.
- Tests: `app-bar` (`.unit`), `catalogue` and `events-tab` (`.integration`), and those `git grep` finds for `TabScreen`, `PartyScreen`, `me-screen`, `friend-panel`, `events-bar` and `SearchBar`.

## Out of scope

- The ? help beside the titles (on hold).
- The sub-screen bars, the 지도 and AI tabs, and the bottom navigation.
- The rest of 파티's and 행사's screens (tickets 12, 15) and the items still waiting (내 파티, the room, the 파티 form).

## Acceptance criteria

- [x] A tab bar's title is 25 Bold with line height 32, and its row is 50 high with 4 on top. (Test, which fails before the change.)
- [x] A sub-screen bar keeps its 20 Bold title and its 56-high row. (Test.)
- [x] The friend panel's title takes the tab form's size. (Test, which fails before the change.)
- [x] 행사's search bar is as high as its tab bar, so the filters do not move when it opens. (Test, which fails before the change.)
- [x] `text.titleLg` and `size.appBar` keep their values. (Test or review.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- The tab form's row is one exported value, `TAB_BAR_ROW` (`design-system/app-bar.tsx`, 50 high, `paddingTop` 4), which 행사's `SearchBar` spreads into its row, so the two bars cannot drift apart. `size` and `text` in `tokens.ts` are untouched; the tab title's 25 / 32 / -0.4 sits in `AppBar`'s own styles, as the sub-screen title's already did.
- The row's content box is 46 (50 less the 4 on top), so a 48 icon button (🔍, the bell, ✕) reaches 1 into the top padding and 1 onto the line under the bar. Its size stays 48 and it stays centred with the title; nothing clips the 1 that reaches past the row.
- Tests: `app-bar.unit` checks the tab form (25 Bold, line height 32, letter spacing -0.4; row 50 with 4 on top; icon button 48) and the sub-screen form (20 Bold; row 56, no top padding). `friend-panel.integration` checks "친구 12" in the tab form's size and row. `events-tab.integration` has a new block, "the search's bar", that checks the tab bar's row and then the search bar's row at 50 with 4 on top. The new checks failed before the change (22 for 25, 56 for 50). `text.titleLg` and `size.appBar` are checked by review: `tokens.ts` is not in the diff.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 20 minutes, in one implementation session (an estimate). Most of it was waiting on the integration tests.
- Tokens: input 4.15M, of which 4.03M cache reads, 0.11M cache writes and under 0.1K uncached; output 21K. These are this session's measured figures when the ticket was updated; the commit and the pull request came after and add little. No subagents.
