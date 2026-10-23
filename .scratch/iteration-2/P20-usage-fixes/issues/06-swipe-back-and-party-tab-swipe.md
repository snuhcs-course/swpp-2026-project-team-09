# 06: Swipes: back from the left edge, and between the 파티 tab's tabs

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

There are two sideways gestures. They are built together so that one rule decides which gesture takes a swipe, and they never fight.

### 1. Back from the left edge, following the finger

A swipe that starts at the screen's left edge goes back, as Android's back button and the in-app back button do. The screen follows the finger, iOS style:
- it slides with the finger,
- let go past a threshold, it finishes going back,
- let go short of it, it slides back into place.

**Where it applies:**
- **A screen above the tabs**, such as a room, a post, 친구 관리, 파티 만들기, the menus or 참여 중인 파티 from ticket 05: the swipe pops it to the screen under it.
- **An open side panel or bottom sheet**: it goes away as the back button makes it go.
- **지도**: the edge swipe does nothing. Back there would leave the app, and the map needs drags from its edges.
- **The other tabs (파티, 행사, 내 정보)**: the edge swipe goes to 지도, as Android's back button does there. There is no screen under a tab to slide back to, so how it looks while the finger drags is the implementer's to choose. One way is to slide the tab with the finger and switch to 지도 past the threshold. Write the choice under `## Comments`.

**Why the app has to build it.** The signed-in screens are a native stack. On Android a native stack has no interactive swipe back, and the predictive back gesture is off in the app's config. Gesture handler and Reanimated are installed. One option is a JS stack for the signed-in screens, whose cards follow the finger on Android. Choose, and keep each screen's slide direction and the reduced-motion behaviour.

### 2. Between 찾기, 내 파티 and 초대

In the 파티 tab, a light sideways swipe anywhere on the screen moves to the next or previous tab: left for the next, right for the previous. It does not have to start at the edge.
- **The tabs bar and the address** follow the swipe, as a press on a tab does.
- **A swipe from the very left edge** stays the back gesture above.
- **Sideways scrollers inside the tabs** win inside their own area: 찾기's row of people looking for company, the official recruiting banner, and 내 파티's chip row.
- **Vertical scrolling** never turns into a tab change.
- **At either end, 찾기 and 초대**, a swipe further does not change the tab.
- **Thresholds**: the edge width, the distances and the angles are the implementer's to choose. Write the values under `## Comments`.

Plan items 7 and 8 say where each part lives.

## Acceptance criteria

- [x] **Edge swipe back.**
  - On an Android phone, on a screen above the tabs, a swipe from the left edge drags the screen with the finger. Past the threshold it goes back to the screen under it; short of it, it slides back into place.
  - An open side panel or bottom sheet goes away with the swipe as it does with the back button.
  - On 지도 the edge swipe does nothing, and the map still pans from its edges.
  - On 파티, 행사 and 내 정보, a swipe from the left edge past the threshold goes to 지도, and one short of it leaves the tab as it was.
  - Every screen keeps its slide in and its back button, and reduced motion still turns the slides off.
- [x] **Swipe between the 파티 tab's tabs.**
  - In the 파티 tab, a sideways swipe moves between 찾기, 내 파티 and 초대, and the tabs bar and the address follow.
  - A press on a tab still works.
  - A vertical scroll never changes the tab.
  - The sideways scrollers inside the tabs scroll without changing the tab.
  - A swipe from the left edge in the 파티 tab is the back gesture, not a tab change.
- [ ] **Tests:**
  - the 파티 tab moves to the next and previous tab on a sideways swipe, and stays at its ends
  - a swipe that starts at the left edge is not taken as a tab change, and on 파티, 행사 and 내 정보 it shows 지도
  - the existing navigation, party tab and back-button tests pass
- [x] Checked on an Android phone: the edge swipe on several screens above the tabs, with a panel or a sheet open, on 지도 and on the other tabs, and the 파티 tab's swipes, including over its sideways scrollers. Also checked on iOS if one is at hand, where the native swipe back must still work. Write what was and was not checked under `## Comments`.

## Comments

### What was built (2026-10-23)

- **One rule for sideways swipes.** It lives in `mobile/src/navigation/swipe-rule.ts`.
  - A swipe that starts within the left edge (`EDGE_WIDTH`) goes back. Every other sideways swipe in the 파티 tab moves between its tabs.
  - The 파티 tab's swipe has a negative left `hitSlop` of the edge's width, so it never begins at the edge. As a second guard, its `onEnd` ignores a swipe whose start lies inside the edge.
  - Whether a swipe goes back is decided the same way everywhere: (distance + speed × 0.3) > half the screen. This matches the JS stack's own rule.
- **Screens above the tabs on Android: the JS stack.**
  - `app/(signed-in)/_layout.tsx` uses `expo-router/js-stack` on Android and the native stack on iOS. expo-router 57 ships `@react-navigation/stack` inside itself, so no dependency was added and `app.json` did not change.
  - Both stacks are built from one list of screens. Each screen keeps its slide-in edge: right, or bottom for 퀘스트, 초대 and the menus.
  - On Android every screen has `gestureEnabled`, a horizontal gesture and `gestureResponseDistance: EDGE_WIDTH`. The screen follows the finger. A right-sliding screen moves right. A bottom-sliding screen moves down by as much as the finger moves right, as iOS's native `slide_from_bottom` does.
  - With reduced motion on, `animation: 'none'`: the screen stays still under the finger, and only the threshold counts. The native-stack options on iOS are unchanged, and so is iOS's own swipe back.
- **Side panels and bottom sheets.**
  - `hooks/use-back-to-close.ts` keeps a list of what is open and can be closed by a swipe. `OverlayHost` (`design-system/overlay.tsx`) draws an `EdgeClose` strip, as wide as the edge, over every panel and sheet while that list is not empty.
  - A swipe past the threshold closes the latest one opened, as the back button does. The panel does not follow the finger; it slides away as it does for the back button.
  - `bottom-sheet.tsx` and `side-panel.tsx` were not changed.
  - Two things on the map opt out with `{ edge: false }`, because they leave the map's left edge uncovered and the map needs drags from there: its open card (`use-selection.ts`) and the layer stack (`layers.tsx`).
  - The AI chat sheet still closes from the edge, like any sheet. It covers the map from the top down to the tab bar. It was left unchanged because open PR #120 edits `chat-sheet.tsx`.
- **지도, 파티, 행사, 내 정보.**
  - `app/(signed-in)/(tabs)/_layout.tsx` wraps every tab except 지도 in `TabEdgeBack` through `screenLayout`. 지도 has no edge gesture.
  - **The tab's look while dragging:** the tab's content follows the finger to the right, with a soft shadow along its left side, over a slightly darker ground (`surfaceSunken`). The tab bar does not move.
  - Let go past the threshold and the app switches to 지도 at once, as a press on the tab does. Let go short of it and the content springs back.
  - With reduced motion on, the content stays still and only the threshold counts.
- **파티 tab's swipe.** `screens/party/party-screen.tsx` wraps the tabs bar and the tab's content in a pan. It calls the same `onTab` as a press, so the tabs bar and the address (`?tab=`) follow. At 찾기 and 초대 a further swipe does nothing.
- **Sideways scrollers.**
  - 찾기's row of people and 내 파티's `ChipRow` are plain RN horizontal `ScrollView`s and were not changed.
  - A native scroll view claims the touch after a few points, and gesture-handler then cancels the pan. The tab's swipe waits for 24 points, so the scroller wins inside its own area.
  - Vertical scrolling stops the swipe the same way, and `failOffsetY` stops it as well.
- **Official banner.**
  - It was not a scroller: it turns by itself and with ‹ ›. Decided with the user: a swipe over it now turns it (`official-banner.tsx`).
  - Its swipe starts at 12 points, before the tab's swipe at 24, so it wins over the banner.
- **Other changes.** `GestureHandlerRootView` now wraps the app in `app-providers.tsx`; the app had none. The jest config loads `react-native-gesture-handler/jestSetup`.
- **Overlap with open PRs.** No source file of #118–#121 was changed. #118 and #119 reword two lines of this ticket's body. This branch only adds to `## Comments`, so the two edits merge without conflict.

### Chosen values

| What | Value |
| - | - |
| Edge width | 40 dp. Android's gesture navigation takes roughly the outer 20 dp for its own back, so 40 leaves room for a swipe that follows the finger. |
| Edge swipe starts | after 10 dp to the right. It is no swipe if the finger first moves 20 dp up or down, or 10 dp left. |
| Goes back | (distance + speed × 0.3 s) > half the screen width: on the JS stack, on the tabs and over panels and sheets. |
| 파티 tab swipe starts | after 24 dp sideways. It fails if the finger first moves 16 dp up or down, which allows about 34° from horizontal. |
| 파티 tab swipe moves a tab | if, at release, it went at least 56 dp or was moving at least 600 dp/s. |
| Banner swipe | starts after 12 dp, fails after 16 dp vertical, and turns the banner at 32 dp or 400 dp/s. |

### What was checked, and what was not

- **Checked:** In `mobile/`, `pnpm lint` and `pnpm format:check` are clean. `tsc --noEmit` is clean when run with the locally generated `expo-env.d.ts` and `.expo/` moved aside. No touched file failed typecheck. The whole mobile suite passes: 149 suites, 1,334 tests and 1 todo.
- **Not checked on a device.** Nothing was tried on a phone, so the device box stays unticked. The phone check is deferred until after this ticket, together with 01–05, against the Dev Server's real data. The mock data was not changed.
- **Tests.**
  - `__tests__/swipe-test.tsx` covers the following:
    - the 파티 tab moves to the next and previous tab, and the address follows;
    - it stays put at either end;
    - a short swipe moves only if it is fast;
    - a vertical scroll and a swipe from the edge do not change the tab;
    - a press still changes the tab;
    - a swipe turns the banner;
    - on 파티, 행사 and 내 정보, an edge swipe past the threshold shows 지도 and one short of it does not;
    - 지도 has no edge gesture;
    - the friend panel and a bottom sheet close on an edge swipe;
    - an open card on the map gets no edge strip.
  - `__tests__/android-stack-test.tsx` runs the app with `Platform.OS = 'android'`, on the JS stack. It opens 참여 중인 파티 and the menus, and closes them with 뒤로 and with the back button.
  - Jest cannot drive the JS stack's own finger-following swipe. That part is left for the phone.
- **Existing tests.** They pass unchanged. In jest the platform is iOS, so they run on the native stack.
- **Device risks to watch:**
  - The JS stack is a new navigator on Android. Watch for keyboard handling, the map re-attaching under a dragged screen, and smoothness.
  - The tab's slide is driven from JS.
  - On iOS, gesture-handler's pan and a `UIScrollView` may decide differently than on Android.

### Steps for the phone (Android first)

1. **Edge swipe on screens above the tabs.**
   1. Open 내 정보 → 참여 중인 파티. Put a finger near the very left edge (within about a fingertip) and drag right slowly. The screen should move with the finger, with 내 정보 visible under it. Let go past the middle: it should go back to 내 정보.
   2. Do the same in a party room (파티방), a post (모집글), 친구 관리 and 파티 만들기.
   3. Open the menus (or 퀘스트 on the whole screen), which slide up from the bottom. Drag right from the left edge: the screen should move down with the finger, and go back past the middle.
2. **Short drags.** On each screen above, drag about a third of the way and let go slowly. The screen should slide back into place. A quick flick that is short should still go back.
3. **Gesture navigation.** If the phone uses gesture navigation, start a swipe right at the outer edge too. That one may be Android's own back, which goes back at once without following the finger. Note whether the 40 dp edge feels right.
4. **Panel and sheet.**
   1. On 지도 open the friend panel. Swipe right from the left edge past the middle: the panel should close and 지도 should stay.
   2. In 파티 만들기 open the 게시판 sheet. Swipe from the left edge: the sheet should close and 파티 만들기 should stay. A short swipe should leave either open.
5. **지도.**
   1. With nothing open, a swipe from the left edge should do nothing but pan the map.
   2. Open a card on the map, then pan the map from its left edge. The map should pan, and the card should not close.
6. **파티, 행사 and 내 정보.** On each, drag from the left edge. The tab should slide right over a slightly darker ground, with a shadow, while the tab bar stays. Past the middle it should switch to 지도. Short of it, it should spring back.
7. **The 파티 tab's swipes.**
   1. Swipe left and right anywhere on 찾기, 내 파티 and 초대. The tab should change, and the tabs bar should follow.
   2. At 찾기 a swipe right, and at 초대 a swipe left, should do nothing.
   3. Over 찾기's 같이 할 사람을 찾는 중 row, a swipe should scroll the row and not change the tab. **Use the mock build for this step:** the build connected to the Dev Server hides this row.
   4. Over the official banner, a swipe should turn the banner and not change the tab. **Use the mock build for this step too:** the Dev Server build hides the banner.
   5. Over 내 파티's chips (전체 / 비공개 / 공개), a swipe should scroll the chips if they overflow, and should not change the tab.
   6. Scroll each tab up and down, a bit diagonally too. The tab should never change.
   7. A swipe from the left edge on 파티 should go to 지도, not to the previous tab.
8. **Reduced motion.** Turn on 애니메이션 제거. Repeat 1, 2 and 6.
   - Screens and tabs should not move under the finger.
   - Past the middle, back should still happen at once. Short of it, nothing should happen.
   - Slides into screens should be off.
9. **iOS, if a phone is at hand.**
   - The native swipe back on screens above the tabs should work as before.
   - Check 6, 7 and 4 there as well, especially the 파티 tab's swipe against the scrollers.

### Agent usage (2026-10-23)

Counted from this session's Claude Code transcript (`~/.claude/projects/…/287ce395-….jsonl`), from the ticket's first prompt until this count was made. The few calls after the count, which wrote this section, committed it and opened the PR, are not included.

- **Agent time:** about 41 minutes, in one session. This is an estimate. It is the sum of each turn's span (about 33 minutes), from the message that started the turn to the agent's last reply, plus about 8 minutes the agent waited between turns for the full mobile suite. It leaves out time spent waiting for a person, including the wait for the plan's approval.
- **Tokens:** 87 calls to Opus 5.5, with no subagents. Usage was summed once per message id.
  - Input: 11,669,985 in all. Of these, 11,334,446 are cache reads, 335,363 are cache writes and 176 are uncached.
  - Output: 79,745.

### Phone check (2026-10-23)

Checked by the person (Jaehyun0320) on an Android phone, a Galaxy S22 (SM-S901N), and reported as passing. The build was a debug build of all six P20 branches merged on `origin/2.0/Main` (a local branch, not pushed), against the servers in Docker with the demo profile. Not checked on iOS.

- **Checked on the phone:** the edge swipe back follows the finger on the screens above the tabs, and closes an open panel or sheet. On 지도 it does nothing, and on 파티, 행사 and 내 정보 it goes to 지도. In the 파티 tab, a sideways swipe moves between 찾기, 내 파티 and 초대, and vertical scrolls and 내 파티's chips leave the tab as it is.
- **Not checked:** steps 7.3 and 7.4, 찾기's 같이 할 사람을 찾는 중 row and the official banner. A build connected to servers hides them, and they need the mock build. iOS was not checked either.
