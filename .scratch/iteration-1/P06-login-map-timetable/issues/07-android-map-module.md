# 07: Android map module

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 06 (Map component, its interface and marker images)

## What to build

A built Android app shows Kakao's map of the campus behind the map component. The native module's Android side is written in Kotlin from scratch, as a local Expo module inside the app project, and the app's configuration gains what a build needs. It is run on an Android emulator on the developer's machine against the spec's device check, and once more on the team's shared phone before the pull request is merged.

The Kakao native app key is a person's to supply. The agent adds the setting, asks for the value and waits, as `.scratch/research/external-sources.md` §7.1.1 says. §7.2 of that file holds what P05's trial build found: the SDK ships ARM libraries only.

## Acceptance criteria

- [x] The app's configuration names the identifier `com.bonnieandclaude.snunow`, adds Kakao's Maven repository and builds for arm64. The Android and iOS project folders are generated and not committed.
- [x] The module implements the whole interface of ticket 06 with Kakao Maps SDK for Android 2.15.2: the rectangle and zoom limits, camera moves, markers with an image and a text, Avatars that glide, the route line, a press on a marker and the camera's stop.
- [x] Where the SDK does not limit panning, the module brings the camera back inside the rectangle when a move ends outside.
- [x] The module starts the SDK with the native app key from the settings, and resumes and pauses the map with the screen.
- [ ] Kakao's logo is visible and unchanged.
- [x] In a build that holds the module the map component uses it. Expo Go and the web keep the plain ground and do not load the module.
- [x] The app's README gives the steps from a clean checkout to the app on an emulator and on a phone: the tools and their versions, the emulator's system image, the settings to fill in, the commands, and what a wrong key hash looks like.
- [x] The device check is run on the emulator and recorded under Comments, item by item: the map appears, a marker appears with its name, an Avatar glides to a new position, the route line appears and clears, the map survives leaving the screen and coming back, a press on a marker is answered, the camera's stop is reported, and the camera cannot be left outside the campus.
- [ ] If Kakao's map does not run on the emulator, that is recorded under Comments with what was tried, and the device check is run on the shared phone instead.
- [ ] Screenshots of the development screen of ticket 06 on the emulator are in the pull request under Test Results.
- [ ] The pull request is merged only after the device check passed on the team's shared phone, recorded under Comments.
- [x] What the device check changed in the interface of ticket 06, if anything, is recorded under Comments for ticket 11.
- [x] The main screen's tickets that were merged before this one are run on the emulator, and their screenshots, compared with the frames, are added under Comments.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Where things are, in `mobile/`:

- `modules/snu-now-map/` is the native map module, a local Expo module that Expo links into every build for Android:
  - `android/build.gradle` takes `com.kakao.maps.open:android:2.15.2`;
  - `android/src/main/java/com/bonnieandclaude/snunow/map/` holds the Kotlin: `SnuNowMapModule.kt` (the module, the SDK's start, pausing and resuming), `SnuNowMapView.kt` (the view, the camera, the route, presses), `Things.kt` (markers and Avatars as labels, the glide, the pictures), `CameraRules.kt` (a port of `src/map/projection.ts`) and `Records.kt` (what the JS side hands over);
  - `app.plugin.ts` writes `KAKAO_NATIVE_APP_KEY` from `mobile/.env` into the Android manifest when the project is generated.
- `src/map/native-map.tsx` is now the module's view: it flattens the interface and adds the design system's colours and sizes for the route and the text.
- `app.json`: the identifier `com.bonnieandclaude.snunow` (Android and iOS), `expo-build-properties` with Kakao's Maven repository and `buildArchs: ["arm64-v8a"]`, and the module's plugin. `android/` and `ios/` stay ignored, as does the module's own `android/build/`.
- `.env.example` names `KAKAO_NATIVE_APP_KEY`. `pnpm android` is now `expo run:android`, which makes the build; `pnpm start` is the way to Expo Go.
- The README's "Build the app for Android" gives the steps from a clean checkout, and "The Android module" says how the module keeps the rules.

Decisions:

- Zoom: the SDK takes whole levels only. The module measures the Web Mercator zoom from the longitudes the view's width spans, and sets a fractional zoom through the camera's height (`CameraPosition.from(…, height)`), after measuring once, when the map is ready, the zoom plus log2 of the height. On the emulator a move asked for zoom 16.16508 and measured 16.16508.
- The centre is the SDK's own camera position. Reading it from the screen's middle point made it creep about a millionth of a degree on every move.
- The rectangle: when a move ends outside the rules, the camera is moved back inside, as a jump: right after a User's gesture the SDK cuts an animated move short, and on the emulator an animated correction gained 0.003 of zoom per try. After a move this view starts, the camera is not measured for 250 ms, because the SDK takes that long to begin a move. A camera outside the rules is never reported; after three failed corrections in a row the view stops trying until the next move.
- `MIN_ZOOM` 14 and `MAX_ZOOM` 19 stay. On a phone 411 points wide the rectangle sets the lowest zoom, 14.97, so `MIN_ZOOM` is only a floor. At 19 one building fills the view.
- Markers and Avatars are labels on two layers, the Avatars' above, both clickable and without the SDK's competition, so none hides another. Within a layer the rank is `order`, then the place in the list. A layer is not clickable unless it says so: without it no press was answered.
- A picture is a label style made from the file, pixel for pixel (`setApplyDpScale(false)`), registered once under its look, its file and whether it has text. It is drawn at the view's size with the view's shadow. The text is the SDK's, in the `micro` size, in `ink` with a white halo, moved up by the 8 points of clear room. No picture is released while the app runs.
- The glide is the module's own, a linear animation that moves the label every frame, so a new target starts from where the Avatar is shown.
- The route is the SDK's route line in `me`, 5 points wide. It is drawn under the labels: seen on the emulator, not set by a z-order.
- Kakao's logo is unchanged, moved to the bottom right with `getLogo().setPosition`, so that it stays apart from the credit at the bottom left. The criterion's "unchanged" holds for the logo itself, not its place.
- The SDK's wait for its engine to start is 10 seconds instead of 3. Twice on the emulator, under load, the map gave up with `MapTimeoutException`; once it showed tiles but drew no label after.
- Leaving the screen finishes the map; the module stops its glides and does not remove the labels itself, since removing them from a map whose start failed throws.

### Device check on the emulator (2026-10-05)

Android 16 (API 36), Google Play, arm64-v8a, the AVD "Medium Phone" (1080 × 2400, 411 × 914 points); a debug build against the development server; on `/map-check`.

- [x] The map appears: Kakao's campus map, opening on the whole rectangle at zoom 14.97, with the credit at the bottom left and Kakao's logo at the bottom right.
- [x] A marker appears with its name: the event's pin with "AI 커리어" under it, the Friend's Avatar with "민준", the User's Avatar and the party's dot. Once, right after a reinstall, the party's dot did not appear; three relaunches showed it each time.
- [x] An Avatar glides to a new position: "아바타 옮기기" moves the User's Avatar over 5 seconds; halfway it stands halfway, and it glides back.
- [x] The route line appears and clears: "경로 그리기" draws it under the pin, "경로 지우기" removes it.
- [x] The map survives leaving the screen and coming back: sent to the background mid-glide and brought back, the map, its labels and the Avatar at its target were there, and the Avatar glided again. Back to the placeholder and "지도 보기" again opened a new map with everything on it.
- [x] A press on a marker is answered: the pin gives "event:e1", the Friend's Avatar "friend:f1".
- [x] The camera's stop is reported: "카메라" changes after each pan, "확대", "캠퍼스 전체" and "경로에 맞추기" (zoom 16.17, the route's ends 48 points from the edges).
- [x] The camera cannot be left outside the campus: pans past the north and south edges and one-finger zooms down to 12.25 were brought back, the north edge to 37.465697 at zoom 16.17, exactly the computed limit. "캠퍼스 전체" asks for zoom 14 and gets 14.97; "확대" stops at 19.

Not checked on the emulator: a two-finger pinch, which `adb` cannot make; the one-finger zoom stood in for it.

### For ticket 11 (2026-10-05)

The device check changed nothing in the interface of ticket 06 (`src/map/types.ts`). What the Android side learnt, for the iOS side:

- Expect whole zoom levels from the SDK, and measure the Web Mercator zoom from the screen rather than convert levels.
- Expect no limit on panning; bring the camera back after a move ends, without animation, and report only cameras inside the rules.
- Expect labels to hide one another and not to take presses unless told otherwise.
- Draw the picture pixel for pixel; the files are in the phone's pixels.
- Keep the logo away from the credit.

### Not done here

- The device check on the team's shared phone, which the pull request waits for. It is a person's to run.
- The screenshots in the pull request: six were taken on the emulator (the map opened, a pressed marker, an Avatar mid-glide, the route drawn, fitted to the route, the route cleared), to be attached when the pull request is opened.
- No main-screen ticket (08 to 10) is merged yet, so none was run.

### Review and merge (2026-10-05)

- 함재현 built the branch and ran it on an Android emulator on a Mac (`Medium_Phone`, Android 16, API 36, Google Play, arm64-v8a). The map works there. The results were not recorded item by item.
- The device check on the team's shared phone is not done yet. 함재현 decided to merge on the emulator's result, so the criterion "merged only after the device check passed on the team's shared phone" is left unticked and waived for this merge.
- Still to do on the shared phone, recorded here when done: the device check's items, a two-finger pinch, and how the snap-back feels when the map is dragged off campus.

### Agent usage (2026-10-05)

- Agent time: about 1 hour 50 minutes, an estimate, in one session. Roughly half of it was native builds and the emulator running, which the agent waited on.
- Tokens: the two review subagents used about 69 thousand and 73 thousand tokens, totals without a split into input and output. The main session's split, and its cache reads and writes, were not measured: its context reached about 360 thousand tokens, and cache reads of that context, turn after turn, make up most of its input.
