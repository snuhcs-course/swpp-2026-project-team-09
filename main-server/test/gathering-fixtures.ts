/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem, type FreeInterval } from '../src/assistant/free-time/free-time.js';
import { type GatheringPerson, type GatheringPlace } from '../src/assistant/gathering/gathering.js';

// Hand-made days for the gathering's unit tests, on Tuesday 2026-11-17 in Korea.

export const at = (clock: string): Date => new Date(`2026-11-17T${clock}:00+09:00`);

export const window = { start: at('11:00'), end: at('14:30') };

// A walking table of seconds between hand-made Places, the same both ways.
export function walks(...legs: [string, string, number][]): { walkingSeconds: (from: string, to: string) => number } {
  const seconds = new Map(
    legs.flatMap(([from, to, value]) => [[`${from}>${to}`, value] as const, [`${to}>${from}`, value] as const]),
  );
  return {
    walkingSeconds: (from, to) => {
      const value = seconds.get(`${from}>${to}`);
      if (value === undefined) {
        throw new Error(`No walk from ${from} to ${to}`);
      }
      return value;
    },
  };
}

export const item = (start: string, end: string, placeId: string | null): DayItem => ({
  id: `${start}-${end}`,
  name: 'Class',
  start: at(start),
  end: at(end),
  placeId,
  isClass: true,
});

export const free = (start: string, end: string, previous: DayItem | null, next: DayItem | null): FreeInterval => ({
  start: at(start),
  end: at(end),
  previous,
  next,
});

export const person = (
  id: string,
  intervals: FreeInterval[],
  locationPlaceId: string | null = null,
): GatheringPerson => ({
  id,
  free: intervals,
  locationPlaceId,
});

export const place = (key: string, placeId: string): GatheringPlace => ({ key, placeId });
