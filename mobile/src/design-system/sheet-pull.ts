/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { createContext, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, type GestureType, type PanGesture } from 'react-native-gesture-handler';
import { type SharedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

// A swipe down that closes a `BottomSheet` (P06 ticket 35), on the UI thread. The sheet follows the finger down and,
// let go, closes or springs back by the way the finger was moving. A list inside the sheet (`SheetScrollView`) has a
// swipe of its own, which pulls the sheet only when the list was at its top where the finger landed (`sheet-list-pan.ts`).

// A drag starts past this many points, so that a press stays a press, and a drag sideways past this many gives way to a
// row that scrolls sideways, as on the answer card (`card-drag.ts`).
export const PAN_STARTS = 8;
export const SIDEWAYS = 16;
// A let-go at rest closes the sheet past a quarter of its height, but never asks for more than this.
const CLOSE_MOST = 120;
// A let-go slower than this, in points a second, is at rest: a tremble of the finger is no way up or down.
export const MOVING = 100;
// A list within half a point of its top is at it.
export const AT_TOP = 0.5;
const BACK = { stiffness: 400, damping: 40, mass: 1, overshootClamping: true } as const;

export interface SheetPull {
  // How far the finger has pulled the sheet down from its place.
  down: SharedValue<number>;
  // The sheet's laid-out height, 0 until laid out.
  height: SharedValue<number>;
  // The sheet's own swipe, which waits while a list under the finger decides.
  ref: RefObject<GestureType | undefined>;
  reduce: boolean;
  // A let-go that closes: the sheet asks its caller to close.
  onPulledAway: () => void;
}

// What a swipe's worklets take of the sheet: all but the ref, which holds the gesture and stays on the JS thread.
export type Pulled = Omit<SheetPull, 'ref'>;

// The sheet a `SheetScrollView` stands in, null outside one.
export const SheetPullContext = createContext<SheetPull | null>(null);

// The sheet's side of the swipe. A let-go that closes asks the caller to close (`close`); when it keeps the sheet open,
// as 시간표 읽기 does, the sheet springs back. Out of sight, the sheet stands at its place again for its next opening.
export function useSheetPull(open: boolean, shown: boolean, close: () => void): SheetPull {
  const reduce = useReduceMotion();
  const down = useSharedValue(0);
  const height = useSharedValue(0);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- Gesture Handler's `withRef` takes a ref that starts undefined
  const ref = useRef<GestureType | undefined>(undefined);
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
  return useMemo(() => ({ down, height, ref, reduce, onPulledAway }), [down, height, reduce, onPulledAway]);
}

export function pulledOf({ down, height, reduce, onPulledAway }: SheetPull): Pulled {
  return { down, height, reduce, onPulledAway };
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

export function springBack(down: SharedValue<number>, reduce: boolean): void {
  'worklet';
  down.value = reduce ? 0 : withSpring(0, BACK);
}

// The sheet `by` points below where the swipe took it, never above its place.
export function pullBy({ down }: Pulled, by: number): void {
  'worklet';
  down.value = Math.max(0, by);
}

// The finger lifts: the sheet closes or springs back. A swipe taken from the finger springs back.
export function letSheetGo(pulled: Pulled, velocityY: number, success: boolean): void {
  'worklet';
  const { down, height, reduce, onPulledAway } = pulled;
  if (success && closesOnLetGo(down.value, velocityY, height.value)) {
    scheduleOnRN(onPulledAway);
  } else {
    springBack(down, reduce);
  }
}

// A swipe up or down, which a press or a sideways row keeps.
export function sheetPan(testId: string): PanGesture {
  return Gesture.Pan().withTestId(testId).activeOffsetY([-PAN_STARTS, PAN_STARTS]).failOffsetX([-SIDEWAYS, SIDEWAYS]);
}

// The sheet's own swipe, anywhere on it outside a list: it pulls whichever way the finger first goes.
export function useSheetPan(sheet: SheetPull): PanGesture {
  const from = useSharedValue(0);
  const pulled = pulledOf(sheet);
  return sheetPan('sheet-drag')
    .withRef(sheet.ref)
    .onStart(({ translationY }) => {
      'worklet';
      from.value = translationY;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      pullBy(pulled, translationY - from.value);
    })
    .onEnd(({ translationY, velocityY }, success) => {
      'worklet';
      pullBy(pulled, translationY - from.value);
      letSheetGo(pulled, velocityY, success);
    });
}
