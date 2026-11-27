/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { LatLng, SubQuest } from '@/api/types';

// A 파티's place that only a point names: "지도에서 고른 위치" or "<건물> 근처", picked on the map (P06 ticket 27).
// Wherever the 파티 is shown, its words open a small map with a pin there, since the words alone do not say where.
export interface PointOnMap {
  label: string;
  position: LatLng;
}

// The point of a place picked on the map: one with a position and no Place. Null for a Place of the list, whose
// words name it, and for words typed with no position, such as "서울대입구".
export function pointOnMap(place: SubQuest['place'] | undefined): PointOnMap | null {
  if (place === null || place === undefined || place.placeId !== null) {
    return null;
  }
  const { label, latitude, longitude } = place;
  if (latitude === null || longitude === null) {
    return null;
  }
  return { label, position: { latitude, longitude } };
}
