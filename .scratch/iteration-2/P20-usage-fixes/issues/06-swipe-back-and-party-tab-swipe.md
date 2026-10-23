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
- **Sideways scrollers inside the tabs** win inside their own area: 찾기's row of people looking for company, the official recruiting banner, and 내 파티's chip row. The build connected to the server hides the first two, which are still mocks there (P06's `server-endpoints.md`). Check the conflicts in the mock build, where they show.
- **Vertical scrolling** never turns into a tab change.
- **At either end, 찾기 and 초대**, a swipe further does not change the tab.
- **Thresholds**: the edge width, the distances and the angles are the implementer's to choose. Write the values under `## Comments`.

Plan items 7 and 8 say where each part lives.

## Acceptance criteria

- [ ] **Edge swipe back.**
  - On an Android phone, on a screen above the tabs, a swipe from the left edge drags the screen with the finger. Past the threshold it goes back to the screen under it; short of it, it slides back into place.
  - An open side panel or bottom sheet goes away with the swipe as it does with the back button.
  - On 지도 the edge swipe does nothing, and the map still pans from its edges.
  - On 파티, 행사 and 내 정보, a swipe from the left edge past the threshold goes to 지도, and one short of it leaves the tab as it was.
  - Every screen keeps its slide in and its back button, and reduced motion still turns the slides off.
- [ ] **Swipe between the 파티 tab's tabs.**
  - In the 파티 tab, a sideways swipe moves between 찾기, 내 파티 and 초대, and the tabs bar and the address follow.
  - A press on a tab still works.
  - A vertical scroll never changes the tab.
  - The sideways scrollers inside the tabs scroll without changing the tab, checked in the mock build, where 찾기's people row and the official banner show.
  - A swipe from the left edge in the 파티 tab is the back gesture, not a tab change.
- [ ] **Tests:**
  - the 파티 tab moves to the next and previous tab on a sideways swipe, and stays at its ends
  - a swipe that starts at the left edge is not taken as a tab change, and on 파티, 행사 and 내 정보 it shows 지도
  - the existing navigation, party tab and back-button tests pass
- [ ] Checked on an Android phone: the edge swipe on several screens above the tabs, with a panel or a sheet open, on 지도 and on the other tabs, and the 파티 tab's swipes, including over its sideways scrollers. Also checked on iOS if one is at hand, where the native swipe back must still work. Write what was and was not checked under `## Comments`.

## Comments
