/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/design-system';
import type { VersionsView } from '@/features/timetable/versions';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

// The list's rows, and what stands above the first: its margin of 2 and its padding of 6.
export const ROW_HEIGHT = 40;
const ABOVE_ROWS = 8;

interface Lift {
  // Where the list's top stands on the screen, under the trigger.
  top: number;
  // The renamed row: the current version's place in the list.
  row: number;
  screenHeight: number;
  keyboard: number;
  // The status bar, which the list never goes over.
  topInset: number;
}

// How far the list goes up so that the renamed row stands 16 above the keyboard, at most up to the status bar. 0 while
// the keyboard is down, or while the row is already above it.
export function menuLift({ top, row, screenHeight, keyboard, topInset }: Lift): number {
  if (keyboard === 0) {
    return 0;
  }
  const rowBottom = top + ABOVE_ROWS + (row + 1) * ROW_HEIGHT;
  const covered = rowBottom + space[4] - (screenHeight - keyboard);
  return Math.max(0, Math.min(covered, top - topInset));
}

// Where the list stands: under the trigger, its right edge on the trigger's.
export interface Place {
  top: number;
  right: number;
}

// The list stands in its own Modal, placed once where the trigger was, so neither 내 정보's scroll view nor the
// keyboard moves it: while the current version is renamed, it goes up by itself.
export function useLiftedPlace(place: Place, view: VersionsView, renaming: boolean): Place {
  const { top: topInset, bottom } = useSafeAreaInsets();
  const keyboard = useKeyboardHeight(bottom);
  const { height } = useWindowDimensions();
  if (!renaming) {
    return place;
  }
  const row = view.versions.findIndex(({ id }) => id === view.currentId);
  return { ...place, top: place.top - menuLift({ top: place.top, row, screenHeight: height, keyboard, topInset }) };
}
