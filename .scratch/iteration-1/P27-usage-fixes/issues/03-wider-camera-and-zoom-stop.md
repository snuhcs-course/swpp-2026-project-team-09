# 03: A wider camera area, and pinching out that stops

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Place markers without words), as both change the main screen's map

## What to build

The camera may move over a wider area around campus: the current rectangle widened by half its height to the north and to the south and by half its width to the east and to the west. The on-campus rectangle, which decides whether the User's own Avatar is shown and where 장소 선택 may pick, stays as it is, and so does the lowest zoom, which is still taken from the campus rectangle.

Pinching out stops at the lowest zoom instead of snapping back: the map component takes a lowest native camera level and hands it to Kakao's SDK on Android and iOS. The SDK takes whole levels, so the level is 15, a hair closer than today's lowest of about 14.97. The SDK cannot restrict panning and reports only a move's end, so a drag past the wider area still settles back when it ends, as today.

## Acceptance criteria

- [ ] The camera's area and the on-campus rectangle are two values; the main screen, 장소 선택 and the map check screen pass the camera's area to the map.
- [ ] The lowest zoom stays as today on a phone-sized view.
- [ ] The User's own Avatar and 장소 선택's pick use the on-campus rectangle, unchanged.
- [ ] The map component takes the lowest native level and the Android and iOS map views set it on Kakao's map; the plain map, used in Expo Go and the tests, keeps its own rule.
- [ ] Tests cover what the app hands the map (the camera area and the level 15) and the plain map's settling with the wider area; the existing camera tests pass, changed only where they assert the old area, which the PR names.

## Check on a phone

- [ ] On Android and iOS, pinching out at the lowest zoom does not zoom further and nothing snaps back.
- [ ] The map can be dragged about half a campus beyond each edge, and settles back past that.
