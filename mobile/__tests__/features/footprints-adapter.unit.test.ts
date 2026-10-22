/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: nothing known, no Friend today, a count below zero, and more faces than three.
// Expected values: P06-10's criteria and P06's todo (iteration 1): three faces and "친구 5명의 오늘", or nothing.

import type { Footprints } from '@/api/types';
import { NO_FOOTPRINTS, toFootprintsView } from '@/features/footprints/adapter';

function faces(count: number): Footprints['faces'] {
  return Array.from({ length: count }, (_, index) => ({ userId: `u${index}`, name: `친구${index}`, photo: null }));
}

describe('toFootprintsView', () => {
  it.each([
    ['nothing known', undefined],
    ['no Friend today', { friendCount: 0, faces: [] }],
    ['a count below zero', { friendCount: -2, faces: faces(1) }],
  ])('%s → no faces and no words', (_, footprints) => {
    expect(toFootprintsView(footprints)).toEqual(NO_FOOTPRINTS);
  });

  it('five Friends today → the first three faces and "친구 5명의 오늘"', () => {
    expect(toFootprintsView({ friendCount: 5, faces: faces(5) })).toEqual({
      faces: [
        { id: 'u0', name: '친구0', photo: null },
        { id: 'u1', name: '친구1', photo: null },
        { id: 'u2', name: '친구2', photo: null },
      ],
      line: '친구 5명의 오늘',
    });
  });
});
