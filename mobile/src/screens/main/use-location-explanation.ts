import { useCallback, useEffect, useState } from 'react';
import type { PositionPermission } from '@/position';
import { keep, readKept } from '@/storage/kept';

export interface LocationExplaining {
  explaining: boolean;
  // Shows it because the User asked for their position.
  explain: () => void;
  // The User answered it, either way.
  close: () => void;
}

// Whether the User answered the explanation on this phone before. Null until the phone has said.
function useAnswered(): [boolean | null, () => void] {
  const [answered, setAnswered] = useState<boolean | null>(null);
  useEffect(() => {
    let shown = true;
    const tell = (was: boolean): void => {
      if (shown) {
        // An answer given in the meantime holds.
        setAnswered((now) => now ?? was);
      }
    };
    void readKept().then(
      ({ locationExplained }) => {
        tell(locationExplained);
      },
      () => {
        // A phone that cannot be read counts as never answered.
        tell(false);
      },
    );
    return (): void => {
      shown = false;
    };
  }, []);
  const answer = useCallback(() => {
    setAnswered(true);
    // A phone that could not keep it shows the explanation once more at the next start.
    void keep({ locationExplained: true }).catch(() => null);
  }, []);
  return [answered, answer];
}

// The explanation before the location prompt appears by itself once on a phone: the first time the main screen opens
// to a User whom the system never asked. After an answer it comes only when it is asked for.
export function useLocationExplanation(permission: PositionPermission): LocationExplaining {
  const [answered, answer] = useAnswered();
  const [asked, setAsked] = useState(false);
  const explain = useCallback(() => {
    setAsked(true);
  }, []);
  const close = useCallback(() => {
    answer();
    setAsked(false);
  }, [answer]);
  return { explaining: asked || (permission === 'unasked' && answered === false), explain, close };
}
