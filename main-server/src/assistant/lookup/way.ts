/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Position } from '../../common/geometry.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type ShuttleStopDto } from '../../shuttle/dto/shuttle-route.dto.js';
import { type LocationMissing } from '../dto/answer.dto.js';
import { SHUTTLE_ADVANTAGE_SECONDS } from '../../travel/judgement-constants.js';
import { shownMinutes, type TravelProvider } from '../../travel/travel.js';
import { byStart, type DayItem, onDay } from '../free-time/free-time.js';
import { itemBefore } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { koreaDate } from '../korea-time.js';
import { type ReportedShuttle, shuttleTrip, type ShuttleTrip } from './shuttle-trip.js';

// The way of a Lookup: where the User sets out from, how many minutes they walk to a Place, whether the shuttle is
// faster, and, when they must be there by a time, when to set out and how late they are.

export interface WayArgs {
  now: Date;
  me: { userId: string; name: string; items: readonly DayItem[] };
  // Where the app says the User is, with the Place it is in or the nearest within 150 m and whether it is on campus,
  // or null when it sent none.
  location: { at: Position; placeId: string | null; onCampus: boolean } | null;
  // Why the app sent none, when it said.
  locationMissing?: LocationMissing;
  // The Place the User named to set out from.
  fromPlaceId: string | null;
  // Null for the Place of the User's next item today.
  toPlaceId: string | null;
  // The time the User named to be there by, as HH:MM.
  by: string | null;
  // What the User asked about, when it changes the words: the shuttle (board n21).
  about?: 'shuttle';
  // The main gate, where a way from off campus starts.
  gatePlaceId: string;
  travel: Pick<TravelProvider, 'walkingSeconds' | 'shuttleWay'>;
  // The shuttle route's stops in loop order, and each shuttle reported at the stop it passed last, with when.
  shuttle: { stops: readonly ShuttleStopDto[]; reported: readonly { stop: string; at: Date }[] };
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
  // The shuttle weighed against the walk for setting out now, taken when it arrives at least 3 minutes earlier, with
  // how late it is. 'not running' outside its service hours or at a weekend; null when the User is at the Place.
  shuttle: { trip: ShuttleTrip; taken: boolean; lateMinutes: number } | 'not running' | null;
}

// A Place the User named; else the main gate when their location is off campus, or the app says it is; else the Place
// of their location; else that of their last item today that has ended.
export function startOf({
  fromPlaceId,
  location,
  locationMissing,
  gatePlaceId,
  me,
  now,
}: Pick<WayArgs, 'fromPlaceId' | 'location' | 'locationMissing' | 'gatePlaceId' | 'me' | 'now'>): WayStart | null {
  if (fromPlaceId !== null) {
    return { placeId: fromPlaceId, basis: 'chosen' };
  }
  if (location === null ? locationMissing === 'off-campus' : !location.onCampus) {
    return { placeId: gatePlaceId, basis: 'gate' };
  }
  if (location !== null && location.placeId !== null) {
    return { placeId: location.placeId, basis: 'location' };
  }
  const placeId = itemBefore(me.items, now)?.placeId ?? null;
  return placeId === null ? null : { placeId, basis: 'timetable' };
}

// The User is at the Place gone to already.
export const atPlace = ({ start, toPlaceId }: Pick<Way, 'start' | 'toPlaceId'>): boolean => start.placeId === toPlaceId;

// The User's next item today that has a Place.
function nextOf(items: readonly DayItem[], now: Date): DayItem | null {
  return items.filter(({ start, placeId }) => start > now && placeId !== null).toSorted(byStart)[0] ?? null;
}

const plusMinutes = (at: Date, count: number): Date => new Date(at.getTime() + count * MINUTE_MS);

const lateBy = (arrival: Date, due: Date | null): number =>
  due === null ? 0 : Math.max(0, (arrival.getTime() - due.getTime()) / MINUTE_MS);

// As the app drops a shuttle's position that is more than a minute old.
const REPORT_LIFETIME_MS = 60 * 1000;

function reportedNow({ shuttle, now }: WayArgs): ReportedShuttle[] {
  return shuttle.reported.flatMap(({ stop, at }) => {
    const order = shuttle.stops.findIndex(({ name }) => name === stop);
    return order === -1 || Math.abs(at.getTime() - now.getTime()) > REPORT_LIFETIME_MS ? [] : [{ stop, order, at }];
  });
}

function shuttleOf(args: WayArgs, way: Omit<Way, 'shuttle'>): Way['shuttle'] {
  const { start, toPlaceId, now, arrival, deadline } = way;
  if (atPlace(way)) {
    return null;
  }
  const legs = args.travel.shuttleWay?.(start.placeId, toPlaceId, now) ?? null;
  if (legs === null) {
    return 'not running';
  }
  const trip = shuttleTrip(legs, reportedNow(args), now);
  return {
    trip,
    taken: arrival.getTime() - trip.arrival.getTime() >= SHUTTLE_ADVANTAGE_SECONDS * 1000,
    lateMinutes: lateBy(trip.arrival, deadline?.at ?? null),
  };
}

// The time the User named, today; else the start of their next item, when the way goes to its Place.
function deadlineOf(by: string | null, next: DayItem | null, now: Date): { at: Date; isClass: boolean } | null {
  if (by !== null) {
    return { at: onDay(koreaDate(now), by), isClass: false };
  }
  return next === null ? null : { at: next.start, isClass: next.isClass };
}

// No way when the time the User named is not later than now, as when the model gives 2시 in the afternoon as 02:00.
export function wayOf(args: WayArgs): Way | 'no-start' | 'no-next' | 'past-by' {
  const { travel, by } = args;
  const now = new Date(Math.ceil(args.now.getTime() / MINUTE_MS) * MINUTE_MS);
  if (by !== null && onDay(koreaDate(args.now), by) <= now) {
    return 'past-by';
  }
  const upcoming = nextOf(args.me.items, args.now);
  const toPlaceId = args.toPlaceId ?? upcoming?.placeId ?? null;
  if (toPlaceId === null) {
    return 'no-next';
  }
  const start = startOf(args);
  if (start === null) {
    return 'no-start';
  }
  const walkMinutes = atPlace({ start, toPlaceId }) ? 0 : shownMinutes(travel.walkingSeconds(start.placeId, toPlaceId));
  const arrival = plusMinutes(now, walkMinutes);
  const next = upcoming !== null && upcoming.placeId === toPlaceId ? upcoming : null;
  const end = deadlineOf(by, next, args.now);
  const deadline =
    end === null
      ? null
      : {
          ...end,
          leaveBy: plusMinutes(end.at, -walkMinutes),
          lateMinutes: lateBy(arrival, end.at),
        };
  const way = { start, toPlaceId, walkMinutes, now, arrival, next, deadline };
  return { ...way, shuttle: shuttleOf(args, way) };
}
