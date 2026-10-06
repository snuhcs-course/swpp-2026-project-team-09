import type { LatLng } from '@/api/types';

// What the map view gives back to the screen that opened it: a Place of the list, or a point with the words it shows.
export interface PickedPlace {
  placeId: string | null;
  position: LatLng;
  // "제1공학관 301동", "제1공학관 근처" or "지도에서 고른 위치".
  words: string;
}

let waiting: ((place: PickedPlace) => void) | null = null;

// The screen that opens the map view says where the choice goes, then opens `/place-map`.
export function waitForPlace(onPick: (place: PickedPlace) => void): void {
  waiting = onPick;
}

// The map view's choice, given once.
export function givePlace(place: PickedPlace): void {
  waiting?.(place);
  waiting = null;
}
