/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockAt, msOf, type Stretch } from './time-band';

// The hours marked under a time card's track (P01 ticket 44), so that a time far along a range from now to a place's
// closing (ticket 43) can be found: whole hours of Korea's clock, every so many hours, the shortest step that marks at
// most MOST_MARKS, none within END_ROOM of the range's width from either end, where the end times stand. A range
// shorter than MARKED_FROM_MS has none: its two end times say enough, and the small card grows no line for a label.

const HOUR_MS = 3_600_000;
// Korea's clock is this far ahead of UTC, so its whole hours are counted from here.
const KOREA_MS = 9 * HOUR_MS;
const STEP_HOURS = [1, 2, 3, 4, 6, 8, 12] as const;
export const MOST_MARKS = 4;
const END_ROOM = 1 / 8;
const MARKED_FROM_MS = 4 * HOUR_MS;

export interface HourMark {
  clock: string;
  // Where it stands on the track, from 0 at the range's start to 1 at its end.
  share: number;
}

function marksEvery(range: Stretch, hours: number): HourMark[] {
  const start = msOf(range.startAt);
  const width = msOf(range.endAt) - start;
  const step = hours * HOUR_MS;
  const first = Math.ceil((start + KOREA_MS) / step) * step - KOREA_MS;
  const marks: HourMark[] = [];
  for (let at = first; at < start + width; at += step) {
    const share = (at - start) / width;
    if (share >= END_ROOM && share <= 1 - END_ROOM) {
      marks.push({ clock: clockAt(at), share });
    }
  }
  return marks;
}

export function hourMarksOf(range: Stretch): HourMark[] {
  if (msOf(range.endAt) - msOf(range.startAt) < MARKED_FROM_MS) {
    return [];
  }
  for (const hours of STEP_HOURS) {
    const marks = marksEvery(range, hours);
    if (marks.length <= MOST_MARKS) {
      return marks;
    }
  }
  return [];
}
