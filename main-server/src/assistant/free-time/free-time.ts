/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Weekday } from '../../generated/prisma/client.js';
import { LONGEST_TIMED_SECONDS, OPEN_SUB_QUEST_SECONDS } from '../../travel/judgement-constants.js';
import { koreaTime } from '../korea-time.js';

// Free Time: a day's items and the intervals between them, for any User. Nothing here is sent to the model as it is.

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = [
  Weekday.sunday,
  Weekday.monday,
  Weekday.tuesday,
  Weekday.wednesday,
  Weekday.thursday,
  Weekday.friday,
  Weekday.saturday,
];

// One entry of a User's day: a Class meeting, or a timed Sub Quest of a Quest they hold.
export interface DayItem {
  // A Class meeting's is its ClassTime's, a Quest's item its Sub Quest's.
  id: string;
  // The course name or the Quest's title.
  name: string;
  start: Date;
  end: Date;
  // Null for an item without a Place.
  placeId: string | null;
  isClass: boolean;
}

// A stretch of Free Time: its previous item ends where it starts, unless now cut it, and its next item starts where it
// ends. The first of a day has no previous item, and the last no next item.
export interface FreeInterval {
  start: Date;
  end: Date;
  previous: DayItem | null;
  next: DayItem | null;
}

// A time on a calendar day in Korea.
export function onDay(date: string, clock: string): Date {
  return new Date(`${date}T${clock}:00+09:00`);
}

export function startOfDay(date: string): Date {
  return onDay(date, '00:00');
}

export function endOfDay(date: string): Date {
  return new Date(startOfDay(date).getTime() + DAY_MS);
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(date).getUTCDay()] ?? Weekday.monday;
}

// HH:MM in Korea, rounded down.
export function clockOf(at: Date): string {
  return koreaTime(at).slice(11, 16);
}

// When a Sub Quest stops being busy: its end, unless it has none or is longer than a timed one can be.
export function busyEnd(start: Date, end: Date | null): Date {
  const timed = end !== null && end.getTime() - start.getTime() <= LONGEST_TIMED_SECONDS * 1000;
  return timed ? end : new Date(start.getTime() + OPEN_SUB_QUEST_SECONDS * 1000);
}

// Every interval between the items of a day, including before the first and after the last. Overlapping or touching
// items leave none between them, and without items the whole day is one. None starts earlier than now.
export function freeTimeOf(items: readonly DayItem[], date: string, now: Date): FreeInterval[] {
  const intervals: FreeInterval[] = [];
  let start = startOfDay(date);
  let previous: DayItem | null = null;
  for (const item of items.toSorted((a, b) => a.start.getTime() - b.start.getTime())) {
    if (item.start > start) {
      intervals.push({ start, end: item.start, previous, next: item });
    }
    if (item.end > start) {
      start = item.end;
      previous = item;
    }
  }
  const end = endOfDay(date);
  if (end > start) {
    intervals.push({ start, end, previous, next: null });
  }
  return intervals
    .filter((interval) => interval.end > now)
    .map(({ start: from, end: to, previous: before, next }) => ({
      start: from < now ? now : from,
      end: to,
      previous: before,
      next,
    }));
}
