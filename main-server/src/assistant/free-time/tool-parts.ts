/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { noneFound, type NoneFound } from '../feature.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { type DayItem, type FreeInterval } from './free-time.js';

// What the 공강 tools share: the day and the clock times they take, and the items they name.

const DAYS_AHEAD = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const CLOCK_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/u;

export const clockTime = z.string().regex(CLOCK_TIME, 'Expected HH:MM');

export const dateInput = z.iso.date().describe('The day, a calendar day in Korea as YYYY-MM-DD.');

export const departurePlaceInput = z
  .uuid()
  .optional()
  .describe('Where the User leaves from, as resolvePlace returned it in this message, after this tool asked by needs.');

export const leaveByInput = clockTime
  .optional()
  .describe('By when the User must leave, as HH:MM, after this tool asked by needs.');

export function outOfReach(date: string, now: Date): boolean {
  return date < koreaDate(now) || date > koreaDate(new Date(now.getTime() + DAYS_AHEAD * DAY_MS));
}

export function noDay(date: string): NoneFound {
  return noneFound(`${date} is not between today and a week from today.`);
}

export function itemName({ name }: DayItem): string {
  return othersText('item.name', name);
}

// What a tool needs to know before it can judge, the earliest stretch's first and the before side first.
export function neededOf(
  parts: readonly Pick<FreeInterval, 'previous' | 'next'>[],
  { departurePlace, leaveBy }: { departurePlace?: string | undefined; leaveBy?: string | undefined },
): object | null {
  for (const { previous, next } of parts) {
    if (previous !== null && previous.placeId === null && departurePlace === undefined) {
      return { result: 'needs', needs: { side: 'before', item: itemName(previous) } };
    }
    if (next !== null && next.placeId === null && leaveBy === undefined) {
      return { result: 'needs', needs: { side: 'after', item: itemName(next) } };
    }
  }
  return null;
}
