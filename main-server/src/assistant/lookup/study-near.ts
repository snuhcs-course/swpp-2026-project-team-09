/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { type RequestContext } from '../dto/answer.dto.js';
import { type DayItem, freeTimeOf } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { koreaDate } from '../korea-time.js';
import { startOf, type WayArgs, type WayStart } from './way.js';

// What "이 근처" works out before any words: which study spaces the visible area holds, where its edge points to a
// Place outside it, and how long the User can stay at each space before their next item.

export type StudyArea = NonNullable<RequestContext['viewport']>;

export type Arrow = '↑' | '↓' | '←' | '→';

export const inArea = ({ south, west, north, east }: StudyArea, { latitude, longitude }: Position): boolean =>
  south <= latitude && latitude <= north && west <= longitude && longitude <= east;

// Where the line from the area's centre to a point outside it leaves the area, and the arrow of that side; through a
// corner, the north or south side. Latitude and longitude serve as plane coordinates.
export function edgeTowards(area: StudyArea, target: Position): { at: Position; arrow: Arrow } {
  const latitude = (area.south + area.north) / 2;
  const longitude = (area.west + area.east) / 2;
  const north = target.latitude - latitude;
  const east = target.longitude - longitude;
  const byLatitude = north === 0 ? Number.POSITIVE_INFINITY : (area.north - latitude) / Math.abs(north);
  const byLongitude = east === 0 ? Number.POSITIVE_INFINITY : (area.east - longitude) / Math.abs(east);
  if (byLatitude <= byLongitude) {
    return {
      at: { latitude: north > 0 ? area.north : area.south, longitude: longitude + east * byLatitude },
      arrow: north > 0 ? '↑' : '↓',
    };
  }
  return {
    at: { latitude: latitude + north * byLongitude, longitude: east > 0 ? area.east : area.west },
    arrow: east > 0 ? '→' : '←',
  };
}

export interface StudyDay {
  // Now, rounded up to the whole minute, or the end of the item under way.
  ready: Date;
  // The Place of the item under way; else where a way starts. Null when that is not known.
  start: WayStart | null;
  // The first item after the User is ready, which the stay ends at; null when nothing follows today.
  next: DayItem | null;
}

// The User's first stretch of Free Time from now, as the seat's arrival reads it.
export function studyDayOf(way: WayArgs): StudyDay {
  const now = new Date(Math.ceil(way.now.getTime() / MINUTE_MS) * MINUTE_MS);
  const [free] = freeTimeOf(way.me.items, koreaDate(now), now);
  const ready = free?.start ?? now;
  const kept = ready > now ? (free?.previous?.placeId ?? null) : null;
  return {
    ready,
    start: kept === null ? startOf({ ...way, now }) : { placeId: kept, basis: 'timetable' },
    next: free?.next ?? null,
  };
}

export interface StudyStay {
  walkMinutes: number;
  arrival: Date;
  // When the User sets out for the next item, and the minutes from the arrival until then; null when nothing follows.
  leaveBy: Date | null;
  minutes: number | null;
}

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

// From the arrival, the ready time plus the walk there, to the next item's start less the walk on to its Place.
export function stayAt(
  { ready, start, next }: Omit<StudyDay, 'start'> & { start: WayStart },
  placeId: string,
  travel: Pick<TravelProvider, 'walkingSeconds'>,
): StudyStay {
  const walk = (from: string, to: string): number => (from === to ? 0 : shownMinutes(travel.walkingSeconds(from, to)));
  const walkMinutes = walk(start.placeId, placeId);
  const arrival = plusMinutes(ready, walkMinutes);
  if (next === null) {
    return { walkMinutes, arrival, leaveBy: null, minutes: null };
  }
  const leaveBy = plusMinutes(next.start, next.placeId === null ? 0 : -walk(placeId, next.placeId));
  return { walkMinutes, arrival, leaveBy, minutes: (leaveBy.getTime() - arrival.getTime()) / MINUTE_MS };
}

// The longest stay first; of equal stays the shorter walk, then the first. With nothing to follow, the shortest walk.
export function byStay<Candidate extends { stay: StudyStay }>(candidates: readonly Candidate[]): Candidate[] {
  const stayOf = ({ stay }: Candidate): number => stay.minutes ?? Number.POSITIVE_INFINITY;
  return candidates.toSorted((a, b) => stayOf(b) - stayOf(a) || a.stay.walkMinutes - b.stay.walkMinutes);
}

export function longestStay<Candidate extends { stay: StudyStay }>(candidates: readonly Candidate[]): Candidate | null {
  return byStay(candidates)[0] ?? null;
}
