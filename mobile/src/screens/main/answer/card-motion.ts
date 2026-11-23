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

// The open card moving as a sheet (P04 ticket 52). It is laid out once, at its highest step's height (`room`), and moved
// only by a translation on the UI thread, `offset`: how far below its laid-out place it stands, so that the step's
// height shows. Nothing inside is laid out again while it moves. A drag on the header row moves it with the finger;
// every change of step (a let-go, a press on the grip or on the line under it, back) runs to the step in MOTION_MS,
// none with reduced motion. The camera hears the lowered card's height once it has settled.

// A drag on the handle starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;

// The heights of the scrolling part that show at each step, null until the stage is laid out.
export interface Targets {
  lowered: number | null;
  raised: number | null;
  full: number | null;
}

export interface CardMotion {
  // How far below its laid-out place the card stands for its step.
  offset: SharedValue<number>;
  // How far below its lowered step the card is dragged.
  drop: SharedValue<number>;
  pan: PanGesture;
  // Letting go now closes the answer.
  past: boolean;
}

interface MotionInput {
  raising: Raising;
  targets: Targets;
  // The scrolling part's laid-out height: its highest step's. Null until the stage is laid out.
  room: number | null;
  // The height the scrolling part shows as the card comes, as the docked card's when it is raised; null, its step's.
  from: number | null;
  // What the card shows over its scrolling part: its top and the input's room, so that its whole height is known.
  extra: number;
  // Told the whole card's height that shows once it has settled lowered.
  onHeight: (height: number) => void;
}

function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

// A card without steps (an invitation's, a made Quest's) has its lowered one alone, which it settles at and tells.
function heightsOf({ lowered, raised, full }: Targets): LevelHeights | null {
  return lowered === null ? null : { lowered, raised: raised ?? lowered, full };
}

// Runs the offset to `to`, telling `done` at the end; at once with reduced motion. `aimed` keeps the last offset run to,
// so that a step's new offset after a let-go is not run to twice.
function runTo(
  offset: SharedValue<number>,
  to: number,
  { reduce, aimed }: { reduce: boolean; aimed: { current: number | null } },
  done: () => void,
): void {
  aimed.current = to;
  if (reduce) {
    offset.value = to;
    done();
    return;
  }
  offset.value = withTiming(to, { duration: MOTION_MS }, (finished) => {
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
): { past: boolean; tellPast: (past: boolean) => void; closeNow: () => void } {
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
  room: number;
  offset: SharedValue<number>;
  drop: SharedValue<number>;
  // The whole lowered card's height that shows, a plain number the gesture takes when it is made.
  card: number;
  // Where the step rests, which a drag starts from: a plain number, as a value written from the JS thread reaches a
  // worklet only later.
  rest: number;
  closable: boolean;
  onPast: (past: boolean) => void;
  onClose: () => void;
  onLetGo: (to: Level) => void;
}

// The handle's drag on the UI thread: the offset follows the finger one step either way; started on the lowered card,
// a drag down goes on below it, and let go past half the card the answer closes.
function usePan(parts: PanParts): PanGesture {
  const { level, heights, room, offset, drop, card, rest, closable } = parts;
  const start = useSharedValue(0);
  const wasPast = useSharedValue(false);
  const { onPast, onClose, onLetGo } = parts;
  return Gesture.Pan()
    .withTestId('answer-card-handle')
    .enabled(heights !== null)
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .onStart(() => {
      start.value = rest;
      wasPast.value = false;
    })
    .onUpdate(({ translationY }) => {
      if (heights === null) {
        return;
      }
      const at = room - (start.value + translationY);
      const { low, high } = rangeOf(level, heights);
      offset.value = room - clamp(at, low, high);
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
      const at = room - (start.value + translationY + velocityY * FLING_S);
      if (closable && heights.lowered - at > card / 2) {
        scheduleOnRN(onClose);
        return;
      }
      drop.value = 0;
      scheduleOnRN(onLetGo, levelAt(level, at, heights));
    });
}

// Tells the camera a height only when it differs from the last one told, so that it hears each value once, and through
// the latest `onHeight`: a run that ends after the card began to give way to the dock tells nothing (the frame passes
// a card about to be docked one that ignores it), where the run's own callback would still hold the one before.
function useTellOnce(onHeight: (height: number) => void): (height: number) => void {
  const told = useRef<number | null>(null);
  const latest = useRef(onHeight);
  useEffect(() => {
    latest.current = onHeight;
  }, [onHeight]);
  return useCallback((height: number) => {
    if (told.current !== height) {
      told.current = height;
      latest.current(height);
    }
  }, []);
}

// What a run's end does: the camera hears the lowered card's whole height, once the lowered step is committed. A run can
// end before the step it ran to is committed (a let-go sets it at the same time, and the render may come later): it
// then tells nothing, and the commit tells, through the latest `onHeight`, which a card about to give way to the dock
// ignores. So lowering into the dock tells the dock's height alone.
function useSettle(
  raised: boolean,
  { lowered, extra, tell }: { lowered: number | null; extra: number; tell: (height: number) => void },
  running: { current: boolean },
): (step: Level) => void {
  const raisedNow = useRef(raised);
  useEffect(() => {
    raisedNow.current = raised;
  }, [raised]);
  return useCallback(
    (step: Level) => {
      running.current = false;
      if (step === 'lowered' && !raisedNow.current && lowered !== null) {
        tell(extra + lowered);
      }
    },
    [lowered, extra, tell, running],
  );
}

// The offset running to its step: at once on a let-go or a step, and again whenever the step's height changes (the
// content grows, the stage is laid out). Settled lowered, the card's whole height goes to the camera, decided by the step
// the run went to rather than by the state its callback was made in (PR 516's review).
function useRun(
  input: MotionInput,
  level: Level,
  heights: LevelHeights | null,
): { offset: SharedValue<number>; back: (to: Level) => void } {
  const { raising, room, from, extra, onHeight } = input;
  const reduce = useReduceMotion();
  const target = heights === null || room === null ? null : room - heightOf(level, heights);
  const offset = useSharedValue(room !== null && from !== null ? room - from : (target ?? 0));
  const aimed = useRef<number | null>(null);
  // A run under way: the camera waits for its end.
  const running = useRef(false);
  const lowered = heights?.lowered ?? null;
  const tell = useTellOnce(onHeight);
  const settle = useSettle(raising.raised, { lowered, extra, tell }, running);
  const back = useCallback(
    (to: Level) => {
      if (heights !== null && room !== null) {
        running.current = !reduce;
        runTo(offset, room - heightOf(to, heights), { reduce, aimed }, () => {
          settle(to);
        });
      }
    },
    [heights, room, offset, reduce, settle],
  );
  // A new step's offset runs there, and the camera hears it at the end; at rest, the card's top measured or its lowered
  // height changed without a run is told at once. One value per change, never one before a run.
  useEffect(() => {
    if (target !== null && target !== aimed.current) {
      running.current = !reduce;
      runTo(offset, target, { reduce, aimed }, () => {
        settle(level);
      });
      return;
    }
    if (!running.current && level === 'lowered' && lowered !== null) {
      tell(extra + lowered);
    }
  }, [target, offset, reduce, settle, level, lowered, extra, tell]);
  return { offset, back };
}

export function useCardMotion(input: MotionInput): CardMotion {
  const { raising, targets, room, extra } = input;
  const level = levelOf(raising.raised, raising.full === true);
  const heights = heightsOf(targets);
  const { offset, back } = useRun(input, level, heights);
  const drop = useSharedValue(0);
  const { past, tellPast, closeNow } = useCloseSide(raising, drop);
  const letGo = useLetGo(raising, level, back);
  const pan = usePan({
    level,
    heights: room === null ? null : heights,
    room: room ?? 0,
    offset,
    drop,
    card: extra + (heights?.lowered ?? 0),
    rest: room === null || heights === null ? 0 : room - heightOf(level, heights),
    closable: level === 'lowered' && raising.close !== undefined,
    onPast: tellPast,
    onClose: closeNow,
    onLetGo: (to) => {
      tellPast(false);
      letGo(to);
    },
  });
  return { offset, drop, pan, past };
}
