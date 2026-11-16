/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { atPoint, inView } from '@/map/projection';

// The position under a point of the map's view (P02 ticket 22): a tap on the ground is turned into the position it
// landed on, by the camera at rest and the view's size.

const SIZE = { width: 390, height: 844 };
const CENTRE = { latitude: 37.459, longitude: 126.952 };
const AT_17 = { centre: CENTRE, zoom: 17 };
const AT_18 = { centre: CENTRE, zoom: 18 };

// Half the view's width at a zoom, in degrees of longitude: 195 points of a world 256 × 2^zoom points wide.
const WEST_EDGE_17 = 126.94990787696838;
const EAST_EDGE_17 = 126.95409212303161;
const WEST_EDGE_18 = 126.95095393848419;

// Partitions: the view's centre, its top left and bottom right corners, and the same point at two zooms.
describe('the position at a point of the view', () => {
  it("is the camera's centre at the view's centre", () => {
    const at = atPoint({ x: 195, y: 422 }, AT_17, SIZE);

    expect(at.latitude).toBeCloseTo(CENTRE.latitude, 9);
    expect(at.longitude).toBeCloseTo(CENTRE.longitude, 9);
  });

  it('is at the west edge and north of the centre at the top left corner, where the view places it', () => {
    const at = atPoint({ x: 0, y: 0 }, AT_17, SIZE);

    expect(at.longitude).toBeCloseTo(WEST_EDGE_17, 9);
    expect(at.latitude).toBeGreaterThan(CENTRE.latitude);
    const back = inView(at, AT_17, SIZE);
    expect(back.x).toBeCloseTo(0, 6);
    expect(back.y).toBeCloseTo(0, 6);
  });

  it('is at the east edge and south of the centre at the bottom right corner', () => {
    const at = atPoint({ x: 390, y: 844 }, AT_17, SIZE);

    expect(at.longitude).toBeCloseTo(EAST_EDGE_17, 9);
    expect(at.latitude).toBeLessThan(CENTRE.latitude);
    const back = inView(at, AT_17, SIZE);
    expect(back.x).toBeCloseTo(390, 6);
    expect(back.y).toBeCloseTo(844, 6);
  });

  it('is half as far from the centre one zoom closer', () => {
    const far = atPoint({ x: 0, y: 0 }, AT_17, SIZE);
    const near = atPoint({ x: 0, y: 0 }, AT_18, SIZE);

    expect(near.longitude).toBeCloseTo(WEST_EDGE_18, 9);
    expect(near.latitude - CENTRE.latitude).toBeCloseTo((far.latitude - CENTRE.latitude) / 2, 6);
  });
});
