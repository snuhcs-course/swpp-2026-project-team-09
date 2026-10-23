/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Gesture, type PanGesture } from 'react-native-gesture-handler';

// Who takes a sideways swipe. One that starts within the screen's left edge goes back: it pops a screen above the
// tabs, closes an open side panel or bottom sheet, and shows 지도 from another tab. Any other sideways swipe in the
// 파티 tab moves between its tabs. A sideways scroller inside takes the swipe first, because it claims the touch
// after a few points while the tabs' swipe waits for `TAB_SWIPE.start`, and so does 찾기's official banner, whose
// swipe starts at `TURN_SWIPE.start`.

// The left edge's width. Wider than the strip that Android's gesture navigation keeps for its own back, so that a
// swipe that starts just inside that strip still follows the finger.
export const EDGE_WIDTH = 40;
// The edge's swipe starts once the finger moves this far right, and is no swipe once it moves `EDGE_FAIL_Y` up or
// down first.
const EDGE_START = 10;
const EDGE_FAIL_Y = 20;
// How much the finger's speed at letting go counts, in seconds of travel: as the JS stack's own swipe back counts it.
const VELOCITY_IMPACT = 0.3;

interface SidewaysSwipe {
  // The finger moves this far sideways before the swipe takes the touch, and up or down this far first is a scroll.
  start: number;
  failY: number;
  // Let go this far, or this fast, it moves one step.
  distance: number;
  velocity: number;
}

// Between the 파티 tab's tabs.
export const TAB_SWIPE: SidewaysSwipe = { start: 24, failY: 16, distance: 56, velocity: 600 };
// Between the official banner's slides, which starts before the tabs' swipe so that it wins over the banner.
export const TURN_SWIPE: SidewaysSwipe = { start: 12, failY: 16, distance: 32, velocity: 400 };

// Whether a swipe from the edge goes back when the finger lets go: past half the screen, its speed counted.
export function goesBack(translationX: number, velocityX: number, width: number): boolean {
  return translationX + velocityX * VELOCITY_IMPACT > width / 2;
}

// Whether a touch that started at `x` from the screen's left started at its edge.
export function startsAtEdge(x: number): boolean {
  return x < EDGE_WIDTH;
}

// Which way a sideways swipe moves: 1 to the next for a swipe left, -1 to the previous for one right, 0 for one too
// short and too slow.
export function swipeStep(translationX: number, velocityX: number, swipe: SidewaysSwipe): -1 | 0 | 1 {
  const far = Math.abs(translationX) >= swipe.distance || Math.abs(velocityX) >= swipe.velocity;
  if (!far || translationX === 0) {
    return 0;
  }
  return translationX < 0 ? 1 : -1;
}

// A sideways swipe by `swipe`'s distances, which a scroll up or down first leaves to the scroll.
export function sidewaysSwipe(testId: string, swipe: SidewaysSwipe): PanGesture {
  return Gesture.Pan()
    .withTestId(testId)
    .runOnJS(true)
    .activeOffsetX([-swipe.start, swipe.start])
    .failOffsetY([-swipe.failY, swipe.failY]);
}

// The edge's swipe, for a view that spans the screen from its left: only a touch that starts within the edge.
export function edgeSwipe(testId: string): PanGesture {
  return Gesture.Pan()
    .withTestId(testId)
    .runOnJS(true)
    .hitSlop({ left: 0, width: EDGE_WIDTH })
    .activeOffsetX(EDGE_START)
    .failOffsetX(-EDGE_START)
    .failOffsetY([-EDGE_FAIL_Y, EDGE_FAIL_Y]);
}
