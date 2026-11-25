/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';

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

// A menu question's answer opens at its Restaurant's menu (P04 ticket 72), which the raised card shows, as when the
// Restaurant is pressed in a meal answer's list: the card is raised when such an answer comes.
export function useRaisedForMenu(
  { answer, menuFor }: Pick<ShownAnswer, 'answer' | 'menuFor'>,
  setRaised: (raised: boolean) => void,
): void {
  const opened = answer?.opened ?? null;
  const raiseIt = useEffectEvent(() => {
    if (opened !== null && menuFor === opened) {
      setRaised(true);
    }
  });
  useEffect(() => {
    raiseIt();
  }, [answer]);
}
