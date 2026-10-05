import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import type { Opened } from '@/session/session';
import { readStart } from '@/session/start';

// The screen stays at least this long, so that it can be read.
export const SHORTEST_MS = 500;
const TICK_MS = 50;
// While the work runs the bar creeps up to a share of the way: less before the phone's memory is read, more while
// the Lobby is fetched. Once the work is done it runs to the end.
const BEFORE_KEPT = 35;
const BEFORE_LOBBY = 90;
const STEP = 5;
const LAST_STEP = 20;

export interface Loading {
  // 0 to 100.
  percent: number;
  failed: boolean;
  retry: () => void;
}

// The frame's names for the bar's stretches.
export function stepOf(percent: number): string {
  if (percent < 40) {
    return '지도';
  }
  if (percent < 75) {
    return '친구';
  }
  return percent < 100 ? '일정' : '완료';
}

// Runs the start of the app and tells how far it is. `onDone` is called once the work is done, the bar is full and
// the shortest time has passed.
export function useLoading(onDone: (opened: Opened) => void): Loading {
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const [percent, setPercent] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const began = Date.now();
    let limit = BEFORE_KEPT;
    let shown = 0;
    let opened: Opened | null = null;
    // False once this attempt is over, so that its late answer changes nothing.
    let live = true;
    const timer = setInterval(() => {
      shown = opened === null ? Math.min(limit, shown + STEP) : Math.min(100, shown + LAST_STEP);
      setPercent(shown);
      if (opened !== null && shown === 100 && Date.now() - began >= SHORTEST_MS) {
        clearInterval(timer);
        onDone(opened);
      }
    }, TICK_MS);
    readStart(queryClient, () => {
      limit = BEFORE_LOBBY;
    }).then(
      (result) => {
        opened = result;
      },
      () => {
        if (live) {
          clearInterval(timer);
          setFailed(true);
        }
      },
    );
    return (): void => {
      live = false;
      clearInterval(timer);
    };
  }, [attempt, onDone, queryClient]);
  const retry = useCallback(() => {
    setPercent(0);
    setFailed(false);
    setAttempt((count) => count + 1);
  }, []);
  return { percent, failed, retry };
}
