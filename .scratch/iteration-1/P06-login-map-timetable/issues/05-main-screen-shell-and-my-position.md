# 05: Main screen: the map, the bottom navigation and my position

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Design system), 03 (Map component and stand-in map)

## What to build

The app's main screen appears: the map filling the screen, the bottom navigation, and the User's own Avatar at their position. A User pans and zooms on the campus, returns to their position with a button, and, off campus or without the location permission, still sees the whole campus.

This is the frame `Main` without its lists, layers and sheets, which tickets 06 to 11 add. Read the frame again when the work starts.

## Acceptance criteria

- [ ] The map fills the screen and opens on the whole campus.
- [ ] The bottom navigation has the five slots 지도, 파티, 올리기, 행사 and 내 정보. 파티 and 행사 show the "준비 중이에요" toast. 올리기 and 내 정보 lead to placeholders until tickets 11 and 15.
- [ ] The zoom in, zoom out and "내 위치로 이동" buttons work as in the frame.
- [ ] The first time the screen opens, the explanation before the location prompt appears with the spec's words. "계속" leads to the system's prompt; "나중에" or a refusal leaves the map without an Avatar.
- [ ] With the permission, the User's Avatar is at the phone's position and glides to each new one. It is shown only while the position is inside the map's rectangle.
- [ ] Off campus, "내 위치로 이동" shows "캠퍼스 밖에 있어요" and moves the camera to the whole campus. Without the permission it shows the explanation again.
- [ ] On Android the back button closes the topmost panel or sheet before it leaves the screen.
- [ ] Jest tests with the stand-in map and a fake position: the Avatar on campus, no Avatar off campus, the toast off campus, the explanation and both of its answers, and the two tabs' toast.
