/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { thinned } from '@/features/private-zones/thinning';
import type { Point } from '@/map';

// The finger's path before a Private Zone is sent (P02 ticket 29): a point within 6 pt of the last one kept is
// dropped, and Douglas–Peucker keeps the 200 that matter most of a longer path.

function circle(points: number, radius: number): Point[] {
  return Array.from({ length: points }, (_, index) => {
    const angle = (2 * Math.PI * index) / points;
    return { x: 200 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) };
  });
}

describe('the thinned path', () => {
  it('drops a point within 6 pt of the last one kept', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 7, y: 0 },
      { x: 9, y: 4 },
      { x: 14, y: 0 },
    ];

    expect(thinned(path)).toEqual([
      { x: 0, y: 0 },
      { x: 7, y: 0 },
      { x: 14, y: 0 },
    ]);
  });

  it('keeps a path of 200 points or fewer, each far enough from the last, as it is', () => {
    const path = circle(150, 200);

    expect(thinned(path)).toEqual(path);
  });

  it('simplifies a long path to 200 points, from its first point and in its order', () => {
    const path = circle(3000, 600);

    const kept = thinned(path);

    expect(kept).toHaveLength(200);
    expect(kept[0]).toEqual(path[0]);
    const order = kept.map((point) => path.indexOf(point));
    expect(order).toEqual(order.toSorted((one, other) => one - other));
  });

  it('leaves fewer than 3 points of a finger that barely moves', () => {
    const path = [
      { x: 100, y: 100 },
      { x: 102, y: 101 },
      { x: 99, y: 103 },
      { x: 101, y: 99 },
    ];

    expect(thinned(path)).toEqual([{ x: 100, y: 100 }]);
  });
});
