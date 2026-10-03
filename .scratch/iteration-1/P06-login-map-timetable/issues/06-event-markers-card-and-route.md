# 06: Main screen: event markers, the event card and the walking route

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (API client and fake API), 05 (Main screen: the map, the bottom navigation and my position)

## What to build

Global Events appear on the map as markers. A User taps one, reads its card and asks for the way there, and a line is drawn from their position to the place.

The Global Events are fake, in the shape of the Global Event that P07 stores, until P12 serves the published list. The walking route is the main server's, which exists.

## Acceptance criteria

- [ ] Published Global Events are markers on the map, from the fake list.
- [ ] The markers' detail follows the zoom as the frames `MapOverviewSelect` and `MapZoomed` show: dots when the whole campus is in view, pins closer, pins with names closest.
- [ ] A tap on a marker opens the frame's card with the event's title, time, place and source. The card closes as in the frame.
- [ ] "길찾기" asks the main server for a walking route from the User's position to the place and draws the returned line.
- [ ] When the server finds no route, or the request fails, the app shows "길을 찾지 못했어요" and moves the map to the place.
- [ ] When the app has no position to start from, "길찾기" moves the map to the place and says why: "캠퍼스 밖에 있어요" off campus, or the explanation before the location prompt.
- [ ] The route is cleared when its card is closed, when another route is asked for and when the screen is left.
- [ ] The card's other buttons (같이 갈 사람 찾기, 참여하기, 알림 받기) behave as the frame's script does, with fake data.
- [ ] Jest tests: the markers and their detail by zoom, the card's content, a route drawn, no route, a failed request, no position, and the route cleared.
