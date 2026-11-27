/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useId, useRef, useState } from 'react';

// The main button of a booking's ticket (P01 ticket 15), beside the input as a Plan's is: the done message's 가는 길,
// or 예약 취소 once its "예약 취소 ›" was pressed; a return card's 반납하기; a cancel card's 예약 취소, drawn in red.
// The card that offers it tells it at each render, with its bubble, and the screen draws it only for the bubble on
// screen.

// The way back from an armed step without acting (P01 ticket 21): its words for a screen reader, and what it does.
export interface StepBack {
  label: string;
  onPress: () => void;
}

export interface ActTold {
  words: string;
  onPress: () => void;
  disabled: boolean;
  danger: boolean;
  // An armed step: the round ✕ beside the button, which un-arms it.
  back?: StepBack;
}

export interface ActSeen {
  bubbleId: number;
  words: string;
  disabled: boolean;
  danger: boolean;
  // The ✕'s label while the step is armed, else null.
  back: string | null;
}

export interface ActStage {
  seen: ActSeen | null;
  // `teller` names the card that tells, so that one that is gone takes away only its own.
  tell: (teller: string, bubbleId: number, told: ActTold | null) => void;
  press: () => void;
  // The ✕ of an armed step.
  stepBack: () => void;
}

function same(one: ActSeen | null, other: ActSeen | null): boolean {
  return JSON.stringify(one) === JSON.stringify(other);
}

// The cards that tell a main button, in the order they first told it: the first has it, whichever renders last, so
// that two cards in one reply never take it in turns; once it tells none, the next has it (PR 646's review).
export function useActStage(): ActStage {
  const tellers = useRef(new Map<string, { bubbleId: number; told: ActTold }>());
  const [seen, setSeen] = useState<ActSeen | null>(null);
  const tell = useCallback((teller: string, bubbleId: number, told: ActTold | null): void => {
    if (told === null) {
      tellers.current.delete(teller);
    } else {
      tellers.current.set(teller, { bubbleId, told });
    }
    const [first] = tellers.current.values();
    const next =
      first === undefined
        ? null
        : {
            bubbleId: first.bubbleId,
            words: first.told.words,
            disabled: first.told.disabled,
            danger: first.told.danger,
            back: first.told.back?.label ?? null,
          };
    setSeen((last) => (same(last, next) ? last : next));
  }, []);
  const press = useCallback(() => {
    const [first] = tellers.current.values();
    first?.told.onPress();
  }, []);
  const stepBack = useCallback(() => {
    const [first] = tellers.current.values();
    first?.told.back?.onPress();
  }, []);
  return { seen, tell, press, stepBack };
}

export type TellAct = ActStage['tell'];

// A card tells its main button at each render, and takes it away when it has none, or is gone.
export function useTellAct(tell: TellAct | null, bubbleId: number, told: ActTold | null): void {
  const teller = useId();
  useEffect(() => {
    tell?.(teller, bubbleId, told);
  });
  useEffect(
    () => (): void => {
      tell?.(teller, bubbleId, null);
    },
    [tell, teller, bubbleId],
  );
}
