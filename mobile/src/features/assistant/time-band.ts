/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { koreaClock } from '@/korea-time';

// The time band's arithmetic. Its times are Korea time with the offset, and the window's are "HH:MM".

export const BAND_STEP_MINUTES = 5;
export const BAND_LEAST_MINUTES = 15;
export type BandBound = 'from' | 'until';
export interface Stretch {
  startAt: string;
  endAt: string;
}
interface Band {
  range: Stretch;
  startAt: string;
  endAt: string;
}

const MINUTE_MS = 60_000;
const STEP_MS = BAND_STEP_MINUTES * MINUTE_MS;
const LEAST_MS = BAND_LEAST_MINUTES * MINUTE_MS;

function msOf(time: string): number {
  return new Date(time).getTime();
}

function clockAt(ms: number): string {
  return koreaClock(new Date(ms).toISOString());
}

// Korea is a whole number of steps ahead of UTC, so a step of the epoch is a step of Korea's clock.
function stepDown(ms: number): number {
  return Math.floor(ms / STEP_MS) * STEP_MS;
}

function stepUp(ms: number): number {
  return Math.ceil(ms / STEP_MS) * STEP_MS;
}

// Where a handle may stand: inside the range, and at least `BAND_LEAST_MINUTES` from the other handle.
function kept(ms: number, bound: BandBound, band: Band): number {
  const [lowest, highest] =
    bound === 'from'
      ? [stepUp(msOf(band.range.startAt)), stepDown(msOf(band.endAt) - LEAST_MS)]
      : [stepUp(msOf(band.startAt) + LEAST_MS), stepDown(msOf(band.range.endAt))];
  return Math.min(Math.max(ms, lowest), highest);
}

export function shareOf(time: string, range: Stretch): number {
  const start = msOf(range.startAt);
  const share = (msOf(time) - start) / (msOf(range.endAt) - start);
  return Math.min(Math.max(share, 0), 1);
}

export function droppedAt(bound: BandBound, share: number, band: Band): string {
  const start = msOf(band.range.startAt);
  const time = start + share * (msOf(band.range.endAt) - start);
  return clockAt(kept(Math.floor(time / STEP_MS + 0.5) * STEP_MS, bound, band));
}

export function stepped(bound: BandBound, direction: 1 | -1, band: Band): string {
  const time = msOf(bound === 'from' ? band.startAt : band.endAt);
  const next = direction === 1 ? stepDown(time) + STEP_MS : stepUp(time) - STEP_MS;
  return clockAt(kept(next, bound, band));
}

// A clock time of the window on the band's day, with Korea's offset.
export function onBandDay(clock: string, band: { startAt: string }): string {
  return `${band.startAt.slice(0, 10)}T${clock}:00+09:00`;
}

export function clashes(
  busy: readonly Stretch[],
  window: PlanInput['window'],
  band: { startAt: string; endAt: string },
): Stretch[] {
  if (window.from === null && window.until === null) {
    return [];
  }
  const askedStart = window.from === null ? band.startAt : onBandDay(window.from, band);
  const askedEnd = window.until === null ? band.endAt : onBandDay(window.until, band);
  return busy.flatMap(({ startAt, endAt }) => {
    const start = msOf(startAt) < msOf(askedStart) ? askedStart : startAt;
    const end = msOf(endAt) > msOf(askedEnd) ? askedEnd : endAt;
    return msOf(start) < msOf(end) ? [{ startAt: start, endAt: end }] : [];
  });
}

export function clockOf(time: string): string {
  return koreaClock(time);
}
