/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { type SharedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { heightOf, type Level, type LevelHeights, levelAt, levelOf, rangeOf } from './card-levels';
import { FLING_S, MOTION_MS, type Raising } from './raise-handle';

// The open card moving as a sheet (P04 ticket 52): its scrolling part's height is one value on the UI thread. A drag
// on the handle moves it with the finger; every change of step (a let-go, a press on the grip or on the line under it,
// back) runs to the step's height in MOTION_MS, none with reduced motion; the camera hears the lowered height once the
// card has settled.

// A drag on the handle starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;

// The heights of the scrolling part at each step, null until the stage is laid out.
export interface Targets {
  lowered: number | null;
  raised: number | null;
  full: number | null;
}

export interface CardMotion {
  height: SharedValue<number>;
  // How far below its lowered height the card is dragged.
  drop: SharedValue<number>;
  pan: PanGesture;
  // A drag or a run to a step is going on: the content takes `height` while it does.
  moving: boolean;
  // Letting go now closes the answer.
  past: boolean;
  onCardLayout: (height: number) => void;
}

interface MotionInput {
  raising: Raising;
  targets: Targets;
  // The height the card comes from, as the docked card's when it is raised; null, its step's own.
  from: number | null;
  // Told the whole card's height once it has settled lowered.
  onHeight: (height: number) => void;
  // The whole card's height as laid out, which a drag down past half of closes the answer. A plain number the gesture
  // takes when it is made, each render: a value written from the JS thread reaches a worklet only later.
  cardHeight: number;
}

function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

function heightsOf({ lowered, raised, full }: Targets): LevelHeights | null {
  return lowered === null || raised === null ? null : { lowered, raised, full };
}

// Runs the height to `to`, telling `done` at the end; at once with reduced motion. `aimed` keeps the last height run
// to, so that a step's new height after a let-go is not run to twice.
function runTo(
  height: SharedValue<number>,
  to: number,
  { reduce, aimed }: { reduce: boolean; aimed: { current: number | null } },
  done: () => void,
): void {
  aimed.current = to;
  if (reduce) {
    height.value = to;
    done();
    return;
  }
  height.value = withTiming(to, { duration: MOTION_MS }, (finished) => {
    if (finished === true) {
      scheduleOnRN(done);
    }
  });
}

// What a let-go does: runs to the step it comes to, or to the same step again, a layer taken away first (back's order).
function useLetGo(raising: Raising, level: Level, back: (to: Level) => void): (to: Level) => void {
  return useCallback(
    (to: Level) => {
      const layer = to === 'lowered' && level === 'raised' ? (raising.layer ?? null) : null;
      layer?.();
      const step = layer === null ? to : 'raised';
      back(step);
      if (step !== level) {
        raising.setRaised(step !== 'lowered');
        raising.setFull?.(step === 'full');
      }
    },
    [raising, level, back],
  );
}

// Past half the card, letting go closes the answer, and the hint says so; with a layer to take away first, it does not.
function useCloseSide(
  raising: Raising,
  drop: SharedValue<number>,
): {
  past: boolean;
  tellPast: (past: boolean) => void;
  closeNow: () => void;
} {
  const [past, setPast] = useState(false);
  const { onPast, close, layer = null } = raising;
  const tellPast = useCallback(
    (next: boolean) => {
      const shown = next && layer === null;
      setPast(shown);
      onPast?.(shown);
    },
    [layer, onPast],
  );
  const closeNow = useCallback(() => {
    tellPast(false);
    drop.value = 0;
    (layer ?? close)?.();
  }, [tellPast, drop, layer, close]);
  return { past, tellPast, closeNow };
}

interface PanParts {
  level: Level;
  heights: LevelHeights | null;
  height: SharedValue<number>;
  drop: SharedValue<number>;
  card: number;
  closable: boolean;
  onStart: () => void;
  onPast: (past: boolean) => void;
  onClose: () => void;
  onLetGo: (to: Level) => void;
}

// The handle's drag on the UI thread: the height follows the finger one step either way; started on the lowered card,
// a drag down goes on below it, and let go past half the card the answer closes.
function usePan(parts: PanParts): PanGesture {
  const { level, heights, height, drop, card, closable } = parts;
  const start = useSharedValue(0);
  const wasPast = useSharedValue(false);
  const { onStart, onPast, onClose, onLetGo } = parts;
  return Gesture.Pan()
    .withTestId('answer-card-handle')
    .enabled(heights !== null)
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .onStart(() => {
      start.value = height.value;
      wasPast.value = false;
      scheduleOnRN(onStart);
    })
    .onUpdate(({ translationY }) => {
      if (heights === null) {
        return;
      }
      const at = start.value - translationY;
      const { low, high } = rangeOf(level, heights);
      height.value = clamp(at, low, high);
      if (closable) {
        const below = Math.max(0, heights.lowered - at);
        drop.value = below;
        const past = below > card / 2;
        if (past !== wasPast.value) {
          wasPast.value = past;
          scheduleOnRN(onPast, past);
        }
      }
    })
    .onEnd(({ translationY, velocityY }) => {
      if (heights === null) {
        return;
      }
      const at = start.value - translationY - velocityY * FLING_S;
      if (closable && heights.lowered - at > card / 2) {
        scheduleOnRN(onClose);
        return;
      }
      drop.value = 0;
      scheduleOnRN(onLetGo, levelAt(level, at, heights));
    });
}

// The card's height running to its step: at once on a let-go or a press, and again whenever the step's height changes
// (the content grows, the stage is laid out); settled, the lowered card's height goes to the camera.
function useRun(
  input: MotionInput,
  level: Level,
  heights: LevelHeights | null,
): {
  height: SharedValue<number>;
  moving: boolean;
  setMoving: (moving: boolean) => void;
  dragging: { current: boolean };
  cardHeight: { current: number };
  back: (to: Level) => void;
} {
  const { raising, from, onHeight } = input;
  const reduce = useReduceMotion();
  const target = heights === null ? null : heightOf(level, heights);
  const height = useSharedValue(from ?? target ?? 0);
  // Growing from the dock, the card moves from its first frame, unless motion is reduced or it has no height to run to.
  const [moving, setMoving] = useState(from !== null && target !== null && !reduce);
  const dragging = useRef(false);
  const cardHeight = useRef(0);
  const aimed = useRef<number | null>(null);
  const settle = useCallback(() => {
    setMoving(false);
    if (!raising.raised && cardHeight.current > 0) {
      onHeight(cardHeight.current);
    }
  }, [raising.raised, onHeight]);
  const back = useCallback(
    (to: Level) => {
      if (heights !== null) {
        runTo(height, heightOf(to, heights), { reduce, aimed }, settle);
      }
    },
    [heights, height, reduce, settle],
  );
  useEffect(() => {
    if (target === null || dragging.current || target === aimed.current) {
      return;
    }
    setMoving(!reduce);
    runTo(height, target, { reduce, aimed }, settle);
  }, [target, height, reduce, settle]);
  return { height, moving, setMoving, dragging, cardHeight, back };
}

export function useCardMotion(input: MotionInput): CardMotion {
  const { raising, targets, onHeight } = input;
  const level = levelOf(raising.raised, raising.full === true);
  const heights = heightsOf(targets);
  const { height, moving, setMoving, dragging, cardHeight, back } = useRun(input, level, heights);
  const drop = useSharedValue(0);
  const { past, tellPast, closeNow } = useCloseSide(raising, drop);
  const letGo = useLetGo(raising, level, back);
  const pan = usePan({
    level,
    heights,
    height,
    drop,
    card: input.cardHeight,
    closable: level === 'lowered' && raising.close !== undefined,
    onStart: () => {
      dragging.current = true;
      setMoving(true);
    },
    onPast: tellPast,
    onClose: () => {
      dragging.current = false;
      closeNow();
    },
    onLetGo: (to) => {
      dragging.current = false;
      tellPast(false);
      letGo(to);
    },
  });
  return {
    height,
    drop,
    pan,
    moving,
    past,
    onCardLayout: (next) => {
      cardHeight.current = next;
      if (!raising.raised && !moving && !dragging.current) {
        onHeight(next);
      }
    },
  };
}
