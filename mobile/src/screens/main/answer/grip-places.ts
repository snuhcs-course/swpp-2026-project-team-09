/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AccessibilityActionInfo } from 'react-native';

// The time card's grip places and the steps between them (out of `time-card-grip.ts` for its length). Tucked, only the
// card's grip strip shows at the stage's top; behind, under the bar of several requests, the card stands wholly behind
// that bar with only its strip under the bar's bottom edge (P01 ticket 22); shown, its place; open, its rows out.
export type GripPlace = 'tucked' | 'behind' | 'shown' | 'open';

export const TUCK_LABEL = '시간 카드 접기';
export const UNTUCK_LABEL = '시간 카드 펴기';

// A card alone has no bar to go behind.
export function placesOf(under: boolean): readonly GripPlace[] {
  return under ? ['tucked', 'behind', 'shown', 'open'] : ['tucked', 'shown', 'open'];
}

// The top's stop a card under the bar of several requests stands at (`top-stops.tsx`), and the place it starts at for a
// stop, as when the step shown changes back to its Plan.
export function stopOfPlace(place: GripPlace): 0 | 1 | 2 {
  if (place === 'tucked') {
    return 0;
  }
  return place === 'behind' ? 1 : 2;
}

export function placeOfStop(stop: 0 | 1 | 2): GripPlace {
  return (['tucked', 'behind', 'shown'] as const)[stop];
}

// The place a press on the strip goes to: one stop open, and open folds back to shown.
export function pressedPlace(place: GripPlace, under: boolean): GripPlace {
  if (place === 'tucked') {
    return under ? 'behind' : 'shown';
  }
  return place === 'shown' ? 'open' : 'shown';
}

// A screen reader's tuck folds one stop, and its untuck opens one, short of the rows.
export function readerPlace(name: string, place: GripPlace, under: boolean): GripPlace {
  if (name === 'tuck') {
    return under && place !== 'behind' ? 'behind' : 'tucked';
  }
  return under && place === 'tucked' ? 'behind' : 'shown';
}

export function readerActions(place: GripPlace, under: boolean): AccessibilityActionInfo[] {
  const tuck = { name: 'tuck', label: TUCK_LABEL };
  const untuck = { name: 'untuck', label: UNTUCK_LABEL };
  if (place === 'tucked') {
    return [untuck];
  }
  return under && place === 'behind' ? [tuck, untuck] : [tuck];
}
