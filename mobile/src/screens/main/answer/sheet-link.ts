/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createContext, useMemo } from 'react';
import type { Raising } from './raise-handle';

// The answer sheet as the time card over it sees it (P04 ticket 61): only one of the two is expanded at a time, and the
// card touched last wins. The time card opening brings a high sheet down to middle, which it stays at when the time
// card folds again; the sheet rising to high folds an open time card. So the time card's grip is never under the sheet.

export interface SheetLink {
  high: boolean;
  onOpen: () => void;
}

function nothing(): void {
  // No sheet under the time card.
}

export const SheetLinkContext = createContext<SheetLink>({ high: false, onOpen: nothing });

export function useSheetLink({ level, setLevel }: Pick<Raising, 'level' | 'setLevel'>): SheetLink {
  return useMemo(
    () => ({
      high: level === 'high',
      onOpen: (): void => {
        if (level === 'high') {
          setLevel('mid');
        }
      },
    }),
    [level, setLevel],
  );
}
