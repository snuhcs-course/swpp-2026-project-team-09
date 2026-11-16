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

- [ ] The projection's round trip at zooms 15 to 18 stays within 0.5 m, and the camera's centre falls on the view's middle (unit test).
- [ ] Thinning keeps 200 points or fewer, and the size check refuses an outline inside a 17 m square but takes a figure eight of two equal lobes (unit tests).
- [ ] Integration tests at the screens over the fake main server:
  - the row's count;
  - the pencil on, a loop drawn by a simulated pan, and the POST body (the outline);
  - a second loop replacing the first;
  - the pencil off;
  - "취소" and "삭제";
  - the too-small line;
  - the limit of five;
  - the own card's line after an upload answered `privateZone: true`.
- [ ] The mock answers as the server does.
- [ ] Emulator check: draw a zone round 301동 and save it; the row reads "1곳" and the zone is filled on the zone screen; with the pencil off, the map moves and the zone stays in place. The pull request carries these screens.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- The contract and the decisions under review are in the spec's section "The Private Zone".
- Lists of choices are equal-width grid cells, never uneven pills. The zone rows are a list of items with a "삭제" each, not choices.
- Revised 2026-11-16 from painted strokes to one closed outline drawn in a pencil mode, on the user's word.
