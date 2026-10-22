/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { centreY, characterCentres, type Word } from './words';

// ① The line that turns a pixel row of the small copy into a time, from the hour labels and the grid lines.

// y = a × hours + b: the row of an hour's grid line.
export interface TimeLine {
  a: number;
  b: number;
}

export interface HourLabel {
  hour: number;
  // The label's centre row, and its top.
  y: number;
  top: number;
}

export interface Fit {
  line: TimeLine;
  inliers: number[];
  error: number;
}

interface Point {
  t: number;
  y: number;
}

export function hoursAt(line: TimeLine, y: number): number {
  return (y - line.b) / line.a;
}

export function rowAt(line: TimeLine, hours: number): number {
  return line.a * hours + line.b;
}

function median(values: readonly number[]): number {
  const sorted = values.toSorted((one, other) => one - other);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

// An hour label as apps write it: `9`, `09:00`, `9:30`, `오전 9시`, `오후 1시`, `9 AM`, `1 PM`. A morning or
// afternoon mark gives the 24-hour value; without one, 12-hour labels are unfolded later.
const LABEL = /^((?:오전|오후|AM|PM)\s*)?(\d{1,2})(:\d{2})?(?!\d)\s*(?:시|(AM|PM)\b)?/iu;

// The hour a label reads, and how many of its characters, from its start, the number takes; null when it is none.
export function labelHour(text: string): { hour: number; length: number } | null {
  const match = LABEL.exec(text);
  if (match === null) {
    return null;
  }
  const [, prefix = '', digits = '', minutes = '', suffix = ''] = match;
  const mark = (prefix.trim() || suffix).toUpperCase();
  let hour = Number(digits) + (minutes === '' ? 0 : Number(minutes.slice(1)) / 60);
  if ((mark === '오후' || mark === 'PM') && hour < 12) {
    hour += 12;
  }
  return hour > 24 ? null : { hour, length: Array.from(prefix).length + digits.length + minutes.length };
}

// The hour labels: in the narrow strip left of the first column and below the header. A number glued to a class's
// name ("2자료구조") counts when its digits sit in the strip.
export function hourLabels(words: readonly Word[], stripRight: number, headerBottom: number): HourLabel[] {
  const labels: HourLabel[] = [];
  for (const word of words) {
    const read = labelHour(word.text);
    const lastDigit = read === null ? undefined : characterCentres(word)[read.length - 1];
    if (
      read !== null &&
      lastDigit !== undefined &&
      word.x0 < stripRight &&
      lastDigit.x < stripRight &&
      centreY(word) > headerBottom
    ) {
      labels.push({ hour: read.hour, y: centreY(word), top: word.y0 });
    }
  }
  return labels.toSorted((one, other) => one.y - other.y);
}

// 12-hour labels unfolded at `wrap`, the first label of the afternoon: from there on 12 is added (… 11, 12, 1, 2 →
// … 11, 12, 13, 14). With `wrap` null the labels stay as they are, as a 24-hour column does.
export function unfoldHours(hours: readonly number[], wrap: number | null): number[] {
  return hours.map((hour, index) => (wrap !== null && index >= wrap ? hour + 12 : hour));
}

// Where the hours could wrap: a label smaller than the one above it, of 12 or less.
export function wrapCandidates(hours: readonly number[]): number[] {
  return hours.flatMap((hour, index) => (index > 0 && hour < (hours[index - 1] ?? 0) && hour <= 12 ? [index] : []));
}

function leastSquares(points: readonly Point[]): TimeLine {
  const meanT = points.reduce((sum, point) => sum + point.t, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let covariance = 0;
  let variance = 0;
  for (const point of points) {
    covariance += (point.t - meanT) * (point.y - meanY);
    variance += (point.t - meanT) ** 2;
  }
  const a = variance === 0 ? 0 : covariance / variance;
  return { a, b: meanY - a * meanT };
}

function better(fit: Fit, best: Fit | null): boolean {
  return (
    best === null ||
    fit.inliers.length > best.inliers.length ||
    (fit.inliers.length === best.inliers.length && fit.error < best.error)
  );
}

// The line two points propose, fitted again over the points within a fifth of an hour of it.
function proposal(points: readonly Point[], one: Point, other: Point): Fit {
  const a = (other.y - one.y) / (other.t - one.t);
  const b = one.y - a * one.t;
  const inliers = points.flatMap((point, index) => (Math.abs(point.y - (a * point.t + b)) <= a * 0.2 ? [index] : []));
  const chosen = inliers.map((index) => points[index] ?? { t: 0, y: 0 });
  const line = leastSquares(chosen);
  const error = chosen.reduce((sum, point) => sum + Math.abs(point.y - rowAt(line, point.t)), 0);
  return { line, inliers, error };
}

// y = a·t + b by RANSAC: every pair of points proposes a line, the one most points agree with wins and is fitted
// again over them. A misread label (1 read as 7) falls out. Every pair is tried, so the result does not depend on
// chance. `minA` and `maxA` bound an hour's height in pixels.
export function ransacLine(points: readonly Point[], minA: number, maxA: number): Fit | null {
  let best: Fit | null = null;
  for (const [i, one] of points.entries()) {
    for (const other of points.slice(i + 1)) {
      const a = other.t === one.t ? 0 : (other.y - one.y) / (other.t - one.t);
      const fit = a >= minA && a <= maxA ? proposal(points, one, other) : null;
      if (fit !== null && better(fit, best)) {
        best = fit;
      }
    }
  }
  return best;
}

// The labels' line: every way of unfolding them is fitted, and the one most labels agree with is kept. At least 3
// labels must agree, so an hour is at most a third of the picture tall (a zoomed timetable showing 3 hours); at least
// a fiftieth (25 hours would not fit).
export function fitHourLabels(labels: readonly HourLabel[], imageHeight: number): { fit: Fit; hours: number[] } | null {
  const raw = labels.map((label) => label.hour);
  let best: { fit: Fit; hours: number[] } | null = null;
  for (const wrap of [null, ...wrapCandidates(raw)]) {
    const hours = unfoldHours(raw, wrap);
    const points = labels.map((label, index) => ({ t: hours[index] ?? 0, y: label.y }));
    const fit = ransacLine(points, imageHeight / 50, imageHeight / 3);
    if (fit !== null && better(fit, best?.fit ?? null)) {
      best = { fit, hours };
    }
  }
  return best !== null && best.fit.inliers.length >= 3 ? best : null;
}

// The labels sit a little below their hour's grid line (SNUTT a quarter of an hour, 에브리타임 less). The line is moved
// up by the median distance from each label to the nearest grid line above it, or to the labels' tops without lines.
export function timeLineOf(
  fit: TimeLine,
  labels: readonly HourLabel[],
  hours: readonly number[],
  inliers: readonly number[],
  gridLines: readonly number[],
): TimeLine {
  const gaps: number[] = [];
  const tops: number[] = [];
  for (const index of inliers) {
    const label = labels[index];
    const predicted = rowAt(fit, hours[index] ?? 0);
    const above = gridLines.filter((y) => y < predicted && predicted - y <= fit.a * 0.45);
    if (above.length > 0) {
      gaps.push(predicted - Math.max(...above));
    }
    if (label !== undefined) {
      tops.push(label.y - label.top);
    }
  }
  const shift = gaps.length > 0 ? median(gaps) : median(tops);
  return { a: fit.a, b: fit.b - shift };
}

// The line fitted again over the grid lines below the header, each on the hour or half hour nearest to where the
// labels' line puts it: the lines are thinner and more evenly drawn than the labels, and a glued label ("2자료구조")
// sits a little off. With fewer than 3 such lines the labels' line stays.
export function refineWithGridLines(line: TimeLine, gridLines: readonly number[], headerBottom: number): TimeLine {
  const tolerance = Math.max(1.5, line.a * 0.06);
  const points = gridLines.flatMap((y) => {
    const hours = hoursAt(line, y);
    const nearest = Math.round(hours * 2) / 2;
    return y > headerBottom && Math.abs(hours - nearest) * line.a <= tolerance ? [{ t: nearest, y }] : [];
  });
  if (points.length < 3 || new Set(points.map((point) => point.t)).size < 2) {
    return line;
  }
  return leastSquares(points);
}
