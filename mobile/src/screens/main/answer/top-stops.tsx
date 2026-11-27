/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useMemo, useState } from 'react';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';
import { TUCK_STRIP } from './time-card-grip';

// The top of an answer to several requests folds upward in stops, as the answer sheet steps below it (P01 ticket 22,
// the user's choice of 2026-11-27, "이 안으로"): 2, the steps card with the time card under it; 1, the time card wholly
// behind the steps card, only its grip strip showing under the steps card's bottom edge; 0, the steps card gone up
// too, the one grip strip left at the stage's top. The strip is the time card itself stopped short, at its own width
// and corners: one drag on it moves both cards on the UI thread, with nothing swapped in. An answer to one request
// folds as it did, its card tucked to its strip at the stage's top.
export type TopStop = 0 | 1 | 2;

export interface TopStops {
  stop: TopStop;
  setStop: (stop: TopStop) => void;
  // The steps card's height, kept from the last one laid out, so that the sheet's high edge at stop 1 stays where it
  // was while an answer loads.
  stepsHeight: number;
  setStepsHeight: (height: number) => void;
  // How far the steps card is pushed up, 0 or less, moved on the UI thread by the time card's grip
  // (`time-card-grip.ts`), or by the strip of a step with no time card (`steps-strip.tsx`).
  lift: SharedValue<number>;
}

export function useTopStops(): TopStops {
  const [stop, setStop] = useState<TopStop>(2);
  const [stepsHeight, setStepsHeight] = useState(0);
  const lift = useSharedValue(0);
  return useMemo(() => ({ stop, setStop, stepsHeight, setStepsHeight, lift }), [stop, stepsHeight, lift]);
}

// Where the steps card rests at a stop, which React holds so that a commit of React's lays it there again: at 0 its
// bottom edge at the stage's top (`stepsBottom` from there), else its place.
export function restingLift(stop: TopStop, stepsBottom: number): number {
  return stop === 0 ? -stepsBottom : 0;
}

// The room over the answer sheet's high edge, from the lists' top (`lists`, from the stage's top), that a stop leaves:
// the strip at the stage's top at 0, the steps card and the strip under it at 1, and at 2 what stands there today
// (`folded`, the folded time card's place or the bar of steps reaching lower).
export function topRoomOf(
  stop: TopStop,
  { stepsHeight, folded, lists }: { stepsHeight: number; folded: number; lists: number },
): number {
  if (stop === 0) {
    return TUCK_STRIP - lists;
  }
  if (stop === 1 && stepsHeight > 0) {
    return stepsHeight + TUCK_STRIP;
  }
  return folded;
}
