/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shownMinutes, type TravelMode, type TravelProvider } from '../../travel/travel.js';
import { type GatheringSide, type PersonPart } from './gathering.js';

// The ways of a gathering: the walking table, and the provider's own weighing of the shuttle at a departure.

export type GatheringTravel = Pick<TravelProvider, 'walkingSeconds' | 'travel' | 'shuttleWay'>;

// The stops a way by the shuttle boards and gets off at, by name.
export interface ShuttleStops {
  boardAt: string;
  getOffAt: string;
}

export interface Leg {
  minutes: number;
  by: TravelMode;
  shuttle: ShuttleStops | null;
}

const MINUTE_MS = 60 * 1000;

export const ON_FOOT = { by: 'walk', shuttle: null } as const satisfies Omit<Leg, 'minutes'>;

// The shuttle can be 3 minutes faster only on a walk this long or longer.
const SHUTTLE_WEIGHED_MINUTES = 10;

// Only the walking table, as a way that is never by the shuttle.
export function onFoot(travel: Pick<TravelProvider, 'walkingSeconds'>): GatheringTravel {
  const walkingSeconds = (from: string, to: string): number => travel.walkingSeconds(from, to);
  return { walkingSeconds, travel: (from, to) => ({ seconds: walkingSeconds(from, to), mode: 'walk' }) };
}

export function walkingMinutes(from: string, to: string, travel: GatheringTravel): number {
  return from === to ? 0 : shownMinutes(travel.walkingSeconds(from, to));
}

// A way of a person's own setting out at `departure`: by the shuttle when the provider takes it for that day and hour,
// with the average wait at the stop, else on foot.
export function legOf(from: string, to: string, travel: GatheringTravel, departure: Date): Leg {
  const walk: Leg = { minutes: walkingMinutes(from, to, travel), by: 'walk', shuttle: null };
  if (walk.minutes < SHUTTLE_WEIGHED_MINUTES) {
    return walk;
  }
  const way = travel.travel(from, to, departure);
  if (way.mode !== 'shuttle') {
    return walk;
  }
  const stops = travel.shuttleWay?.(from, to, departure)?.stops ?? [];
  const [board, getOff] = [stops[0]?.name, stops.at(-1)?.name];
  return {
    minutes: shownMinutes(way.seconds),
    by: 'shuttle',
    shuttle: board === undefined || getOff === undefined ? null : { boardAt: board, getOffAt: getOff },
  };
}

// The way on from the place to the next item's Place, leaving in time for its start.
export function nextOf(next: GatheringSide['next'], placeId: string, travel: GatheringTravel): PersonPart['next'] {
  if (next === null) {
    return null;
  }
  if (next.placeId === null) {
    return { ...next, walkMinutes: null, ...ON_FOOT };
  }
  const departure = new Date(next.start.getTime() - walkingMinutes(placeId, next.placeId, travel) * MINUTE_MS);
  const { minutes: walkMinutes, by, shuttle } = legOf(placeId, next.placeId, travel, departure);
  return { ...next, walkMinutes, by, shuttle };
}
