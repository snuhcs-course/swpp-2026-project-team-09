/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type OsmWay, type Pin, walkingGraph, walkingSeconds } from '../src/travel/walking-graph.js';

// Hand-made graphs on a plane in metres, from a corner near the campus.
const METRES_PER_DEGREE = 111_195;
const LATITUDE = 37.458;
const LONGITUDE = 126.95;
const EAST = METRES_PER_DEGREE * Math.cos((LATITUDE * Math.PI) / 180);

function point(x: number, y: number): { lat: number; lon: number } {
  return { lat: LATITUDE + y / METRES_PER_DEGREE, lon: LONGITUDE + x / EAST };
}

function pin(x: number, y: number, elevation = 0): Pin {
  const { lat, lon } = point(x, y);
  return { latitude: lat, longitude: lon, elevation };
}

// A way through the points (x, y), (x, y) and so on. Nodes at one spot are one node, so ways join where they meet.
function tagged(tags: Record<string, string>, ...coordinates: number[]): OsmWay {
  const points = coordinates.flatMap((x, index) =>
    index % 2 === 0 ? [[x, coordinates[index + 1] ?? 0] as const] : [],
  );
  return {
    nodes: points.map(([x, y]) => (x + 10_000) * 100_000 + y + 10_000),
    geometry: points.map(([x, y]) => point(x, y)),
    tags,
  };
}

function footway(...coordinates: number[]): OsmWay {
  return tagged({ highway: 'footway' }, ...coordinates);
}

function seconds(ways: OsmWay[], from: Pin, to: Pin): number {
  const [row] = walkingSeconds(walkingGraph(ways), [from], [to]);
  return row?.[0] ?? Number.NaN;
}

function shortCut(tags: Record<string, string>): OsmWay {
  return tagged(tags, 0, 0, 100, 0);
}

// Two long roads, joined only at their west end, with the pins 200 m along them.
function twoRoads(farY: number): OsmWay[] {
  return [footway(0, 0, 400, 0), footway(0, 0, 0, farY, 400, farY)];
}

const SPEED = 1.1;

describe('the walk between two pins', () => {
  it('goes from the pin to the path, along it and from the path, in straight lines at 1.1 m/s', () => {
    expect(seconds([footway(0, 0, 100, 0)], pin(0, 10), pin(100, 10))).toBeCloseTo((10 + 100 + 10) / SPEED);
  });

  it('turns where two ways share a node', () => {
    const ways = [footway(0, 0, 100, 0), footway(100, 0, 100, 100)];

    expect(seconds(ways, pin(0, 0), pin(100, 100))).toBeCloseTo(200 / SPEED);
  });

  it('crosses no way it shares no node with', () => {
    const ways = [footway(0, 0, 100, 0), footway(50, -50, 50, 50), footway(0, 0, 0, 50, 50, 50)];

    expect(seconds(ways, pin(100, 0), pin(50, 50))).toBeCloseTo((100 + 50 + 50) / SPEED);
  });

  it('takes no time from a pin to itself', () => {
    const here = pin(50, 10);

    expect(seconds([footway(0, 0, 100, 0)], here, here)).toBe(0);
  });
});

describe('the ways of the graph', () => {
  const road = footway(0, 0, 0, 100, 100, 100, 100, 0);
  const from = pin(0, 0);
  const to = pin(100, 0);

  it.each([
    'footway',
    'path',
    'steps',
    'pedestrian',
    'living_street',
    'service',
    'residential',
    'unclassified',
    'tertiary',
    'secondary',
    'track',
  ])('walks a %s', (highway) => {
    expect(seconds([road, shortCut({ highway })], from, to)).toBeCloseTo(100 / SPEED);
  });

  it.each<Record<string, string>>([
    { highway: 'motorway' },
    { highway: 'trunk' },
    { highway: 'footway', foot: 'no' },
    { highway: 'service', access: 'private' },
  ])('walks no way tagged %j', (tags) => {
    expect(seconds([road, shortCut(tags)], from, to)).toBeCloseTo(300 / SPEED);
  });

  it('walks a private way that says foot=yes', () => {
    const tags = { highway: 'service', access: 'private', foot: 'yes' };

    expect(seconds([road, shortCut(tags)], from, to)).toBeCloseTo(100 / SPEED);
  });
});

describe('joining a pin to the graph', () => {
  it('joins the nearest path and another within that distance + 20 m', () => {
    // 5 m to the near road and 24 m to the far one, so that the walk steps across.
    expect(seconds(twoRoads(29), pin(200, 5), pin(200, 39))).toBeCloseTo((24 + 10) / SPEED);
  });

  it('joins no path further than the nearest distance + 20 m', () => {
    // 5 m to the near road and 26 m to the far one, so that the walk goes round by the west end.
    expect(seconds(twoRoads(31), pin(200, 5), pin(200, 41))).toBeCloseTo((5 + 200 + 31 + 200 + 10) / SPEED);
  });

  it('joins only the main connected component', () => {
    const main = footway(0, 0, 100, 0, 200, 0);
    const island = footway(90, 49, 110, 49);

    expect(seconds([main, island], pin(100, 50), pin(200, 0))).toBeCloseTo((50 + 100) / SPEED);
  });

  it('joins no way tagged sac_scale', () => {
    const trail = tagged({ highway: 'path', sac_scale: 'hiking' }, 0, 0, 100, 0);
    const sides = footway(0, 0, 0, 30, 100, 30, 100, 0);

    expect(seconds([trail, sides], pin(50, 1), pin(50, 40))).toBeCloseTo((29 + 10) / SPEED);
  });

  it('runs along a way tagged sac_scale, which only a join leaves out', () => {
    const trail = tagged({ highway: 'path', sac_scale: 'hiking' }, 0, 0, 100, 0);
    const ways = [trail, footway(0, 0, 0, 300), footway(100, 0, 100, 300)];

    expect(seconds(ways, pin(0, 300), pin(100, 300))).toBeCloseTo((300 + 100 + 300) / SPEED);
  });
});

describe('climbing', () => {
  const path = footway(0, 0, 110, 0);

  it('adds 0.5 minutes per 10 m when the destination is higher', () => {
    expect(seconds([path], pin(0, 0, 100), pin(110, 0, 120))).toBeCloseTo(100 + 60);
  });

  it('adds nothing going down', () => {
    expect(seconds([path], pin(0, 0, 120), pin(110, 0, 100))).toBeCloseTo(100);
  });
});
