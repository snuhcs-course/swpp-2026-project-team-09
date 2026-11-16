/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { metresBetween } from '@/features/quests/walking-times';
import { atPoint, inView } from '@/map/projection';

// A Private Zone drawn on the map (P02 ticket 29): the finger's points become positions by the camera at rest and the
// view's size, and the outline is put back in the view by the same camera, each time it settles.

const SIZE = { width: 411, height: 560 };
const CENTRE = { latitude: 37.45905, longitude: 126.9512 };
// 301동, 관정관 and the corners of the on-campus rectangle.
const AROUND = [
  { latitude: 37.45016, longitude: 126.95259 },
  { latitude: 37.45903, longitude: 126.95247 },
  { latitude: 37.445, longitude: 126.945 },
  { latitude: 37.471, longitude: 126.963 },
];

describe('a position put in the view and read back', () => {
  it.each([15, 16, 17, 18])('comes back within half a metre at zoom %d', (zoom) => {
    const camera = { centre: CENTRE, zoom };

    for (const position of AROUND) {
      const back = atPoint(inView(position, camera, SIZE), camera, SIZE);
      expect(metresBetween(position, back)).toBeLessThan(0.5);
    }
  });

  it.each([15, 16, 17, 18])("puts the camera's centre at the view's middle at zoom %d", (zoom) => {
    const middle = inView(CENTRE, { centre: CENTRE, zoom }, SIZE);

    expect(middle.x).toBeCloseTo(SIZE.width / 2, 9);
    expect(middle.y).toBeCloseTo(SIZE.height / 2, 9);
  });
});
