import { createContext, type ReactElement, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { LatLng } from '@/api/types';
import { walksOnCampus } from '@/dev-settings';
import { type MyPosition, POSITION_EVERY_MS, usePhone } from './use-phone';
import { walkAt } from './walk';

// The development walk: a new position of the fixed path each time, measured when it moves, and the phone is never
// asked.
function useWalk(walking: boolean): { position: LatLng; measuredAt: number } | null {
  const [step, setStep] = useState({ count: 0, at: Date.now() });
  useEffect(() => {
    const timer = walking
      ? setInterval(() => {
          setStep((last) => ({ count: last.count + 1, at: Date.now() }));
        }, POSITION_EVERY_MS)
      : null;
    return (): void => {
      if (timer !== null) {
        clearInterval(timer);
      }
    };
  }, [walking]);
  return useMemo(() => (walking ? { position: walkAt(step.count), measuredAt: step.at } : null), [walking, step]);
}

// The walk's accuracy, in metres: as a phone's outdoors.
const WALK_ACCURACY = 10;

// The walk needs no permission, and has no watch to start again.
const asksNothing = (): Promise<'granted'> => Promise.resolve('granted');
const retriesNothing = (): void => {
  // The walk never fails.
};

const PositionContext = createContext<MyPosition | null>(null);

// Holds the User's own position for everything inside it: one permission and one watch of the phone, however many
// parts of the screen read it. The development walk can replace the phone's. The position is not a server's answer;
// `PositionSending` sends it while the Master Switch is on.
export function PositionProvider({ children }: { children: ReactNode }): ReactElement {
  const [walking] = useState(walksOnCampus);
  const phone = usePhone(!walking);
  const walk = useWalk(walking);
  const walked = useMemo<MyPosition>(
    () => ({
      permission: 'granted',
      position: walk?.position ?? null,
      accuracy: walk === null ? null : WALK_ACCURACY,
      measuredAt: walk?.measuredAt ?? null,
      stepMs: POSITION_EVERY_MS,
      ask: asksNothing,
      retry: retriesNothing,
    }),
    [walk],
  );
  return <PositionContext value={walking ? walked : phone}>{children}</PositionContext>;
}

// The User's own position, as the `PositionProvider` around the screen holds it.
export function usePosition(): MyPosition {
  const position = use(PositionContext);
  if (position === null) {
    throw new Error('The position must be read inside a PositionProvider');
  }
  return position;
}
