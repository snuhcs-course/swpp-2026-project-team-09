/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { MapScene } from '@/api/assistant-types';
import type { RouteRole } from '@/api/scene-roles';
import type { LatLng } from '@/api/types';
import type { WalkingRoute } from '@/api/walking-route-types';
import type { MapLine } from '@/map';

// The id of the line of a scene's route at `index` of its routes.
export function routeLineId(index: number): string {
  return `answer:route:${index}`;
}

// A route of a scene that is walked: the id of its line, whose way it is, and its two ends.
export interface Walk {
  lineId: string;
  role: RouteRole;
  from: LatLng;
  to: LatLng;
}

// The routes of a scene that are walked, in the scene's order: those without a mode and those whose mode is 'walk'. A
// shuttle's ride is not.
export function walksOf(routes: MapScene['routes']): Walk[] {
  return routes.flatMap(({ role, from, to, mode }, index) =>
    mode === undefined || mode === 'walk' ? [{ lineId: routeLineId(index), role, from, to }] : [],
  );
}

// The two ends of a walk, as one key: walks with the same ends share one path.
export function endsOf({ from, to }: Pick<Walk, 'from' | 'to'>): string {
  return `${from.latitude},${from.longitude}>${to.latitude},${to.longitude}`;
}

// The walks whose paths are asked for: each pair of ends once, the people's ways to the place before the way on to
// the next Class, in the scene's order otherwise, and at most `limit` of them.
export function walksToAsk(walks: readonly Walk[], limit: number): Walk[] {
  const distinct = walks.filter((walk, at) => walks.findIndex((other) => endsOf(other) === endsOf(walk)) === at);
  const people = distinct.filter(({ role }) => role !== 'next');
  const next = distinct.filter(({ role }) => role === 'next');
  return [...people, ...next].slice(0, limit);
}

function same(one: LatLng, other: LatLng): boolean {
  return one.latitude === other.latitude && one.longitude === other.longitude;
}

// A path that starts and ends at the walk's own ends: the walking route service snaps each end to the nearest walkway,
// which may stop short of a building's mark, so the ends are joined on where the path does not reach them.
function joined(walk: Walk, path: readonly LatLng[]): LatLng[] {
  const first = path[0];
  const last = path.at(-1);
  return [
    ...(first === undefined || same(first, walk.from) ? [] : [walk.from]),
    ...path,
    ...(last === undefined || same(last, walk.to) ? [] : [walk.to]),
  ];
}

// The lines to draw: each walk's line along the path the walking route service found for its two ends (`found`, by
// `endsOf`), joined onto its ends, in the line's own colour, width and style. A line whose walk was not found yet,
// failed, or found no path stays the straight line from its start to its end, as does every line that is not a walk.
export function linesAlongPaths(
  lines: readonly MapLine[],
  walks: readonly Walk[],
  found: ReadonlyMap<string, WalkingRoute>,
): MapLine[] {
  return lines.map((line) => {
    const walk = walks.find(({ lineId }) => lineId === line.id);
    const route = walk === undefined ? undefined : found.get(endsOf(walk));
    if (walk === undefined || route?.status !== 'OK' || route.route.line.length < 2) {
      return line;
    }
    return { ...line, points: joined(walk, route.route.line) };
  });
}
