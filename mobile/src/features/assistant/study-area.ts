/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MapScene, RequestContext } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { color } from '@/design-system';
import { atPoint, type LineStyle, type MapCamera, type MapLine, type Size } from '@/map';
import type { AnswerDrawing } from './answer-drawing';
import type { SceneSetting } from './answer-marks';
import { NO_STANDINGS } from './invited-friends';

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

// The rooms open only to others at one building as one faded mark, named after the first ("{space} · {to whom} 외 N"):
// the server sends one `dropped` place per room, all at the building's point, and the map draws one mark a point.
export function oneMarkPerBuilding(scene: MapScene): MapScene {
  const rooms = new Map<string, number>();
  for (const { place, role } of scene.places) {
    if (role === 'dropped') {
      rooms.set(place.label, (rooms.get(place.label) ?? 0) + 1);
    }
  }
  const seen = new Set<string>();
  const places = scene.places.flatMap((item) => {
    if (item.role !== 'dropped') {
      return [item];
    }
    if (seen.has(item.place.label)) {
      return [];
    }
    seen.add(item.place.label);
    const more = (rooms.get(item.place.label) ?? 1) - 1;
    return [more === 0 || item.tag === null ? item : { ...item, tag: `${item.tag} 외 ${String(more)}` }];
  });
  return { ...scene, places };
}

// How a Lookup is drawn: each of its marks raises its card at a press, so each title ends with "›" (P04 ticket 22).
export const LOOKUP_SETTING: SceneSetting = { number: null, plans: [], standings: NO_STANDINGS, opens: true };

// A `study` Lookup's scene as the map draws it: one faded mark a building, and the free seats on the flag to 관정.
export function studyScene(lookup: Lookup, seats: AwaySeats | null): MapScene {
  return lookup.kind === 'study' ? withAwaySeats(oneMarkPerBuilding(lookup.scene), seats) : lookup.scene;
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
