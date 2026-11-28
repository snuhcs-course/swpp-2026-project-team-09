/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { koreaDate } from '../korea-time.js';
import { type DayItem, endOfDay, onDay } from './free-time.js';
import { type Interval } from './meal-fit.js';

// The range a time card draws a band over (P01 ticket 43): the stretch of the day its span can be dragged to, the same
// for every kind of answer.

const MINUTE_MS = 60_000;
const HALF_HOUR_MS = 30 * MINUTE_MS;
const HOUR_MS = 60 * MINUTE_MS;

// The longest range, as the seat card's 관정관 day (07:00–23:00).
export const RANGE_MOST_MS = 16 * HOUR_MS;

// The latest a range ends, before its day's end: the app puts a time dropped on the band on the band's own day, and the
// main server reads a corrected window's clocks on the input's date, so 24:00 would read as 00:00 of that day.
const DAY_END_MARGIN_MS = HALF_HOUR_MS;

// From the half hour at or before `earliest` to the half hour at or after `latest`, both in milliseconds.
export function halfHoursAround(earliest: number, latest: number): { from: Date; until: Date } {
  return {
    from: new Date(Math.floor(earliest / HALF_HOUR_MS) * HALF_HOUR_MS),
    until: new Date(Math.ceil(latest / HALF_HOUR_MS) * HALF_HOUR_MS),
  };
}

// What bounds a range: the place's hours on the band's day, or for a meal the stretch it can be eaten in (`mealBounds`).
export interface RangeBounds {
  // When the place opens; null when that is not known, or it is open from before the day begins.
  opens: Date | null;
  // When it closes; null when that is not known, or it stays open a day or more.
  closes: Date | null;
}

// A meal's bounds (P01 ticket 46), as a study's are its place's hours: the stretch of the day it can be eaten in, from
// the end of the asker's item before the plan, no earlier than the meal is served, to the start of their next item, no
// later than it is served. `served` is the meal's window, or wider where the plan's Restaurant serves longer.
export function mealBounds(
  span: Interval,
  served: Interval,
  items: readonly Pick<DayItem, 'start' | 'end'>[],
): { opens: Date; closes: Date } {
  const before = items.filter(({ end }) => end <= span.start).map(({ end }) => end.getTime());
  const after = items.filter(({ start }) => start >= span.end).map(({ start }) => start.getTime());
  return {
    opens: new Date(Math.max(served.start.getTime(), ...before)),
    closes: new Date(Math.min(served.end.getTime(), ...after)),
  };
}

// A fixed band's stretch (`fixedRange`): from an hour before its span to half an hour past it.
export function aroundSpan({ start, end }: Interval): { opens: Date; closes: Date } {
  return { opens: new Date(start.getTime() - HOUR_MS), closes: new Date(end.getTime() + HALF_HOUR_MS) };
}

export interface RangeAsked {
  now: Date;
  // The band's day.
  date: string;
  span: Interval;
  bounds: RangeBounds;
  // What else the range reaches: the window the User fixed, the end of what a left-out Class frees.
  holds?: readonly Date[];
}

// Today from now, or the opening when later; another day from the opening, or an hour before the span when the opening
// is not known; to the closing, at most RANGE_MOST_MS on and never past the day's last half hour; holding the span and
// `holds` whole, which may make it longer. In half hours.
export function bandRange({ now, date, span, bounds, holds = [] }: RangeAsked): { from: Date; until: Date } {
  const today = koreaDate(now) === date;
  const opens = bounds.opens?.getTime() ?? null;
  const start = today
    ? Math.max(now.getTime(), opens ?? Number.NEGATIVE_INFINITY)
    : (opens ?? span.start.getTime() - HOUR_MS);
  const held = holds.map((one) => one.getTime());
  const { from } = halfHoursAround(Math.min(start, span.start.getTime(), ...held), 0);
  const end = Math.min(
    bounds.closes?.getTime() ?? Number.POSITIVE_INFINITY,
    from.getTime() + RANGE_MOST_MS,
    endOfDay(date).getTime() - DAY_END_MARGIN_MS,
  );
  return { from, until: halfHoursAround(0, Math.max(end, span.end.getTime(), ...held)).until };
}

// A place's opening and closing clocks on `date`, or none when they are not known.
export function hoursOn(date: string, clocks: { open: string; close: string } | null): RangeBounds {
  return clocks === null
    ? { opens: null, closes: null }
    : { opens: onDay(date, clocks.open), closes: onDay(date, clocks.close) };
}

// The ends of the window the User fixed, "HH:MM" on `date`, for `holds`.
export function windowHolds(date: string, { from, until }: { from: string | null; until: string | null }): Date[] {
  return [from, until].flatMap((clock) => (clock === null ? [] : [onDay(date, clock)]));
}

// A band whose time is fixed, as an event's or a party's, is not dragged: its range is around its span
// (`aroundSpan`), from now when that is later.
export function fixedRange(now: Date, span: Interval): { from: Date; until: Date } {
  const { opens, closes } = aroundSpan(span);
  return halfHoursAround(Math.max(now.getTime(), opens.getTime()), closes.getTime());
}
