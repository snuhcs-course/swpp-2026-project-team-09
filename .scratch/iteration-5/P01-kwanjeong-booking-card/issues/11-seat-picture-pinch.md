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

- The scroll views only show the picture and report where the view is. They take no touch (`scrollEnabled={false}`); `scrollTo` still moves them.
- One finger moves the view by a pan of the gesture handler, held within the picture's edges (`pannedOffset`).
- The pan and the pinch run at once (`Gesture.Simultaneous`). A spread in any direction zooms about the point between the fingers, as before, and two fingers moving together move the picture.
- A tap still picks a seat: the pan starts only after the finger has moved. 확대 and 축소 and the zoom's limits of 1 to 4 stay as they are.
- After a one-finger fling the view glides on a short way, slowing, and stops at the picture's edges (the orchestrator's addition).
  - It slows as Reanimated's `withDecay` does, its speed falling by 0.995 each millisecond. It runs frame by frame on the JS thread, as the pan does, since the picture is moved by the scroll views' `scrollTo`. Moving it by Reanimated's shared values would mean replacing the scroll views' refs with animated ones, which is not cheap.
  - A new touch, a pinch, or 확대 and 축소 stops it. Two fingers lifted give no glide.
- A pan never takes the view past the picture's edges at any zoom. A spread at an edge keeps the point between the fingers where it is; a closing that would take the view past an edge holds it at the edge.

## Acceptance criteria

- [x] The pan's offsets: inside the picture, and held at every edge at zoom 1, 2 and 4. A spread at each edge keeps the point still; a closing past an edge is held. The glide's decay and length. (Unit tests.)
- [x] A fling glides and slows, a hard fling stops at the edge, a new touch stops it, and two fingers give none. (Unit tests.)
- [x] The scroll views take no touch, one finger moves the view by the change since the last update within the picture, a pinch zooms about the point between the fingers, and a tap picks a seat. (Unit tests; the first two fail before the change.)
- [x] The seat picture's tests of ticket 01 pass: 확대 and 축소, the picked seat, and the pinch's total scale.
- [ ] On a phone: a two-finger spread sideways, across, and upright zooms each time; one finger moves the picture; a tap picks a seat. Only a phone shows that the touch is no longer taken from the pinch.
- [x] Whole lint, format and types of the app.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 25 minutes in the p04-58 session, from 16:02 UTC to the pull request, an estimate. No emulator: it was in use by another session. No subagents.
- Tokens, from 16:02 UTC to this entry: input 90 uncached, with cache reads 28,652,834 and cache writes 681,804; output 53,261.
