# 41: A meal answer's legs are drawn as they are gone, and their minutes stand on them

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Native files: none. Releases: an app OTA update only.

## What happens now

- A leg by the shuttle ("셔틀 14분") is one straight solid line from where it starts to the place, across buildings, beside the way on that follows the walkways. It reads as a walk through buildings.
- A leg's minutes ("20분") are placed against the straight line between the leg's ends, while the map draws the leg along the walking path once found. They can stand away from the drawn path, over a Friend's face or a building's name. When no place was free, the last resort at the leg's middle ignored the faces, and the face was drawn over the minutes.

## What changes

- **A leg by the shuttle** is drawn as the User goes it:
  - the walk from where it starts to the stop they board at, along the walkways;
  - the ride along the shuttle's own road line (`GET /shuttle`), in the shuttle's colour, to the stop they get off at;
  - the walk from that stop to where it ends.

  The stops are the ones the Plan names (the User's part's `shuttle`); a way on by the shuttle, which names none, takes the stops nearest its ends. Both stops are marked and named ("301동 승차", "기숙사삼거리 하차"), and "셔틀 N분" stands on the ride. Until the shuttle's route is known, the leg is a dotted line in the shuttle's colour, never a solid one.
- **The scene's walking paths are asked for before the answer draws.** Each leg's minutes stand on the line drawn, and the chosen place's label and the minutes keep clear of every line drawn. A walk whose path is not found yet stays straight.
- **A leg's minutes try places along the leg,** from its middle out towards both ends. First they try places clear of the faces, then places over a face, and last the middle. A face over the minutes gives way, as one over the chosen place's label does.
- **The crowded mock's 자하연식당 2층** gets off at 기숙사삼거리, a stop of the shuttle's route.

## Acceptance criteria

- [x] The crowded mock's 자하연식당 2층 by the shuttle draws a walk to 301동, the ride along the road line to 기숙사삼거리, and a walk to the place. Both stops are marked and named, and "셔틀 13분" stands on the ride. Without the shuttle's route, the leg is dotted in the shuttle's colour. (Unit test.)
- [x] With no path found, the minutes stand on the straight line; with a path found that bends 250 metres away from it, they stand on the path. (Unit test.)
- [x] A face where the minutes would stand is kept clear where another place along the leg is free; a face over the minutes is left out. (Unit test.)
Not pictured: checked on the phone after the Release.
- [x] No native file changes; lint, format, and types pass on the app.
