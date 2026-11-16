# 29: The User draws a Private Zone round an area of the map

Parent: [P02 spec](../spec.md), "The Private Zone"; the design's section 7, "What happens by place", and row 9; the gesture board `GestureAsk` (the pencil); the 위치 공유 screen of ticket 11
Status: ready-for-agent
Blocked by: 28 for the server client (the mock and the fake main server can go first)

## What to build

The app half of the Private Zone, over the contract in the spec's section. No native file changes.

- **The API.**
  - The type `PrivateZone` (an `outline` of `LatLng`) with its check.
  - `privateZones()`, `addPrivateZone(outline)`, and `removePrivateZone(id)` on the server client and the mock client.
  - `privateZone` read from the position upload's reply.
- **The row.**
  - The 위치 공유 screen (ticket 11) gains the row "비공개 구역", "칠한 곳 안에서는 시간표만 보여요", and the count "N곳" ("0곳" with none).
  - The row opens `/me/private-zones`.
- **The zone screen, "비공개 구역".**
  - The campus map with no inset.
  - The saved zones, each outline filled translucent over the map, on an SVG layer projected again whenever the camera settles and hidden while it moves.
  - The line "칠한 곳 안의 위치는 저장하지 않아요. 친구에게는 시간표만 보여요."
  - One row per zone: its label and "삭제".
  - The pencil, which is disabled at five zones, with "5곳까지 그릴 수 있어요".
- **The pencil and drawing.**
  - The pencil turns drawing on and off.
  - On: an overlay catches the finger (`react-native-gesture-handler`'s pan) and the map is held still. One finger draws a line with `react-native-svg`.
  - When the finger lifts, the end joins the start and the inside is filled (SVG's default nonzero fill).
  - Off: the map moves and zooms as usual, and the drawn outline stays in its place.
  - Drawing again while an outline is unsaved replaces it. "저장" sends it; "취소" leaves without saving.
- **Before sending.**
  - The finger's path is thinned to at most 200 points: drop a point within 6 pt of the one before it, then simplify (Douglas–Peucker) until 200 or fewer remain.
  - A path that barely moves, under 3 points after thinning, draws nothing.
  - An outline that fits in a 17 m square (both sides of its bounding box under 17 m) shows "조금 더 크게 둘러 주세요" and is not sent.
  - The server's 400 answers show one line each: "캠퍼스 가까이에서만 그릴 수 있어요" for `PRIVATE_ZONE_OFF_CAMPUS` (an outline may run a little past the campus's edge), "조금 더 크게 둘러 주세요" for too small.
  - After saving, the toast "저장했어요 · 이 안에서는 친구에게 시간표만 보여요".
- **The projection.**
  - A pure pair of functions, screen point to coordinates and back, by Web Mercator: at zoom z the world is 256 × 2^z points wide.
  - It uses the centre and zoom of `onCameraIdle` and the view's laid-out size, with the centre at the view's middle.
  - The zoom the map reports is measured against the view's width, and rotation and tilt are off (`modules/snu-now-map`), so no native call is needed.
- **My own card.** While the last upload answered `privateZone: true`, the User's own card says "비공개 구역 안 · 친구에게는 시간표만 보여요".
- **The mock** keeps zones in memory, answers `privateZone: true` for a position inside one, and refuses as the server does.

## Acceptance criteria

- [x] The projection's round trip at zooms 15 to 18 stays within 0.5 m, and the camera's centre falls on the view's middle (unit test).
- [x] Thinning keeps 200 points or fewer, and the size check refuses an outline inside a 17 m square but takes a figure eight of two equal lobes (unit tests).
- [x] Integration tests at the screens over the fake main server:
  - the row's count;
  - the pencil on, a loop drawn by a simulated pan, and the POST body (the outline);
  - a second loop replacing the first;
  - the pencil off;
  - "취소" and "삭제";
  - the too-small line;
  - the limit of five;
  - the own card's line after an upload answered `privateZone: true`.
- [x] The mock answers as the server does.
- [x] Emulator check: draw a zone round 301동 and save it; the row reads "1곳" and the zone is filled on the zone screen; with the pencil off, the map moves and the zone stays in place. The pull request carries these screens.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- The contract and the decisions under review are in the spec's section "The Private Zone".
- Lists of choices are equal-width grid cells, never uneven pills. The zone rows are a list of items with a "삭제" each, not choices.
- Revised 2026-11-16 from painted strokes to one closed outline drawn in a pencil mode, on the user's word.

### Decisions (2026-11-16)

- The projection is the pair ticket 22 already added, `atPoint` and `inView` in `src/map/projection.ts`, which work from `onCameraIdle`'s camera and the view's size. The new unit test checks them at zooms 15 to 18.
- The zone screen opens on the User at zoom 17 when they are on campus, as 장소 선택 does, and on the whole campus otherwise, so that a building can be drawn round without zooming in first.
- The map stands between the app bar and a panel under it, not under a sheet laid over it, so it needs no inset and the map's credit stays in view. The pencil floats at the map's top right as a switch named "그리기".
- The zones are hidden from a touch that starts on the map until the camera settles. A touch that moves nothing brings no report of the camera, so they come back 1 s after the last finger lifts.
- Douglas–Peucker splits first the span whose farthest point lies farthest off it, until 200 points are kept, instead of a tolerance that grows. A point 6 pt or less from the last one kept is dropped.
- A finger that barely moves leaves the unsaved outline as it was. While a finger draws the next loop the unsaved one is hidden, and it is replaced when the finger lifts.
- An outline that fits in a 17 m square shows "조금 더 크게 둘러 주세요" as soon as the finger lifts, and 저장 stays off until another loop is drawn. The main server's refusals do the same with their lines. 409 `PRIVATE_ZONES_FULL` shows "5곳까지 그릴 수 있어요", and any other failure the toast "저장하지 못했어요".
- 저장 and 취소 both turn the pencil off, and 취소 stays on the screen. While an outline is unsaved the panel shows its line and 취소 and 저장 in place of the rows.
- 삭제 asks nothing, as 관심사's 지우기 does. A failure shows "지우지 못했어요", and a zone already deleted elsewhere counts as deleted. With no zone the list says "아직 그린 곳이 없어요".
- The own card's line is on 내 정보's 위치 공유 card, where the off-campus line is. The main map's card "지금 친구에게 보이는 나" shows no off-campus line either, so it gains none.
- `privateZone` in the upload's reply is optional, and a reply without it reads as false.
- The geometry the mock and the screen share (the 17 m box, the winding rule, and the 10 m edge) is in `src/api/private-zone-outline.ts`, mirroring the main server's. The mock's Campus Boundary is the on-campus rectangle, and it names a zone after its own Places within 150 m.

### Emulator check (2026-11-16)

On the shared emulator (API 36), a development build on the mock. The zone was drawn round 교수회관 (65동), since the screen opened on the whole campus with the emulator's position off campus; 301동 is at the screen's edge there.
- The 위치 공유 row read "0곳", then "1곳" after saving.
- With the pencil on, a loop drawn by one finger closed by itself and was filled with a dashed edge. When the panel shrank for 취소 and 저장 and the map grew, the outline moved with the map, still round 교수회관.
- 저장 gave the toast "저장했어요 · 이 안에서는 친구에게 시간표만 보여요", the zone filled solid, and the row "그린 구역" (the mock's label with no Place near) with 삭제.
- With the pencil off, the map panned, and once it settled the zone was in its place round 교수회관.

### Agent usage (2026-11-16)

One implementing subagent (Opus 5.5). This session's review, the emulator check, and the pull request are counted under P03 ticket 07.

- Agent time: about 31 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 141,391; input 31,122,335, of which 30,788,610 were cache reads, 333,477 cache writes, and 248 uncached. Without cache reads: 475,116.
