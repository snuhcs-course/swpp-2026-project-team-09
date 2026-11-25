/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
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

interface Place {
  target: number | null;
  room: number | null;
  level: Level;
  reduce: boolean;
  offset: SharedValue<number>;
  aimed: { current: number | null };
  ranLevel: { current: Level };
  running: { current: boolean };
  rest: number;
  setRest: (rest: number) => void;
}

// In the render: whether the step's new place is run to (a step the User asked for, with motion), or else sets it at
// once and tells React (`rest`).
function usePlace({ target, room, level, reduce, offset, aimed, ranLevel, running, rest, setRest }: Place): boolean {
  const stepped = ranLevel.current !== level && aimed.current !== null;
  const runs = target !== null && target !== aimed.current && stepped && !reduce;
  if (target !== null && target !== aimed.current && !runs) {
    aimed.current = target;
    offset.value = target;
    // Set at once, the place ends any run under way.
    running.current = false;
  } else if (target === null && aimed.current === null && room !== null) {
    offset.value = room;
  }
  const placedAt = target !== null && !runs ? target : aimed.current === null ? (room ?? 0) : null;
  if (placedAt !== null && placedAt !== rest && !running.current) {
    setRest(placedAt);
  }
  ranLevel.current = level;
  return runs;
}

interface LetGoRun {
  heights: LevelHeights | null;
  room: number | null;
  offset: SharedValue<number>;
  reduce: boolean;
  aimed: { current: number | null };
  running: { current: boolean };
  setRest: (rest: number) => void;
  settle: (level: Level) => void;
}

// The run of a let-go (`back`): to its step with the finger's speed, or none when that speed points away from the step,
// so that no frame goes back. A toss up begins its run on the UI thread (`card-drag`): `back` only keeps its step, and
// `landed` ends it.
function useLetGoRun(p: LetGoRun): {
  back: (to: Level, velocity?: number, started?: boolean) => void;
  landed: (to: Level) => void;
} {
  const { heights, room, offset, reduce, aimed, running, setRest, settle } = p;
  const back = useCallback(
    (to: Level, velocity = 0, started = false) => {
      if (heights === null || room === null) {
        return;
      }
      running.current = !reduce;
      const at = room - heightOf(to, heights);
      if (started) {
        aimed.current = at;
        return;
      }
      const toward = (at - offset.value) * velocity > 0 ? velocity : 0;
      runTo(offset, at, { reduce, aimed, velocity: toward }, () => {
        setRest(at);
        settle(to);
      });
    },
    [heights, room, offset, reduce, aimed, running, setRest, settle],
  );
  const landed = useCallback(
    (to: Level) => {
      if (heights !== null && room !== null && aimed.current === room - heightOf(to, heights)) {
        setRest(aimed.current);
        settle(to);
      }
    },
    [heights, room, aimed, setRest, settle],
  );
  return { back, landed };
}

// The offset running to its step. A step the User asked for runs: a let-go by `back`, a screen reader's or back's step
// here. Anything else, the card's first place, a change of the step's height alone (the stage, the header, the
// keyboard, the content laid out), and every step with reduced motion, is set in the render itself, before the moved
// view's place is told to React (`rest`): React lays what it holds for the view again over a place set on the UI thread
// alone, which on a fresh start's first answer left the card where it was first laid out (P04 ticket 61). A run tells
// React its place when it ends, as it then stands there too. Settled at low, the card's whole height goes to the camera.
export function useRun(
  input: RunInput,
  level: Level,
  reduce: boolean,
): {
  offset: SharedValue<number>;
  rest: number;
  back: (to: Level, velocity?: number, started?: boolean) => void;
  landed: (to: Level) => void;
} {
  const { heights, room, extra, onHeight } = input;
  const target = heights === null || room === null ? null : room - heightOf(level, heights);
  // Laid out with no steps yet, the card waits wholly under its place.
  const offset = useSharedValue(target ?? room ?? 0);
  // Where the card rests, which React holds for the moved view: set with each place set at once, and at the end of
  // each run, when the run stands there too.
  const [rest, setRest] = useState(target ?? room ?? 0);
  const aimed = useRef<number | null>(target);
  const ranLevel = useRef(level);
  // A run under way: the camera waits for its end.
  const running = useRef(false);
  const low = heights?.low ?? null;
  const tell = useTellOnce(onHeight);
  const settle = useSettle(level, { low, extra, tell }, running);
  const runs = usePlace({ target, room, level, reduce, offset, aimed, ranLevel, running, rest, setRest });
  const { back, landed } = useLetGoRun({ heights, room, offset, reduce, aimed, running, setRest, settle });
  useEffect(() => {
    if (runs && target !== null) {
      running.current = true;
      runTo(offset, target, { reduce: false, aimed }, () => {
        setRest(target);
        settle(level);
      });
      return;
    }
    if (!running.current && level === 'low' && low !== null) {
      tell(extra + low);
    }
  }, [runs, target, offset, settle, level, low, extra, tell]);
  return { offset, rest, back, landed };
}
