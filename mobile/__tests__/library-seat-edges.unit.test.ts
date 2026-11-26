/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { digitsThatFit, pannedOffset, pictureSize, zoomedOffset } from '@/library/cards/seat-zoom';

// The seat picture's maths at its edges (P01 ticket 11): where a pan and a pinch leave the view on the picture, which
// the gestures call as worklets, and the digits of a seat's number that fit at a zoom.

// The picture's view as the tests lay it out, and the picture of 7A 열람실 2 구역 at zoom 1: 633 × 300 points.
const VIEW = { width: 320, height: 298 };
const IMAGE = { width: 2529, height: 1198 };
const AT_ONE = pictureSize(IMAGE, 1);

// Partitions: a move inside the picture, past its left edge, and past its bottom. Expected values: the picture's
// edges, the view at 0 at the left and top, and at the picture's size less the view's at the right and bottom.
describe('Where one finger moves the view', () => {
  it.each([
    ['inside the picture', { x: 100, y: 0 }, { x: -40, y: 0 }, { x: 140, y: 0 }],
    ['past its left edge', { x: 50, y: 0 }, { x: 80, y: 0 }, { x: 0, y: 0 }],
    ['past its bottom', { x: 0, y: 0 }, { x: 0, y: -500 }, { x: 0, y: 2 }],
  ] as const)('moves %s and stops at the edges', (_, offset, by, to) => {
    expect(pannedOffset({ offset, by, picture: AT_ONE, view: VIEW })).toEqual(to);
  });
});

// Partitions: each edge at zoom 2 and at the most, 4. Expected values: the picture's size at that zoom less the view's.
describe('Where one finger moves the view at any zoom', () => {
  it.each([2, 4])('never passes the picture’s edges at %d times', (zoom) => {
    const picture = pictureSize(IMAGE, zoom);
    const most = { x: picture.width - VIEW.width, y: picture.height - VIEW.height };
    const middle = { x: most.x / 2, y: most.y / 2 };

    expect(pannedOffset({ offset: middle, by: { x: 5000, y: 5000 }, picture, view: VIEW })).toEqual({ x: 0, y: 0 });
    expect(pannedOffset({ offset: middle, by: { x: -5000, y: -5000 }, picture, view: VIEW })).toEqual(most);
  });
});

// Partitions: a spread at the right and bottom edge, at the left and top, and a closing whose point would leave the
// picture's edge. Expected values: the point under the fingers is where it was, scaled by the zoom, unless the view
// would leave the picture.
describe('Where a pinch keeps the point between the fingers at the edges', () => {
  const at = { x: 200, y: 100 };

  it.each([
    ['the right and bottom edges', { x: AT_ONE.width - VIEW.width, y: AT_ONE.height - VIEW.height }],
    ['the left and top edges', { x: 0, y: 0 }],
  ])('keeps it still when spread at %s', (_, offset) => {
    const point = { x: offset.x + at.x, y: offset.y + at.y };
    const picture = pictureSize(IMAGE, 2);

    const landed = zoomedOffset({ point, at, from: 1, to: 2, picture, view: VIEW });

    expect(landed.x + at.x).toBeCloseTo(point.x * 2);
    expect(landed.y + at.y).toBeCloseTo(point.y * 2);
    expect(landed.x).toBeLessThanOrEqual(picture.width - VIEW.width);
    expect(landed.y).toBeLessThanOrEqual(picture.height - VIEW.height);
  });

  it('holds the view at the edge when a closing would take it past', () => {
    const picture = pictureSize(IMAGE, 1);

    expect(zoomedOffset({ point: { x: 250, y: 120 }, at, from: 2, to: 1, picture, view: VIEW })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

// Partitions: zoom 1, the zoom where four digits first fit, and 4. Expected values: `seatNumberSize` of a seat's box
// at that zoom, at least 8 points.
describe('The digits of a seat number that fit at a zoom', () => {
  it('are none at 1, four at 4, and so the numbers show only near the most zoom', () => {
    expect(digitsThatFit(IMAGE, 1)).toBe(0);
    expect(digitsThatFit(IMAGE, 2.6)).toBe(3);
    expect(digitsThatFit(IMAGE, 4)).toBeGreaterThanOrEqual(4);
  });
});
