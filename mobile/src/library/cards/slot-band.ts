/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from '@/api/library-card-types';
import { koreaDateKey, koreaMinutes } from '@/korea-time';
import type { Slot } from './payloads';
import { clockOf, minutesOf, nextStart, STEP_MINUTES } from './times';

// The time band of a seat book card (P15 ticket 57): the card's start and end on a track from the space's opening to
// its closing time, moved by its ends or whole, always by the space's step. Minutes are minutes of the day.

export interface Span {
  start: number;
  end: number;
}

export type SpanEnd = 'start' | 'end';

// What a band may be on its date: its track, the earliest start, the step, and its shortest and longest length.
export interface SpanLimits {
  open: number;
  close: number;
  earliest: number;
  step: number;
  least: number;
  most: number;
}

export function limitsOf(space: LibrarySpace, date: string, now: Date): SpanLimits {
  const open = minutesOf(space.hours.open);
  const today = date === koreaDateKey(now);
  return {
    open,
    close: minutesOf(space.hours.close),
    earliest: today ? Math.max(open, minutesOf(nextStart(now))) : open,
    step: space.stepMinutes > 0 ? space.stepMinutes : STEP_MINUTES,
    least: space.minMinutes,
    most: space.maxMinutes,
  };
}

export function spanOf(slot: Slot): Span {
  const start = minutesOf(slot.start);
  return { start, end: start + slot.minutes };
}

export function slotOf(date: string, span: Span): Slot {
  return { date, start: clockOf(span.start), minutes: span.end - span.start };
}

function snapped(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

function clamped(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

// One end moved to `minutes`, by the step, so that the start is not before the earliest, the end not after closing,
// and the length stays within the least and the most. The other end stays.
export function endMoved(span: Span, which: SpanEnd, minutes: number, limits: SpanLimits): Span {
  const at = snapped(minutes, limits.step);
  if (which === 'start') {
    const low = Math.max(limits.earliest, span.end - limits.most);
    return { start: clamped(at, low, Math.max(low, span.end - limits.least)), end: span.end };
  }
  const high = Math.min(limits.close, span.start + limits.most);
  return { start: span.start, end: clamped(at, Math.min(high, span.start + limits.least), high) };
}

// The band moved whole by `by` minutes, by the step, with its length kept, between the earliest and closing.
export function wholeMoved(span: Span, by: number, limits: SpanLimits): Span {
  const length = span.end - span.start;
  const start = clamped(snapped(span.start + by, limits.step), limits.earliest, limits.close - length);
  return start < limits.earliest ? span : { start, end: start + length };
}

// Where a minute of the day lies on the track, from 0 at opening to 1 at closing.
export function shareOn(minutes: number, limits: SpanLimits): number {
  const width = limits.close - limits.open;
  return width <= 0 ? 0 : clamped((minutes - limits.open) / width, 0, 1);
}

// The minutes a drag of `share` of the track's width covers.
export function minutesAcross(share: number, limits: SpanLimits): number {
  return share * (limits.close - limits.open);
}

// "6시간", "1시간 30분", "30분".
export function lengthWords(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${String(rest)}분`;
  }
  return rest === 0 ? `${String(hours)}시간` : `${String(hours)}시간 ${String(rest)}분`;
}

// "14:00–20:00 · 6시간", the words under the band.
export function spanWords(span: Span): string {
  return `${clockOf(span.start)}–${clockOf(span.end)} · ${lengthWords(span.end - span.start)}`;
}

// The line of now on the track: on the band's date only, while the space is open.
export function nowOn(date: string, now: Date, limits: SpanLimits): number | null {
  if (date !== koreaDateKey(now)) {
    return null;
  }
  const minutes = koreaMinutes(now);
  return minutes < limits.open || minutes > limits.close ? null : minutes;
}
