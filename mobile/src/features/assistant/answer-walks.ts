/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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

// The paths found for a scene's walks (`found`, by `endsOf`), joined onto their ends, by their lines' ids. A walk not
// found yet, failed, or with no path is not in it.
export function pathsOf(walks: readonly Walk[], found: ReadonlyMap<string, WalkingRoute>): Map<string, LatLng[]> {
  return new Map(
    walks.flatMap((walk): [string, LatLng[]][] => {
      const route = found.get(endsOf(walk));
      return route?.status !== 'OK' || route.route.line.length < 2
        ? []
        : [[walk.lineId, joined(walk, route.route.line)]];
    }),
  );
}

// The lines to draw: each walk's line along the path the walking route service found for its two ends (`found`, by
// `endsOf`), joined onto its ends, in the line's own colour, width and style. A line whose walk was not found yet,
// failed, or found no path stays the straight line from its start to its end, as does every line that is not a walk.
export function linesAlongPaths(
  lines: readonly MapLine[],
  walks: readonly Walk[],
  found: ReadonlyMap<string, WalkingRoute>,
): MapLine[] {
  return linesOn(lines, pathsOf(walks, found));
}

// The ids of the lines of the walks whose paths are on their way: those whose ends (`endsOf`) are `waiting`.
export function waitingLines(walks: readonly Walk[], waiting: ReadonlySet<string>): Set<string> {
  return new Set(walks.flatMap((walk) => (waiting.has(endsOf(walk)) ? [walk.lineId] : [])));
}

const NONE_WAITING: ReadonlySet<string> = new Set();

// The lines with those of `paths`, by their ids, along their paths; those `waiting` for a path not drawn until it
// comes (P04 ticket 75), so that no straight line shows and turns into the path a moment later; the others as they
// are.
export function linesOn(
  lines: readonly MapLine[],
  paths: ReadonlyMap<string, readonly LatLng[]>,
  waiting: ReadonlySet<string> = NONE_WAITING,
): MapLine[] {
  return lines.flatMap((line) => {
    const points = paths.get(line.id);
    if (points !== undefined) {
      return [{ ...line, points }];
    }
    return waiting.has(line.id) ? [] : [line];
  });
}

// The walking a meal Plan adds to the User's day (the answer screen's redesign, board E1): the way from where they
// start to the place, plus the way on from it to the next fixed thing when one follows. When where they start is not
// known, the way on alone, which every choice adds all the same; null with neither.
export function addedWalk({ parts, scene }: Pick<Plan, 'parts' | 'scene'>): number | null {
  const there = parts.find(({ me }) => me)?.walkMinutes ?? null;
  const on = scene.routes.find(({ role }) => role === 'next')?.minutes ?? null;
  if (there === null) {
    return on;
  }
  return there + (on ?? 0);
}

// The way a meal Plan adds to the User's day, as `addedWalk` counts it, and whether a leg of it is by shuttle: the way
// there (the User's part's `mode`) or a leg of the scene's routes, the way on included. Null when where they start is
// not known. A main server before the shuttle-aware Plan sends no `mode`, which reads as walking.
export function travelOf(plan: Pick<Plan, 'parts' | 'scene'>): { minutes: number; shuttle: boolean } | null {
  const minutes = addedWalk(plan);
  if (minutes === null) {
    return null;
  }
  const shuttle =
    plan.parts.some(({ me, mode }) => me && mode === 'shuttle') ||
    plan.scene.routes.some(({ role, mode }) => (role === 'me' || role === 'next') && mode === 'shuttle');
  return { minutes, shuttle };
}

// "걸음 16분" where every leg is on foot, "이동 16분 · 셔틀" where one is by shuttle; null when not known.
export function travelWords(plan: Pick<Plan, 'parts' | 'scene'>): string | null {
  const travel = travelOf(plan);
  if (travel === null) {
    return null;
  }
  return travel.shuttle ? `이동 ${String(travel.minutes)}분 · 셔틀` : `걸음 ${String(travel.minutes)}분`;
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

// Where a person of a Plan sets out from, as the answer used it: the end of a fixed thing of theirs at its place (a
// Class or a Quest ending between now and the Plan's start), the place alone when no such thing ends there in that
// time, as an older reply gives for a Class already over, their own position, or null when it is not known.
export type StartPoint =
  | { kind: 'item'; at: string; label: string | null; place: string }
  | { kind: 'place'; place: string }
  | { kind: 'here' };

export function startOf(plan: Pick<Plan, 'band' | 'parts' | 'startAt'>, userId?: string): StartPoint | null {
  const part = plan.parts.find((one) => (userId === undefined ? one.me : one.userId === userId));
  const origin = part?.origin ?? null;
  if (part === undefined || origin === null) {
    return null;
  }
  if (origin.basis === 'location') {
    return { kind: 'here' };
  }
  const now = Date.parse(plan.band.now);
  const start = Date.parse(plan.startAt);
  const lane = plan.band.lanes.find((one) => one.userId === part.userId);
  const item = (lane?.busy ?? []).findLast(({ endAt }) => Date.parse(endAt) >= now && Date.parse(endAt) <= start);
  return item === undefined
    ? { kind: 'place', place: origin.place.label }
    : { kind: 'item', at: item.endAt, label: item.label ?? null, place: origin.place.label };
}

// The fixed thing after the Plan, starting at or after its end, with the time it starts; null for none.
export function fixedAfter(plan: Pick<Plan, 'band' | 'parts' | 'endAt'>): FixedThing | null {
  const end = Date.parse(plan.endAt);
  const next = myBusy(plan).find(({ startAt }) => Date.parse(startAt) >= end);
  return next === undefined ? null : { at: next.startAt, label: next.label ?? null };
}

const MINUTE = 60_000;
// How long a meal takes at least, for whether a candidate fits: the main server's `SHORTEST_MEAL_SECONDS`, by which it
// keeps a candidate, so that the phone fades none it offers for this alone (P04 ticket 71).
const SHORTEST_MEAL = 15;

// Whether a meal Plan fits its band: arriving inside it, fifteen minutes there, and the walk on, before the next fixed
// thing, or before the band's end with none.
export function fitsBand(plan: Pick<Plan, 'band' | 'parts' | 'scene' | 'startAt' | 'endAt'>): boolean {
  const start = Date.parse(plan.startAt);
  const on = plan.scene.routes.find(({ role }) => role === 'next')?.minutes ?? 0;
  const next = fixedAfter(plan);
  const end = Date.parse(next?.at ?? plan.band.range.endAt);
  return start >= Date.parse(plan.band.range.startAt) && start + (SHORTEST_MEAL + on) * MINUTE <= end;
}

// A candidate the map and the list fade: it cannot be done in the time, as it does not fit its band. A long walk alone
// fades nothing: the list's order by walking says it already.
export function fadedPlan(plan: Pick<Plan, 'band' | 'parts' | 'scene' | 'startAt' | 'endAt'>): boolean {
  return !fitsBand(plan);
}
