/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useState } from 'react';
import type { ChatSheetControl } from '../chat-sheet';
import type { QuestionsOpen } from './card-questions';
import type { Level } from './card-levels';
import type { Raising } from './raise-handle';

// The answer card's state, moved out of `answer-frame.tsx`: the step the card stands at, whether the list of questions
// is open in it, and what back takes away first.

export interface CardState {
  // The sheet's step (P04 ticket 61): low while the control holds the card lowered, else the step it was raised to.
  level: Level;
  setLevel: (level: Level) => void;
  lower: () => void;
  list: QuestionsOpen;
}

// The step the card was raised to. A press that raises the card (`setRaised`: a chosen restaurant's "메뉴 ›" on the
// map, a Lookup's own mark) takes it from low to middle, so that what it opened is seen, and leaves a raised card at
// its step: only the User's drag or a screen reader's step takes the card to high (P04 ticket 63, the user's phone
// check).
type Upper = Exclude<Level, 'low'>;

// The card's step, which the control holds as raised or not so that a press on the map raises it too, and whether the
// list of questions is open in the card.
// The list closes when the turn on screen changes (`turn`, its last bubble's id): a message sent, a reply come, or a
// question pressed while typing, so that the card shows that turn (PR 479's review). The control's `earlier` follows
// the list, so that the main button's row gives way while it is open (P04 ticket 50).
export function useCardState({ raised, setRaised, earlier }: ChatSheetControl['card'], turn: number | null): CardState {
  const [open, setOpen] = useState(false);
  const { setOpen: tellEarlier } = earlier;
  useEffect(() => {
    tellEarlier(open);
  }, [tellEarlier, open]);
  const [upper, setUpper] = useState<Upper>('mid');
  const [seen, setSeen] = useState(turn);
  if (seen !== turn) {
    setSeen(turn);
    setOpen(false);
  }
  const setLevel = useCallback(
    (next: Level): void => {
      if (next === 'low') {
        setUpper('mid');
        setRaised(false);
      } else {
        setUpper(next);
        setRaised(true);
      }
    },
    [setRaised],
  );
  const lower = useCallback((): void => {
    setLevel('low');
  }, [setLevel]);
  const toggle = useCallback((): void => {
    setOpen((last) => !last);
  }, []);
  const close = useCallback((): void => {
    setOpen(false);
  }, []);
  return { level: raised ? upper : 'low', setLevel, lower, list: { open, toggle, close } };
}

interface BackLayers {
  list: QuestionsOpen;
  control: ChatSheetControl;
  level: Level;
  lower: () => void;
  leave: () => void;
}

// What back takes away before the card's height: the list of questions, a mark's card, or a restaurant's menu (back to
// the list of candidates); null when none is open. A drag never takes it away: it only changes the card's height or
// closes the answer (P04 ticket 63).
export function layerOf(list: QuestionsOpen, control: ChatSheetControl): (() => void) | null {
  if (list.open) {
    return list.close;
  }
  if (control.mark !== null) {
    return control.closeMark;
  }
  return control.answer.menuFor === null ? null : control.answer.closeMenu;
}

// What Android's back takes away, one layer a press: picking people in the time card, leaving the Plan as it was (P04
// ticket 64), the layer over the card (`layerOf`), the raised card down to low, then the answer.
export function backOf({ list, control, level, lower, leave }: BackLayers): () => void {
  if (control.answer.adding) {
    return (): void => {
      control.answer.setAdding(false);
    };
  }
  return layerOf(list, control) ?? (level === 'low' ? leave : lower);
}

// The answer card's way up and down for the frame: the card's state, what back takes away, and the `Raising` the card
// moves by.
export function useAnswerRaising(
  control: ChatSheetControl,
  leave: () => void,
  onPast: (past: boolean) => void,
): { raising: Raising; list: QuestionsOpen; back: () => void } {
  const { level, setLevel, lower, list } = useCardState(control.card, control.chat.bubbles.at(-1)?.id ?? null);
  const raising: Raising = { level, setLevel, close: leave, onPast };
  return { raising, list, back: backOf({ list, control, level, lower, leave }) };
}
