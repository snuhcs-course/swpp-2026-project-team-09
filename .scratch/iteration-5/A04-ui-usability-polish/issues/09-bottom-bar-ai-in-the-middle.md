# 09: The bottom bar reads 파티, 행사, the map and AI in the middle, 알림, 내 정보, and the middle raises and lowers the AI

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: None. P06 ticket 01 (the map's lists go) also changes `main-screen.tsx` and the main screen's tests; whichever goes second merges `5.0/Main` first.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-28, with the proposal <https://claude.ai/artifact/UgGcW4Jx5G5doZhPnT89iK> ("아래 탭: 지금과 권장", the 권장 boards). Positions are as of `origin/5.0/Main` 9ea45c14.

- The bar's five slots are in `screens/shell/tab-bar.tsx:19-25`: 지도, 파티, `{ route: null, icon: 'plus', label: '올리기' }`, 행사, 내 정보. The middle one pushes `/party-form` (:54-56). It is `BottomNav`'s action (`design-system/bottom-nav.tsx`): a navy circle, role button, never selected.
- The 파티 tab has its own pencil button that opens 파티 만들기 (`screens/party/party-screen.tsx:98-101`), so the ＋ does the same thing twice.
- The tabs are Expo Router `Tabs` (`app/(signed-in)/(tabs)/_layout.tsx`): `main`, `party`, `events`, `me`, with `backBehavior="firstRoute"`.
- On the map the AI input always stands over the tab bar (`screens/main/map-bottom.tsx:263-277`), with the lines over it: the conversation to go on with (`past-chats.tsx`) and a Quest made from a Plan that waits for answers (`made-quest-line.tsx`). The input layer is hidden only for the tutorial and the earlier-answers list (`inputStateOf`, :218-224).
- The tab bar gives way to the answer frame on the map (`useTabBarHiddenOnMain`, `tab-bar.tsx:40-45`).
- 알림 is a screen above the tabs (`app/(signed-in)/notifications.tsx`, `ABOVE_TABS` in `app/(signed-in)/_layout.tsx`), a `FullScreenPanel` with a back button, opened only from the bell in 내 정보's header (`screens/me/me-screen.tsx:67`).
- The tab tour points at four tabs by slot (`screens/shell/tab-tour.tsx:21-26`; `TOUR_STEPS = 4` in `features/tab-tour/rules.ts`).

## What was decided

On 2026-11-28 the user chose the proposal's 권장: the middle is the app's home, the map and the AI, and the 지도 tab goes. The app opens with the AI raised. The fifth slot is 오늘, which this ticket fills with today's 알림 screen and ticket 10 grows. This replaces P06 ticket 04 (식단 / 파티 / 지도 / 행사 / 내 정보); the pull request says so, and P06-04's file is left as it is until then.

## What to build

- **The bar** reads 파티, 행사, [middle], 알림, 내 정보. The ＋ (올리기) goes; 파티 만들기 stays on the 파티 tab's pencil button.
- **The middle button** is a round tab, the map's tab (`main`):
  - Its icon is a map with a sparkle, a new icon in `design-system/icon.tsx`, drawn by us.
  - Raised: a navy circle with a white icon. Lowered, or on another tab: a white circle with a navy border and a navy icon. On the map it carries the selected tab's light ring as the board draws it.
  - Its screen reader role is tab and its name stays "지도", selected while the map is in front, so the tests that find `getByRole('tab', { name: '지도' })` still do. On the map it also says whether the AI is raised (`expanded`).
- **On the map, a press raises or lowers the AI.**
  - Lowered: the AI input and the lines over it (the conversation to go on with, the made Quest's line) go, and the map is clean but for the 친구 and 퀘스트 chips at the top.
  - Raised: they come back as they were, the text being typed included.
  - While an answer frame is shown, the tab bar gives way as now, so there is no raising or lowering there.
  - The tutorial keeps the input layer as it does now; the button does not lower what the tutorial shows.
- **On another tab, a press goes to the map with the AI raised.**
- **The state** (raised or lowered) is kept while the app runs, in memory only. The app always opens raised.
- **알림 moves into the tabs.** The fifth slot (bell icon, "알림") is today's 알림 screen as a tab: a new `(tabs)` route, with no back button, its bottom clear of the tab bar. The `/notifications` route above the tabs goes, so only one exists; whatever opened it (the bell, the tests' router, push links if any) opens the tab. 내 정보's bell goes. The 파티 tab keeps its count until ticket 12.
- **The map stays the first route**: Android's back and the edge swipe on another tab go to the map, as now.
- **The tab tour** has five steps, one per slot in the bar's order. The middle's step shows that a press raises and lowers the AI and what the filled and the outlined button mean. The new steps' words are decided while building and shown at the screen review; 파티, 행사 and 내 정보 keep theirs.
- The catalogue's bar and `mobile/README.md`'s lines on the bar, the bell and 알림 follow.

## Must not break

- `main` stays the first route (`firstRoute`; back and the edge swipe rely on it).
- The map's AI input, its lines and the answer frame, when raised, exactly as now. `map-bottom.tsx` is also changed by P04's open work; merge `5.0/Main` first.
- 알림's rows, their presses, and the read marks.
- Tests: `shell`, `main`, `tab-tour`, `notifications*`, `notification-links`, `catalogue`, `android-stack` (`.integration`), `design-system/bottom-nav.unit`, the main map tests that type into the input, and the Maestro subflow `mobile/maestro/subflows/map.yaml` (waits for 지도 with `selected: true`). The tests' router registers `'(signed-in)/notifications'` (`__tests__/support/app.tsx`); it moves with the route.

## Acceptance criteria

- [ ] The bar reads 파티, 행사, 지도 (middle), 알림, 내 정보, with no 올리기; the middle is a tab, selected while the map is in front. (Unit test of `BottomNav` and integration test, which fail before the change.)
- [ ] On the map a press on the middle hides the AI input and its lines, and a second press brings them back with the typed text. (Integration test, which fails before the change.)
- [ ] From 파티, a press on the middle shows the map with the AI raised, also after it was lowered. (Integration test.)
- [ ] The app opens with the AI raised. (Integration test.)
- [ ] 알림 is a tab with its rows, and 내 정보 has no bell. (Integration test.)
- [ ] The tab tour points at the five slots. (Integration test.)
- [ ] The bar raised, lowered and on another tab, and the tour's middle step, on a phone with the mock build; the screens go to the user before the PR. (Emulator.)
- [ ] The PR body says P06 ticket 04 is replaced by this ticket.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
