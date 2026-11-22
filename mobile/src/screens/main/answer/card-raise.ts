/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';

// Whether the answer card is raised, and whether its earlier turns are open under the turn on screen. The card's handle,
// the dock's line and chips, and a press on a Lookup's mark on the map raise it; leaving the frame lowers it.
export interface CardRaise {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  earlier: { open: boolean; setOpen: (open: boolean) => void };
  // Raises the card, with the earlier turns open when `earlier` is true.
  raise: (earlier: boolean) => void;
}

export function useCardRaise(framed: boolean): CardRaise {
  const [raised, setRaised] = useState(false);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(framed);
  if (seen !== framed) {
    setSeen(framed);
    setRaised(false);
    setOpen(false);
  }
  const raise = useCallback((earlier: boolean): void => {
    setOpen(earlier);
    setRaised(true);
  }, []);
  return { raised, setRaised, earlier: { open, setOpen }, raise };
}

// The frame's list of earlier questions, open or not, which it also tells the control as `earlier.open`, so that the
// main button's row gives way while the list is open (P04 ticket 50).
export function useToldOpen(tell: (open: boolean) => void): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    tell(open);
  }, [tell, open]);
  return [open, setOpen];
}
