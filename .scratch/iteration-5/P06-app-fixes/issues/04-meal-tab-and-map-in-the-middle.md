# 04: The bottom tabs: 식단, 파티, the map in the middle, 행사, 내 정보, and no +

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-lists-go-quest-chip-opens-quests.md), which changes `main-screen.tsx` and the main screen's tests too.

Native files: none. Releases: an app OTA update only.

## What happens now

Received: "현재 메인화면 하단의 + 버튼이 파티 만들기로 이어지는데, 이는 파티 탭에서 가능한거라 굳이 필요없다고 생각함. 대신 우리의 메인화면이 되는 지도를 가운데로 옮기고, 비는 곳 하나를 식단으로 채워 식단 탭으로 넘어가게 하는 것을 제안." (`references/04-1-menu-screen-now.webp`, `references/04-2-tab-bar-now.webp`; mock-up `references/04-3-tab-bar-mock-up.png`)

- The tabs are Expo Router `Tabs` (`mobile/src/app/(signed-in)/(tabs)/_layout.tsx:17-41`): `main`, `party`, `events`, `me`, with `backBehavior="firstRoute"` (:20) and our own `tabBar`.
- The bar's five slots are in `screens/shell/tab-bar.tsx:20-26`: 지도, 파티, `{ route: null, icon: 'plus', label: '올리기' }`, 행사, 내 정보. The middle one pushes `/party-form` (:52-58); it came with iteration 4's P02 ticket 31 (PR 332).
- The middle slot is `BottomNav`'s action (`design-system/bottom-nav.tsx:17-19`, `Action` at :68-81): a 44 pt navy circle, role button, never selected. A selected tab shows a `blue100` pill, navy, bold (:40-66).
- The menu screen (`app/(signed-in)/menus.tsx` to `screens/menus/menus-screen.tsx`) slides up above the tabs (`ABOVE_TABS` in `app/(signed-in)/_layout.tsx:43-57`, `['menus', 'bottom']`). It is a `FullScreenPanel` closed by ✕ (`menus-screen.tsx:153-156`). The only way in is a restaurant card's "메뉴 보기" (`main-screen.tsx:140-141` to `openMenus` in `map-bottom.tsx:66-69`, which pushes `/menus?date&meal&restaurant`).
- `MenusScreen` reads its params only as `useState`'s first values (:143-151), and `useScrollOnce` (:125) scrolls once.
- There never was a 식단 tab: the 편의기능 stack had a 메뉴 tile until PR 197 (P13-02) made it the 공부공간 layer.
- The tab tour points at four tabs by slot, leaving out 올리기 (`screens/shell/tab-tour.tsx:18-28`; `TOUR_STEPS = 4` in `features/tab-tour/rules.ts:11`). The catalogue draws the bar (`catalogue/composites.tsx:97-115`); `mobile/README.md` describes it (:434-437, :826-828, :1054).

## What to build

As the mock-up draws it:

- The bar reads 식단, 파티, 지도, 행사, 내 정보. 지도 in the middle is a round button: a navy circle with a white map icon while the map is in front, a light (`blue100`) circle with a navy icon on another tab. It is a tab, not an action: role tab, selected while the map is in front. 식단 uses the `meal` icon (`icon.tsx:51-56`) and, selected, the pill as the other tabs do.
- The 식단 tab is the menu screen, without ✕. The menu screen moves into `(tabs)` and leaves `ABOVE_TABS`, so that only one `/menus` route exists. Its bottom clears the tab bar.
- The + (올리기) goes. 파티 만들기 stays on the 파티 tab's "+ 만들기".
- A restaurant card's "메뉴 보기" switches to the 식단 tab and shows that restaurant at the meal served next, as it does now (`nextMeal(now())` in `map-bottom.tsx:66-69`, so after dinner tomorrow's breakfast), also when the tab was opened before with other choices: the screen reads new params each time and scrolls to the restaurant each time. The 지도 button brings the User back to the map.
- A plain press on the 식단 tab shows, the first time, the meal served next with no restaurant picked, as the menu screen does today when opened without a restaurant; afterwards the tab keeps what the User last chose, as the other tabs do.
- The map stays the first route: Android's back and the edge swipe on another tab go to the map, as now.
- The tab tour has five steps, one per tab in the bar's order. 식단's words are decided while building and shown at the screen review; the other four keep theirs.

## Must not break

- About 21 tests find the map's tab by `getByRole('tab', { name: '지도' })`; the middle button keeps role tab and its selected state.
- `main` stays the first route (`firstRoute`, back and the edge swipe rely on it).
- The menu screen's own behaviour: days, meals, a restaurant scrolled to.
- Tests: `shell` (:41-84), `main` (:55-101), `tab-tour` (:127-138), `menus-screen`, `dining-layer`, `android-stack` (:61-74, uses `/menus`), `catalogue` (`.integration`), `design-system/bottom-nav.unit` (:45-72), and the Maestro subflow `mobile/maestro/subflows/map.yaml` (waits for the text 지도 with `selected: true`).
- The tests' router registers `'(signed-in)/menus'` (`__tests__/support/app.tsx:100`); it moves with the route.

## Acceptance criteria

- [ ] The bar reads 식단, 파티, 지도, 행사, 내 정보, with no 올리기; 지도 in the middle is a tab, selected while the map is in front. (Unit test of `BottomNav` and integration test, which fail before the change.)
- [ ] The 식단 tab shows the menus with no ✕. (Integration test.)
- [ ] "메뉴 보기" on a restaurant's card switches to 식단 with that restaurant at the meal served next, and again with another restaurant on a second press. (Integration test, which fails before the change.)
- [ ] The 파티 tab's "+ 만들기" still opens 파티 만들기; back from 식단 goes to the map. (Integration tests.)
- [ ] The tab tour points at the five tabs. (Integration test.)
- [ ] The bar on the map and on 식단, and the "메뉴 보기" path, on a phone with the mock build; the screens go to the orchestrator before the PR, and to the design review. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
