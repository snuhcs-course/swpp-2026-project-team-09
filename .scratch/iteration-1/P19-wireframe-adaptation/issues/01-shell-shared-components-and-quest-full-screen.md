# 01: The shell, the shared components, the Quest full screen and the Friend panel

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The bottom navigation becomes real. 파티, 행사 and 내 정보 open their own screens, and the map stays the main screen. A User who comes back to 지도 finds the map as they left it. Android's back button closes whatever is on top: a dialog, a sheet, a panel, an open card, a pushed screen. From another tab it goes back to 지도. 올리기 keeps saying "준비 중이에요".

The elements that the screens of P13, P14, P15 and this task repeat become shared components of the design system, so that those tasks build their screens in the wireframe's arrangement from the start.

Two controls on the map that P06 left saying "준비 중이에요" open what the frames draw:

- the Quest list's full-screen button opens the Quest full screen (`MainQuests`);
- the friend pill opens the Friend panel (`MainFriends`).

Both read data the app already fetches. Their buttons that lead to P13's and P14's screens keep saying "준비 중이에요" until those tasks connect them.

The frames are `Main`, `MainFriends` and `MainQuests`, and the app bars and the bottom navigation of `Party`, `Events` and `Profile` ("Common chrome" in the wireframe).

How the navigation is built: the signed-in place becomes a group of Expo Router routes. Its layout is Expo Router's `Tabs`, with a custom tab bar that draws the design system's `BottomNav`. The four slots 지도, 파티, 행사 and 내 정보 are its routes, and the map keeps its address `/main`. Tabs are used because:

- a tab's screen stays mounted when another tab is shown, so the native map view, its camera, the selection, the route and the collapsed lists survive a visit to another tab without being made again;
- `backBehavior: 'firstRoute'` gives Android's "back to 지도, then out of the app";
- 올리기 is not a route, and the tab bar handles its press itself.

Screens that cover the whole screen (the Quest full screen here; 프로필 편집, 알림 and the timetable in tickets 02 and 03) are routes of the root stack, above the tabs. The stack's back, and the app bar's back or close button, pop them. Parts that leave the screen behind them visible (the Friend panel, bottom sheets, dialogs, the open card on the map) close on Android's back through one shared means, topmost first: React Native's `Modal` `onRequestClose`, or one hook over `BackHandler`. The implementer picks one and uses it everywhere.

## Acceptance criteria

### The shell

- [ ] The bottom navigation is the tab bar of a tab layout. 지도, 파티, 행사 and 내 정보 each show their screen with their slot active, and 올리기 shows the "준비 중이에요" toast. The 파티 badge stays as it is; ticket 02 counts it.
- [ ] The map's state survives a visit to another tab: camera, selection with its card, route, and collapsed lists. No new native map view is made.
- [ ] The guard of the signed-in place (`useOwnPlace('ready')`) covers every route of the group and every route above it. A signed-out User who reaches one is led to sign-in.
- [ ] The `PositionProvider` moves from the main screen to the signed-in group's layout, so that one permission and one watch of the phone serve every tab and every screen above them. Ticket 02's sending reads it there. The explanation before the location prompt stays on the map.
- [ ] 파티 shows its app bar: `파티` in 22/700, and `+ 만들기`, which shows "준비 중이에요" until P13. Under it are the segmented tabs `찾기` · `내 파티` · `초대`, without counts until P13, and each tab's body is the shared empty state with `준비 중이에요`. The address can name the tab, so that ticket 02's 알림 rows open `초대`.
- [ ] 행사 shows its app bar, `행사`, and the shared empty state with `준비 중이에요`. P13 fills it.
- [ ] 내 정보 shows its app bar, `내 정보`, and the shared empty state with `준비 중이에요`. Ticket 02 fills it. The address can ask for the 위치 공유 card to be shown, so that ticket 02 can scroll to it.
- [ ] Android's back closes the topmost of: a dialog, a bottom sheet, the Friend panel, a screen above the tabs, and the open card on the map. On 파티, 행사 or 내 정보 with nothing open, back shows 지도. On 지도 with nothing open, back leaves the app as Android does.
- [ ] A toast on a tab other than 지도 sits above the navigation (the frame's bottom ≈ 96). On 지도 it stays where P06 put it. On a screen above the tabs it sits above the phone's bottom inset.

### Shared components

Each is in the design system, shown in the catalogue (`/catalogue`) and tested in `__tests__/design-system/`. The screens of this ticket use them, and P13, P14 and P15 use them.

- [ ] **App bar**, in two forms:
  - a tab's form: title 22/700 and actions on the right;
  - a sub-screen's form: a 48×48 back button, chevron-left with the label `뒤로`, or a close button, ✕ with `닫기`; then the title in 20/700, with an optional count after it in 500 muted (`퀘스트 12`), and actions on the right.
- [ ] **Full-screen panel**: the frame of a screen above the tabs. It is white, inside the safe area, with an app bar, a scrolling body and an optional footer holding a 52 primary button. It slides in over 0.28 s, from the right for a pushed screen and from the bottom for the Quest full screen. With reduced motion it appears without sliding (`use-reduce-motion`).
- [ ] **Side panel**: slides from the left, 324 wide, white, radius 24 on its right corners. A scrim `rgba(14,19,48,.4)` covers the rest, and a press on the scrim closes it (`친구 패널 닫기` on the Friend panel). Back closes it.
- [ ] **Bottom sheet**: a drag handle of 36×4 in grey, a top radius of 24, and the same scrim. A press on the scrim, Android's back, or a downward drag from the handle closes it.
- [ ] **Confirm dialog**: the existing `Dialog` gains its confirm button's tone. The title is 18/700, the body is optional, and the buttons are `취소` (outlined) and the confirm button, red `#C42B2B` filled for danger or navy for primary.
- [ ] **Segmented tabs** under an app bar: 48 high, words in 15, the selected tab underlined in navy 3, and an optional count pill after a tab's name, grey or red (`내 파티 2`, `초대 1`).
- [ ] **Chip row**: a horizontal scroll of `Chip`s, each with its count (`전체 12`). A chip whose count is 0 can be hidden.
- [ ] **Search field**: 44 to 46 high, grey `#F5F6F9`, a search icon, a placeholder, an accessibility label, and ✕ `지우기` while it holds text.
- [ ] **List row**: on the left an Avatar of 40, or a round icon of 40 in a colour; the name in 15/600; one or two meta lines in 12–13 muted; and a trailing slot for a button, or a value with a chevron. The minimum height is 56 to 72, with a 1 `#E2E5EC` divider. The whole row presses when it has a press.
- [ ] **Section header**: 12 in grey, such as `공강 · 4` or `오늘 · 10월 1일 (수)`.
- [ ] **Switch** and **switch row**: the frame's `SnuNow.Switch`, with a label, an optional description and the switch. A screen reader reads it as a switch. Ticket 02 and P14 use it.
- [ ] **States**:
  - empty: centred words in `#858CA0` 14/500 with an optional icon. The caller gives the words (`결과 없음`, `퀘스트가 없어요`, `준비 중이에요`);
  - loading: a spinner read as `불러오는 중`;
  - error: `불러오지 못했어요` and a `다시 시도` button, the loading screen's words.

### The Quest full screen (`MainQuests`)

- [ ] The Quest list's full-screen button (`퀘스트 전체 화면으로 열기`) opens it, in place of its toast. It is a screen above the tabs that slides up. Ticket 02's `내 퀘스트` row opens the same screen.
- [ ] The header is ✕ `닫기` and `퀘스트 {all}`. Under it are the chips `전체 N`, `강의 N` and `파티 N`. `파티` counts every Quest that is not a Class Quest. A chip filters the list, and the counts do not change with the filter.
- [ ] The rows are grouped by the day of their next Sub Quest's start, in Korea's time, under `오늘 · 10월 1일 (수)`, `내일 · 10월 2일 (목)`, `이번 주` (2 to 4 days ahead), `다음 주` (5 to 11) and `그 이후` (12 and more). The frame's groups name no Quest without a time. Such a Quest goes last, under `시간 미정`, the word of the 내 파티 tab. Ended Quests are not shown.
- [ ] A row is 72 high:
  - a round icon of 40 in the kind's colour, from `questTone`: `clock` for a class, `users` for a Quest others may join, `lock` for any other;
  - the kicker: `강의`, `공개 파티`, or `비공개 파티 · {another Holder}`;
  - the title in 16/600;
  - the detail in 13: the place;
  - the time on the right in 14/600.

  These come from the quest feature's adapter, which gains what the full screen needs. The floating list and the full screen agree on a Quest's kind and words.
- [ ] A press on a class's row closes the full screen, shows 지도, moves the map to the Place at the "names" level and shows `{title} · {place}`, as the floating list does. A press on any other row shows "준비 중이에요" until P13 opens the Quest's room.
- [ ] With no Quest it says `퀘스트가 없어요`. While loading and after a failure it shows the shared states.

### The Friend panel (`MainFriends`)

- [ ] The friend pill opens it, in place of its toast. It is the side panel.
- [ ] The header is `친구 {N}` and ✕ `닫기`. The search field reads `이름, 학과 검색`, with the label `친구 검색`, and filters by name and department. Nothing found says `결과 없음`.
- [ ] The chips are `전체 N`, `공강 N`, `수업 중 N`, `이동 중 N` and `위치 꺼짐 N`. Those with 0 are hidden, except `전체`.
- [ ] The rows are grouped by presence under `공강 · 4`, `수업 중 · 5`, `이동 중 · 1` and `위치 꺼짐 · 2`. A row is 64 high, with:
  - the Avatar with its status ring;
  - the name in 15/600 and the department in 12;
  - the detail in 13 (`FriendView.detail`, such as `위치 꺼짐 · 마지막 활동 2시간 전`);
  - a round outlined calendar button of 44, `{이름}님과 파티 만들기`, which shows "준비 중이에요" until P14 proposes a Meetup from it.
- [ ] The footer holds:
  - the live Badge `친구 {n}명과 위치 공유 중`, where n counts the Friends the User sees now (`visible`);
  - the link `공유 설정`, which closes the panel and shows 내 정보, at its 위치 공유 card once ticket 02 builds it;
  - the outlined `+ 친구 추가`, which shows "준비 중이에요" until P14.

### Records and checks

- [ ] `mobile/README.md` ("Screens and the flow between them", "Design system") describes the tab layout, the screens above the tabs, the back rule and the new components. `todo.md` §4 of P06 loses the rows this ticket connects: the friend pill, the full-screen button, and the 파티, 행사 and 내 정보 slots.
- [ ] Jest tests, through `startApp` on the real routes:
  - each slot opens its screen, and 올리기 shows its toast;
  - the map's selection and a collapsed list are kept across a visit to 파티;
  - Android's back closes, in turn, a dialog over the Friend panel, the panel itself, the Quest full screen and the open card, and returns from 내 정보 to 지도;
  - the Quest full screen's chips, counts, groups, `시간 미정`, empty state and both kinds of row press;
  - the Friend panel's search, chips, groups, footer count, `공유 설정`, and the toasts of its two buttons;
  - a signed-out User at a tab's address is led to sign-in.

  The screen tests of P06 pass. A test that found the navigation inside the main screen finds it by its meaning.
- [ ] The frames were read again when the work started. Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - the Quest full screen lists only today's Class Quests, because the main server derives Class Quests for today only;
  - `시간 미정`;
  - the class's detail has no professor;
  - a Friend's department has no year;
  - the placeholder bodies of 파티, 행사 and 내 정보.
- [ ] Screenshots of the web target are in the pull request under Test Results, each compared with its frame: 파티, 행사, 내 정보, the Quest full screen and the Friend panel.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.
