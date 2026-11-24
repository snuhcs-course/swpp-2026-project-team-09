/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef } from 'react';
import { type SharedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { heightOf, type Level, type LevelHeights } from './card-levels';

// The answer sheet running to its step (moved out of `card-motion.ts` for its length, P04 ticket 61), and the camera
// told the low card's height once it has settled there.

// The run to a step: as stiff as Android's settling sheet and damped not to overshoot, carrying the let-go's speed.
export const SETTLE = { stiffness: 400, damping: 40, mass: 1, overshootClamping: true } as const;

export interface RunInput {
  heights: LevelHeights | null;
  room: number | null;
  extra: number;
  onHeight: (height: number) => void;
}

// Runs the offset to `to` with the let-go's speed, telling `done` at the end. With reduced motion, and for the card's
// first place, the number is set itself, not a run of no length: each run that settles makes Reanimated render the
// view again with its value, and while the card is first laid out several such renders came late and laid an earlier
// step's place over the last one's (P04 ticket 61). `aimed` keeps the last offset run to, so that a step's new offset
// after a let-go is not run to twice.
function runTo(
  offset: SharedValue<number>,
  to: number,
  { reduce, aimed, velocity = 0 }: { reduce: boolean; aimed: { current: number | null }; velocity?: number },
  done: () => void,
): void {
  aimed.current = to;
  if (reduce) {
    offset.value = to;
    done();
    return;
  }
  offset.value = withSpring(to, { ...SETTLE, velocity }, (finished) => {
    'worklet';
    if (finished === true) {
      scheduleOnRN(done);
    }
  });
}

// Tells the camera a height only when it differs from the last one told, so that it hears each value once, and through
// the latest `onHeight`.
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

// What a run's end does: the camera hears the low card's whole height, once low is committed. A run can end before the
// step it ran to is committed (a let-go sets it at the same time, and the render may come later): it then tells nothing,
// and the commit tells, through the latest `onHeight`.
function useSettle(
  level: Level,
  { low, extra, tell }: { low: number | null; extra: number; tell: (height: number) => void },
  running: { current: boolean },
): (step: Level) => void {
  const levelNow = useRef(level);
  useEffect(() => {
    levelNow.current = level;
  }, [level]);
  return useCallback(
    (step: Level) => {
      running.current = false;
      if (step === 'low' && levelNow.current === 'low' && low !== null) {
        tell(extra + low);
      }
    },
    [low, extra, tell, running],
  );
}

// The offset running to its step: on a let-go or a step, and again whenever the step's height changes (the content
// grows, the stage is laid out). The first step the card comes to once it is laid out, it stands at at once (PR 537's
// review). Settled at low, the card's whole height goes to the camera.
export function useRun(
  input: RunInput,
  level: Level,
  reduce: boolean,
): { offset: SharedValue<number>; back: (to: Level, velocity?: number) => void } {
  const { heights, room, extra, onHeight } = input;
  const target = heights === null || room === null ? null : room - heightOf(level, heights);
  // Laid out with no steps yet, the card waits wholly under its place.
  const offset = useSharedValue(target ?? room ?? 0);
  const aimed = useRef<number | null>(null);
  const placed = useRef(target !== null);
  // A run under way: the camera waits for its end.
  const running = useRef(false);
  const low = heights?.low ?? null;
  const tell = useTellOnce(onHeight);
  const settle = useSettle(level, { low, extra, tell }, running);
  const back = useCallback(
    (to: Level, velocity = 0) => {
      if (heights !== null && room !== null) {
        running.current = !reduce;
        runTo(offset, room - heightOf(to, heights), { reduce, aimed, velocity }, () => {
          settle(to);
        });
      }
    },
    [heights, room, offset, reduce, settle],
  );
  useEffect(() => {
    if (target !== null && target !== aimed.current) {
      const first = !placed.current;
      placed.current = true;
      running.current = !reduce && !first;
      runTo(offset, target, { reduce: reduce || first, aimed }, () => {
        settle(level);
      });
      return;
    }
    if (target === null && room !== null && !placed.current) {
      offset.value = room;
    }
    if (!running.current && level === 'low' && low !== null) {
      tell(extra + low);
    }
  }, [target, room, offset, reduce, settle, level, low, extra, tell]);
  return { offset, back };
}
