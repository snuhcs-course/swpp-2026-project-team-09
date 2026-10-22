/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Weekday } from '@/api/types';

import { BLOCK, FAINT, type PixelImage } from './pixels';
import { centreY, type Word } from './words';

// ① The grid's columns and lines, in the small copy's pixels. `hours.ts` fits the time to the rows.

const DAYS: Record<string, Weekday> = {
  월: 'monday',
  화: 'tuesday',
  수: 'wednesday',
  목: 'thursday',
  금: 'friday',
  토: 'saturday',
  일: 'sunday',
};
const WEEK: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const ENGLISH: Record<string, Weekday> = {
  MON: 'monday',
  TUE: 'tuesday',
  WED: 'wednesday',
  THU: 'thursday',
  FRI: 'friday',
  SAT: 'saturday',
  SUN: 'sunday',
};

// The day a header word names: `월`, `월요일`, `Mon`, `MON`, `Monday`.
export function dayOf(text: string): Weekday | undefined {
  const word = text.trim().replace(/\.$/u, '');
  const korean = /^([월화수목금토일])(?:요일)?$/u.exec(word)?.[1];
  if (korean !== undefined) {
    return DAYS[korean];
  }
  const upper = word.toUpperCase();
  const abbreviation = upper.slice(0, 3);
  const full = (ENGLISH[abbreviation] ?? '').toUpperCase();
  return upper === abbreviation || upper === full ? ENGLISH[abbreviation] : undefined;
}

export interface Column {
  weekday: Weekday;
  left: number;
  right: number;
}

export interface Header {
  columns: Column[];
  top: number;
  bottom: number;
}

// Columns centred on x0 + d × i for the days 0 … last, each edge halfway to the next centre.
function columnsAround(x0: number, d: number, last: number): Column[] {
  return WEEK.slice(0, last + 1).map((weekday, index) => ({
    weekday,
    left: x0 + d * (index - 0.5),
    right: x0 + d * (index + 0.5),
  }));
}

// The day letters grouped into rows of about one height.
function letterRows(words: readonly Word[]): Word[][] {
  const letters = words
    .filter((word) => dayOf(word.text) !== undefined)
    .toSorted((one, other) => centreY(one) - centreY(other));
  const rows: Word[][] = [];
  for (const letter of letters) {
    const row = rows.find((candidate) => {
      const first = candidate[0];
      return first !== undefined && Math.abs(centreY(first) - centreY(letter)) < (first.y1 - first.y0) * 0.6;
    });
    if (row === undefined) {
      rows.push([letter]);
    } else {
      row.push(letter);
    }
  }
  return rows.map((row) => row.toSorted((one, other) => one.x0 - other.x0));
}

// Least squares of x over the day numbers: x = x0 + d × day.
function dayLine(days: readonly number[], centres: readonly number[]): { x0: number; d: number } {
  const meanDay = days.reduce((sum, day) => sum + day, 0) / days.length;
  const meanX = centres.reduce((sum, x) => sum + x, 0) / centres.length;
  let covariance = 0;
  let variance = 0;
  days.forEach((day, index) => {
    covariance += (day - meanDay) * ((centres[index] ?? 0) - meanX);
    variance += (day - meanDay) ** 2;
  });
  const d = variance === 0 ? 0 : covariance / variance;
  return { x0: meanX - d * meanDay, d };
}

// The day header: a row of words that read 월 화 수 목 금 (토, 일) left to right. Their positions place the columns, not
// their confidence, which ML Kit gives low to a lone letter (월 0.23). A letter not read is filled in from the others.
export function findHeader(words: readonly Word[], imageWidth: number): Header | null {
  let best: { row: Word[]; days: number[] } | null = null;
  for (const row of letterRows(words)) {
    const days = row.map((word) => WEEK.indexOf(dayOf(word.text) ?? 'sunday'));
    const ordered = days.every((day, index) => index === 0 || day > (days[index - 1] ?? 7));
    if (ordered && new Set(days).size >= 3 && (best === null || row.length > best.row.length)) {
      best = { row, days };
    }
  }
  if (best === null) {
    return null;
  }
  const { x0, d } = dayLine(
    best.days,
    best.row.map((word) => (word.x0 + word.x1) / 2),
  );
  if (!(d > imageWidth / 12)) {
    return null;
  }
  const top = Math.min(...best.row.map((word) => word.y0));
  const bottom = Math.max(...best.row.map((word) => word.y1));
  return {
    columns: columnsAround(x0, d, Math.max(4, best.days.at(-1) ?? 4)),
    top,
    bottom: bottom + (bottom - top) * 0.5,
  };
}

// A pixel of a grid line: grey and a little off the background, lighter or darker (`pixels.ts`).
function gridGrey(image: PixelImage, index: number): boolean {
  return image.kind[index] === FAINT;
}

// Whether a block's coloured pixel meets a pixel of another colour between x − 1 and x.
function colourEdge(image: PixelImage, index: number): boolean {
  const left = index - 1;
  if (image.kind[index] !== BLOCK && image.kind[left] !== BLOCK) {
    return false;
  }
  let difference = 0;
  for (let channel = 0; channel < 3; channel += 1) {
    difference += Math.abs((image.rgba[index * 4 + channel] ?? 0) - (image.rgba[left * 4 + channel] ?? 0));
  }
  return difference > 60;
}

// The pixel columns that are grey, or where a block's side runs, far more often than their neighbours.
function verticalPeaks(image: PixelImage, top: number, bottom: number): number[] {
  const counts: number[] = [];
  const y0 = Math.max(0, Math.round(top));
  const y1 = Math.min(image.height, Math.round(bottom));
  for (let x = 0; x < image.width; x += 1) {
    let count = 0;
    for (let y = y0; y < y1; y += 1) {
      const index = y * image.width + x;
      if (gridGrey(image, index) || (x > 0 && colourEdge(image, index))) {
        count += 1;
      }
    }
    counts.push(count);
  }
  return counts.flatMap((count, x) => {
    const around = [counts[x - 3], counts[x - 2], counts[x + 2], counts[x + 3]].filter((one) => one !== undefined);
    const ground = around.reduce((sum, one) => sum + one, 0) / Math.max(1, around.length);
    const peak = count >= (counts[x - 1] ?? 0) && count > (counts[x + 1] ?? 0);
    return peak && count >= (y1 - y0) * 0.1 && count >= ground * 2 + 5 ? [x] : [];
  });
}

// The even spacing that the most peaks fall on, within a pixel and a half; of two equally good, the wider.
function evenSpacing(peaks: readonly number[], width: number): { d: number; matched: number[] } | null {
  let best: { d: number; matched: number[] } | null = null;
  const tries = peaks.flatMap((anchor) =>
    peaks.flatMap((other) =>
      other > anchor ? [1, 2, 3].map((steps) => ({ anchor, d: (other - anchor) / steps })) : [],
    ),
  );
  for (const { anchor, d } of tries.filter((one) => one.d >= width / 9 && one.d <= width / 4)) {
    const matched = peaks.filter((x) => {
      const offset = (x - anchor) / d;
      return Math.abs(offset - Math.round(offset)) * d <= 1.5;
    });
    if (
      best === null ||
      matched.length > best.matched.length ||
      (matched.length === best.matched.length && d > best.d)
    ) {
      best = { d, matched };
    }
  }
  return best;
}

// The columns from the vertical grid lines when the header was not read: the peaks fitted to evenly spaced lines.
// The block sides stand in for lines that the small copy lost: scaled down to a quarter, a one-pixel line falls
// between the pixels that the scaling reads. The lines not seen are filled in, out to the picture's right edge and
// left until the label strip, which is narrower than a column. The first column is 월.
export function columnsFromGridLines(image: PixelImage, top: number, bottom: number): Column[] | null {
  const spacing = evenSpacing(verticalPeaks(image, top, bottom), image.width);
  if (spacing === null || spacing.matched.length < 3) {
    return null;
  }
  const { d } = spacing;
  let first = Math.min(...spacing.matched);
  let last = Math.max(...spacing.matched);
  while (first - d >= -d * 0.1) {
    first -= d;
  }
  while (last + d <= image.width + d * 0.1) {
    last += d;
  }
  const count = Math.round((last - first) / d);
  return count < 3 || count > 7 ? null : columnsAround(first + d / 2, d, count - 1);
}

// The rows of horizontal grid lines between x0 and x1: most of a row's uncoloured pixels are faint. A run of such
// rows longer than 3 is a grey area, not a line.
export function horizontalLines(image: PixelImage, x0: number, x1: number): number[] {
  const lines: number[] = [];
  let run: number[] = [];
  const close = (): void => {
    if (run.length > 0 && run.length <= 3) {
      lines.push(run.reduce((sum, y) => sum + y, 0) / run.length);
    }
    run = [];
  };
  const from = Math.max(0, Math.round(x0));
  const to = Math.min(image.width, Math.round(x1));
  for (let y = 0; y < image.height; y += 1) {
    let plain = 0;
    let grey = 0;
    for (let x = from; x < to; x += 1) {
      const index = y * image.width + x;
      plain += image.kind[index] === BLOCK ? 0 : 1;
      grey += gridGrey(image, index) ? 1 : 0;
    }
    if (plain >= (x1 - x0) * 0.2 && grey >= plain * 0.6) {
      run.push(y);
    } else {
      close();
    }
  }
  close();
  return lines;
}
