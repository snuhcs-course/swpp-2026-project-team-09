/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, Plan } from '@/api/assistant-types';
import type { ShuttleRoute, ShuttleStop } from '@/api/shuttle-types';
import type { LatLng } from '@/api/types';
import type { MapLine } from '@/map';
import { metresBetween } from './answer-drawing';
import { type Draft, LEG_STYLES } from './answer-groups';
import { routeLineId, type Walk } from './answer-walks';

// A meal Plan's leg by the shuttle, drawn as the User goes it (P04 ticket 41): the walk from where the leg starts to
// the stop they board at, along the walkways; the ride along the shuttle's own road line to the stop they get off at;
// and the walk from that stop to where the leg ends. The stops are the ones the Plan names (the User's part's
// `shuttle`), else, as for a way on, the ones nearest the leg's ends.

export interface ShuttleLeg {
  // The leg's index among the scene's routes.
  index: number;
  from: LatLng;
  to: LatLng;
  board: ShuttleStop;
  getOff: ShuttleStop;
  // Along the loop's roads from the boarding stop to the stop they get off at.
  ride: LatLng[];
}

// The paths the walks were found along, by their lines' ids, and a meal Plan's legs by the shuttle.
export interface Ways {
  paths: ReadonlyMap<string, readonly LatLng[]>;
  legs: readonly ShuttleLeg[];
  // The ids of the walks' lines whose paths are on their way, not drawn until they come (P04 ticket 75). Left out,
  // none.
  waiting?: ReadonlySet<string>;
}

export const NO_WAYS: Ways = { paths: new Map(), legs: [] };

export function walkInId(index: number): string {
  return `${routeLineId(index)}:in`;
}

export function rideId(index: number): string {
  return `${routeLineId(index)}:ride`;
}

export function walkOutId(index: number): string {
  return `${routeLineId(index)}:out`;
}

function point({ latitude, longitude }: LatLng): LatLng {
  return { latitude, longitude };
}

function nearestStop(stops: readonly ShuttleStop[], at: LatLng): ShuttleStop | null {
  let best: ShuttleStop | null = null;
  for (const stop of stops) {
    if (best === null || metresBetween(point(stop), at) < metresBetween(point(best), at)) {
      best = stop;
    }
  }
  return best;
}

function stopOf(stops: readonly ShuttleStop[], name: string | undefined, at: LatLng): ShuttleStop | null {
  return stops.find((stop) => stop.name === name) ?? nearestStop(stops, at);
}

function nearestIndex(line: readonly LatLng[], at: LatLng): number {
  let best = 0;
  for (const [index, one] of line.entries()) {
    if (metresBetween(one, at) < metresBetween(line[best] ?? one, at)) {
      best = index;
    }
  }
  return best;
}

// The loop's road line from one stop to the next one in the loop's direction, around past its start when it must.
export function rideBetween(line: readonly LatLng[], board: ShuttleStop, getOff: ShuttleStop): LatLng[] {
  const from = nearestIndex(line, point(board));
  const to = nearestIndex(line, point(getOff));
  const along = from <= to ? line.slice(from, to + 1) : [...line.slice(from), ...line.slice(0, to + 1)];
  return [point(board), ...along, point(getOff)];
}

// The Plan's legs by the shuttle, once the shuttle's route is known; none without it.
export function shuttleLegsOf(plan: Pick<Plan, 'parts' | 'scene'>, shuttle: ShuttleRoute | null): ShuttleLeg[] {
  if (shuttle === null) {
    return [];
  }
  const named = plan.parts.find(({ me }) => me)?.shuttle;
  return plan.scene.routes.flatMap(({ role, from, to, mode }, index): ShuttleLeg[] => {
    if (mode !== 'shuttle' || (role !== 'me' && role !== 'next')) {
      return [];
    }
    const board = stopOf(shuttle.stops, role === 'me' ? named?.boardAt : undefined, from);
    const getOff = stopOf(shuttle.stops, role === 'me' ? named?.getOffAt : undefined, to);
    if (board === null || getOff === null || board.id === getOff.id) {
      return [];
    }
    return [{ index, from, to, board, getOff, ride: rideBetween(shuttle.line, board, getOff) }];
  });
}

// The walks to the boarding stop and from the stop they get off at, whose paths are asked for as the scene's are.
export function shuttleWalks(legs: readonly ShuttleLeg[]): Walk[] {
  return legs.flatMap(({ index, from, to, board, getOff }) => [
    { lineId: walkInId(index), role: 'me', from, to: point(board) },
    { lineId: walkOutId(index), role: 'me', from: point(getOff), to },
  ]);
}

// The lines of a leg by the shuttle: the two walks, along their paths once found, and the ride, each in its leg's
// weight (`on`, the way on to the next fixed thing: a pale band) and its mode's hue (P04 ticket 76).
export function shuttleLines(leg: ShuttleLeg, ways: Ways, on = false): MapLine[] {
  const { index, from, to, board, getOff, ride } = leg;
  const walk = on ? LEG_STYLES.walkOn : LEG_STYLES.walkThere;
  return [
    { id: walkInId(index), points: ways.paths.get(walkInId(index)) ?? [from, point(board)], style: walk },
    { id: rideId(index), points: ride, style: on ? LEG_STYLES.rideOn : LEG_STYLES.rideThere },
    { id: walkOutId(index), points: ways.paths.get(walkOutId(index)) ?? [point(getOff), to], style: walk },
  ];
}

// The line of a scene's route by the shuttle in a meal Plan: its leg's, or one ride in the shuttle's hue when its stops
// are not known, never a walk's that reads as a walk through buildings.
export function shuttleRouteLines(route: MapScene['routes'][number], index: number, ways: Ways, on = false): MapLine[] {
  const leg = ways.legs.find((one) => one.index === index);
  const ride = on ? LEG_STYLES.rideOn : LEG_STYLES.rideThere;
  return leg === undefined
    ? [{ id: routeLineId(index), points: [route.from, route.to], style: ride }]
    : shuttleLines(leg, ways, on).filter(({ id }) => ways.waiting?.has(id) !== true);
}

function stopDraft(stop: ShuttleStop, word: string, id: string): Draft {
  return {
    id,
    name: `${stop.name} ${word}`,
    position: point(stop),
    planId: null,
    group: 'stop',
    symbol: { type: 'dot', role: 'stop', number: null },
    tone: 'stop',
    title: null,
    line: null,
    number: null,
  };
}

// The two stops of a leg by the shuttle: a dot each where the line turns purple and back, with no words on the map
// (P04 ticket 80), named for a screen reader "301동 승차", "기숙사삼거리 하차".
export function stopDrafts(legs: readonly ShuttleLeg[]): Draft[] {
  return legs.flatMap(({ index, board, getOff }) => [
    stopDraft(board, '승차', `answer:board:${String(index)}`),
    stopDraft(getOff, '하차', `answer:get-off:${String(index)}`),
  ]);
}
