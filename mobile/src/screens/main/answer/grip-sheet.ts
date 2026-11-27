/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import { type SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import type { SheetLink } from './sheet-link';
import { type GripPlace, PLACES } from './time-card-grip';

// The time card's grip and the answer sheet under it (moved out of `time-card-grip.ts` for its length).

// While the sheet's move leads (`sheet-link`) and the card was open when it began, its open height follows the sheet
// on the UI thread: open at middle, folded at high. Arrived at high, React folds it (`useFoldUnder`); back at middle,
// it stands open as it rests.
export function useFollowSheet(
  y: SharedValue<number>,
  rows: number,
  sheet: SheetLink,
  place: GripPlace,
): SharedValue<number> {
  const open = useSharedValue(place === 'open' ? 1 : 0);
  useEffect(() => {
    open.value = place === 'open' ? 1 : 0;
  }, [open, place]);
  const tracking = useSharedValue(0);
  const { rise, sheetLeads } = sheet;
  useAnimatedReaction(
    () => [sheetLeads?.value ?? 0, rise?.value ?? 0] as const,
    ([leads, share], previous) => {
      if (leads === 1 && previous?.[0] !== 1) {
        tracking.value = open.value;
      }
      if (tracking.value === 1 && rows > 0) {
        y.value = rows * (1 - share);
      }
      if (leads !== 1) {
        tracking.value = 0;
      }
    },
    [rows],
  );
  return tracking;
}

// The sheet rising to high folds an open card back to its place; the card touched last wins, so only the rise does.
export function useFoldUnder(high: boolean, place: GripPlace, settle: (index: number) => void): void {
  const wasHigh = useRef(high);
  useEffect(() => {
    if (high && !wasHigh.current && place === 'open') {
      settle(PLACES.indexOf('shown'));
    }
    wasHigh.current = high;
  }, [high, place, settle]);
}
