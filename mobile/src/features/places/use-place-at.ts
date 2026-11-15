/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { PlaceAt } from '@/api/room-types';
import type { LatLng, Place } from '@/api/types';
import type { PickedPlace } from './picked-place';

// What the map view's sheet shows for the point under its pin, and what choosing it gives.
export interface PlaceAtView {
  // "제1공학관 301동", "제1공학관 근처" or "지도에서 고른 위치".
  words: string;
  hint: string;
  choice: PickedPlace;
}

const POINT_HINT = '직접 찍은 위치 · 가장 가까운 건물 기준';

export function toPlaceAt(at: PlaceAt, point: LatLng): PlaceAtView {
  if (at.place === null) {
    const words = '지도에서 고른 위치';
    return { words, hint: '직접 찍은 위치', choice: { placeId: null, position: point, words } };
  }
  const { id, name, number, latitude, longitude } = at.place;
  if (at.relation === 'near') {
    const words = `${name} 근처`;
    return { words, hint: POINT_HINT, choice: { placeId: null, position: point, words } };
  }
  const words = number === null ? name : `${name} ${number}동`;
  return { words, hint: '건물 위치예요', choice: { placeId: id, position: { latitude, longitude }, words } };
}

function placeAtKey(point: LatLng | null): (string | number | undefined)[] {
  return ['place-at', point?.latitude, point?.longitude];
}

function askPlaceAt(point: LatLng | null): Promise<PlaceAt> {
  return point === null ? Promise.reject(new Error('No point')) : apiClient.findPlaceAt(point);
}

// The Place at the point, asked when the camera stops there. Undefined until it is known.
export function usePlaceAt(point: LatLng | null): PlaceAtView | undefined {
  return useQuery({
    queryKey: placeAtKey(point),
    queryFn: () => askPlaceAt(point),
    enabled: point !== null,
    select: (at: PlaceAt) => (point === null ? undefined : toPlaceAt(at, point)),
  }).data;
}

function placeOf(at: PlaceAt): Place | null {
  return at.place;
}

// The Place a point is in or near, the one a Friend at the building level is shown, null for none, and undefined until
// it is known. The last point's answer stays while a new point is asked about.
export function usePlaceNear(point: LatLng | null): Place | null | undefined {
  return useQuery({
    queryKey: placeAtKey(point),
    queryFn: () => askPlaceAt(point),
    enabled: point !== null,
    select: placeOf,
    placeholderData: keepPreviousData,
  }).data;
}
