# 11: iOS map module

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 07 (Android map module), with its device check recorded

## What to build

A built iOS app shows Kakao's map of the campus behind the map component. The native module's iOS side is written in Swift to the interface of ticket 06 as the Android device check left it, by a teammate with a Mac, and checked on the simulator against the same device check.

The registration is a person's: the iOS app's identifier at Kakao. The agent adds what the app's configuration needs, asks for what a person must do and waits.

## Acceptance criteria

- [x] The module's iOS side implements the whole interface of ticket 06 with Kakao Maps SDK for iOS, taken as a CocoaPods pod: the rectangle and zoom limits, camera moves, markers with an image and a text, Avatars that glide, the route line, a press on a marker and the camera's stop.
- [x] The module drives the SDK's engine itself: it prepares and activates it when the view is attached to a window, pauses and resets it when the view leaves or the app goes to the background, and activates it again on return.
- [x] The module sets the map's size when the view's size changes, a first size of zero included.
- [ ] What the screen asks for before the map is ready is kept and carried out once it is.
- [x] Where the SDK does not limit panning, the module brings the camera back inside the rectangle when a move ends outside. Kakao's logo is visible and unchanged.
- [x] The iOS app's identifier is `com.bonnieandclaude.snunow`, and the iOS project folder is generated and not committed.
- [x] The app's README gives the steps to a build on the simulator and on an iPhone, with what must be registered at Kakao.
- [x] `.scratch/research/external-sources.md` gains what was learned for iOS, with its sources: the SDK, its version and its registration.
- [ ] The device check is run on the simulator and recorded under Comments, item by item as in ticket 07, with screenshots of ticket 06's development screen in the pull request under Test Results.
- [x] The words of the plain ground no longer name Android alone.
- [ ] The Jest tests, Expo Go and the Android build are unchanged.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-06)

Where things are, in `mobile/`:

- `modules/snu-now-map/ios/` is the module's iOS side, in Swift:
  - `SnuNowMap.podspec` takes the CocoaPods pod `KakaoMapsSDK` 2.12.19;
  - `SnuNowMapModule.swift` (the module, the SDK's key, pausing and activating the engines with the app), `SnuNowMapView.swift` (the view, the engine, the camera, the route, presses), `Things.swift` (markers and Avatars as Pois, the glide, the pictures), `CameraRules.swift` (a port of `CameraRules.kt`) and `Records.swift` (what the JS side hands over).
- `modules/snu-now-map/expo-module.config.json` names the iOS module; `app.plugin.ts` also writes `KAKAO_NATIVE_APP_KEY` into the iOS app's `Info.plist`. The Android part of the plugin is unchanged.
- `plugins/ios-scene-life-cycle.ts`, in `app.json`, and a change to `app.config.ts`: see "Outside the module" below.
- The plain ground says "지도는 Android·iOS 빌드에서 보입니다". The tests that read the words, the README, ticket 06, the spec and `todo.md` say the same.
- `pnpm ios` is now `expo run:ios`, as `pnpm android` is `expo run:android`.
- The README gains "Build the app for iOS" and "The iOS module"; `.scratch/research/external-sources.md` gains §7.6 and the iOS bundle ID in the registration record.
- `src/map/types.ts` and `src/map/native-map.tsx` are unchanged: the iOS side takes the same view, props and calls as the Android side.

Decisions:

- The engine: the view prepares and activates it on the first layout that gives it a size while it is in a window, and pauses and resets it when it leaves the window. When the app goes to the background, the engine is paused only, as Kakao's guide says, and keeps what it shows; it is activated again when the app is active. The criterion's "pauses and resets it when the view leaves or the app goes to the background" is read as "pauses when the app goes to the background, and pauses and resets when the view leaves".
- A map made again, after the view left its window and came back, opens on the camera last reported instead of the whole campus.
- A `moveCamera` or `fitTo` asked before the map is ready is kept, the last one only, and carried out once the map opens.
- Zoom, as on Android: through the camera's height, with the zoom plus log2 of the height measured from the screen. The measure spans the left half of the view, since the SDK answers a point on the right edge with (0, 0), and it is taken again after each move the view makes: the first one, taken while the view still took its size (706, then 610 points high), made every move miss by 0.21 of zoom.
- The rectangle: the SDK does not limit panning; a camera outside the rules is brought back with a jump and never reported, with the 3 tries of the Android side. `cameraDidStopped` and the callbacks of `moveCamera` and `animateCamera` say when a move ended, with a fallback after 0.5 seconds.
- Markers and Avatars are Pois on two label layers, zOrder 5001 and 5002, without competition, clickable. The rank within a layer is `order`, then the place in the list.
- A picture is redrawn at twice its size in points, in 8-bit RGBA sRGB, since the SDK draws a pixel at half the screen's scale and throws on a wider format. The text is the SDK's, in `ink` with a white halo, moved up into the picture's clear room by a negative padding.
- The glide is the module's own, a display link that moves the Poi every frame.
- The route is the SDK's route line in `me`, 5 points wide; the SDK always draws routes under labels.
- Kakao's logo is left where the SDK puts it, at the bottom right, apart from the credit.
- The SDK's wait for the map's configuration is 10 seconds, as the Android side's start timeout.
- Markers, Avatars and camera moves are read from dictionaries: Expo's records refuse the `null` that `native-map.tsx` sends, and Expo drops a prop that fails to convert without a log.

Outside the module, needed for any iOS build of the app:

- `plugins/ios-scene-life-cycle.ts`: the iOS 27 SDK refuses to launch an app without the scene life cycle ("UIScene life cycle is required for apps built with this SDK"). Expo 57 ships `ExpoAppSceneDelegate`, but its template, up to 57.0.28, does not use it. The plugin names it in `Info.plist` and lets the app delegate hand it the React Native factory. Decided with 함재현.
- `app.config.ts`: `pod install` failed on `AppCheckCore`, whose Google dependencies need modular headers to be linked statically. The sign-in library's plugin adds them, but only runs when `GOOGLE_IOS_URL_SCHEME` is set; without it, `app.config.ts` now adds the same three lines to the Podfile. Decided with 함재현.

### Device check on the simulator (2026-10-06)

iPhone 17 simulator, iOS 27.0, 402 × 874 points (the map 402 × 610), Xcode 27.0; a debug build against the development server; on `/map-check`. Presses and drags were sent with AXe 1.8.0.

- [x] The map appears: Kakao's campus map, opening on the whole rectangle at zoom 14.94, the credit at the bottom left and Kakao's logo at the bottom right.
- [x] A marker appears with its name: the event's pin with "AI 커리어" under it, the Friend's Avatar with "민준", the User's Avatar and the party's dot, at the size of the design system's views.
- [x] An Avatar glides to a new position: "아바타 옮기기" moves the User's Avatar over 5 seconds; at 2.3 seconds it stood halfway.
- [x] The route line appears and clears: "경로 그리기" draws it under the pin, "경로 지우기" removes it.
- [x] The map survives leaving the screen and coming back: sent to the home screen mid-glide and opened again, the map, its labels and the Avatar at its target were there, and the Avatar glided again. Back to the placeholder, the engine stopped, and "지도 보기" again opened a new map with everything on it.
- [x] A press on a marker is answered: the pin gives "event:e1", the Friend's Avatar "friend:f1".
- [x] The camera's stop is reported: "카메라" changes after "확대" (16.94, 17.94, 18.94, then 19.00 and no further), "캠퍼스 전체" (asks 14, gets 14.94) and "경로에 맞추기" (zoom 15.94, the route's ends about 48 points from the edges).
- [x] The camera cannot be left outside the campus: dragged far past the north edge at zoom 16.94, it was brought back to 37.46829, the computed limit 37.468293.

Not checked on the simulator: a two-finger pinch, which AXe cannot make. On 함재현's iPhone 14 Pro, with a debug build, the same items, a pinch and a drag off campus worked "as on Android" (함재현, 2026-10-06); they were not recorded one by one.

Screenshots, for the pull request's Test Results: the map opened, a pressed pin, an Avatar mid-glide and arrived, the route drawn, fitted to the route, the route cleared, dragged north, back from the background, the map opened again.

### What the check changed in the module

The first run on the simulator found five faults, each fixed in the module:

1. `Prepare engine failed! ViewSize is zero.`: the view is in a window before it is laid out. The engine is now prepared on the first layout with a size (the criterion on a first size of zero).
2. Kakao answered 401 until the bundle ID was registered at Kakao.
3. `getPosition` at the right edge answers (0, 0), so the zoom could not be measured: measured over the left half.
4. Every move landed 0.21 of zoom too low, from a scale measured during the view's first resize: measured again after each move.
5. No marker reached the map: Expo's records refused the `null` fields, silently. And then the app quit when the first picture was handed to the SDK, in a wide-colour format: pictures are redrawn in 8-bit RGBA.

### Building

- The repository sits on a Desktop that iCloud Drive syncs, and `codesign` refuses what the build makes there (`resource fork, Finder information, or similar detritus not allowed`). The builds ran from a copy of `mobile/` in `~/Developer/snu-now-ios-build`, kept in step with `rsync`. The README now says to clone outside iCloud.
- `pod install` stalled on two downloads from Maven (React Native's core and Hermes, about 160 MB) at 20 KB/s; fetched in parallel ranges into `~/Library/Caches/ReactNative`, checked against Maven's SHA-1, they were taken from the cache.
- AXe's plain `tap` does not reach the app on the iOS 27 simulator; a `touch` held for 0.15 seconds does. Its taps do not reach the system's "Open in “SNU Now”?" alert either, which 함재현 pressed once.

### Android build and Expo Go (2026-10-06)

- The Android build, from the same tree, built and installed on the "Medium Phone" emulator (Android 16, arm64-v8a) in 32 minutes. `/map-check` showed Kakao's map at zoom 14.97, as in ticket 07, with the labels, the credit and the logo; a press on the pin gave "event:e1". Kakao's tiles came about 30 seconds late on an emulator that the iOS build left busy.
- Expo Go, on the same emulator, failed on `/map-check` with "Render Error: undefined is not a function" at `things.toSorted` in `src/map/plain-map.tsx`. It is older than this ticket: 1.0/Main (5ff4e65) has the same line, and `src/features/quests/adapter.ts` uses `toSorted` too. Expo Go's JavaScript engine on Android has no `Array.prototype.toSorted`; Jest runs on Node, which has it. With 함재현, `src/polyfills.ts` adds it where it is missing, imported first by the root layout. The four checks pass with it, but whether Expo Go then shows the plain ground with its new words was not seen: Expo Go did not ask the restarted server for a new bundle before the work stopped.

### Not done here

- The criterion "What the screen asks for before the map is ready is kept and carried out once it is" is built (`waiting` in `SnuNowMapView.swift`, the last `moveCamera` or `fitTo` only) but no screen asks that early, so it was not seen working. Left unticked.
- The screenshots are not in a pull request yet: fourteen were taken (the twelve of the device check, Expo Go's error and the Android map), kept on 함재현's Mac in `~/Developer/snu-now-ios-build/screenshots-p06-11/`, to be attached under Test Results.
- Expo Go with the polyfill, on Android and on iOS. Left unticked.
- The device check on the phone was 함재현's, not recorded item by item.

### After the review (2026-10-06)

Changed in code after the pull request's review. Nothing here was built or run: the four checks pass, and each item is left for a build to show.

- Kakao's logo and the map's inset, on both sides. The modules take the `inset` prop that `native-map.tsx` already sent, and place the logo 8 points from the bottom right of what the screen's controls leave (`placeLogo`, again whenever the inset changes). iOS uses `setLogoPosition(origin: GuiAlignment(vAlign: .bottom, hAlign: .right), position:)` with positive offsets; the SDK's documents call the position an offset from the alignment's point and do not say which way a positive one goes, so the direction is the first thing to see in a build.
- A camera call before the map is ready, on Android. `moveCamera` and `fitTo` were dropped there before the map opened; they are now kept, the last one only, and carried out once it opens, as on iOS. `/map-check` gains "새로 열고 바로 맞추기", which makes the map anew and asks it to fit the route at once: a map that keeps the request opens fitted to the route, not on the whole campus.
- `withGooglePods` throws with a clear message when the Podfile has no `config = use_native_modules` line, instead of leaving Google's pods out silently.
- The scene life cycle and URLs: no change. Expo's `ExpoAppSceneDelegate` forwards `openURLContexts`, `continue userActivity` and the URL a cold start is opened with (expo 57.0.25, `ios/AppDelegates/ExpoAppSceneDelegate.swift`). Not yet seen working: a `snunow://` link, the return from Google's sign-in on iOS (ticket 12), and the Invite Link (P14).

Left to check in a build:

- On the main screen, on iOS and on Android: Kakao's logo inside the inset, left of the zoom control and above "활성 파티", and above a card while one is open. On iOS, first that a positive offset moves the logo inwards.
- On `/map-check`, on iOS and on Android: "새로 열고 바로 맞추기" opens the new map fitted to the route.
- `pnpm expo prebuild --platform ios` still generates the Podfile with Google's pods.
- On the iOS simulator: `xcrun simctl openurl booted snunow://main` opens the app on that screen.

### Agent usage (2026-10-06)

- Agent time: about 3 hours 40 minutes, an estimate, in one session, of which about 1 hour 20 minutes was builds and downloads the agent waited on. Waiting for 함재현 (installing Xcode, Kakao's registration, signing, pressing a system alert) is not counted.
- Tokens: no subagents. The session's split into input and output, and its cache reads and writes, were not measured; most of its input is cache reads of the conversation's context, turn after turn.
