# 06: Map component, its interface and marker images

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 01 (Design system)

## What to build

The app gets its one map component, with the provider-neutral interface of the spec's "Map" decisions and of `todo.md` section 2.9. Every screen uses this component and nothing else to show a map; the Android module (ticket 07) and the iOS module (ticket 11) implement it. What the interface cannot say, a screen cannot ask of any map, so it is settled here.

In a build without a native module, which Expo Go, the web and the tests are, the component is a plain ground with the words "지도는 Android 빌드에서 보입니다". There is no stand-in map.

## Acceptance criteria

- [x] The interface, in latitude and longitude, offers: the rectangle the camera stays in and the zoom limits; camera moves with or without animation; markers with an identifier, an image and an optional text, which can be added, changed and removed; Avatars that glide to a new position over a given time, a move that starts during another starting from where the Avatar is shown; one route line that can be drawn and cleared; a press on a marker or an Avatar, with its identifier; and the camera's stop, with its centre and zoom.
- [x] The campus rectangle is a constant of the app, a little wider than the Campus Boundary.
- [x] An image is made from the design system's marker views, once for each look, as a picture a native map can draw: the User's own Avatar, a Friend's Avatar with their letters or photo and status colour, and a marker of each kind, each as a dot and as a pin. How the picture is made is settled here and proven with ticket 07.
- [x] Without a native module the component shows the plain ground and its words, and lists what it was asked to show so that a screen reader and a test can read a marker's name.
- [x] The app chooses the implementation while it runs, by whether the build holds a native module, and loads a native module only when it is there.
- [x] The credit "© OpenStreetMap · 국토지리정보원" sits in the smallest text size at the bottom left of the map.
- [x] A development screen shows the component with sample markers, an Avatar that is moved, and a route line.
- [x] Jest tests: a marker's name can be read, a press on a marker is passed on with its identifier, a route is drawn and cleared, and the credit is shown.
- [x] The app's README describes the interface and says that no screen calls a map SDK directly.
- [ ] A screenshot of the development screen, taken from the app's web target at a phone's size, is in the pull request under Test Results.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Where things are, in `mobile/`:

- `src/map/types.ts` is the interface: `MapProps`, `MapMarker`, `MapAvatar`, `MapCamera`, `CameraMove`, `MapHandle`, `MapBounds` and `MarkerImage`. `src/map/index.ts` is what a screen imports from, as `@/map`.
- `src/map/campus.ts` holds the campus rectangle `CAMPUS_BOUNDS` (south 37.445, west 126.945, north 37.471, east 126.963) and the zoom limits `MIN_ZOOM` 14 and `MAX_ZOOM` 19. The two limits are the numbers of `todo.md` section 2.9, not measured: ticket 07 settles them.
- `src/map/map.tsx` is the component, `src/map/plain-map.tsx` the plain ground, `src/map/native-map.tsx` the seam for the native map, and `src/map/native-module.ts` the question whether the build holds the module.
- `src/map/marker-looks.tsx`, `src/map/marker-images.tsx` and `src/map/capture.ts` make the marker images. The stage they are made on is shown by `src/app-providers.tsx`.
- `src/screens/map-check-screen.tsx` is the development screen, at `/map-check` and behind "지도 보기" on a placeholder screen.
- The design system gains `MapDot`, a marker from far away, and `Avatar` gains `onPhotoSettled`.
- Tests: `__tests__/map-test.tsx`, `map-native-test.tsx`, `marker-images-test.tsx` and `map-check-test.tsx`, with what they share in `__tests__/support/map.tsx`.

Decisions:

- The interface is that of `todo.md` section 2.9 with five additions, and section 2.9 is corrected to match.
  - A marker has a `name`, which a screen reader says. A dot has no text, so the text cannot be the name.
  - `moveCamera` takes a centre, a zoom and `animated`, each of which may be left out: a zoom button changes the zoom alone.
  - `onCameraIdle` is also called once when the map is ready, so that a screen learns the first zoom the same way as every later one.
  - A `MarkerImage` carries the look's name, the picture's address, its size in points and its `anchor`: the point of the picture that stands on the position, the middle of a dot and the tip of a pin.
  - The component takes a `style`. Without one it fills its parent.
- Markers and Avatars are lists. A map compares each list with the last by `id`: a new one is added, a kept one changed, a missing one removed. The interface has no calls to add or remove.
- How the implementation is chosen: `hasNativeMap()` asks Expo for the module `SnuNowMap` with `requireOptionalNativeModule`, which answers null where the build has none. `Map` asks once, when it is first shown. With the module it asks for `native-map.tsx` with a `require` inside the function, so the file is loaded only then; without it, it shows the plain ground. A test proves both: the file is not loaded without the module, and is shown with it.
- How an image is made: the design system's view of a look is drawn on a stage outside the screen, with 8 points of clear room around it for the ring and the shadow, and `react-native-view-shot` 5.1.0, the version Expo SDK 57 expects, captures it as a PNG in the phone's own pixels. The result is a temporary file on a phone and a data address in a browser. One picture is kept for each look's name for as long as the app runs. A look with a photo is captured when the photo is shown, or after three seconds without it.
- `useMarkerImages(looks)` answers an image for each look at once, with a null address until the picture is made. A map draws a marker once its picture is there. In a test no picture is made, so a screen's test needs no waiting, and the plain ground gives the look's name as the `testID` of the marker's button.
- The looks: the User's own Avatar is the design system's `MapPin` of the kind `me`. A Friend's Avatar is the design system's `Avatar` with the friend ring and the status colour, small as a dot and of the usual size as a pin. A marker of each of the design system's seven kinds is `MapDot` as a dot and `MapPin` as a pin. The `Main` frame draws a Friend as a drop in the status colour and a selected marker larger, with a ring; neither is a look yet. Ticket 09, which matches the frames, adds them to `MarkerLook`.
- The plain ground shows each marker and Avatar as a button under its name, with its picture and its text, and a route as the words "경로가 그려져 있습니다". It keeps the camera it is asked for, inside the rectangle and the zoom limits, and answers with `onCameraIdle`.
- The credit is drawn by `Map` over every implementation, in the `micro` text style, 8 points from the left and the bottom.

What ticket 07 does to plug in:

- Register the module under the name `SnuNowMap` (`NATIVE_MAP_MODULE`), and replace the body of `src/map/native-map.tsx` with the module's view. Nothing else in `src/` changes: `Map` then shows it in a build that holds the module.
- Open the map on the middle of `bounds` at `minZoom`, call `onCameraIdle` once when the map is ready and after every move, and keep the camera inside `bounds` and the zoom limits also for `moveCamera`.
- Draw a marker only once its `image.uri` is there, load one picture for each `image.look`, set the label's anchor from `image.anchor`, and draw `text` under it as the SDK's own text. The picture has 8 clear points on every side, so the text starts that much lower unless the module moves it up.
- Glide an Avatar over `glideMs` with `Label.moveTo`, and remove what is no longer listed.
- The interface names no colour and no width: the route line's and the text's come from the design system's tokens, handed over by `native-map.tsx`.
- Keep Kakao's logo and the credit apart: both are at the bottom left by default.
- Settle `MIN_ZOOM` and `MAX_ZOOM` in `src/map/campus.ts`.

Open points for the later tickets:

- The interface cannot fit the camera to a set of points. A screen that shows a route moves to a centre and a zoom it chooses. If ticket 09 needs the map to fit a line, the interface gains that call there, and ticket 07's module with it.
- The credit sits at the bottom left of the component. A screen that lays a bottom navigation over the map covers it; the main screen keeps the map's lower edge above the navigation, or the component gains a way to raise the credit.
- A temporary picture is never deleted while the app runs. The looks are few; a Friend's changed status or photo is a new look.

What was not checked:

- Nothing ran in a browser, on a phone or in a native build. The four checks and Jest are all that ran.
- That `react-native-view-shot` captures a view outside the screen, with its `boxShadow` rings and a clear background, on Android, on iOS and in a browser: this is proven with ticket 07 on the development screen, and in Expo Go before that. If a picture comes out empty there, the stage moves behind the screen instead of beside it.
- That a photo is drawn by the time `onLoad` is answered and one frame has passed.
- That Kakao's SDK draws a picture of the phone's own pixels at the size of the view.
- The screenshot of the development screen from the web target is not taken.
