/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';

// The time window both search tools take, in Asia/Seoul: whole days, or times that override the end they name.

const MINUTE_MS = 60 * 1000;

export const WINDOW_INPUT = {
  from: z.iso
    .date()
    .optional()
    .describe('The first day of a period of whole days, a calendar day in Korea as YYYY-MM-DD. Give it with to.'),
  to: z.iso.date().optional().describe('The last day of that period, the same as from for one day.'),
  after: z.iso
    .datetime({ local: true })
    .optional()
    .describe(
      'When the window starts, a date and time in Korea as YYYY-MM-DDTHH:MM, such as 2026-11-02T17:00 for "11/2 17:00 이후". With no before and no to, the window ends at 23:59 of that day.',
    ),
  before: z.iso
    .datetime({ local: true })
    .optional()
    .describe(
      'When the window ends, in the same form, this minute included. With after, it gives both ends, such as "11/2 15–18시". With no after and no from, the window starts at 00:00 of that day.',
    ),
};

export interface WindowConditions {
  from?: string;
  to?: string;
  after?: string;
  before?: string;
}

// The first and the last minute of the window in Korea, as YYYY-MM-DDTHH:MM, or null when no end was given.
function minutesOf({ from, to, after, before }: WindowConditions): { first: string; last: string } | null {
  const first = after ?? (from === undefined ? undefined : `${from}T00:00`);
  const last = before ?? (to === undefined ? undefined : `${to}T23:59`);
  if (first === undefined && last === undefined) {
    return null;
  }
  return {
    first: (first ?? `${String(last).slice(0, 10)}T00:00`).slice(0, 16),
    last: (last ?? `${String(first).slice(0, 10)}T23:59`).slice(0, 16),
  };
}

export function daysTogether({ from, to }: WindowConditions): boolean {
  return (from === undefined) === (to === undefined);
}

export function inOrder(conditions: WindowConditions): boolean {
  const minutes = minutesOf(conditions);
  return minutes === null || minutes.first <= minutes.last;
}

export function hasWindow(conditions: WindowConditions): boolean {
  return minutesOf(conditions) !== null;
}

// The window as [from, to), holding the whole of its last minute.
export function windowOf(conditions: WindowConditions): { from: Date; to: Date } | undefined {
  const minutes = minutesOf(conditions);
  return minutes === null
    ? undefined
    : {
        from: new Date(`${minutes.first}:00+09:00`),
        to: new Date(new Date(`${minutes.last}:00+09:00`).getTime() + MINUTE_MS),
      };
}

// How a reason for "none" says the window: " from 2026-11-02T17:00 to 2026-11-02T23:59", or nothing without one.
export function windowWords(conditions: WindowConditions): string {
  const minutes = minutesOf(conditions);
  return minutes === null ? '' : ` from ${minutes.first} to ${minutes.last}`;
}
