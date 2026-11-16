# 34: A Private Zone stays drawn while the map moves

Parent: [P02 spec](../spec.md); ticket [29](29-private-zone-app.md); the user's own use of the released app (`snunow/all/26.11.17-2`) on 2026-11-17
Status: ready-for-human
Blocked by: nothing

## What to build

On the zone screen ("비공개 구역"), ticket 29 drew the zones on an SVG layer over the map. The layer was placed by the camera the map last came to rest at. The native map reports no camera while it moves, so the layer was hidden from the first touch until the map settled, and came back a second after the finger lifted when nothing moved. Panning or zooming made the painted area vanish and come back.

- The zones are lines of the map itself, so the map moves them with its own drawing:
  - each zone's outline is a closed line, 2 wide, in `color.private`;
  - its inside is hatched with thin diagonal strokes, 1 wide, in `color.private` at half strength.
- The outline not yet saved is drawn the same way. The plain map (tests, web) dashes it; the native map draws it solid, because its lines take no dash.
- The hatch is laid at the camera's resting zoom, rounded to a whole level. It is laid again only when that level changes, so a pan leaves it as it is. During a pinch the strokes spread or close in with the map, and they are laid again at the new level when it comes to rest.
- The finger's path while drawing stays on the SVG layer, since the map is held still under the pencil.
- No zone is hidden on a touch any more, and the timer that brought them back is removed.

## Acceptance criteria

- [x] A touch on the map and its lift leave every saved zone drawn.
- [x] Each zone has hatch strokes as lines of the map.
- [x] The strokes lie inside the outline, a stroke that crosses the gap of a U is broken in two, and a zone has at most 80 strokes however close the camera.
- [x] The same strokes are laid for zooms that round to the same level, and fewer further out.
- [x] On the emulator, a zone stays drawn mid-drag and after a double-tap zoom.

## Decisions for review

1. **A hatch, not a translucent fill.** A map line is the only shape the native map draws, and an area cannot be filled without a change to the native module, which would stop over-the-air updates until a native Release. A hatched area is a common map sign for a restricted area. If a translucent fill is wanted later, it needs a polygon in the native module (Kakao's shape layer) and a native Release.
2. **No transparency on the lines.** The hatch's colour is `color.private` mixed half with white (`#86B9C1`). The native side reads a colour with `Color.parseColor`, which takes `#AARRGGBB`, while the plain map and CSS take `#RRGGBBAA`, so an alpha colour would come out differently on each.
3. **Laid again only at a whole zoom level.** Laying the hatch at every resting camera would replace up to 400 native lines after each pan. At a whole level, the strokes are 11 to 15.6 points apart across them.
4. **The unsaved outline is solid on the phone.** The native map's lines have no dash. The panel's 취소/저장 still tells an unsaved outline from a saved one.

## Comments

### Checked on an emulator (2026-11-17)

The debug build with the mock API, a loop drawn with the pencil round 교수회관 and saved:

- Before: mid-drag the zone is gone; 2 s after the lift it is back at the new place.
- After: mid-drag the zone, its outline and hatch move with the map; after a double-tap zoom the outline is in place and the hatch is laid again.
- A fast refresh of the bundle while the zone screen was open once left the map half drawn (tiles and lines). A cold start drew it right. It is a development-only effect of reloading JavaScript under a native view, not seen in a release build.

### Agent usage (2026-11-17)

- Agent time: about 25 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 20.5 million, of which about 20.4 million cache reads and 0.09 million cache writes; output about 46,000. Measured from the session's transcript between the two pull requests; the session went on to other tickets.
