# 08: Main screen: the map, my position and the bottom navigation

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 05 (Onboarding screen), 06 (Map component, its interface and marker images)

## What to build

The main screen appears after a sign-in: the map filling the screen, the User's Avatar at their position, the zoom and position buttons, and the bottom navigation. A User pans and zooms on the campus, returns to their position with a button, and, off campus or without the location permission, still sees the whole campus. This is the `Main` frame without its markers, lists and other controls, which tickets 09 and 10 add.

## Acceptance criteria

- [x] The map fills the screen and opens on the whole campus.
- [x] The bottom navigation has the frame's five slots, 지도, 파티, 올리기, 행사 and 내 정보, with the frame's centre button and badge. Every slot but 지도 shows the "준비 중이에요" toast.
- [x] The 파티 badge shows 3: the number of things waiting for the User in Parties, a mock of the app's own behind the API client.
- [x] The centre button, 올리기, is the design system's raised item. A long press on it does nothing.
- [x] The zoom in, zoom out and "내 위치로 이동" buttons sit where the frame puts them and work as in the frame.
- [x] The zoom in and zoom out buttons change the zoom by a factor 1.5 around the view's centre.
- [x] "내 위치로 이동" goes to the User's position at the larger of the current zoom and the "close" level.
- [x] The zoom levels are named once, counted from the fit zoom, for tickets 09 and 10 to use: "pins" (+0.68), "names" (+1.26), "close" (+1.38) and one press of a zoom button (0.585).
- [x] The first time the screen opens, the explanation before the location prompt appears with the spec's words, in the design system's Dialog. "계속" leads to the system's prompt; "나중에" or a refusal leaves the map without an Avatar.
- [x] The position comes from `expo-location`, in the version Expo SDK 57 expects.
- [x] With the permission, the User's Avatar is at the phone's position and glides to each new one. It is shown only while the position is inside the campus rectangle.
- [x] The User's Avatar is drawn at 0.75 of its size while the whole campus is in view, below the "pins" level.
- [x] Off campus, "내 위치로 이동" shows "캠퍼스 밖에 있어요" and moves the camera to the whole campus. Without the permission it shows the explanation again.
- [x] A development setting replaces the phone's position with a walk along a fixed path on campus.
- [x] The shared Toast has the frame's look: a bar from 16 to 16 from the sides on the `ink` ground, radius 12, padding 12 and 16, a `check` icon of 18 and white words of 14/20 in the medium weight. It lasts 2400 ms, or the time its caller gives.
- [x] Jest tests with a given position: the Avatar on campus, no Avatar off campus, the toast off campus, the explanation and both of its answers, and a tab's toast.
- [x] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots are in the pull request under Test Results, each compared with the frame: of the web target with the plain ground, and, once ticket 07 is merged, of the emulator with the map and the walking Avatar.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

The frame `Main` was read again when the work started and is unchanged since the spec: 148106 bytes at canvas version `1791129072-d0ec`.

Where things are, in `mobile/`:

- `src/screens/main/`: `main-screen.tsx` (the screen and `OverMap`, the place of what floats over the map), `use-main-map.ts` (the map's handle, the camera, the fit zoom, the detail by zoom and the moves), `use-me.ts` (the User's Avatar, "내 위치로 이동", the explanation), `zoom-control.tsx`, `main-nav.tsx`, `location-explanation.tsx`, `layout.ts` (the frame's offsets, counted from the navigation's top edge). `src/app/main.tsx` only says which place it is.
- `src/position/`: `usePosition()`, `phone.ts` (the one file that names `expo-location`), `walk.ts` (the development walk's path).
- `src/map/campus.ts`: `ZOOM_OFFSET` and `zoomDetail`. `src/map/types.ts` and `plain-map.tsx`: `onFitZoom`.
- `src/api/`: the operation `getPartyNews`, its type `PartyNews` marked as the app's own, the mock's 3, `partyNewsQuery`; `src/features/parties/`: `usePartyBadge()`.
- `src/design-system/`: the Toast's look and time, the icon `minus`, the `small` form of the `me` pin.
- Tests: `__tests__/main-test.tsx`, `main-location-test.tsx`, `main-walk-test.tsx`, with `__tests__/support/main.tsx`; additions to the Toast's, the map camera's, the pin's, the client's and the catalogue's tests.

Decisions made while building:

- The development setting is `EXPO_PUBLIC_CAMPUS_WALK=1`. With it the phone is asked nothing, the permission counts as granted, and the position takes a step along a round of ten points every five seconds, starting where the frame draws the User.
- `usePosition()` has a fourth permission, `checking`, until the phone has said whether the User was asked before, so that the explanation does not flash for a User who allowed it earlier.
- "The first time" for the explanation is each time the screen opens while the phone says the User was never asked. After "나중에" it does not come again by itself while the screen stays open; after a refusal of the system's prompt the phone says "refused", and it comes only on "내 위치로 이동". The phone keeps nothing about it.
- A new position comes about every five seconds, from the phone and from the walk, and the Avatar's glide takes the same five seconds.
- "내 위치로 이동" does nothing in the moment between the permission and the first position.
- The map tells its fit zoom with a new property, `onFitZoom`, and the screen counts every level from it. The zoom buttons use the existing `moveCamera`; the screen remembers the zoom the camera is on its way to, so that two quick presses are two steps.
- The toast sits 78 above the navigation, where the frame has it: over the row of buttons that ticket 10 adds, clear of the AI input.
- The placeholder screen is gone, and with it the temporary sign-out button and the buttons to the catalogue and the map's check. The README gives their addresses and the links that open them, and `EXPO_PUBLIC_FIRST_STATE=1` leads back to the sign-in screen.
- The system prompt's words on iOS are the explanation's body, set through the config plugin of `expo-location` in `app.json`. Only the permission while the app is in use is asked.

Differences from the frame:

- The map ends at the navigation's top and does not run under it, so that the map's credit and Kakao's logo stay uncovered until ticket 10 gives the map an inset.
- The centre button is the design system's raised item: 60 with a white border, standing out of the bar, with its label "올리기" shown. The frame draws a round 44 inside the bar and hides the label.
- The bar is the design system's, with a line on top. The frame draws a soft shadow above it.
- The zoom control's buttons have a touch area of 48 around their 44, and a pressed look, which the frame does not draw.
- The frame's navigation has 16 under the bar; the app has the phone's own inset there, which is 0 on a phone without a bar of its own.
- The lists, the markers, the route, the cards and the other controls of the frame are tickets 09 and 10.

Not checked: nothing ran in a browser, on a phone or in a native build. So the system's location prompt, the browser's geolocation, the words of the iOS prompt, the config plugin in a real build, the safe-area inset and the look of the zoom control and the Toast on a screen were not seen. No screenshot was taken.

What ticket 07 must know:

- `MapProps` gained `onFitZoom?: (zoom: number) => void`. The native side sends the lowest zoom it allows, in Web Mercator levels as every zoom: once when the map is ready, before the first `onCameraIdle`, and again whenever the view's size changes it. Without it the main screen takes the whole campus for in view at every zoom: the Avatar stays small, and the zoom out button is not held at the whole campus by the screen, only by the map.
- The main screen asks `moveCamera({ zoom, animated: true })` for a zoom button, with a fraction of a level (a step is 0.585), and `moveCamera({ centre, zoom, animated: true })` for "내 위치로 이동" and the whole campus (`zoom: MIN_ZOOM`, which the map brings up to its fit zoom).
- There is a new look, `me:small`, the User's Avatar at three quarters of its size (36 points with its ring). The screen swaps the Avatar's image between `me` and `me:small` at the "pins" level; a new image alone must not restart a glide.
- The User's Avatar has `glideMs` 5000 and `order` 1.
- `/map-check` is no longer linked from a screen. In a development build it opens with `adb shell am start -a android.intent.action.VIEW -d snunow://map-check`.
