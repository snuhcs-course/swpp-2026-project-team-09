/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SEAT_NUMBER_MIN, seatNumberSize } from '@/library/cards/seats';

// A seat number's size on the seat picture (P01 ticket 01): the whole number in its box, or none. A seat's box is
// 33×28 image pixels; on 7A 열람실 2 구역's picture that is about 8.3×7.0 points at zoom 1 and 33×28 at zoom 4.

const DIGIT = 0.7;
const SIDE = 1;

function box(zoom: number): { width: number; height: number } {
  const scale = (300 * zoom) / 1198;
  return { width: 33 * scale, height: 28 * scale };
}

// How wide the number is drawn at `size`, by the rule the size is taken with.
function drawnWidth(label: string, size: number): number {
  return label.length * DIGIT * size + 2 * SIDE;
}

describe('a seat number’s size', () => {
  it('is none while a four-digit number cannot fit whole at 8 points', () => {
    expect(seatNumberSize(box(1), '7193')).toBeNull();
    expect(seatNumberSize(box(1.5), '7193')).toBeNull();
    expect(seatNumberSize(box(2), '7193')).toBeNull();
  });

  it('fits the whole number in its box once there is room', () => {
    for (const zoom of [3, 4]) {
      const size = seatNumberSize(box(zoom), '7193');
      expect(size).not.toBeNull();
      expect(size ?? 0).toBeGreaterThanOrEqual(SEAT_NUMBER_MIN);
      expect(drawnWidth('7193', size ?? 0)).toBeLessThanOrEqual(box(zoom).width + 1e-9);
    }
    expect(seatNumberSize(box(4), '7193')).toBeCloseTo((box(4).width - 2 * SIDE) / (4 * DIGIT));
  });

  it('gives a shorter number a larger size', () => {
    expect(seatNumberSize(box(3), '101') ?? 0).toBeGreaterThan(seatNumberSize(box(3), '7193') ?? 0);
  });

  it('stays within 0.8 of the box’s height, and at most 14 points', () => {
    expect(seatNumberSize({ width: 200, height: 10 }, '7193')).toBeCloseTo(8);
    expect(seatNumberSize({ width: 200, height: 9.9 }, '7193')).toBeNull();
    expect(seatNumberSize({ width: 400, height: 400 }, '7193')).toBe(14);
  });
});
