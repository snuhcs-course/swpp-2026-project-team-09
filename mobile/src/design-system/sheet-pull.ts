/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { type SharedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

// The drag on a `BottomSheet`'s handle bar (P06 ticket 35), on the UI thread. The sheet follows the finger down and, let
// go, closes or springs back by the way the finger was moving. The sheet's body takes no drag: the user's decision after
// the phone check of 2026-11-28, where a swipe on the body never closed the sheet.

// A drag starts past this many points, so that a tap on the bar stays a tap, and a drag sideways past this many is no
// drag, as on the answer card (`card-drag.ts`).
export const PAN_STARTS = 8;
export const SIDEWAYS = 16;
// A let-go at rest closes the sheet past a quarter of its height, but never asks for more than this.
const CLOSE_MOST = 120;
// A let-go slower than this, in points a second, is at rest: a tremble of the finger is no way up or down.
export const MOVING = 100;
const BACK = { stiffness: 400, damping: 40, mass: 1, overshootClamping: true } as const;

export interface SheetPull {
  // How far the finger has pulled the sheet down from its place.
  down: SharedValue<number>;
  // The sheet's laid-out height, 0 until laid out.
  height: SharedValue<number>;
  reduce: boolean;
  // A let-go that closes: the sheet asks its caller to close.
  onPulledAway: () => void;
}

// The sheet's side of the drag. A let-go that closes asks the caller to close (`close`); when it keeps the sheet open,
// as 시간표 읽기 does, the sheet springs back. Out of sight, the sheet stands at its place again for its next opening.
export function useSheetPull(open: boolean, shown: boolean, close: () => void): SheetPull {
  const reduce = useReduceMotion();
  const down = useSharedValue(0);
  const height = useSharedValue(0);
  const [pulls, setPulls] = useState(0);
  useEffect(() => {
    if (pulls > 0 && open) {
      springBack(down, reduce);
    }
  }, [pulls, open, down, reduce]);
  useEffect(() => {
    if (!shown) {
      down.value = 0;
    }
  }, [shown, down]);
  const onPulledAway = useCallback(() => {
    setPulls((count) => count + 1);
    close();
  }, [close]);
  return useMemo(() => ({ down, height, reduce, onPulledAway }), [down, height, reduce, onPulledAway]);
}

// Whether a let-go `down` points below the sheet's place, moving `velocityY` points a second, closes it: moving up it
// stays, moving down it closes, and at rest it closes past a quarter of its height or 120 points, whichever is less. How
// far it went on the way counts for nothing (the user's phone check, 2026-11-28).
export function closesOnLetGo(down: number, velocityY: number, height: number): boolean {
  'worklet';
  if (down <= 0 || velocityY < -MOVING) {
    return false;
  }
  if (velocityY > MOVING) {
    return true;
  }
  return down > (height > 0 ? Math.min(height / 4, CLOSE_MOST) : CLOSE_MOST);
}

function springBack(down: SharedValue<number>, reduce: boolean): void {
  'worklet';
  down.value = reduce ? 0 : withSpring(0, BACK);
}

// The handle bar's drag: the sheet follows the finger down, never up past its place, and closes or springs back as the
// finger lets go. A drag taken from the finger springs back.
export function useSheetPan({ down, height, reduce, onPulledAway }: SheetPull): PanGesture {
  const from = useSharedValue(0);
  const follow = (translationY: number): void => {
    'worklet';
    down.value = Math.max(0, translationY - from.value);
  };
  return Gesture.Pan()
    .withTestId('sheet-drag')
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .failOffsetX([-SIDEWAYS, SIDEWAYS])
    .onStart(({ translationY }) => {
      'worklet';
      from.value = translationY;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      follow(translationY);
    })
    .onEnd(({ translationY, velocityY }, success) => {
      'worklet';
      follow(translationY);
      if (success && closesOnLetGo(down.value, velocityY, height.value)) {
        scheduleOnRN(onPulledAway);
      } else {
        springBack(down, reduce);
      }
    });
}
