/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene } from '@/api/assistant-types';
import type { WalkingRoute } from '@/api/walking-route-types';
import {
  endsOf,
  linesAlongPaths,
  linesOn,
  routeLineId,
  waitingLines,
  walksOf,
  walksToAsk,
} from '@/features/assistant/answer-walks';
import type { LineStyle, MapLine } from '@/map';

// An answer's walking routes along their paths (P15 ticket 56): which routes of a scene are walked, which of them are
// asked for, and which line each route draws once the walking route service answered or not.

const A = { latitude: 37.45, longitude: 126.95 };
const B = { latitude: 37.451, longitude: 126.951 };
const C = { latitude: 37.452, longitude: 126.952 };
const D = { latitude: 37.453, longitude: 126.953 };
const BEND = { latitude: 37.4505, longitude: 126.9509 };
// Where the service's path starts and ends: the walkways nearest to A and B.
const NEAR_A = { latitude: 37.4501, longitude: 126.9501 };
const NEAR_B = { latitude: 37.4509, longitude: 126.9509 };
const STYLE = { color: '#123456', width: 5 };
const DASHED: LineStyle = { color: '#654321', width: 3, dash: [2, 6] };

type Route = MapScene['routes'][number];

function route(from: Route['from'], to: Route['to'], more: Partial<Route> = {}): Route {
  return { userId: 'u', role: 'me', from, to, minutes: 3, ...more };
}

function found(...line: Route['from'][]): WalkingRoute {
  return { status: 'OK', route: { line, distance: 200, duration: 180 } };
}

const LINES: MapLine[] = [
  { id: routeLineId(0), points: [A, B], style: STYLE },
  { id: routeLineId(1), points: [B, C], style: DASHED },
];

// Partitions: a route with no mode, with 'walk', with 'shuttle'.
describe('the walks of a scene', () => {
  it("takes the routes without a mode and the walks, not a shuttle's ride, with their lines' ids", () => {
    const walks = walksOf([route(A, B), route(B, C, { mode: 'shuttle' }), route(C, A, { mode: 'walk', role: 'next' })]);

    expect(walks).toEqual([
      { lineId: 'answer:route:0', role: 'me', from: A, to: B },
      { lineId: 'answer:route:2', role: 'next', from: C, to: A },
    ]);
  });
});

// Partitions: fewer walks than the limit, more; two walks with the same ends; the way to the next Class first in the
// scene. Expected values: the decision that the people's ways come before the way on to the next Class.
describe('the walks asked for', () => {
  it('asks each pair of ends once, the people before the next Class, and no more than the limit', () => {
    const walks = walksOf([
      route(C, D, { role: 'next' }),
      route(A, B),
      route(A, B, { role: 'friend' }),
      route(B, C, { role: 'friend' }),
      route(D, A, { role: 'friend' }),
    ]);

    expect(walksToAsk(walks, 3).map(({ lineId }) => lineId)).toEqual([
      'answer:route:1',
      'answer:route:3',
      'answer:route:4',
    ]);
    expect(walksToAsk(walks, 9).map(({ lineId }) => lineId)).toEqual([
      'answer:route:1',
      'answer:route:3',
      'answer:route:4',
      'answer:route:0',
    ]);
  });
});

// Partitions: a walk found whose path reaches its ends, one whose path stops short of them, not answered yet, found
// no path, found a line of one point; two lines of the same ends; a line that is no walk.
describe('the lines drawn', () => {
  const walks = walksOf([route(A, B), route(B, C, { mode: 'shuttle' })]);
  const pathOf = (answer: WalkingRoute): Map<string, WalkingRoute> => new Map([[endsOf({ from: A, to: B }), answer]]);

  it("draws a walk along its path in the line's own colour, width and style", () => {
    expect(linesAlongPaths(LINES, walks, pathOf(found(A, BEND, B)))).toEqual([
      { id: 'answer:route:0', points: [A, BEND, B], style: STYLE },
      LINES[1],
    ]);
  });

  it("joins the walk's ends onto a path that stops at the nearest walkways", () => {
    expect(linesAlongPaths(LINES, walks, pathOf(found(NEAR_A, BEND, NEAR_B)))[0]?.points).toEqual([
      A,
      NEAR_A,
      BEND,
      NEAR_B,
      B,
    ]);
  });

  it('keeps the straight line while the walk is not answered, and when no path is found', () => {
    expect(linesAlongPaths(LINES, walks, new Map())).toEqual(LINES);
    expect(linesAlongPaths(LINES, walks, pathOf({ status: 'ROUTE_RESULT_NOT_FOUND', route: null }))).toEqual(LINES);
    expect(linesAlongPaths(LINES, walks, pathOf(found(A)))).toEqual(LINES);
  });

  it('draws two walks of the same ends along the one path', () => {
    const twice: MapLine[] = [
      { id: routeLineId(0), points: [A, B], style: STYLE },
      { id: routeLineId(1), points: [A, B], style: DASHED },
    ];

    const drawn = linesAlongPaths(twice, walksOf([route(A, B), route(A, B)]), pathOf(found(A, BEND, B)));

    expect(drawn.map(({ points }) => points)).toEqual([
      [A, BEND, B],
      [A, BEND, B],
    ]);
  });

  it("never moves a line that is not a walk, such as a shuttle's ride", () => {
    const shuttleOnly = walksOf([route(B, C, { mode: 'shuttle' })]);

    expect(linesAlongPaths(LINES, shuttleOnly, pathOf(found(A, BEND, B)))).toEqual(LINES);
  });
});

// P04 ticket 75: a straight line that turns into the path a moment later is not drawn. Partitions: a walk on its way,
// one of the same ends, one found, one not asked; a line on its way whose path has come.
describe('the lines of walks on their way', () => {
  const walks = walksOf([route(A, B), route(A, B, { role: 'friend' }), route(C, D)]);

  it('are the lines of every walk whose ends are on their way', () => {
    expect(waitingLines(walks, new Set([endsOf({ from: A, to: B })]))).toEqual(
      new Set([routeLineId(0), routeLineId(1)]),
    );
    expect(waitingLines(walks, new Set())).toEqual(new Set());
  });

  it('are not drawn until their paths come, while the others are drawn as they are', () => {
    expect(linesOn(LINES, new Map(), new Set([routeLineId(0)]))).toEqual([LINES[1]]);
    expect(linesOn(LINES, new Map([[routeLineId(0), [A, BEND, B]]]), new Set([routeLineId(0)]))[0]?.points).toEqual([
      A,
      BEND,
      B,
    ]);
  });
});
