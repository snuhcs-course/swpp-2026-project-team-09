/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useRef } from 'react';

// A tap on the map, told in JS: the native map sends a press only for a marker, and no tap on the ground. The
// touches are watched on a View around the map with `onTouchStart` and `onTouchEnd`, which see them without taking
// the responder, so that the native map still pans and zooms.

// Where and when one finger touched or let go, in the screen's points and in milliseconds.
export interface TouchMoment {
  x: number;
  y: number;
  at: number;
}

// What is read of a touch event: React Native's `GestureResponderEvent` is one. `touches` are the fingers on the
// screen after it: with the new one at a start, without the lifted one at an end.
export interface TouchEventLike {
  nativeEvent: { pageX: number; pageY: number; timestamp: number; touches: readonly unknown[] };
}

// A tap is short and moves little: longer is a long press, farther is a drag.
export const TAP_MAX_MS = 250;
export const TAP_MAX_MOVE = 10;

// How long a tap waits before it counts, for the native map's marker press, which may come after the touch's end.
export const TAP_WAIT_MS = 180;

export function isTap(start: TouchMoment, end: TouchMoment): boolean {
  return end.at - start.at <= TAP_MAX_MS && Math.hypot(end.x - start.x, end.y - start.y) <= TAP_MAX_MOVE;
}

type Timer = ReturnType<typeof setTimeout>;

export interface Timers {
  setTimeout: (run: () => void, ms: number) => Timer;
  clearTimeout: (timer: Timer) => void;
}

const GLOBAL_TIMERS: Timers = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  clearTimeout: (timer) => {
    clearTimeout(timer);
  },
};

export interface MapTap {
  // For the View around the map.
  touches: {
    onTouchStart: (event: TouchEventLike) => void;
    onTouchEnd: (event: TouchEventLike) => void;
    onTouchCancel: () => void;
  };
  // A press on a marker that keeps what a tap would end: a tap just before or just after it does not count.
  keep: () => void;
}

interface OneTimer {
  // `run` is called when the time is up; without it the timer only tells that it runs.
  start: (run?: () => void) => void;
  stop: () => void;
  running: () => boolean;
}

// One timer of `TAP_WAIT_MS` at a time, stopped when the component goes.
function useOneTimer(timers: Timers): OneTimer {
  const timer = useRef<Timer | null>(null);
  const one = useMemo((): OneTimer => {
    const stop = (): void => {
      if (timer.current !== null) {
        timers.clearTimeout(timer.current);
        timer.current = null;
      }
    };
    return {
      start: (run) => {
        stop();
        timer.current = timers.setTimeout(() => {
          timer.current = null;
          run?.();
        }, TAP_WAIT_MS);
      },
      stop,
      running: () => timer.current !== null,
    };
  }, [timers]);
  useEffect(() => one.stop, [one]);
  return one;
}

function moment({ nativeEvent }: TouchEventLike): TouchMoment {
  return { x: nativeEvent.pageX, y: nativeEvent.pageY, at: nativeEvent.timestamp };
}

// Calls `onTap` `TAP_WAIT_MS` after a tap of one finger on the map, unless `keep` comes within that time either side
// of it. A second finger makes the touch a pinch, which is no tap. While `active` is false no tap counts.
export function useMapTap(onTap: () => void, active: boolean, timers: Timers = GLOBAL_TIMERS): MapTap {
  const start = useRef<TouchMoment | null>(null);
  const pending = useOneTimer(timers);
  const kept = useOneTimer(timers);
  useEffect(() => {
    if (!active) {
      pending.stop();
    }
  }, [active, pending]);
  const onTouchEnd = useCallback(
    (event: TouchEventLike) => {
      const began = start.current;
      start.current = null;
      const tapped = began !== null && event.nativeEvent.touches.length === 0 && isTap(began, moment(event));
      if (active && tapped && !kept.running()) {
        pending.start(onTap);
      }
    },
    [active, kept, pending, onTap],
  );
  const keep = useCallback(() => {
    pending.stop();
    kept.start();
  }, [kept, pending]);
  const touches = useMemo(
    () => ({
      onTouchStart: (event: TouchEventLike): void => {
        start.current = event.nativeEvent.touches.length > 1 ? null : moment(event);
      },
      onTouchEnd,
      onTouchCancel: (): void => {
        start.current = null;
      },
    }),
    [onTouchEnd],
  );
  return { touches, keep };
}
