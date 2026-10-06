import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LatLng } from '@/api/types';
import { askPermission, type Measured, type PhonePermission, readPermission, watchPhone } from './phone';

// How often a new position is asked for, from the phone or from the walk. It is also the longest an Avatar glides.
export const POSITION_EVERY_MS = 5000;

// Another person's position measured this long ago or longer is old, and their Avatar is dimmed.
export const OLD_POSITION_MS = 2 * 60 * 1000;
// The main server keeps a position this long, so one measured this long ago or longer is no longer on the map.
export const KEPT_POSITION_MS = 10 * 60 * 1000;
// How often the age of the positions on the map is looked at again.
export const POSITION_AGE_EVERY_MS = 15 * 1000;

// The shortest glide. A phone may tell a position more often than it was asked to: iOS does about every second.
const SHORTEST_STEP_MS = 1000;

// `checking` until the phone has said whether the User was asked before. `unasked`: the system's prompt was never
// answered. `refused`: the User said no, or the phone has no position to give. `blocked`: the system no longer
// prompts, and only the phone's settings can allow it.
export type PositionPermission = 'checking' | PhonePermission;

export interface MyPosition {
  permission: PositionPermission;
  // Null without the permission, and until the first position comes.
  position: LatLng | null;
  // The position's accuracy in metres, null where the phone does not say, and the time it was measured, in
  // milliseconds since 1970. Null without a position.
  accuracy: number | null;
  measuredAt: number | null;
  // How long this position took to come after the one before, between one and five seconds. An Avatar glides to it
  // over this time, so that it keeps moving from one position to the next without trailing behind.
  stepMs: number;
  // Shows the system's prompt and follows its answer, which it gives.
  ask: () => Promise<PositionPermission>;
  // Starts the phone's watch again if it could not start, as with location services turned off. The same happens
  // by itself when the app returns to the front.
  retry: () => void;
}

interface Fix extends Measured {
  at: number;
  stepMs: number;
}

function fixAfter(last: Fix | null, measured: Measured, at: number): Fix {
  const since = last === null ? POSITION_EVERY_MS : at - last.at;
  return { ...measured, at, stepMs: Math.min(Math.max(since, SHORTEST_STEP_MS), POSITION_EVERY_MS) };
}

// Calls `onFront` each time the app returns to the front, from the phone's settings for example.
function useFront(listening: boolean, onFront: () => void): void {
  const tell = useEffectEvent(onFront);
  useEffect(() => {
    const listener = listening
      ? AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            tell();
          }
        })
      : null;
    return (): void => {
      listener?.remove();
    };
  }, [listening]);
}

// What the phone says about the permission: read when the screens that ask are shown, and again for each `look`.
function usePermission(asking: boolean, look: number): [PositionPermission, (permission: PositionPermission) => void] {
  const [permission, setPermission] = useState<PositionPermission>('checking');
  useEffect(() => {
    let shown = true;
    if (asking) {
      void readPermission().then((read) => {
        if (shown) {
          // A phone that cannot say leaves what is known; the first time, the User counts as never asked.
          setPermission((now) => read ?? (now === 'checking' ? 'unasked' : now));
        }
      });
    }
    return (): void => {
      shown = false;
    };
  }, [asking, look]);
  return [permission, setPermission];
}

const nothing = (): void => {
  // No watch was started.
};

// The phone's positions while `watching`. A watch that could not start is started again by `retry`.
function useWatch(watching: boolean): { fix: Fix | null; retry: () => void } {
  const [fix, setFix] = useState<Fix | null>(null);
  const [attempt, setAttempt] = useState(0);
  const failed = useRef(false);
  useEffect(() => {
    failed.current = false;
    const stop = watching
      ? watchPhone(POSITION_EVERY_MS, {
          tell: (measured): void => {
            const at = Date.now();
            setFix((last) => fixAfter(last, measured, at));
          },
          failed: (): void => {
            failed.current = true;
          },
        })
      : nothing;
    return stop;
  }, [watching, attempt]);
  const retry = useCallback(() => {
    if (failed.current) {
      failed.current = false;
      setAttempt((last) => last + 1);
    }
  }, []);
  return { fix, retry };
}

// The phone's position, while the screens that ask are shown and the User allows it.
export function usePhone(asking: boolean): MyPosition {
  const [look, setLook] = useState(0);
  const [permission, setPermission] = usePermission(asking, look);
  const watching = asking && permission === 'granted';
  const { fix, retry } = useWatch(watching);
  // The User may have changed the permission or turned location services on in the phone's settings.
  useFront(asking, () => {
    setLook((last) => last + 1);
    retry();
  });
  const ask = useCallback(async (): Promise<PositionPermission> => {
    const answer = await askPermission();
    setPermission(answer);
    return answer;
  }, [setPermission]);
  return useMemo(() => {
    const shown = watching ? fix : null;
    return {
      permission,
      position: shown?.position ?? null,
      accuracy: shown?.accuracy ?? null,
      measuredAt: shown?.measuredAt ?? null,
      stepMs: fix === null ? POSITION_EVERY_MS : fix.stepMs,
      ask,
      retry,
    };
  }, [permission, watching, fix, ask, retry]);
}
