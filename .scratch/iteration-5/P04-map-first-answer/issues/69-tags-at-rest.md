# 69: An answer's tags are placed again where the map comes to rest

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #567
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

From the phone on 2026-11-26, on the released app: asked "내일 저녁?" alone, the answer had seven Plans. Only candidate 3 carried a tag ("③ 15분"). Candidates 2 and 4 to 7 were numbered dots without one, also after the map was moved or zoomed to show them all.

## Cause

- An answer's labels are placed once, for the camera the answer glides to (`useDrawnMap`'s view in `use-answer-map.ts`). A pan or a pinch moves the map but places nothing again.
- The seven Plans spread further than the answer's outermost zoom holds. The camera keeps the pick's side in view, as its rules say (`correctedCentre` in `answer-camera.ts`), so candidates 2 and 4 to 7 stood behind the time card at the top.
  - A label only takes a side whose box is inside the labels' area. Theirs had none, so they kept their numbered dots.
  - A candidate outside the area does not count when tags are left out by rank (`leftOutByRank`). So candidate 3, inside the area, kept its tag.
- Seen on screen once the map was moved, a higher-ranked candidate had lost its tag before a lower-ranked one. Ticket 13 says that never happens.

The user's decision (2026-11-26): the tags are placed again each time the map comes to rest, so that zooming in or moving the map shows the minutes where there is room. The camera's fit stays as it is.

## What to build

1. **When to place again.** The labels are placed at the answer's own camera, as today, until the map comes to rest after the answer's camera last moved. Then they are placed at the camera at rest, with the same view size and labels' area. The map comes to rest after a User's pan or pinch, and after the answer's own glide.
   - "At rest" is the map's `onCameraIdle`, which `useMainMap` keeps as `map.camera`. The module sends it once a gesture or a move has ended, not while the map moves.
   - The answer's camera moves whenever the drawing or the framing changes (`useAnswerCamera`). Each such move starts again from the answer's own camera.
2. **What is placed.** The same placement as at the answer's own camera (`drawingOf` at a view):
   - every candidate whose dot is in the labels' area gets its tag where a side fits, in rank order, and a higher rank never loses its tag before a lower one among them;
   - candidates outside the area keep their numbered dots;
   - the pick's label is never left out, and held candidates keep their tags, by the same rules as today, now at the camera at rest.
3. **No flicker.**
   - While the map moves, the labels stay as they are.
   - A drawing placed again waits, the drawing before it still shown, until every picture of it is made. Then all its marks change in one frame. A mark's dot and its tag are one picture, so it never shows both numbers or neither.
   - A picture that is still not made after 1.5 seconds stops the wait. The Android module keeps a mark's old picture until its new one is made.
   - Any other change of drawing (another Plan, another answer, the choosing ring, the walks' paths) shows at once, as today.
4. **The camera's rules do not change** (`answer-camera.ts`): no new move of the camera.

## Acceptance criteria

- [ ] The case from the phone, with the stored meal answer: at the answer's first camera, candidates 2, 4, and 5 behind the time card have no tag and candidate 3 in view has one. At a camera that shows them all, 2 to 5 are tagged in rank order as room allows. Zoomed in on two neighbours, both are tagged, and the candidates out of view keep their numbered dots. (Unit test of `useAnswerMap`, failing before the change.)
- [ ] While the pictures of the new placement are not made, every mark keeps the placement before it. Once they are made, every mark changes together. A wait longer than 1.5 seconds ends. (Unit test.)
- [ ] The answer's camera moves no more than before. (Unit test.)
- [ ] Ticket 13's rank rule holds for what is on screen; its wording says so.
- [ ] No native file changes. Lint, format, and types pass on the app.
