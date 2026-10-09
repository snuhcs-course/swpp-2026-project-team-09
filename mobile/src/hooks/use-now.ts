/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useEffect, useState } from 'react';
import { clockMoves, now } from '@/clock';

// The app's time in milliseconds, looked at again every `everyMs` while it moves.
export function useNow(everyMs: number): number {
  const [at, setAt] = useState(() => now().getTime());
  useEffect((): (() => void) | void => {
    if (!clockMoves()) {
      return;
    }
    const timer = setInterval(() => {
      setAt(now().getTime());
    }, everyMs);
    return (): void => {
      clearInterval(timer);
    };
  }, [everyMs]);
  return at;
}
