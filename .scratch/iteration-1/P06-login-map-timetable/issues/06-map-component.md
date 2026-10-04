# 06: Map component, its interface and marker images

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Design system)

## What to build

The app gets its one map component, with the provider-neutral interface of the spec's "Map" decisions and of `todo.md` section 2.9. Every screen uses this component and nothing else to show a map; the Android module (ticket 07) and the iOS module (ticket 11) implement it. What the interface cannot say, a screen cannot ask of any map, so it is settled here.

In a build without a native module, which Expo Go, the web and the tests are, the component is a plain ground with the words "지도는 Android 빌드에서 보입니다". There is no stand-in map.

## Acceptance criteria

- [ ] The interface, in latitude and longitude, offers: the rectangle the camera stays in and the zoom limits; camera moves with or without animation; markers with an identifier, an image and an optional text, which can be added, changed and removed; Avatars that glide to a new position over a given time, a move that starts during another starting from where the Avatar is shown; one route line that can be drawn and cleared; a press on a marker or an Avatar, with its identifier; and the camera's stop, with its centre and zoom.
- [ ] The campus rectangle is a constant of the app, a little wider than the Campus Boundary.
- [ ] An image is made from the design system's marker views, once for each look, as a picture a native map can draw: the User's own Avatar, a Friend's Avatar with their letters or photo and status colour, and a marker of each kind, each as a dot and as a pin. How the picture is made is settled here and proven with ticket 07.
- [ ] Without a native module the component shows the plain ground and its words, and lists what it was asked to show so that a screen reader and a test can read a marker's name.
- [ ] The app chooses the implementation while it runs, by whether the build holds a native module, and loads a native module only when it is there.
- [ ] The credit "© OpenStreetMap · 국토지리정보원" sits in the smallest text size at the bottom left of the map.
- [ ] A development screen shows the component with sample markers, an Avatar that is moved, and a route line.
- [ ] Jest tests: a marker's name can be read, a press on a marker is passed on with its identifier, a route is drawn and cleared, and the credit is shown.
- [ ] The app's README describes the interface and says that no screen calls a map SDK directly.
- [ ] A screenshot of the development screen, taken from the app's web target at a phone's size, is in the pull request under Test Results.
- [ ] The app's four checks pass: lint, format, types and tests.
