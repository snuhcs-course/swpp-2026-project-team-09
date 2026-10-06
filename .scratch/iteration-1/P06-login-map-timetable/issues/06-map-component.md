# 06: Map component, its interface and marker images

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 01 (Design system)

## What to build

The app gets its one map component, with the provider-neutral interface of the spec's "Map" decisions and of `todo.md` section 2.9. Every screen uses this component and nothing else to show a map; the Android module (ticket 07) and the iOS module (ticket 11) implement it. What the interface cannot say, a screen cannot ask of any map, so it is settled here.

In a build without a native module, which Expo Go, the web and the tests are, the component is a plain ground with the words "지도는 Android·iOS 빌드에서 보입니다". There is no stand-in map.

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

- `src/map/types.ts` is the interface and its rules: `MapProps`, `MapMarker`, `MapAvatar`, `MapCamera`, `CameraMove`, `FitOptions`, `MapHandle`, `MapBounds` and `MarkerImage`. `src/map/index.ts` is what a screen imports from, as `@/map`.
- `src/map/campus.ts` holds the campus rectangle `CAMPUS_BOUNDS` (south 37.445, west 126.945, north 37.471, east 126.963) and the zoom limits `MIN_ZOOM` 14 and `MAX_ZOOM` 19. The two limits are the numbers of `todo.md` section 2.9, not measured: ticket 07 settles them.
- `src/map/map.tsx` is the component, `src/map/native-map.tsx` the seam for the native map, and `src/map/native-module.ts` the question whether the build holds the module.
- `src/map/plain-map.tsx` and `src/map/plain-things.tsx` are the plain ground, and `src/map/projection.ts` the camera's rules in Web Mercator that it follows.
- `src/map/marker-looks.tsx`, `src/map/marker-images.tsx` and `src/map/capture.ts` make the marker images. The stage they are made on is shown by `src/app-providers.tsx`.
- `src/screens/map-check-screen.tsx` is the development screen, at `/map-check` and behind "지도 보기" on a placeholder screen.
- The design system gains `MapDot`, a marker from far away, and `Avatar` gains `onPhotoSettled`.
- Tests: `__tests__/map-test.tsx`, `map-camera-test.tsx`, `map-glide-test.tsx`, `map-native-test.tsx`, `marker-images-test.tsx` and `map-check-test.tsx`, with what they share in `__tests__/support/map.tsx`.

Decisions:

- The interface is that of `todo.md` section 2.9, which is corrected to match, with these additions: a marker's `name` for a screen reader, since a dot has no text; a marker's `order`; `fitTo` on the handle; a `MarkerImage` that carries its look, its picture's address, its size and its `anchor`; and a `style`.
- Markers and Avatars are lists. A map compares each list with the last by `id`. The interface has no calls to add or remove.
- How the implementation is chosen: `hasNativeMap()` asks Expo for the module `SnuNowMap` with `requireOptionalNativeModule`, which answers null where the build has none. `Map` asks once, when it is first shown. With the module it asks for `native-map.tsx` with a `require` inside the function, so the file is loaded only then; without it, it shows the plain ground. A test proves both: the file is not loaded without the module, and is shown with it.
- How an image is made: in a build that holds the native map module, the design system's view of a look is drawn on a stage outside the screen, with 8 points of clear room around it for the ring and the shadow, and `react-native-view-shot` 5.1.0, the version Expo SDK 57 expects, captures it as a PNG file in the phone's own pixels. One picture is kept for each look's name for as long as the app runs.
- `useMarkerImages(looks)` answers an image for each look at once, with a null address until the picture is made. A screen's test needs no waiting.
- The looks: the User's own Avatar is the design system's `MapPin` of the kind `me`. A Friend's Avatar is the design system's `Avatar` with the friend ring and the status colour, small as a dot and of the usual size as a pin. A marker of each of the design system's seven kinds is `MapDot` as a dot and `MapPin` as a pin. The `Main` frame draws a Friend as a drop in the status colour and a selected marker larger, with a ring; neither is a look yet. Ticket 09, which matches the frames, adds them to `MarkerLook`.
- The credit is drawn by `Map` over every implementation, in the `micro` text style, 8 points from the left and the bottom.

What ticket 07 does to plug in:

- Register the module under the name `SnuNowMap` (`NATIVE_MAP_MODULE`), and replace the body of `src/map/native-map.tsx` with the module's view. Nothing else in `src/` changes: `Map` then shows it in a build that holds the module.
- Follow the rules written in `src/map/types.ts` for the zoom, the rectangle, `moveCamera`, `fitTo`, `onCameraIdle`, gliding and what is on top. `src/map/projection.ts` works the camera's rules out for the plain ground and can be read as their reference.
- Draw a marker only once its `image.uri` is there, load one picture for each `image.look`, read it again when the `uri` under that look changes, set the label's anchor from `image.anchor`, and draw `text` under it as the SDK's own text. The picture has 8 clear points on every side, so the text starts that much lower unless the module moves it up.
- The interface names no colour and no width: the route line's and the text's come from the design system's tokens, handed over by `native-map.tsx`.
- Keep Kakao's logo and the credit apart: both are at the bottom left by default.
- Settle `MIN_ZOOM` and `MAX_ZOOM` in `src/map/campus.ts`.

Open point for the main screen's tickets:

- The credit sits at the bottom left of the component. A screen that lays a bottom navigation over the map covers it; the main screen keeps the map's lower edge above the navigation, or the component gains a way to raise the credit.

What was not checked:

- Nothing ran on a phone or in a native build, and this ticket's agent ran nothing in a browser. The four checks and Jest are all that ran.
- The screenshot of the development screen from the web target is not this ticket's agent's to take.

### After the review and the screenshots (2026-10-05)

A review and screenshots of the web target led to these changes. `src/map/types.ts`, the app's README and `todo.md` section 2.9 state the rules.

1. A zoom is the Web Mercator zoom level at the camera's centre, and may be a fraction. "Inside `bounds`" means that the visible area never leaves the rectangle: the lowest zoom allowed is the larger of `minZoom` and the zoom at which the view just fits, which depends on the view's size, and the centre is kept away from the edges. The plain ground follows this with its own size. On a view of 390 by 700 points the lowest zoom is 14.9, above `MIN_ZOOM`; where the rectangle and `maxZoom` disagree, the rectangle wins.
2. The handle has `fitTo(points, { padding, animated })`. The plain ground implements it.
3. The rules of gliding are written out. The plain ground glides an Avatar with React Native's `Animated`, starts only when the position differs from the last target, and places it at once for a `glideMs` of 0 or when the phone asks for less motion.
4. Every Avatar is above every marker, and `order` ranks within each.
5. `onCameraIdle` is sent once when the map is ready and each time the camera rests somewhere else. A call that changes nothing sends nothing.
6. A capture that gives no picture is tried again, four times in all, after 0.5, 1 and 2 seconds; a look whose tries are used up is tried again when a screen that asks for it is next shown. A look with a photo is captured without it after three seconds and again, under the same look, when the photo comes. The image handed to the map is then a new object.
7. No picture is made without the native map module: the stage is empty, `react-native-view-shot` is not called, and the plain ground draws the design system's view from the image's `view`.
8. Left to ticket 07 to decide on a phone: when a picture that no screen uses any more is released, since what is kept grows with every new look; whether a picture in the phone's own pixels is drawn at the view's size; and whether a view's shadow, a `boxShadow`, is in its picture. Also unproven until then: that a view outside the screen is captured at all, with a clear background, and that a photo is drawn one frame after it is loaded. If a picture comes out empty, the stage moves behind the screen instead of beside it.
9. The plain ground places markers, Avatars and the route by position, with the camera's centre and zoom. It has no tiles and draws no campus, and a User cannot pan it. What is outside the view is not drawn and stays a button under its name. A marker's button carries the look's name as its `testID`; the route is read as "경로가 그려져 있습니다". Until it is laid out, the ground counts as large as the window, so a test that fires no layout still gets a camera.
10. On `/map-check`, "아바타 옮기기" moves the User's Avatar about 600 metres, and "경로에 맞추기" fits the camera to the route's two ends.

What is approximate on the plain ground: a glide's path is worked out in the view's points when it starts, so a change of zoom during a glide bends it; and an animated camera move jumps.

Not checked after these changes: nothing ran in a browser, on a phone or in a native build. That the plain ground's look in a browser is right, with the views standing on their positions and the route's strokes, is for the next screenshots to show.

### Agent usage (2026-10-05)

- Agent time: about 45 minutes, an estimate, nearly all of it in subagents.
- Tokens: three subagent runs (the build with its fix round, and a review with screenshots): about 400 thousand in all. The main session's share was small and is not counted apart.
