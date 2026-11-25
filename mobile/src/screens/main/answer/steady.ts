/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';

// A length measured from a layout moves what depends on it only by half a point or more (P04 ticket 63, the user's
// phone): a layout comes back a fraction of a point different as the phone rounds it to its pixels, and a sheet that
// moved with each fraction laid things out again, which reported a new fraction, and never settled.
export const STEADY = 0.5;

function moved(last: number | null, next: number): boolean {
  return last === null || Math.abs(next - last) >= STEADY;
}

// A length handed down as a prop, kept until it moves by STEADY or more.
export function useSteady(value: number): number {
  const [kept, setKept] = useState(value);
  const goes = moved(kept, value);
  if (goes && value !== kept) {
    setKept(value);
  }
  return goes ? value : kept;
}

// A length told by an `onLayout`, set only when it moves by STEADY or more, so that a fraction sets no state at all.
export function useSteadyState(initial: number | null): [number | null, (next: number) => void] {
  const [value, setValue] = useState(initial);
  const last = useRef(initial);
  const set = useCallback((next: number): void => {
    if (moved(last.current, next)) {
      last.current = next;
      setValue(next);
    }
  }, []);
  return [value, set];
}
