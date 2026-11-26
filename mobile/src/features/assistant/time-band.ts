/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { BandRules, MealInput, TimeBand } from '@/api/assistant-types';
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
  rules?: BandRules;
}

const MINUTE_MS = 60_000;
export const STEP_MS = BAND_STEP_MINUTES * MINUTE_MS;

// A meal's band: 5-minute steps, at least 15 minutes, anywhere in its range.
export const MEAL_RULES: BandRules = {
  stepMinutes: BAND_STEP_MINUTES,
  leastMinutes: BAND_LEAST_MINUTES,
  mostMinutes: null,
  earliest: null,
};

function rulesOf(band: Band): BandRules {
  return band.rules ?? MEAL_RULES;
}

// The band's step in milliseconds.
export function stepMsOf(band: Band): number {
  return rulesOf(band).stepMinutes * MINUTE_MS;
}

// The earliest a band may start: its range's start, or its rules' earliest when that is later.
export function earliestMsOf(band: Band): number {
  const { earliest } = rulesOf(band);
  const start = msOf(band.range.startAt);
  return earliest === null ? start : Math.max(start, msOf(earliest));
}

export function msOf(time: string): number {
  return new Date(time).getTime();
}

export function clockAt(ms: number): string {
  return koreaClock(new Date(ms).toISOString());
}

// Korea is a whole number of steps ahead of UTC, so a step of the epoch is a step of Korea's clock.
function stepDown(ms: number, step: number): number {
  return Math.floor(ms / step) * step;
}

function stepUp(ms: number, step: number): number {
  return Math.ceil(ms / step) * step;
}

// Where a handle may stand: inside the range from its earliest start, at least the shortest length from the other
// handle, and at most the longest.
function kept(ms: number, bound: BandBound, band: Band): number {
  const { leastMinutes, mostMinutes } = rulesOf(band);
  const step = stepMsOf(band);
  const least = leastMinutes * MINUTE_MS;
  const most = mostMinutes === null ? Number.POSITIVE_INFINITY : mostMinutes * MINUTE_MS;
  const [lowest, highest] =
    bound === 'from'
      ? [
          Math.max(stepUp(earliestMsOf(band), step), stepUp(msOf(band.endAt) - most, step)),
          stepDown(msOf(band.endAt) - least, step),
        ]
      : [
          stepUp(msOf(band.startAt) + least, step),
          Math.min(stepDown(msOf(band.range.endAt), step), stepDown(msOf(band.startAt) + most, step)),
        ];
  return Math.min(Math.max(ms, lowest), highest);
}

// The handle moved from `own` toward `wanted`, where it may stand. For a band off the steps the nearest step it may
// take can lie behind its own time: it then stays.
function moved(own: number, wanted: number, bound: BandBound, band: Band): string {
  const time = kept(wanted, bound, band);
  return clockAt((wanted - own) * (time - own) < 0 ? own : time);
}

function ownOf(bound: BandBound, band: Band): number {
  return msOf(bound === 'from' ? band.startAt : band.endAt);
}

export function shareOf(time: string, range: Stretch): number {
  const start = msOf(range.startAt);
  const share = (msOf(time) - start) / (msOf(range.endAt) - start);
  return Math.min(Math.max(share, 0), 1);
}

// A handle's width on the track, in points.
export const HANDLE_WIDTH = 16;

// Whether a band, as wide as it is drawn on a track `trackWidth` wide, is narrower than its two handles, which drawn
// on its ends would cover it: they are drawn outside it then (P01 ticket 16). Before the track is measured, on them.
export function handlesOutside(shown: Stretch, range: Stretch, trackWidth: number): boolean {
  const width = (shareOf(shown.endAt, range) - shareOf(shown.startAt, range)) * trackWidth;
  return trackWidth > 0 && width < 2 * HANDLE_WIDTH;
}

export function droppedAt(bound: BandBound, share: number, band: Band): string {
  const start = msOf(band.range.startAt);
  const time = start + share * (msOf(band.range.endAt) - start);
  const step = stepMsOf(band);
  return moved(ownOf(bound, band), Math.floor(time / step + 0.5) * step, bound, band);
}

export function stepped(bound: BandBound, direction: 1 | -1, band: Band): string {
  const time = ownOf(bound, band);
  const step = stepMsOf(band);
  return moved(time, direction === 1 ? stepDown(time, step) + step : stepUp(time, step) - step, bound, band);
}

// A clock time of the window on the band's day, with Korea's offset.
export function onBandDay(clock: string, band: { startAt: string }): string {
  return `${band.startAt.slice(0, 10)}T${clock}:00+09:00`;
}

export function clashes(
  busy: readonly Stretch[],
  fixed: MealInput['window'],
  band: { startAt: string; endAt: string },
): Stretch[] {
  if (fixed.from === null && fixed.until === null) {
    return [];
  }
  const askedStart = fixed.from === null ? band.startAt : onBandDay(fixed.from, band);
  const askedEnd = fixed.until === null ? band.endAt : onBandDay(fixed.until, band);
  return busy.flatMap(({ startAt, endAt }) => {
    const start = msOf(startAt) < msOf(askedStart) ? askedStart : startAt;
    const end = msOf(endAt) > msOf(askedEnd) ? askedEnd : endAt;
    return msOf(start) < msOf(end) ? [{ startAt: start, endAt: end }] : [];
  });
}

export function clockOf(time: string): string {
  return koreaClock(time);
}

// The busy stretches on each side of the span: the one that ends last before it and the one that starts first after it,
// each with its person's name unless it is the first lane's, the User's own; and whether now is in the range before it.
function aroundOf(band: TimeBand): {
  last: { endAt: string; label?: string; who: string } | undefined;
  next: { startAt: string; label?: string; who: string } | undefined;
  nowBefore: boolean;
} {
  const [own] = band.lanes;
  const all = band.lanes.flatMap(({ userId, name, busy }) =>
    busy.map((stretch) => ({ ...stretch, who: userId === own?.userId ? '' : `${name} ` })),
  );
  const start = msOf(band.startAt);
  const end = msOf(band.endAt);
  const [last] = all.filter(({ endAt }) => msOf(endAt) <= start).toSorted((a, b) => msOf(b.endAt) - msOf(a.endAt));
  const [next] = all
    .filter(({ startAt }) => msOf(startAt) >= end)
    .toSorted((a, b) => msOf(a.startAt) - msOf(b.startAt));
  const now = msOf(band.now);
  return { last, next, nowBefore: now >= msOf(band.range.startAt) && now <= start };
}

// What bounds the span, written between the folded bar's two end times (P04 ticket 82): the busy stretch that ends last
// before it ("13:45 수업 끝"), or now when it is in the range before the span and later than that ("13:50 지금");
// without either, the one that starts first after it ("민수 15:30 수업"). Each is named after its person unless it is
// the first lane's, the User's own. Null when nothing bounds the span.
export interface BandNote {
  side: 'left' | 'right';
  words: string;
}

export function bandNoteOf(band: TimeBand): BandNote | null {
  const { last, next, nowBefore } = aroundOf(band);
  if (last !== undefined && !(nowBefore && msOf(band.now) > msOf(last.endAt))) {
    return { side: 'left', words: `${last.who}${clockOf(last.endAt)} ${last.label ?? '일정'} 끝` };
  }
  if (nowBefore) {
    return { side: 'left', words: `${clockOf(band.now)} 지금` };
  }
  return next === undefined
    ? null
    : { side: 'right', words: `${next.who}${clockOf(next.startAt)} ${next.label ?? '일정'}` };
}

const FOLD_MARGIN_MS = 15 * MINUTE_MS;

// The folded bar's track (P04 ticket 14, board 1): the free time around the span, from 15 minutes before what bounds it
// on the left (the busy stretch that ends last before it, or now) to 15 minutes after what bounds it on the right, within
// the range.
export function foldedRangeOf(band: TimeBand): Stretch {
  const { before, after } = edgeMsOf(band);
  const startMs = before === null ? null : Math.max(msOf(band.range.startAt), before - FOLD_MARGIN_MS);
  const endMs = after === null ? null : Math.min(msOf(band.range.endAt), after + FOLD_MARGIN_MS);
  return {
    startAt: startMs === null ? band.range.startAt : onBandDay(clockAt(startMs), band),
    endAt: endMs === null ? band.range.endAt : onBandDay(clockAt(endMs), band),
  };
}

// When what bounds the span on each side is, null for the range's own end.
function edgeMsOf(band: TimeBand): { before: number | null; after: number | null } {
  const { last, next, nowBefore } = aroundOf(band);
  const now = msOf(band.now);
  const lastEnd = last === undefined ? null : msOf(last.endAt);
  return {
    before: nowBefore && (lastEnd === null || now > lastEnd) ? now : lastEnd,
    after: next === undefined ? null : msOf(next.startAt),
  };
}
