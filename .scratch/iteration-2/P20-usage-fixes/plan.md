# P20: Usage fixes

These are fixes from using the app on a phone. This file is a short plan, not a spec. Each item says what is wrong and whether the current code shows the problem. It also says where to look. The tickets are cut from it at the end.

All paths are under `mobile/src/` unless they say otherwise. "Checked in code" means the code was read and matches the report; nothing here has been reproduced on a phone yet.

## Items

### 1. The AI chat sometimes stops scrolling

**Report.** In the AI chat sheet the conversation sometimes stops scrolling. It scrolls again only after the sheet is closed with ✕ and opened again.

**When.** The user has seen it after the keyboard went up or down, but no pattern is certain. The cause is not known yet: diagnose it on the device first.

**Suspects from the code.**
- `ChatBubbles` calls `scrollToEnd({ animated: true })` from `onContentSizeChange` (`screens/main/chat-bubbles.tsx`). The bubbles' `paddingBottom` is `under`, and `under` follows the keyboard's lift (`map-bottom.tsx` → `chat.sheet(AI_INPUT.bottom + lift + inputHeight)` → `chat-sheet.tsx`). So the keyboard going up or down changes the content size and starts an animated scroll. With `keyboardDismissMode="on-drag"`, a drag puts the keyboard down, and that change can start a scroll to the end while the finger is still dragging. That fits "after keyboard up/down".
- The whole sheet is a `Pressable` around the `ScrollView` (`ChatSheet` in `chat-sheet.tsx`, added by P07-09 so that a press puts the keyboard down). Its `blockNativeResponder` is false (RN's default), so it should not block the native scroll by itself. It is still the newest thing between the finger and the scroll view.
- `ChatEmpty` has the same `ScrollView` set-up without the scroll to the end.

**Where to look.** `screens/main/chat-sheet.tsx`, `screens/main/chat-bubbles.tsx`, `screens/main/map-bottom.tsx`, `screens/main/ai-input.tsx`, `hooks/use-keyboard-height.ts`. Background: `.scratch/iteration-2/P07-ai-activity-chat/issues/09-chat-input-on-device.md`.

### 2. Filter chips sit right against what is above them on Android

**Report.** On Android, each row of filter chips touches the element right above it. The rows are:
- the friend panel's 전체 / 공강 / 위치 꺼짐 … under its search box,
- the 행사 tab's 오늘 / 이번 주 / 파티 모집 중 …,
- 파티 → 내 파티's 전체 / 비공개 / 공개.

**Wanted.** Some space between each row and what is above it.

**Checked in code.** All three rows are horizontal `ScrollView`s whose only vertical room comes from `minHeight: 56` with `alignItems: 'center'` on the content container: `ChipRow` (`design-system/chip-row.tsx`) and the 행사 tab's own `Filters` (`screens/events/events-bar.tsx`, `filters` style). There is no padding or margin above them. Likely cause: Android does not size the horizontal scroll view to that content `minHeight`, so the row is only as tall as the chips. Give the room in a way Android keeps, such as vertical padding on the scroll view itself.

**Where to look.** `design-system/chip-row.tsx`, `screens/events/events-bar.tsx` (`Filters`), `screens/main/friend-panel.tsx` (`styles.search`), `screens/party/mine-tab.tsx`. `ChipRow` is also used by 내 퀘스트 (`screens/quests/quests-screen.tsx`) and the catalogue: check that they still look right.

### 3. Markers at the same place hide each other

**Report.** When one place has, say, a Global Event and a Party's Quest, one marker lies on top of the other, and the one underneath cannot be pressed.

**Wanted.**
- Where several markers stand at one place, draw one marker: the usual circle, with a small circle inside it for each kind that is there.
- A press opens a card with a chip for each kind (행사, 파티, …), each listing what is there of that kind.
- A press on a row opens that thing's own card.

**Decided.** "The same place" means exactly the same coordinates, the way Global Events are grouped today. Markers that are only near each other are not merged.

**Checked in code.** Only Global Events are grouped: `groupedByPoint` in `features/map/event-points.ts` makes an `event-point` card with `choices`. It marks each event as `within` the point, so the event draws no marker of its own (`screens/main/use-things.ts`). Nothing else is grouped. Every other place marker at the same coordinates is drawn separately and overlaps.

**What can stand at a place.** Every place marker must be covered:
- `global-event` and the existing `event-point`,
- `party` and `shared-quest`, drawn as a Party, and a Quest the User holds alone, drawn as a Quest (`features/map/adapter.ts`, `questCards`),
- `dining` (`features/dining/adapter.ts`), while its layer is on,
- `shuttle-stop` (`features/shuttle/adapter.ts`), while its layer is on.

People (Friends, Party members, the User) and shuttle vehicles are Avatars. They move, so they stay out of the grouping.

**Where to look.**
- Grouping: `screens/main/main-screen.tsx:196`, where the map's, the dining and the shuttle cards are first in one list. The grouping has to run on that list, not inside `toCards`. Also `features/map/event-points.ts`, which can become a general per-point grouping, and `features/map/adapter.ts` (`CardView.kind`, `within`, `choices`).
- Drawing: `screens/main/use-things.ts` (`lookOf`, `everyLook`), `map/marker-looks.tsx`, `map/marker-images.tsx`, `design-system/map-pin.tsx`.
- Selecting and the card: `screens/main/use-selection.ts`, `screens/main/card.tsx` (`Choices`, which gets the chips).

### 4. A public party's card in 찾기 does nothing when pressed

**Report.** In 파티 → 찾기 → 모집 중인 파티, pressing a public party's card does nothing.

**Wanted.** Pressing the card opens that party's post (모집글).

**Checked in code.** `PostCard` (`screens/party/post-card.tsx`) is pressable only when given `onOpen`, and its comment says this is on purpose ("which a press opens where it is drawn outside 찾기"). `Posts` in `screens/party/find-tab.tsx` passes no `onOpen`, so only the small `자세히 ›` opens the post. Fix: pass `onOpen` → `openPost(questId)`. `관심 없음` and `참여하기` must keep their own presses. Update the comment that says 찾기's card is not pressable.

**Where to look.** `screens/party/find-tab.tsx`, `screens/party/post-card.tsx`.

### 5. The keyboard covers the input being typed in

**Report.** In many places, the keyboard comes up over the field being typed in, and the field stays hidden behind it.

**Wanted.** Every input rises above the keyboard. Go through every place there is an input.

**Checked in code.**
- Expo 57 runs Android edge to edge, so the window no longer shrinks for the keyboard.
- Only two places respond to it:
  - the onboarding (`KeyboardAvoidingView` in `screens/onboarding/onboarding-screen.tsx`, and `useKeyboardShown` in `foot.tsx`),
  - the main screen's AI input (`useKeyboardHeight` in `screens/main/map-bottom.tsx`).
- `FullScreenPanel` (`design-system/full-screen-panel.tsx`) and `BottomSheet` (`design-system/bottom-sheet.tsx`) do nothing for the keyboard. Most inputs sit in one of these two.
- `react-native-keyboard-controller` is not installed. Whether to add it, or to build on `useKeyboardHeight`, is for the ticket to decide. A new native dependency needs a new dev build, which is fine at this stage.

**Inputs to go through.** Check each on the device:
- 파티방's chat input: `ChatInput` in `screens/room/party-chat.tsx`, inside `screens/room/room-screen.tsx`,
- 파티방's plan form: `screens/room/plan-form.tsx`,
- 파티 만들기 / 모집글 수정: `screens/party/form/party-form-screen.tsx`, `party-form-fields.tsx`, `tag-field.tsx`,
- the form's sheets with a search: `screens/party/form/event-field.tsx`, `friend-picker.tsx`, `board-sheet.tsx`,
- the place picker: `screens/places/place-picker.tsx`,
- 친구 추가 (친구 ID): `screens/friends/add-screen.tsx`,
- 친구 관리's search: `screens/friends/friends-screen.tsx`,
- the friend panel's search: `screens/main/friend-panel.tsx`,
- the 행사 tab's search: `screens/events/events-bar.tsx`,
- 파티 → 찾기's search: `screens/party/find-tab.tsx`,
- 시간표 version rename: `screens/me/version-rename.tsx`, inside 내 정보's week card (`week-card.tsx` → `version-menu.tsx`) in the tab's own `ScrollView`, not in `FullScreenPanel`,
- 수업 추가 / 수정: `screens/timetable/class-form-screen.tsx`,
- the onboarding, which already has `KeyboardAvoidingView`: check that it works on Android edge to edge,
- the AI input: already rises, so keep it as it is unless one shared mechanism replaces `useKeyboardHeight`.

Fields at the top of a screen, such as the searches, may never be covered. Mark those as checked, not changed.

**Where to look.** `design-system/full-screen-panel.tsx`, `design-system/bottom-sheet.tsx`, `design-system/chat-input.tsx`, `design-system/text-field.tsx`, `hooks/use-keyboard-height.ts`, and the screens above.

### 6. 내 정보 → 참여 중인 파티 jumps, and back leaves to the map

**Report.** On 내 정보, pressing 참여 중인 파티 switches the screen at once, with no slide. 친구 관리 and 내 퀘스트 slide in. Back from there goes to the main map instead of 내 정보.

**Checked in code.** `screens/me/me-screen.tsx:146` calls `router.navigate({ pathname: '/party', params: { tab: 'mine' } })`. That switches tabs, which has no animation. The tabs use `backBehavior="firstRoute"` (`app/(signed-in)/(tabs)/_layout.tsx`), so back goes to 지도.

**Decided.** A new screen above the tabs, pushed from 내 정보 and sliding in from the right like 친구 관리, shows the 내 파티 list. Back returns to 내 정보. The 파티 tab does not change.

**Where to look.**
- Wiring: `screens/me/me-screen.tsx`, and `app/(signed-in)/_layout.tsx` (register the screen with `slideFrom('right', …)`). Add a new route such as `app/(signed-in)/me/parties.tsx`.
- Content: `screens/party/mine-tab.tsx`. Reuse its list in a `FullScreenPanel`.
- `showMine()` in `screens/party/use-party-actions.ts` still goes to the 파티 tab: leave it.

### 7. Swiping from the left edge goes back

**Report.** A swipe from the screen's left edge should go back, as the Android back button or the in-app back button does.

**Decided.** The screen follows the finger, iOS style: it slides with the finger from the left edge and goes back once dragged far enough, or slides back into place if not.

**Checked in code.**
- The signed-in screens are a native stack (`app/(signed-in)/_layout.tsx`). On Android a native stack has no interactive swipe-back, and `predictiveBackGestureEnabled` is `false` in `mobile/app.json`.
- `react-native-gesture-handler` and `react-native-reanimated` are installed.
- One option is a JS stack for these screens, `@react-navigation/stack` through expo-router's `withLayoutContext`, whose cards follow the finger on Android. The ticket decides.

**Defaults to keep unless the ticket finds better.**
- On a screen above the tabs, the swipe pops it.
- On 파티, 행사 and 내 정보, the edge swipe goes to 지도, as the back button does there (decided).
- On 지도 the edge swipe does nothing, because back there would leave the app and the map needs drags from its edges.
- An open side panel or bottom sheet goes away as the back button makes it go (`hooks/use-back-to-close.ts`).
- Exact edge width and distances are for the implementer.

**Where to look.** `app/(signed-in)/_layout.tsx`, `app/(signed-in)/(tabs)/_layout.tsx`, `hooks/use-back-to-close.ts`, `design-system/side-panel.tsx`, `design-system/bottom-sheet.tsx`, `mobile/app.json`.

### 8. Swiping between 찾기, 내 파티 and 초대 in the 파티 tab

**Report.** In the 파티 tab, a light sideways swipe anywhere on the screen moves between 찾기, 내 파티 and 초대. It does not have to start at the edge.

**Wanted.** A swipe from the very left edge stays item 7's back, and every other sideways swipe changes the tab. The thresholds are for the implementer.

**Checked in code.** `PartyScreen` (`screens/party/party-screen.tsx`) shows one of `FindTab`, `MineTab` or `InvitesTab` by the `tab` search parameter (`app/(signed-in)/(tabs)/party.tsx`). There is no gesture. `react-native-pager-view` is not installed.

**Conflicts to handle.**
- Sideways scrollers inside the tabs win inside their own area. The first two below are hidden in the server build, being mocks, so check them in the mock build:
  - 찾기's 같이 할 사람을 찾는 중 row (`find-tab.tsx`),
  - the official banner (`official-banner.tsx`),
  - 내 파티's `ChipRow`.
- Vertical scrolling must not turn into a tab change.
- The swipe and `SegmentedTabs` stay in step, and the address keeps naming the tab.

**Where to look.** `screens/party/party-screen.tsx`, `app/(signed-in)/(tabs)/party.tsx`, `design-system/segmented-tabs.tsx`, `screens/party/find-tab.tsx`, `mine-tab.tsx`, `invites-tab.tsx`, `official-banner.tsx`.

## Tickets

Items are grouped so that work which touches the same code, or is checked on the device the same way, lands in one ticket.

| # | Ticket | Items | Blocked by | Why grouped like this |
| - | ------ | ----- | ---------- | --------------------- |
| 01 | Room above the filter chips, and 찾기's card opens its post | 2, 4 | — | Both are small, layout-level fixes in the party and events screens. One quick ticket, checked together on Android. |
| 02 | Every input rises above the keyboard | 5 | — | One shared way of avoiding the keyboard, mostly in `FullScreenPanel` and `BottomSheet`, then the audit of every input. |
| 03 | The AI chat keeps scrolling | 1 | 02 | The likely cause runs through the keyboard's lift, which 02 may change. It is diagnosed on the device once 02's keyboard handling is in. |
| 04 | One marker for everything at one place | 3 | — | Self-contained in the map: grouping, the marker's look, and the card with chips. |
| 05 | 참여 중인 파티 as its own screen | 6 | — | A new route and screen, with nothing shared with the gestures beyond being a stack screen. |
| 06 | Swipes: back from the left edge, and between the 파티 tab's tabs | 7, 8 | — | Both are horizontal gestures, and they must share one rule for who takes a swipe. The edge belongs to back, and the rest of the 파티 tab to the tabs. Built and tuned together, they cannot fight each other. |

Order: 01, 04 and 05 can start at once and in parallel. 02 comes before 03. 06 can start at once. If 05 lands first, 06 covers 05's new screen as one more screen above the tabs.
