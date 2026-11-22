/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MealInput, TimeBand } from '@/api/assistant-types';
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
export const STEP_MS = BAND_STEP_MINUTES * MINUTE_MS;
const LEAST_MS = BAND_LEAST_MINUTES * MINUTE_MS;

export function msOf(time: string): number {
  return new Date(time).getTime();
}

export function clockAt(ms: number): string {
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

export function droppedAt(bound: BandBound, share: number, band: Band): string {
  const start = msOf(band.range.startAt);
  const time = start + share * (msOf(band.range.endAt) - start);
  return moved(ownOf(bound, band), Math.floor(time / STEP_MS + 0.5) * STEP_MS, bound, band);
}

export function stepped(bound: BandBound, direction: 1 | -1, band: Band): string {
  const time = ownOf(bound, band);
  return moved(time, direction === 1 ? stepDown(time) + STEP_MS : stepUp(time) - STEP_MS, bound, band);
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

// What bounds the span on each side of the folded bar: the busy stretch that ends last before it ("13:45 수업 끝") and
// the one that starts first after it ("민수 15:30 수업"), named after its person unless it is the first lane's, the
// User's own. Without one, now when it is in the range before the span, else the range's end.
export function bandEdgesOf(band: TimeBand): { before: string; after: string } {
  const { last, next, nowBefore } = aroundOf(band);
  const now = msOf(band.now);
  const before =
    last === undefined || (nowBefore && now > msOf(last.endAt))
      ? nowBefore
        ? `${clockOf(band.now)} 지금`
        : clockOf(band.range.startAt)
      : `${last.who}${clockOf(last.endAt)} ${last.label ?? '일정'} 끝`;
  const after =
    next === undefined ? clockOf(band.range.endAt) : `${next.who}${clockOf(next.startAt)} ${next.label ?? '일정'}`;
  return { before, after };
}

const FOLD_MARGIN_MS = 15 * MINUTE_MS;

// The folded bar's track (P04 ticket 14, board 1): the free time around the span, from 15 minutes before what bounds it
// on the left (`bandEdgesOf`'s: the busy stretch that ends last before it, or now) to 15 minutes after what bounds it on
// the right, within the range.
export function foldedRangeOf(band: TimeBand): Stretch {
  const { before, after } = edgeMsOf(band);
  const startMs = before === null ? null : Math.max(msOf(band.range.startAt), before - FOLD_MARGIN_MS);
  const endMs = after === null ? null : Math.min(msOf(band.range.endAt), after + FOLD_MARGIN_MS);
  return {
    startAt: startMs === null ? band.range.startAt : onBandDay(clockAt(startMs), band),
    endAt: endMs === null ? band.range.endAt : onBandDay(clockAt(endMs), band),
  };
}

// When `bandEdgesOf`'s words are: what bounds the span on each side, null for the range's own end.
function edgeMsOf(band: TimeBand): { before: number | null; after: number | null } {
  const { last, next, nowBefore } = aroundOf(band);
  const now = msOf(band.now);
  const lastEnd = last === undefined ? null : msOf(last.endAt);
  return {
    before: nowBefore && (lastEnd === null || now > lastEnd) ? now : lastEnd,
    after: next === undefined ? null : msOf(next.startAt),
  };
}

// Where the folded bar's end words stand: each under its own time, as shares of `range` (P04 ticket 14).
export function edgeSharesOf(band: TimeBand, range: Stretch): { before: number; after: number } {
  const { before, after } = edgeMsOf(band);
  const start = msOf(range.startAt);
  const length = msOf(range.endAt) - start;
  const share = (ms: number | null, otherwise: number): number =>
    ms === null ? otherwise : Math.min(1, Math.max(0, (ms - start) / length));
  return { before: share(before, 0), after: share(after, 1) };
}
