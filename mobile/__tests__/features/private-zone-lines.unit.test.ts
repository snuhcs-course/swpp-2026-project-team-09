/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import { hatchOf, zoneLines } from '@/features/private-zones/zone-lines';
import { type Point, project } from '@/map';
import { BUILDING_301, offset, squareRound } from '../support/zone-shapes';

// The Private Zones as lines of the map (P02 ticket 34): each outline closed, its inside hatched with diagonal strokes
// laid at the camera's whole zoom.

const ZOOM = 17;
const SQUARE = squareRound(BUILDING_301, 80);
// A U open to the north: 60 m wide, 60 m tall, a 20 m gap in the middle down to 20 m above its bottom.
const U: LatLng[] = [
  offset(BUILDING_301, -30, -30),
  offset(BUILDING_301, 30, -30),
  offset(BUILDING_301, 30, 30),
  offset(BUILDING_301, 10, 30),
  offset(BUILDING_301, 10, -10),
  offset(BUILDING_301, -10, -10),
  offset(BUILDING_301, -10, 30),
  offset(BUILDING_301, -30, 30),
];

function placed(points: readonly LatLng[]): Point[] {
  return points.map((point) => project(point, ZOOM));
}

function box(points: readonly Point[]): { left: number; right: number; top: number; bottom: number } {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

describe('the hatch of a zone', () => {
  it('lays diagonal strokes whose ends are on the outline, all inside it', () => {
    const outer = box(placed(SQUARE));

    const strokes = hatchOf(SQUARE, ZOOM).map((stroke) => placed(stroke));

    expect(strokes.length).toBeGreaterThan(5);
    for (const [from, to] of strokes) {
      expect(from).toBeDefined();
      expect(to).toBeDefined();
      for (const end of [from, to]) {
        expect(end?.x).toBeGreaterThanOrEqual(outer.left - 0.01);
        expect(end?.x).toBeLessThanOrEqual(outer.right + 0.01);
        expect(end?.y).toBeGreaterThanOrEqual(outer.top - 0.01);
        expect(end?.y).toBeLessThanOrEqual(outer.bottom + 0.01);
      }
      expect((from?.x ?? 0) + (from?.y ?? 0)).toBeCloseTo((to?.x ?? 0) + (to?.y ?? 0), 3);
    }
  });

  it('lays the same strokes for any zoom that rounds to the same level, and fewer further out', () => {
    expect(hatchOf(SQUARE, 16.6)).toEqual(hatchOf(SQUARE, 17.4));
    expect(hatchOf(SQUARE, 16).length).toBeLessThan(hatchOf(SQUARE, 17).length);
  });

  it('breaks a stroke where it crosses the gap of a U', () => {
    const strokes = hatchOf(U, ZOOM);
    const sums = strokes.map(([from]) => {
      const point = project(from ?? BUILDING_301, ZOOM);
      return Math.round(point.x + point.y);
    });

    expect(new Set(sums).size).toBeLessThan(strokes.length);
  });

  it('keeps to at most 80 strokes however close the camera', () => {
    expect(hatchOf(SQUARE, 21).length).toBeLessThanOrEqual(80);
  });
});

describe('the lines of the zones', () => {
  it('closes each outline after its hatch, and puts the outline not yet saved last, dashed', () => {
    const zone = { id: 'z1', label: '301동 근처', outline: SQUARE, createdAt: '2026-11-16T03:00:00.000Z' };

    const lines = zoneLines([zone], U, ZOOM);

    const ids = lines.map(({ id }) => id);
    expect(ids.indexOf('zone:z1')).toBeGreaterThan(ids.indexOf('zone:z1:hatch:0'));
    expect(lines.find(({ id }) => id === 'zone:z1')?.points).toEqual([...SQUARE, SQUARE[0]]);
    expect(lines.at(-1)).toMatchObject({ id: 'unsaved-zone', style: { dash: [6, 4] } });
  });
});
