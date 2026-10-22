/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: positions inside, outside, on an edge and on a corner of simple rings. The distances come from the
// haversine formula on a sphere of 6,371 km, the Earth's mean radius, worked out apart from the code.

import { encloses, metresBetween, metresToRing, type Position } from '../src/common/geometry.js';

// A closed ring, as GeoJSON writes one, between two latitudes and two longitudes.
function rectangle(south: number, north: number, west: number, east: number): Position[] {
  return [
    { latitude: south, longitude: west },
    { latitude: south, longitude: east },
    { latitude: north, longitude: east },
    { latitude: north, longitude: west },
    { latitude: south, longitude: west },
  ];
}

// 0.001° on each side on the campus: 111.20 m north to south and 88.26 m west to east.
const square = rectangle(37.46, 37.461, 126.95, 126.951);
const middle = { latitude: 37.4605, longitude: 126.9505 };

describe('metresBetween', () => {
  it('the same position → 0 m', () => {
    expect(metresBetween(middle, middle)).toBe(0);
  });

  it.each([
    ['0.001° of latitude', 111.2, { latitude: 37.46, longitude: 126.95 }, { latitude: 37.461, longitude: 126.95 }],
    [
      '0.001° of longitude at 37.46° N',
      88.26,
      { latitude: 37.46, longitude: 126.95 },
      { latitude: 37.46, longitude: 126.951 },
    ],
    [
      "제1공학관 and the shuttle's 정문 stop, as README.md places them,",
      1764.95,
      { latitude: 37.45016, longitude: 126.95259 },
      { latitude: 37.4656884925184, longitude: 126.948449058974 },
    ],
  ])('%s apart → %f m', (_as, metres, from, to) => {
    expect(metresBetween(from, to)).toBeCloseTo(metres, 1);
  });
});

describe('encloses', () => {
  it('a position inside the ring → held', () => {
    expect(encloses(square, middle)).toBe(true);
  });

  it('a position outside the ring → not held', () => {
    expect(encloses(square, { latitude: 37.4605, longitude: 126.952 })).toBe(false);
  });

  it("a position in the notch of an L-shaped ring, inside the L's bounding box → not held", () => {
    const shape = [
      { latitude: 37.46, longitude: 126.95 },
      { latitude: 37.46, longitude: 126.952 },
      { latitude: 37.461, longitude: 126.952 },
      { latitude: 37.461, longitude: 126.951 },
      { latitude: 37.462, longitude: 126.951 },
      { latitude: 37.462, longitude: 126.95 },
    ];

    expect(encloses(shape, { latitude: 37.4615, longitude: 126.9515 })).toBe(false);
    expect(encloses(shape, { latitude: 37.4615, longitude: 126.9505 })).toBe(true);
  });

  it('a position on the edge two rings share → held by exactly one of them', () => {
    const east = rectangle(37.46, 37.461, 126.951, 126.952);
    const onEdge = { latitude: 37.4605, longitude: 126.951 };

    expect([square, east].filter((ring) => encloses(ring, onEdge))).toHaveLength(1);
  });

  it('a position on the corner four rings share → held by exactly one of them', () => {
    const rings = [
      square,
      rectangle(37.46, 37.461, 126.951, 126.952),
      rectangle(37.461, 37.462, 126.95, 126.951),
      rectangle(37.461, 37.462, 126.951, 126.952),
    ];
    const onCorner = { latitude: 37.461, longitude: 126.951 };

    expect(rings.filter((ring) => encloses(ring, onCorner))).toHaveLength(1);
  });
});

describe('metresToRing', () => {
  it('a position at the middle of the ring → the distance to its nearer sides, 44.13 m', () => {
    expect(metresToRing(square, middle)).toBeCloseTo(44.13, 1);
  });

  it.each([
    ['0.001° east of the ring', 88.26, { latitude: 37.4605, longitude: 126.952 }],
    ['0.0005° north of the ring', 55.6, { latitude: 37.4615, longitude: 126.9505 }],
    ['beyond a corner, 0.0005° north and east of it', 70.98, { latitude: 37.4615, longitude: 126.9515 }],
  ])('a position %s → %f m', (_as, metres, position) => {
    expect(metresToRing(square, position)).toBeCloseTo(metres, 1);
  });

  it.each([
    ['an edge', { latitude: 37.4605, longitude: 126.951 }],
    ['a corner', { latitude: 37.461, longitude: 126.951 }],
  ])('a position on %s → 0 m', (_as, position) => {
    expect(metresToRing(square, position)).toBeCloseTo(0, 6);
  });
});
