/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { createContext, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, type GestureType, type PanGesture } from 'react-native-gesture-handler';
import { type SharedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

// A swipe down that closes a `BottomSheet` (P06 ticket 35), on the UI thread. The sheet follows the finger down and,
// let go, closes or springs back. A list inside the sheet (`SheetScrollView`) pulls the sheet only when it was at its
// top where the finger landed, and only by a swipe that starts down: that is decided for the whole gesture, so a swipe
// that scrolled the list never goes on to move the sheet.

// A drag starts past this many points, so that a press stays a press, and a drag sideways past this many gives way to a
// row that scrolls sideways, as on the answer card (`card-drag.ts`).
export const PAN_STARTS = 8;
export const SIDEWAYS = 16;
// A let-go closes the sheet past a quarter of its height, but never asks for more than this.
const CLOSE_MOST = 120;
// A let-go faster than this down, in points a second, is a flick: it closes from any depth. The answer card's.
export const FLICK = 500;
// A list within half a point of its top is at it.
const AT_TOP = 0.5;
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

export function closesOnLetGo(down: number, velocityY: number, height: number): boolean {
  'worklet';
  const far = height > 0 ? Math.min(height / 4, CLOSE_MOST) : CLOSE_MOST;
  return down > far || (velocityY > FLICK && down > 0);
}

export function springBack(down: SharedValue<number>, reduce: boolean): void {
  'worklet';
  down.value = reduce ? 0 : withSpring(0, BACK);
}

export interface Pull {
  gesture: PanGesture;
  // The swipe is moving the sheet: the list it started in stays at its top.
  pulling: SharedValue<boolean>;
}

// The swipe that pulls the sheet down: the sheet's own (`scrollY` null), which pulls whichever way the finger first
// goes, or a list's, which pulls only when the list was at its top as the finger landed and the finger first goes down.
export function usePull(sheet: SheetPull | null, scrollY: SharedValue<number> | null): Pull {
  const may = useSharedValue(false);
  const pulling = useSharedValue(false);
  const from = useSharedValue(0);
  const down = sheet?.down;
  const height = sheet?.height;
  const reduce = sheet?.reduce ?? true;
  const onPulledAway = sheet?.onPulledAway;
  const follow = (translationY: number): void => {
    'worklet';
    if (pulling.value && down !== undefined) {
      down.value = Math.max(0, translationY - from.value);
    }
  };
  const gesture = Gesture.Pan()
    .withTestId(scrollY === null ? 'sheet-drag' : 'sheet-list-drag')
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .failOffsetX([-SIDEWAYS, SIDEWAYS])
    .onBegin(() => {
      'worklet';
      may.value = scrollY === null || scrollY.value <= AT_TOP;
    })
    .onStart(({ translationY }) => {
      'worklet';
      pulling.value = may.value && (scrollY === null || translationY > 0);
      from.value = translationY;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      follow(translationY);
    })
    .onEnd(({ translationY, velocityY }, success) => {
      'worklet';
      if (!pulling.value || down === undefined || height === undefined || onPulledAway === undefined) {
        return;
      }
      follow(translationY);
      if (success && closesOnLetGo(down.value, velocityY, height.value)) {
        scheduleOnRN(onPulledAway);
      } else {
        springBack(down, reduce);
      }
    })
    .onFinalize(() => {
      'worklet';
      pulling.value = false;
    });
  return { gesture, pulling };
}
