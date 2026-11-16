/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { OUTLINE_MAX_POINTS } from '@/api/private-zone-outline';
import type { Point } from '@/map';

// The finger's path made into an outline the main server takes, in the map view's points.

const NEAR = 6;

function spaced(path: readonly Point[]): Point[] {
  const kept: Point[] = [];
  for (const point of path) {
    const last = kept.at(-1);
    if (last === undefined || Math.hypot(point.x - last.x, point.y - last.y) > NEAR) {
      kept.push(point);
    }
  }
  return kept;
}

// From the point to the nearest point of the segment.
function offSegment(point: Point, from: Point, to: Point): number {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const lengthSquared = dx * dx + dy * dy;
  const along =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + along * dx), point.y - (from.y + along * dy));
}

interface Span {
  from: number;
  to: number;
  // The point between the two that lies farthest off the segment, and how far; none when it is on it.
  far: number | null;
  distance: number;
}

function spanOf(path: readonly Point[], from: number, to: number): Span {
  let far: number | null = null;
  let distance = 0;
  for (let index = from + 1; index < to; index += 1) {
    const off = offSegment(path[index], path[from], path[to]);
    if (off > distance) {
      [far, distance] = [index, off];
    }
  }
  return { from, to, far, distance };
}

// Douglas–Peucker, splitting first the span whose farthest point lies farthest off it, until `most` points are kept.
function simplified(path: readonly Point[], most: number): Point[] {
  const kept = new Set([0, path.length - 1]);
  let spans = [spanOf(path, 0, path.length - 1)];
  while (kept.size < most) {
    const widest = spans.reduce((best, span) => (span.distance > best.distance ? span : best));
    if (widest.far === null) {
      break;
    }
    const at = widest.far;
    kept.add(at);
    spans = [...spans.filter((span) => span !== widest), spanOf(path, widest.from, at), spanOf(path, at, widest.to)];
  }
  return [...kept].toSorted((one, other) => one - other).map((index) => path[index]);
}

// A point within 6 pt of the last one kept is dropped, and a path still longer than the main server takes is
// simplified to as many points as it takes.
export function thinned(path: readonly Point[]): Point[] {
  const kept = spaced(path);
  return kept.length > OUTLINE_MAX_POINTS ? simplified(kept, OUTLINE_MAX_POINTS) : kept;
}
