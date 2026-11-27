/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { type SharedValue, useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { GripPlace } from './grip-places';
import type { SheetLink } from './sheet-link';
import type { TopStops } from './top-stops';

// The time card's grip, the answer sheet under it, and the bar of several requests over it (out of
// `time-card-grip.ts` for its length).

export type Moved = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

function clampTo(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

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
// Under the bar of several requests it folds the card behind that bar, shown or open (P01 ticket 22).
export function useFoldUnder(high: boolean, place: GripPlace, settleTo: (to: GripPlace) => void, under: boolean): void {
  const wasHigh = useRef(high);
  useEffect(() => {
    if (high && !wasHigh.current) {
      if (under && (place === 'shown' || place === 'open')) {
        settleTo('behind');
      } else if (place === 'open') {
        settleTo('shown');
      }
    }
    wasHigh.current = high;
  }, [high, place, settleTo, under]);
}

// Under the bar of several requests the card moves inside a frame that the bar's lift moves (`TimeCard`), so past its
// place behind the bar it stands still in that frame and the frame takes it up with the bar.
export function useGripStyles(
  y: SharedValue<number>,
  rows: number,
  { pull, behind }: { pull?: SharedValue<number>; behind: number | null },
): { moved: Moved; grown: Moved } {
  // How far the card is pulled open, for the sheet under it.
  useAnimatedReaction(
    () => (rows > 0 ? clampTo(y.value / rows, 0, 1) : 0),
    (share) => {
      if (pull !== undefined) {
        pull.value = share;
      }
    },
    [rows, pull],
  );
  const moved = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ translateY: Math.min(0, y.value) - (behind === null ? 0 : Math.min(0, y.value + behind)) }],
  }));
  const grown = useAnimatedStyle<ViewStyle>(() => ({ height: clampTo(y.value, 0, rows) }));
  return { moved, grown };
}

// Under the bar of several requests the bar's lift follows the card on the UI thread past its place behind the bar, so
// that the strip stays hung under the bar's bottom edge up to the stage's top.
// It waits for the card's height, which its place behind the bar is measured from.
export function useLift(y: SharedValue<number>, behind: number, ready: boolean, under?: TopStops): void {
  const lift = under?.lift;
  useAnimatedReaction(
    () => (ready ? Math.min(0, y.value + behind) : null),
    (at) => {
      if (at !== null && lift !== undefined) {
        lift.value = at;
      }
    },
    [behind, lift, ready],
  );
}
