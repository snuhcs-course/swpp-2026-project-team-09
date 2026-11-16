/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, RequestContext } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { color } from '@/design-system';
import { atPoint, type LineStyle, type MapCamera, type MapLine, type Size } from '@/map';
import type { AnswerDrawing } from './answer-drawing';

// "이 근처" (P02 ticket 23): the visible area every request sends, and how a `study` Lookup is drawn over it.

export type Viewport = NonNullable<RequestContext['viewport']>;

// The part of the map's view, `size` large at `camera`, that the status bar `top` high leaves.
export function viewportOf(camera: MapCamera, size: Size, top: number): Viewport {
  const northWest = atPoint({ x: 0, y: top }, camera, size);
  const southEast = atPoint({ x: size.width, y: size.height }, camera, size);
  return {
    south: southEast.latitude,
    west: northWest.longitude,
    north: northWest.latitude,
    east: southEast.longitude,
  };
}

// Dashed where the map draws dashes; a native map without them draws it solid.
const AREA_STYLE: LineStyle = { color: color.snuBlue, width: 2, dash: [8, 6] };

export const AREA_LINE_ID = 'answer:area';

export function areaLine({ south, west, north, east }: Viewport): MapLine {
  const corners = [
    { latitude: north, longitude: west },
    { latitude: north, longitude: east },
    { latitude: south, longitude: east },
    { latitude: south, longitude: west },
  ];
  return { id: AREA_LINE_ID, points: [...corners, corners[0]], style: AREA_STYLE };
}

// The free seats the phone read for the Place an `away` flag points to.
export interface AwaySeats {
  placeId: string;
  free: number;
}

// The flag pointing to the Place of `seats` with "· 빈 자리 N석" added; the scene as it is without them.
export function withAwaySeats(scene: MapScene, seats: AwaySeats | null): MapScene {
  if (seats === null) {
    return scene;
  }
  const flags = scene.flags.map((flag) =>
    flag.role === 'away' && flag.placeId === seats.placeId
      ? { ...flag, text: `${flag.text} · 빈 자리 ${String(seats.free)}석` }
      : flag,
  );
  return { ...scene, flags };
}

// The Place a `study` Lookup's `away` flag points to, or null.
export function awayPlaceOf(lookup: Lookup | null): string | null {
  if (lookup?.kind !== 'study') {
    return null;
  }
  return lookup.scene.flags.find(({ role, placeId }) => role === 'away' && placeId !== undefined)?.placeId ?? null;
}

// A `study` Lookup's drawing: the area its request sent outlined under the rest, and no point for the camera to fit,
// since the area is the question and the camera stays where the User put it. Any other Lookup's as it is.
export function studyDrawing(drawing: AnswerDrawing, lookup: Lookup, area: Viewport | null): AnswerDrawing {
  if (lookup.kind !== 'study') {
    return drawing;
  }
  return { ...drawing, lines: area === null ? drawing.lines : [areaLine(area), ...drawing.lines], points: [] };
}
