# 08: Main screen: the map, my position and the bottom navigation

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 05 (Onboarding screen), 06 (Map component, its interface and marker images)

## What to build

The main screen appears after a sign-in: the map filling the screen, the User's Avatar at their position, the zoom and position buttons, and the bottom navigation. A User pans and zooms on the campus, returns to their position with a button, and, off campus or without the location permission, still sees the whole campus. This is the `Main` frame without its markers, lists and other controls, which tickets 09 and 10 add.

## Acceptance criteria

- [ ] The map fills the screen and opens on the whole campus.
- [ ] The bottom navigation has the frame's five slots, 지도, 파티, 올리기, 행사 and 내 정보, with the frame's centre button and badge. Every slot but 지도 shows the "준비 중이에요" toast.
- [ ] The zoom in, zoom out and "내 위치로 이동" buttons sit where the frame puts them and work as in the frame.
- [ ] The first time the screen opens, the explanation before the location prompt appears with the spec's words. "계속" leads to the system's prompt; "나중에" or a refusal leaves the map without an Avatar.
- [ ] With the permission, the User's Avatar is at the phone's position and glides to each new one. It is shown only while the position is inside the campus rectangle.
- [ ] Off campus, "내 위치로 이동" shows "캠퍼스 밖에 있어요" and moves the camera to the whole campus. Without the permission it shows the explanation again.
- [ ] A development setting replaces the phone's position with a walk along a fixed path on campus.
- [ ] Jest tests with a given position: the Avatar on campus, no Avatar off campus, the toast off campus, the explanation and both of its answers, and a tab's toast.
- [ ] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots are in the pull request under Test Results, each compared with the frame: of the web target with the plain ground, and, once ticket 07 is merged, of the emulator with the map and the walking Avatar.
- [ ] The app's four checks pass: lint, format, types and tests.
