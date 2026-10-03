# 03: Map component and stand-in map

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Design system)

## What to build

The app gets its one map component, with the provider-neutral interface of the spec's "Map" decisions, and the stand-in map behind it: the wireframe's campus picture with every position computed from latitude and longitude. A developer opens the map in Expo Go, pans and zooms inside the campus, sees markers and an Avatar gliding between two positions, and sees a route line.

Every later screen uses this component and nothing else to show a map. The Android and iOS modules (tickets 04 and 22) are further implementations of the same interface, so the interface is settled here: what it cannot say, a screen cannot ask of any map.

## Acceptance criteria

- [ ] The interface, in latitude and longitude, offers what the spec lists: the rectangle the camera stays in and the zoom limits; camera moves with or without animation; markers with an identifier, an image and an optional text, which can be added, changed and removed; Avatars that glide to a new position over a given time; one route line that can be drawn and cleared; taps on a marker and on the map and a long press on the map, each with the position; and an event when the camera stops, with its centre and zoom.
- [ ] The camera stays inside the spec's campus rectangle and opens on all of it, which is also the furthest zoom out.
- [ ] The stand-in map draws the campus picture and places every marker, Avatar and route point from its latitude and longitude. It pans, zooms and raises the same events as the interface names.
- [ ] The marker images exist as picture files, one per kind and state the wireframes use.
- [ ] The app chooses the implementation while it runs, by whether the build holds the native map, and loads the native module only when it is there. Until ticket 04 the stand-in is the only one.
- [ ] The credit "© OpenStreetMap · 국토지리정보원" sits in the smallest text size at the bottom left of the map. A tap opens a sheet with both attributions and their links, as the spec says.
- [ ] A development screen shows the map with sample markers, an Avatar that glides along a short path, and a route line.
- [ ] Jest tests with the stand-in map: a marker appears at its position, a tap and a long press report the position, the camera cannot be moved outside the rectangle, the camera's stop is reported, and the credit opens its sheet.
- [ ] The app's README describes the map component's interface and says that no screen calls a map SDK directly.
