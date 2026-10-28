/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FIRST_CLASS_AWAY_MINUTES, GONGANG_STARTED_WITHIN_MINUTES } from './constants.js';
import { minutesOf } from './korea-day.js';

// What a day's class times say about now, in minutes since midnight in Korea. The times are one User's on today's
// weekday, as `HH:MM`.

export interface ClassSpan {
  readonly startTime: string;
  readonly endTime: string;
}

// Free: no class covers now.
export function isFree(times: readonly ClassSpan[], now: number): boolean {
  return !times.some(({ startTime, endTime }) => minutesOf(startTime) <= now && now < minutesOf(endTime));
}

// A 공강 started: a class ended within the last 15 minutes, or the day's first class is over an hour away.
export function gongangStarted(times: readonly ClassSpan[], now: number): boolean {
  const endedJustNow = times.some(({ endTime }) => {
    const since = now - minutesOf(endTime);
    return since >= 0 && since <= GONGANG_STARTED_WITHIN_MINUTES;
  });
  const first = Math.min(...times.map(({ startTime }) => minutesOf(startTime)));
  return endedJustNow || (times.length > 0 && first - now > FIRST_CLASS_AWAY_MINUTES);
}

// The class that starts next today, after now.
export function nextClass<T extends ClassSpan>(times: readonly T[], now: number): T | undefined {
  return times
    .filter(({ startTime }) => minutesOf(startTime) > now)
    .toSorted((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime))[0];
}
