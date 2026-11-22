/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, freeTimeOf, type FreeInterval, startOfDay } from '../free-time/free-time.js';
import { MINUTE_MS, originOf } from '../gathering/gathering.js';
import { clockOfMinutes, minutesOfClock } from './booking-rules.js';
import { type LibrarySpace } from './catalogue.js';

// The time of a seat asked for today without a start, filled from when the User arrives at 관정관.

export interface SeatFacts {
  // Today in Korea.
  date: string;
  now: Date;
  items: readonly DayItem[];
  // The Place of the position the request holds, or null.
  locationPlaceId: string | null;
  // Null when 관정관 is not among the Places.
  kwanjeongPlaceId: string | null;
  // Whole minutes on foot between two Places.
  walkingMinutes: (fromPlaceId: string, toPlaceId: string) => number;
}

export type SeatSpace = Pick<LibrarySpace, 'stepMinutes' | 'minMinutes' | 'maxMinutes'> & {
  hours: NonNullable<LibrarySpace['hours']>;
};

export interface NamedLength {
  minutes?: number | undefined;
  end?: string | undefined;
}

export interface Arrival {
  at: string;
  // The space's opening, which an arrival before it waits for.
  opensAt: string;
  fromPlaceId: string | null;
  walkMinutes: number | null;
}

export interface SeatFill {
  arrival: Arrival;
  start: string;
  minutes?: number;
  end?: string;
  note: string;
}

export interface LeaveBy {
  at: string;
  for: '수업' | '일정';
  start: string;
}

// A filled seat's arrival on its card: when the User reaches 관정관, their walk, the Place they set out from and the
// end of the item they set out after, and the opening an arrival before it waits for.
export interface SeatArrival {
  at: string;
  walkMinutes: number;
  from: { place: string; endsAt: string | null; kind: '수업' | '일정' | null };
  opensAt: string | null;
}

// Minutes of the day in Korea, a part of a minute counted as a whole one.
function minutesOfDay(date: string, at: Date): number {
  return Math.ceil((at.getTime() - startOfDay(date).getTime()) / MINUTE_MS);
}

function arrivalOf(
  { date, now, items, locationPlaceId, kwanjeongPlaceId, walkingMinutes }: SeatFacts,
  opensAt: string,
): Arrival {
  const first: FreeInterval = freeTimeOf(items, date, now)[0] ?? { start: now, end: now, previous: null, next: null };
  const ready = minutesOfDay(date, first.start);
  const origin = originOf({ locationPlaceId }, first, now);
  if (origin === null || kwanjeongPlaceId === null) {
    return { at: clockOfMinutes(ready), opensAt, fromPlaceId: null, walkMinutes: null };
  }
  const walk = origin.placeId === kwanjeongPlaceId ? 0 : walkingMinutes(origin.placeId, kwanjeongPlaceId);
  return { at: clockOfMinutes(ready + walk), opensAt, fromPlaceId: origin.placeId, walkMinutes: walk };
}

// The item the User is in when asked, whose end the arrival counts from; null when it counts from now.
export function countedAfter({ date, now, items }: SeatFacts): { endsAt: string; kind: '수업' | '일정' } | null {
  const first = freeTimeOf(items, date, now)[0];
  if (first === undefined || first.start <= now || first.previous === null) {
    return null;
  }
  return { endsAt: clockOfMinutes(minutesOfDay(date, first.start)), kind: first.previous.isClass ? '수업' : '일정' };
}

function beforeOpening({ at, opensAt }: Arrival): boolean {
  return minutesOfClock(at) < minutesOfClock(opensAt);
}

// When the User sits down: the arrival, or the opening for an arrival before it.
export function seatedAt({ arrival }: Pick<SeatFill, 'arrival'>): string {
  return beforeOpening(arrival) ? arrival.opensAt : arrival.at;
}

function noteOf(arrival: Arrival, named: boolean): string {
  const from = beforeOpening(arrival)
    ? `${arrival.opensAt} 열 때부터`
    : arrival.fromPlaceId === null
      ? '지금부터'
      : `${arrival.at} 도착에 맞춰`;
  return `${from} ${named ? '' : '최대 시간으로 '}채웠어요`;
}

export function fillSeat(facts: SeatFacts, space: SeatSpace, { minutes, end }: NamedLength): SeatFill {
  const arrival = arrivalOf(facts, space.hours.open);
  const { stepMinutes } = space;
  const open = minutesOfClock(space.hours.open);
  const start = Math.max(open, Math.ceil(minutesOfClock(arrival.at) / stepMinutes) * stepMinutes);
  const named = minutes !== undefined || end !== undefined;
  const note = noteOf(arrival, named);
  if (named) {
    return { arrival, start: clockOfMinutes(start), ...(minutes === undefined ? { end } : { minutes }), note };
  }
  const untilClose = Math.min(space.maxMinutes, minutesOfClock(space.hours.close) - start);
  // A start too late for the shortest booking keeps that length, so that the hours refuse it.
  const longest = Math.max(space.minMinutes, Math.floor(untilClose / stepMinutes) * stepMinutes);
  return { arrival, start: clockOfMinutes(start), minutes: longest, note };
}

// When to leave 관정관 for the first item with a Place that starts at or after the arrival and before the booking ends.
// None when that time is not later than the arrival: the seat could not be used before the item.
export function leaveByOf(facts: SeatFacts, arrival: string, bookingEnd: string): LeaveBy | null {
  const { date, items, kwanjeongPlaceId, walkingMinutes } = facts;
  const from = minutesOfClock(arrival);
  const until = minutesOfClock(bookingEnd);
  const next = items
    .flatMap(({ start, placeId, isClass }) => {
      const minutes = minutesOfDay(date, start);
      return placeId !== null && minutes >= from && minutes < until ? [{ minutes, placeId, isClass }] : [];
    })
    .toSorted((a, b) => a.minutes - b.minutes)[0];
  if (next === undefined || kwanjeongPlaceId === null) {
    return null;
  }
  const walk = next.placeId === kwanjeongPlaceId ? 0 : walkingMinutes(kwanjeongPlaceId, next.placeId);
  if (next.minutes - walk <= from) {
    return null;
  }
  return {
    at: clockOfMinutes(next.minutes - walk),
    for: next.isClass ? '수업' : '일정',
    start: clockOfMinutes(next.minutes),
  };
}

// The card's arrival; none when where the User sets out from is not known, the seat then being filled from now.
export function cardArrival(
  { arrival }: Pick<SeatFill, 'arrival'>,
  facts: SeatFacts,
  placeName: (placeId: string) => string | null,
): SeatArrival | null {
  const place = arrival.fromPlaceId === null ? null : placeName(arrival.fromPlaceId);
  if (place === null || arrival.walkMinutes === null) {
    return null;
  }
  const after = countedAfter(facts);
  return {
    at: arrival.at,
    walkMinutes: arrival.walkMinutes,
    from: { place, endsAt: after?.endsAt ?? null, kind: after?.kind ?? null },
    opensAt: beforeOpening(arrival) ? arrival.opensAt : null,
  };
}

// The words of a filled seat: when the User arrives and the booking starts, and when to leave for what follows. The
// booking runs past that time, so the words say how to end it then, and the two times do not read as a contradiction.
export function filledWords(fill: SeatFill, leaveBy: LeaveBy | null, end: string): string {
  const { arrival, start } = fill;
  const arriving = beforeOpening(arrival)
    ? `${arrival.opensAt} 열 때부터예요. `
    : arrival.at === start
      ? `${arrival.at}에 도착해요. `
      : `${arrival.at}에 도착해 ${start}부터예요. `;
  if (leaveBy === null) {
    return arriving;
  }
  return `${arriving}${leaveBy.start} ${leaveBy.for}이라 ${leaveBy.at}엔 나서요. ${end}까지 쓰지 않으면 카드에서 끝 시간을 당겨요. `;
}
