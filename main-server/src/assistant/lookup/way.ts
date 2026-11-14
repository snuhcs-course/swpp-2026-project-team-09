/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { type DayItem } from '../free-time/free-time.js';
import { itemBefore } from '../gathering/answer-words.js';

// The way of a Lookup: where the User sets out from, and how many minutes they walk to a Place.

export interface WayArgs {
  now: Date;
  me: { userId: string; name: string; items: readonly DayItem[] };
  // Where the app says the User is, with the Place it is in or the nearest within 150 m, or null when there is none.
  location: { at: Position; placeId: string | null } | null;
  // The Place the User named to set out from.
  fromPlaceId: string | null;
  toPlaceId: string;
  travel: Pick<TravelProvider, 'walkingSeconds'>;
  placeOf: (placeId: string) => PlaceDto;
}

export interface WayStart {
  placeId: string;
  basis: 'chosen' | 'location' | 'timetable';
}

export interface Way {
  start: WayStart;
  toPlaceId: string;
  walkMinutes: number;
}

// A Place the User named; else the Place of their location; else that of their last item today that has ended.
export function startOf({ fromPlaceId, location, me, now }: WayArgs): WayStart | null {
  if (fromPlaceId !== null) {
    return { placeId: fromPlaceId, basis: 'chosen' };
  }
  if (location !== null && location.placeId !== null) {
    return { placeId: location.placeId, basis: 'location' };
  }
  const placeId = itemBefore(me.items, now)?.placeId ?? null;
  return placeId === null ? null : { placeId, basis: 'timetable' };
}

// Null when it is not known where the User sets out from.
export function wayOf(args: WayArgs): Way | null {
  const start = startOf(args);
  if (start === null) {
    return null;
  }
  const { toPlaceId, travel } = args;
  const walkMinutes = start.placeId === toPlaceId ? 0 : shownMinutes(travel.walkingSeconds(start.placeId, toPlaceId));
  return { start, toPlaceId, walkMinutes };
}
