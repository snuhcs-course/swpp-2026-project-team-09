/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, Plan } from '@/api/assistant-types';
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

// The walking a meal Plan adds to the User's day (the answer screen's redesign, board E1): the way from where they
// start to the place, plus the way on from it to the next fixed thing when one follows. Null when where they start is
// not known.
export function addedWalk({ parts, scene }: Pick<Plan, 'parts' | 'scene'>): number | null {
  const there = parts.find(({ me }) => me)?.walkMinutes ?? null;
  if (there === null) {
    return null;
  }
  const on = scene.routes.find(({ role }) => role === 'next');
  return there + (on?.minutes ?? 0);
}

// A fixed thing of the User's day beside a Plan, from their lane of its band: its time and what it is ("302동 수업").
export interface FixedThing {
  at: string;
  label: string | null;
}

function myBusy({ band, parts }: Pick<Plan, 'band' | 'parts'>): Plan['band']['lanes'][number]['busy'] {
  const me = parts.find((part) => part.me)?.userId;
  const lane = band.lanes.find(({ userId }) => userId === me) ?? band.lanes[0];
  return lane?.busy ?? [];
}

// The fixed thing before the Plan, ending at or before its start, with the time it ends; null for none.
export function fixedBefore(plan: Pick<Plan, 'band' | 'parts' | 'startAt'>): FixedThing | null {
  const start = Date.parse(plan.startAt);
  const before = myBusy(plan).filter(({ endAt }) => Date.parse(endAt) <= start);
  const last = before.at(-1);
  return last === undefined ? null : { at: last.endAt, label: last.label ?? null };
}

// The fixed thing after the Plan, starting at or after its end, with the time it starts; null for none.
export function fixedAfter(plan: Pick<Plan, 'band' | 'parts' | 'endAt'>): FixedThing | null {
  const end = Date.parse(plan.endAt);
  const next = myBusy(plan).find(({ startAt }) => Date.parse(startAt) >= end);
  return next === undefined ? null : { at: next.startAt, label: next.label ?? null };
}

const MINUTE = 60_000;
// How long a meal takes at least, for whether a candidate fits.
const SHORTEST_MEAL = 20;
// Walking beyond this fades a candidate.
const FAR = 30;

// Whether a meal Plan fits its band: arriving inside it, twenty minutes there, and the walk on, before the next fixed
// thing, or before the band's end with none.
export function fitsBand(plan: Pick<Plan, 'band' | 'parts' | 'scene' | 'startAt' | 'endAt'>): boolean {
  const start = Date.parse(plan.startAt);
  const on = plan.scene.routes.find(({ role }) => role === 'next')?.minutes ?? 0;
  const next = fixedAfter(plan);
  const end = Date.parse(next?.at ?? plan.band.range.endAt);
  return start >= Date.parse(plan.band.range.startAt) && start + (SHORTEST_MEAL + on) * MINUTE <= end;
}

// A candidate the map fades: it does not fit its band, or its walking is over thirty minutes.
export function fadedPlan(plan: Pick<Plan, 'band' | 'parts' | 'scene' | 'startAt' | 'endAt'>): boolean {
  const walk = addedWalk(plan);
  return !fitsBand(plan) || (walk !== null && walk > FAR);
}
