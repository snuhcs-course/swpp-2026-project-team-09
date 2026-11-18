/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import type { WalkingRoute } from '@/api/walking-route-types';
import type { MapLine } from '@/map';

// The id of the line of a scene's route at `index` of its routes.
export function routeLineId(index: number): string {
  return `answer:route:${index}`;
}

// A route of a scene that is walked: the id of its line and its two ends.
export interface Walk {
  lineId: string;
  from: LatLng;
  to: LatLng;
}

// The routes of a scene that are walked, in the scene's order: those without a mode and those whose mode is 'walk'. A
// shuttle's ride is not.
export function walksOf(routes: MapScene['routes']): Walk[] {
  return routes.flatMap(({ from, to, mode }, index) =>
    mode === undefined || mode === 'walk' ? [{ lineId: routeLineId(index), from, to }] : [],
  );
}

// The lines to draw: each walked route's line along the path the walking route service found for it (`found`, at the
// walk's index), in the line's own colour, width and style. A line whose walk was not found yet, failed, or found no
// path stays the straight line from its start to its end, as does every line that is not a walk.
export function linesAlongPaths(
  lines: readonly MapLine[],
  walks: readonly Walk[],
  found: readonly (WalkingRoute | undefined)[],
): MapLine[] {
  return lines.map((line) => {
    const at = walks.findIndex(({ lineId }) => lineId === line.id);
    const route = at === -1 ? undefined : found[at];
    if (route?.status !== 'OK' || route.route.line.length < 2) {
      return line;
    }
    return { ...line, points: route.route.line };
  });
}
