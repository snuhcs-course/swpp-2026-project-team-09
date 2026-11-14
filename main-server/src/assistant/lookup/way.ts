/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { byStart, type DayItem, onDay } from '../free-time/free-time.js';
import { itemBefore } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { koreaDate } from '../korea-time.js';

// The way of a Lookup: where the User sets out from, how many minutes they walk to a Place, and, when they must be
// there by a time, when to set out and how late they are.

export interface WayArgs {
  now: Date;
  me: { userId: string; name: string; items: readonly DayItem[] };
  // Where the app says the User is, with the Place it is in or the nearest within 150 m and whether it is on campus,
  // or null when it sent none.
  location: { at: Position; placeId: string | null; onCampus: boolean } | null;
  // The Place the User named to set out from.
  fromPlaceId: string | null;
  // Null for the Place of the User's next item today.
  toPlaceId: string | null;
  // The time the User named to be there by, as HH:MM.
  by: string | null;
  // The main gate, where a way from off campus starts.
  gatePlaceId: string;
  travel: Pick<TravelProvider, 'walkingSeconds'>;
  placeOf: (placeId: string) => PlaceDto;
}

export interface WayStart {
  placeId: string;
  basis: 'chosen' | 'gate' | 'location' | 'timetable';
}

export interface Way {
  start: WayStart;
  toPlaceId: string;
  walkMinutes: number;
  // Now, rounded up to the whole minute.
  now: Date;
  // When the User is there if they set out now.
  arrival: Date;
  // The User's next item today, when the way goes to its Place.
  next: DayItem | null;
  // When the User must be there, the time they named or their next item's start, with when to set out to be there by
  // it and how many minutes late they are if they set out now. Null without either.
  deadline: { at: Date; isClass: boolean; leaveBy: Date; lateMinutes: number } | null;
}

// A Place the User named; else the main gate when their location is off campus; else the Place of their location;
// else that of their last item today that has ended.
export function startOf({ fromPlaceId, location, gatePlaceId, me, now }: WayArgs): WayStart | null {
  if (fromPlaceId !== null) {
    return { placeId: fromPlaceId, basis: 'chosen' };
  }
  if (location !== null && !location.onCampus) {
    return { placeId: gatePlaceId, basis: 'gate' };
  }
  if (location !== null && location.placeId !== null) {
    return { placeId: location.placeId, basis: 'location' };
  }
  const placeId = itemBefore(me.items, now)?.placeId ?? null;
  return placeId === null ? null : { placeId, basis: 'timetable' };
}

// The User's next item today that has a Place.
function nextOf(items: readonly DayItem[], now: Date): DayItem | null {
  return items.filter(({ start, placeId }) => start > now && placeId !== null).toSorted(byStart)[0] ?? null;
}

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

// The time the User named, today; else the start of their next item, when the way goes to its Place.
function deadlineOf(by: string | null, next: DayItem | null, now: Date): { at: Date; isClass: boolean } | null {
  if (by !== null) {
    return { at: onDay(koreaDate(now), by), isClass: false };
  }
  return next === null ? null : { at: next.start, isClass: next.isClass };
}

export function wayOf(args: WayArgs): Way | 'no-start' | 'no-next' {
  const upcoming = nextOf(args.me.items, args.now);
  const toPlaceId = args.toPlaceId ?? upcoming?.placeId ?? null;
  if (toPlaceId === null) {
    return 'no-next';
  }
  const start = startOf(args);
  if (start === null) {
    return 'no-start';
  }
  const { travel, by } = args;
  const walkMinutes = start.placeId === toPlaceId ? 0 : shownMinutes(travel.walkingSeconds(start.placeId, toPlaceId));
  const now = new Date(Math.ceil(args.now.getTime() / MINUTE_MS) * MINUTE_MS);
  const arrival = plusMinutes(now, walkMinutes);
  const next = upcoming !== null && upcoming.placeId === toPlaceId ? upcoming : null;
  const end = deadlineOf(by, next, args.now);
  const deadline =
    end === null
      ? null
      : {
          ...end,
          leaveBy: plusMinutes(end.at, -walkMinutes),
          lateMinutes: Math.max(0, (arrival.getTime() - end.at.getTime()) / MINUTE_MS),
        };
  return { start, toPlaceId, walkMinutes, now, arrival, next, deadline };
}
