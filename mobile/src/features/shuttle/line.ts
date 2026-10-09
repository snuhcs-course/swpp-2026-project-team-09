/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';

// The shuttle's line measured for travel along it: how far along it, in metres, each of its points is. Lengths are
// those of a flat map around the line's first point, close enough on a campus.
export interface MeasuredLine {
  points: readonly LatLng[];
  // How far along the line each point is, from 0 to `length`.
  along: readonly number[];
  length: number;
}

const METRES_PER_DEGREE = 111_320;

interface Flat {
  x: number;
  y: number;
}

function flatten({ latitude, longitude }: LatLng, scale: number): Flat {
  return { x: longitude * scale * METRES_PER_DEGREE, y: latitude * METRES_PER_DEGREE };
}

function scaleOf(points: readonly LatLng[]): number {
  return Math.cos(((points[0]?.latitude ?? 0) * Math.PI) / 180);
}

export function measureLine(points: readonly LatLng[]): MeasuredLine {
  const scale = scaleOf(points);
  const along: number[] = [];
  let walked = 0;
  for (const [index, point] of points.entries()) {
    const before = points[index - 1];
    if (before !== undefined) {
      const [from, to] = [flatten(before, scale), flatten(point, scale)];
      walked += Math.hypot(to.x - from.x, to.y - from.y);
    }
    along.push(walked);
  }
  return { points, along, length: walked };
}

// How far along the line its nearest point to `position` is. Of two that are as near, the first along the line.
export function nearestAlong({ points, along }: MeasuredLine, position: LatLng): number {
  const scale = scaleOf(points);
  const at = flatten(position, scale);
  let best = { distance: Number.POSITIVE_INFINITY, along: 0 };
  for (const [index, to] of points.slice(1).entries()) {
    const [from, end] = [flatten(points[index] ?? to, scale), flatten(to, scale)];
    const [dx, dy] = [end.x - from.x, end.y - from.y];
    const squared = dx * dx + dy * dy;
    const share = squared === 0 ? 0 : Math.min(1, Math.max(0, ((at.x - from.x) * dx + (at.y - from.y) * dy) / squared));
    const distance = Math.hypot(from.x + dx * share - at.x, from.y + dy * share - at.y);
    if (distance < best.distance) {
      best = { distance, along: (along[index] ?? 0) + Math.sqrt(squared) * share };
    }
  }
  return best.along;
}

// The point `distance` metres along the line. Past its end the loop starts again from its first point.
export function pointAlong({ points, along, length }: MeasuredLine, distance: number): LatLng {
  const first = points[0] ?? { latitude: 0, longitude: 0 };
  if (length === 0) {
    return first;
  }
  const wanted = ((distance % length) + length) % length;
  const next = along.findIndex((walked) => walked >= wanted);
  const to = points[next] ?? first;
  const from = points[next - 1];
  if (from === undefined) {
    return to;
  }
  const [start, end] = [along[next - 1] ?? 0, along[next] ?? 0];
  const share = end === start ? 0 : (wanted - start) / (end - start);
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * share,
    longitude: from.longitude + (to.longitude - from.longitude) * share,
  };
}
