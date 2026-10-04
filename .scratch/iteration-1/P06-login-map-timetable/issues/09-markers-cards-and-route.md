# 09: Main screen: markers, cards and the route

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 08 (Main screen: the map, my position and the bottom navigation)

## What to build

The map shows the people, the Global Event and the Party of the `Main` frame. A User presses one, reads its card, looks closer, and asks for the way there. The frames are `Main`, `MapOverviewSelect` and `MapZoomed`. Everything shown is mock data from the client of ticket 02.

## Acceptance criteria

- [ ] What the frame shows is on the map. Avatars: the Friends who can be seen and a member of the User's Party. Markers: a Global Event and a Party. The frame's Private Event is left out.
- [ ] Their detail follows the camera's zoom as in the frames: dots when the whole campus is in view, pins closer, and pins with names closest. A Friend's Avatar is the frame's, with the status colour and the name below at the closest level. The two zoom levels where the detail changes are chosen so that the three frames match, and recorded under Comments.
- [ ] A press on a marker opens its card with what the frame shows for its kind: the sub-label, the title, the lines and the buttons. A selected marker looks selected.
- [ ] The card's X closes it, and so does Android's back button.
- [ ] "가까이 보기" zooms in on the marker and is offered where the frame offers it.
- [ ] "길찾기" draws the route line from the User's position to the place, moves the map to show both ends and shows "…까지 길 안내". Another "길찾기" replaces the line, and leaving the screen drops it.
- [ ] A route to the User's next Quest is drawn when the screen opens, as in the frame, once the app has a position inside the campus rectangle; without one, none is drawn.
- [ ] When the app has no position to start from, "길찾기" moves the map to the place and says "캠퍼스 밖에 있어요" off campus, or shows the explanation before the location prompt when the permission is missing.
- [ ] The card's other buttons show the "준비 중이에요" toast: 같이 갈 사람 찾기, 참여하기, 파티 만들기 and 파티 열기.
- [ ] Jest tests: the markers by their names, a card's content for each kind, the card closed, a route asked for, and a button's toast.
- [ ] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots are in the pull request under Test Results, each compared with its frame: of the web target with a card open, and, once ticket 07 is merged, of the emulator at each of the three levels of detail, with a card open and with a route.
- [ ] The app's four checks pass: lint, format, types and tests.
