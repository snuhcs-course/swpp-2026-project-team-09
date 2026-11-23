/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { FLING_S, MOTION_MS, type Raising } from './raise-handle';

// The docked card's drag (P04 ticket 52): the whole card takes it on the UI thread, the input and the main button
// beside it being outside the card, and a press on a chip or a button stays a press. The card follows the finger down;
// let go past half the card the answer closes and keeps the conversation, as ✕ and Android's back do; a drag up raises
// the card; a shorter drag runs back.

// A drag starts past this many points up or down; sideways it gives way to the dock's row of chips.
const PAN_STARTS = 8;
const SIDEWAYS = 16;
// A drag up this far, a fling carried on, raises the card.
const RAISES_AT = 40;

export interface DockDrag {
  pan: PanGesture;
  // How far below its place the card is dragged.
  drop: SharedValue<number>;
  // Letting go now closes the answer.
  past: boolean;
}

interface DockPanParts {
  drop: SharedValue<number>;
  // The card's height as laid out, a plain number the gesture takes when it is made.
  height: number;
  reduce: boolean;
  tell: (past: boolean) => void;
  down: () => void;
  raise: () => void;
}

// The pan on the UI thread: the card follows the finger down, and the let-go point, a fling carried on, closes it past
// half the card, raises it past RAISES_AT up, and else runs it back.
function dockPanOf(
  { drop, height, reduce, tell, down, raise }: DockPanParts,
  wasPast: SharedValue<boolean>,
): PanGesture {
  return Gesture.Pan()
    .withTestId('answer-dock-drag')
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .failOffsetX([-SIDEWAYS, SIDEWAYS])
    .onStart(() => {
      wasPast.value = false;
    })
    .onUpdate(({ translationY }) => {
      const below = Math.max(0, translationY);
      drop.value = below;
      const now = below > height / 2;
      if (now !== wasPast.value) {
        wasPast.value = now;
        scheduleOnRN(tell, now);
      }
    })
    .onEnd(({ translationY, velocityY }) => {
      const at = translationY + velocityY * FLING_S;
      if (at > height / 2) {
        drop.value = 0;
        scheduleOnRN(down);
      } else if (-at > RAISES_AT) {
        drop.value = 0;
        scheduleOnRN(raise);
      } else {
        drop.value = reduce ? 0 : withTiming(0, { duration: MOTION_MS });
        if (wasPast.value) {
          scheduleOnRN(tell, false);
        }
      }
    });
}

export function useDockDrag({ setRaised, close, layer = null, onPast }: Raising, height: number): DockDrag {
  const reduce = useReduceMotion();
  const drop = useSharedValue(0);
  const wasPast = useSharedValue(false);
  const [past, setPast] = useState(false);
  // Past half the card the hint says the answer closes; with a layer to take away first, it does not.
  const tell = (next: boolean): void => {
    const shown = next && layer === null && close !== undefined;
    setPast(shown);
    onPast?.(shown);
  };
  const parts = {
    drop,
    height,
    reduce,
    tell,
    down: (): void => {
      tell(false);
      (layer ?? close)?.();
    },
    raise: (): void => {
      tell(false);
      setRaised(true);
    },
  };
  return { pan: dockPanOf(parts, wasPast), drop, past };
}
