import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from '@/api/types';
import { walksOnCampus } from '@/dev-settings';
import { askPermission, readPermission, watchPhone } from './phone';
import { walkAt } from './walk';

// How often a new position comes, from the phone or from the walk. An Avatar glides to it over the same time, so
// that it keeps moving from one position to the next.
export const POSITION_EVERY_MS = 5000;

// `checking` until the phone has said whether the User was asked before. `unasked`: the system's prompt was never
// answered. `refused`: the User said no, or the phone has no position to give.
export type PositionPermission = 'checking' | 'unasked' | 'granted' | 'refused';

export interface MyPosition {
  permission: PositionPermission;
  // Null without the permission, and until the first position comes.
  position: LatLng | null;
  // Shows the system's prompt and follows its answer.
  ask: () => Promise<void>;
}

// The development walk: a new position of the fixed path each time, and the phone is never asked.
function useWalk(walking: boolean): LatLng | null {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = walking
      ? setInterval(() => {
          setStep((last) => last + 1);
        }, POSITION_EVERY_MS)
      : null;
    return (): void => {
      if (timer !== null) {
        clearInterval(timer);
      }
    };
  }, [walking]);
  return walking ? walkAt(step) : null;
}

// What the phone says about the permission, read once when the screen that asks is shown.
function usePermission(asking: boolean): [PositionPermission, (permission: PositionPermission) => void] {
  const [permission, setPermission] = useState<PositionPermission>('checking');
  useEffect(() => {
    let shown = true;
    if (asking) {
      void readPermission().then((read) => {
        if (shown) {
          // An answer the User gave in the meantime holds.
          setPermission((now) => (now === 'checking' ? read : now));
        }
      });
    }
    return (): void => {
      shown = false;
    };
  }, [asking]);
  return [permission, setPermission];
}

// The phone's position, while the screen that asks is shown and the User allows it.
function usePhone(asking: boolean): MyPosition {
  const [permission, setPermission] = usePermission(asking);
  const [position, setPosition] = useState<LatLng | null>(null);
  const watching = asking && permission === 'granted';
  useEffect(() => (watching ? watchPhone(POSITION_EVERY_MS, setPosition) : undefined), [watching]);
  const ask = useCallback(async (): Promise<void> => {
    setPermission(await askPermission());
  }, [setPermission]);
  return { permission, position: watching ? position : null, ask };
}

// The walk needs no permission.
const asksNothing = (): Promise<void> => Promise.resolve();

// The User's own position, behind one hook, so that the development walk can replace the phone's. It is not a
// server's answer and is sent nowhere.
export function usePosition(): MyPosition {
  const [walking] = useState(walksOnCampus);
  const phone = usePhone(!walking);
  const walk = useWalk(walking);
  return walking ? { permission: 'granted', position: walk, ask: asksNothing } : phone;
}
