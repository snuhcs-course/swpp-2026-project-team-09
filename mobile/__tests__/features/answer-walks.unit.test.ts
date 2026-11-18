/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { MapScene } from '@/api/assistant-types';
import type { WalkingRoute } from '@/api/walking-route-types';
import { linesAlongPaths, routeLineId, walksOf } from '@/features/assistant/answer-walks';
import type { MapLine } from '@/map';

// An answer's walking routes along their paths (P15 ticket 56): which routes of a scene are walked, and which line each
// route draws once the walking route service answered or not.

const A = { latitude: 37.45, longitude: 126.95 };
const B = { latitude: 37.451, longitude: 126.951 };
const C = { latitude: 37.452, longitude: 126.952 };
const BEND = { latitude: 37.4505, longitude: 126.9509 };
const STYLE = { color: '#123456', width: 5 };
const DASHED = { color: '#654321', width: 3, dash: [2, 6] };

type Route = MapScene['routes'][number];

function route(from: Route['from'], to: Route['to'], mode?: Route['mode']): Route {
  return { userId: 'u', role: 'me', from, to, minutes: 3, ...(mode === undefined ? {} : { mode }) };
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
    const walks = walksOf([route(A, B), route(B, C, 'shuttle'), route(C, A, 'walk')]);

    expect(walks).toEqual([
      { lineId: 'answer:route:0', from: A, to: B },
      { lineId: 'answer:route:2', from: C, to: A },
    ]);
  });
});

// Partitions: a walk found, not answered yet, failed (no data), found no path, found a line of one point; a line that
// is no walk.
describe('the lines drawn', () => {
  const walks = walksOf([route(A, B), route(B, C, 'shuttle')]);

  it("draws a walk along its path in the line's own colour, width and style", () => {
    expect(linesAlongPaths(LINES, walks, [found(A, BEND, B)])).toEqual([
      { id: 'answer:route:0', points: [A, BEND, B], style: STYLE },
      LINES[1],
    ]);
  });

  it('keeps the straight line while the walk is not answered, after a failure, and when no path is found', () => {
    expect(linesAlongPaths(LINES, walks, [])).toEqual(LINES);
    expect(linesAlongPaths(LINES, walks, [undefined])).toEqual(LINES);
    expect(linesAlongPaths(LINES, walks, [{ status: 'ROUTE_RESULT_NOT_FOUND', route: null }])).toEqual(LINES);
    expect(linesAlongPaths(LINES, walks, [found(A)])).toEqual(LINES);
  });

  it("never moves a line that is not a walk, such as a shuttle's ride", () => {
    const shuttleOnly = walksOf([route(B, C, 'shuttle')]);

    expect(linesAlongPaths(LINES, shuttleOnly, [found(A, BEND, B)])).toEqual(LINES);
  });
});
