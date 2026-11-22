/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useState } from 'react';
import type { ChatSheetControl } from '../chat-sheet';
import type { QuestionsOpen } from './card-questions';
import type { Raising } from './raise-handle';

// The answer card's state, moved out of `answer-frame.tsx`: how high the card stands, whether the list of questions is
// open in it, and what back takes away first.

export interface CardState {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  // The raised card at full height (P04 ticket 52), which falls back to raised once the card is lowered.
  full: boolean;
  setFull: (full: boolean) => void;
  // Takes a full card back to raised while it is full, as back does first; null otherwise.
  unfull: (() => void) | null;
  lower: () => void;
  list: QuestionsOpen;
}

// Whether the card is raised, which the control holds so that a press on the map raises it too, and whether the list
// of questions is open in the card.
// The list closes when the turn on screen changes (`turn`, its last bubble's id): a message sent, a reply come, or a
// question pressed while typing, so that the card shows that turn (PR 479's review). The control's `earlier` follows
// the list, so that the main button's row gives way while it is open (P04 ticket 50).
export function useCardState({ raised, setRaised, earlier }: ChatSheetControl['card'], turn: number | null): CardState {
  const [open, setOpen] = useState(false);
  const { setOpen: tellEarlier } = earlier;
  useEffect(() => {
    tellEarlier(open);
  }, [tellEarlier, open]);
  const [full, setFull] = useState(false);
  const [seen, setSeen] = useState(turn);
  if (seen !== turn) {
    setSeen(turn);
    setOpen(false);
  }
  if (full && !raised) {
    setFull(false);
  }
  const lower = useCallback((): void => {
    setRaised(false);
  }, [setRaised]);
  const toggle = useCallback((): void => {
    setOpen((last) => !last);
  }, []);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);
  const unfull = useCallback((): void => {
    setFull(false);
  }, []);
  const shownFull = full && raised;
  return {
    raised,
    setRaised,
    full: shownFull,
    setFull,
    unfull: shownFull ? unfull : null,
    lower,
    list: { open, toggle, close },
  };
}

interface BackLayers {
  list: QuestionsOpen;
  control: ChatSheetControl;
  raised: boolean;
  lower: () => void;
  // Takes a full card back to raised, while it is full; null otherwise.
  unfull: (() => void) | null;
  leave: () => void;
}

// What back takes away before the card's height: the list of questions, a mark's card, or a restaurant's menu (back to
// the list of candidates); null when none is open. A drag down on the card takes it away first too (P04 ticket 52).
export function layerOf(list: QuestionsOpen, control: ChatSheetControl): (() => void) | null {
  if (list.open) {
    return list.close;
  }
  if (control.mark !== null) {
    return control.closeMark;
  }
  return control.answer.menuFor === null ? null : control.answer.closeMenu;
}

// What Android's back takes away, one layer a press: the full height (P04 ticket 52), the layer over the card
// (`layerOf`), the raised card, then the answer.
export function backOf({ list, control, raised, lower, unfull, leave }: BackLayers): () => void {
  return unfull ?? layerOf(list, control) ?? (raised ? lower : leave);
}

// One step down from a raised or full card, as back takes it, short of closing the answer: what a press on the handle
// and "내리기 ⌄" do (PR 516's review).
export function stepDownOf(layers: BackLayers): () => void {
  return backOf({ ...layers, leave: layers.lower });
}

// The answer card's way up and down for the frame: the card's state, what back takes away, and the `Raising` the card
// moves by, its drag, its handle, and "내리기 ⌄" stepping down as back does.
export function useAnswerRaising(
  control: ChatSheetControl,
  leave: () => void,
  onPast: (past: boolean) => void,
): { raising: Raising; list: QuestionsOpen; back: () => void } {
  const { raised, setRaised, full, setFull, unfull, lower, list } = useCardState(
    control.card,
    control.chat.bubbles.at(-1)?.id ?? null,
  );
  const layers = { list, control, raised, lower, unfull, leave };
  const raising: Raising = {
    raised,
    setRaised,
    full,
    setFull,
    close: leave,
    layer: layerOf(list, control),
    onPast,
    stepDown: stepDownOf(layers),
  };
  return { raising, list, back: backOf(layers) };
}
