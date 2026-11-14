/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shownMinutes, type ShuttleWay } from '../../travel/travel.js';
import { MINUTE_MS } from '../gathering/gathering.js';

// The shuttle a way takes when the User sets out now, in the whole minutes the answer shows. Only the stop a shuttle
// passed last is known, so its arrival at the boarding stop is the ride from there.

// A shuttle reported at the stop it passed last, by the stop's place on the loop, with when it was reported.
export interface ReportedShuttle {
  stop: string;
  order: number;
  at: Date;
}

export interface ShuttleTrip {
  stops: ShuttleWay['stops'];
  toStopMinutes: number;
  rideMinutes: number;
  fromStopMinutes: number;
  // When the shuttle comes to the boarding stop, and the stop it passed last, or null for the timing's average wait.
  comes: Date;
  passed: string | null;
  // At the stop, for a User who sets out now.
  waitMinutes: number;
  // Now, or in time for the shuttle reported.
  leave: Date;
  arrival: Date;
}

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

// Down to the minute, so that the User is at the stop by the time it is said to come.
const minuteOf = (time: number): Date => new Date(Math.floor(time / MINUTE_MS) * MINUTE_MS);

// The first of a shuttle's arrivals, a lap apart, at or after `from`.
function lapsUntil(first: number, from: number, lap: number): number {
  return first >= from || lap <= 0 ? first : first + Math.ceil((from - first) / lap) * lap;
}

// The first reported shuttle that comes to the boarding stop once the User is there; else the average wait. One
// reported at the boarding stop has just left it.
export function shuttleTrip(legs: ShuttleWay, reported: readonly ReportedShuttle[], now: Date): ShuttleTrip {
  const toStopMinutes = shownMinutes(legs.walkToStopSeconds);
  const rideMinutes = shownMinutes(legs.stops.at(-1)?.rideSeconds ?? 0);
  const fromStopMinutes = shownMinutes(legs.walkFromStopSeconds);
  const atStop = plusMinutes(now, toStopMinutes);
  const boarding = legs.stops[0]?.order;
  const caught = reported
    .map(({ stop, order, at }) => {
      const ride = order === boarding ? legs.lapSeconds : (legs.ridesToBoarding[order] ?? Number.NaN);
      return { stop, comes: minuteOf(lapsUntil(at.getTime() + ride * 1000, atStop.getTime(), legs.lapSeconds * 1000)) };
    })
    .filter(({ comes }) => comes.getTime() >= atStop.getTime())
    .toSorted((one, other) => one.comes.getTime() - other.comes.getTime())[0];
  const comes = caught?.comes ?? plusMinutes(atStop, shownMinutes(legs.waitSeconds));
  return {
    stops: legs.stops,
    toStopMinutes,
    rideMinutes,
    fromStopMinutes,
    comes,
    passed: caught?.stop ?? null,
    waitMinutes: (comes.getTime() - atStop.getTime()) / MINUTE_MS,
    leave: caught === undefined ? now : plusMinutes(comes, -toStopMinutes),
    arrival: plusMinutes(comes, rideMinutes + fromStopMinutes),
  };
}
