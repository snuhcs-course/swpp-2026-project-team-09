# 11: The seat picture zooms with two fingers in any direction

Parent: [P01 spec](../spec.md); the user's phone (2026-11-27, preview 1.0.5): "확대가 너무 잘 안 먹어. 대각선으로 당기거나 가로로 당길 때 안 되는 듯?"
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: an app OTA update.

## What happens now

The 관정 seat picture ("<room> 좌석 현황", opened from the seats card's 크게 보기 or from choosing a seat) zooms with a pinch of the gesture handler around two native scroll views, one down and one across, that move the picture under one finger (ticket 01).

- An Android scroll view starts its scroll once the first finger moves about 8 dp along its axis, and asks its parents not to take the touch (`requestDisallowInterceptTouchEvent`). The gesture handler's root then cancels every running handler, the pinch too.
- The picture is wider than its box, so the scroll view across can always scroll. A spread sideways or across, or one where a finger moves first or the second lands late, becomes its scroll, and the pinch is cancelled.
- At zoom 1 the picture is about as high as the box, so the scroll view down has almost nothing to scroll, and an upright spread often still zoomed. That is what the user saw.

## What to build

First version (pushed, then checked on the user's phone): the scroll views took no touch, a pan of the gesture handler moved them by `scrollTo` beside the pinch, and a fling glided frame by frame on the JS thread. The pinch then worked in every direction, but stuttered: "좀 너무 버벅거려". Each frame crossed the JS thread, and each step of a pinch laid the picture and its 478 seats out again (measured: 6 layouts in a pinch of 6 updates).

Now (the orchestrator's brief, 2026-11-27):

- No scroll view. One layer holds the picture and the seats, laid out once at the most zoom, 4, and scaled down to the zoom seen, so that the picture stays sharp. Its offsets and scale are Reanimated shared values on an animated style.
- A pan and a pinch of the gesture handler, at once (`Gesture.Simultaneous`), change them in worklets on the UI thread. One finger moves the view; two zoom it about the point between them and move it as they move.
- A one-finger fling glides on by `withDecay`, clamped to the picture's edges. A touch stops it, and two fingers lifted give none.
- 확대 and 축소 move the same values by `withTiming`, or at once without motion. Each press steps from the zoom the last one aimed at, so quick presses during a move each take a step.
- The tested maths (the point between the fingers kept, 1 to 4 times, the edges) are worklets the gestures call.
- Nothing is laid out during a gesture. The zoom seen reaches React only when a gesture or a press ends, for the buttons and the seats' numbers. A seat's number shows when the whole number fits its box at that zoom, as before (`digitsThatFit`), so the seats are drawn again only when that changes, near 3 times. The picked seat's tag is drawn apart and keeps its size seen.
- Each seat stays a button of its own (478 in 7A 열람실 2 구역), with its label for a screen reader. A seat is memoised, so a pick draws two seats again, not all. One tap handler on the layer, which finds the seat from the tap's point, would drop those labels: it is not built.
- A tap still picks a seat: the pan starts only after the finger has moved. The limits and the edges are as before.
- **Size at 4×** (the orchestrator's check):
  - 7A 열람실 2 구역's layer is 2533 × 1200 points at 4, 7600 × 3600 px on a phone at a density of 3.
  - It is a view, not a bitmap. Nothing makes it an offscreen layer (no `renderToHardwareTextureAndroid`, no offscreen alpha), so no texture limit applies to it.
  - The one bitmap is the room's image. React Native's image loader shrinks an image only to a view smaller than it, and this view is larger, so the image is decoded at its own 2529 × 1198 px: 12.1 MB at 4 bytes a pixel. That is well under the 100 MB a canvas draws.
  - Its 2529 px side is above the 2048 px that OpenGL ES 3 guarantees for a texture and below the 8192 px or more that phones of these years give. Before this change, the same bitmap was decoded and drawn at that size once the picture was zoomed to 4, so the risk is not new.
  - Only a phone shows the memory itself.

## Acceptance criteria

- [x] The pan's offsets inside the picture and held at every edge at zoom 1, 2 and 4; a spread at each edge keeps the point still; a closing past an edge is held; the digits of a number that fit at a zoom. (Unit tests.)
- [x] The picture is one layer laid out at 4 and seen at 1; one finger moves it by the change since the last update within the picture; a fling glides, a touch stops it, a hard fling stops at the edge, two fingers give none; a pinch zooms about the point between the fingers, by its total scale, no further than 4; 확대 and 축소 zoom about the middle or the picked seat, and quick presses each take a step; a tap picks a seat. (Unit tests.)
- [x] The seat layer is not laid out at any step of a pinch of the 478 seats of 7A 열람실 2 구역: 0 of 6, against 6 of 6 before. (Unit test.)
- [x] A tap lands on the seat drawn under it at 1, 2 and 4 times: each seat is drawn at its own place in the picture through the layer's move and scale, the picked seat at the view's middle and its neighbour not, and a press picks it. Only a phone shows the touch itself finding the view through the transform. (Unit tests.)
- [x] The seat picture's integration tests: the buttons' ends, the pinch in and out, the numbers whole or not at all, and the picked seat's tag.
- [ ] On a phone: a spread in any direction zooms without stutter; one finger moves the picture; a fling glides; a tap picks a seat.
- [x] Whole lint, format and types of the app.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 25 minutes in the p04-58 session, from 16:02 UTC to the pull request, an estimate. No emulator: it was in use by another session. No subagents.
- Tokens, from 16:02 UTC to this entry: input 90 uncached, with cache reads 28,652,834 and cache writes 681,804; output 53,261.
- The redo after the phone's stutter: about 35 minutes more in the same session, from 16:44 UTC to the push, an estimate; no emulator. Tokens: input 174 uncached, with cache reads 69,967,653 and cache writes 150,196; output 110,151.
