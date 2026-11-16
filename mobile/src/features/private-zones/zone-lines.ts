/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PrivateZone } from '@/api/private-zone-types';
import type { LatLng } from '@/api/types';
import { color } from '@/design-system';
import { type MapLine, type Point, project, unproject } from '@/map';

// The zones as lines the map draws itself, so that they move with it under a finger: each outline closed, and its
// inside hatched with thin diagonal strokes. A map draws no filled area, and an overlay put in the view by the last
// camera would lag behind a moving map.

// The strokes' distance apart across them, in points at the zoom they were laid at.
const HATCH_SPACING = 11;
// At most this many strokes in one zone, however close the camera: further apart beyond it.
const HATCH_MOST = 80;

const EDGE = { color: color.private, width: 2 } as const;
// `color.private` at half strength over white: a map line takes no transparency on every platform.
const HATCH = { color: '#86B9C1', width: 1 } as const;
const UNSAVED_EDGE = { ...EDGE, dash: [6, 4] as const };

// Where each edge of the closed outline crosses the stroke x + y = c, by the half-open rule, so that a corner on the
// stroke counts once.
function crossings(points: readonly Point[], c: number): number[] {
  const xs: number[] = [];
  points.forEach((from, index) => {
    const to = points[(index + 1) % points.length] ?? from;
    const a = from.x + from.y - c;
    const b = to.x + to.y - c;
    if (a < 0 !== b < 0) {
      const t = a / (a - b);
      xs.push(from.x + t * (to.x - from.x));
    }
  });
  return xs.toSorted((left, right) => left - right);
}

// The strokes inside an outline, laid at a whole zoom so that a camera that comes to rest at the same level lays the
// same ones. Each pair of crossings bounds a stretch inside.
export function hatchOf(outline: readonly LatLng[], zoom: number): LatLng[][] {
  const level = Math.round(zoom);
  const points = outline.map((point) => project(point, level));
  const sums = points.map(({ x, y }) => x + y);
  const low = Math.min(...sums);
  const high = Math.max(...sums);
  const step = Math.max(HATCH_SPACING * Math.SQRT2, (high - low) / HATCH_MOST);
  const strokes: LatLng[][] = [];
  for (let c = Math.ceil(low / step) * step; c < high; c += step) {
    const xs = crossings(points, c);
    xs.forEach((left, index) => {
      const right = xs[index + 1];
      if (index % 2 === 0 && right !== undefined) {
        strokes.push([unproject({ x: left, y: c - left }, level), unproject({ x: right, y: c - right }, level)]);
      }
    });
  }
  return strokes;
}

function linesOf(id: string, outline: readonly LatLng[], zoom: number, edge: MapLine['style']): MapLine[] {
  const hatch = hatchOf(outline, zoom).map((points, index) => ({
    id: `${id}:hatch:${String(index)}`,
    points,
    style: HATCH,
  }));
  const first = outline[0];
  return [...hatch, { id, points: first === undefined ? [] : [...outline, first], style: edge }];
}

// The saved zones, then the outline not yet saved, dashed, on top. `zoom` is the camera's last resting zoom.
export function zoneLines(zones: readonly PrivateZone[], unsaved: readonly LatLng[] | null, zoom: number): MapLine[] {
  return [
    ...zones.flatMap(({ id, outline }) => linesOf(`zone:${id}`, outline, zoom, EDGE)),
    ...(unsaved === null ? [] : linesOf('unsaved-zone', unsaved, zoom, UNSAVED_EDGE)),
  ];
}
