import { createContext, type ReactElement, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { LatLng } from '@/api/types';
import { walksOnCampus } from '@/dev-settings';
import { type MyPosition, POSITION_EVERY_MS, usePhone } from './use-phone';
import { walkAt } from './walk';

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

// The walk needs no permission, and has no watch to start again.
const asksNothing = (): Promise<void> => Promise.resolve();
const retriesNothing = (): void => {
  // The walk never fails.
};

const PositionContext = createContext<MyPosition | null>(null);

// Holds the User's own position for everything inside it: one permission and one watch of the phone, however many
// parts of the screen read it. The development walk can replace the phone's. The position is not a server's answer
// and is sent nowhere.
export function PositionProvider({ children }: { children: ReactNode }): ReactElement {
  const [walking] = useState(walksOnCampus);
  const phone = usePhone(!walking);
  const walk = useWalk(walking);
  const walked = useMemo<MyPosition>(
    () => ({
      permission: 'granted',
      position: walk,
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
