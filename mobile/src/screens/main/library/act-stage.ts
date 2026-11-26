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

export interface ActTold {
  words: string;
  onPress: () => void;
  disabled: boolean;
  danger: boolean;
}

export interface ActSeen {
  bubbleId: number;
  words: string;
  disabled: boolean;
  danger: boolean;
}

export interface ActStage {
  seen: ActSeen | null;
  // `teller` keeps a card that is gone from taking away what another drawn in its place told.
  tell: (teller: string, bubbleId: number, told: ActTold | null) => void;
  press: () => void;
}

function ignore(): void {
  // Nothing told yet.
}

function same(one: ActSeen | null, other: ActSeen | null): boolean {
  return JSON.stringify(one) === JSON.stringify(other);
}

export function useActStage(): ActStage {
  const pressRef = useRef<{ teller: string | null; press: () => void }>({ teller: null, press: ignore });
  const [seen, setSeen] = useState<ActSeen | null>(null);
  const tell = useCallback((teller: string, bubbleId: number, told: ActTold | null): void => {
    if (told === null) {
      if (pressRef.current.teller === teller) {
        pressRef.current = { teller: null, press: ignore };
        setSeen(null);
      }
      return;
    }
    pressRef.current = { teller, press: told.onPress };
    const next = { bubbleId, words: told.words, disabled: told.disabled, danger: told.danger };
    setSeen((last) => (same(last, next) ? last : next));
  }, []);
  const press = useCallback(() => {
    pressRef.current.press();
  }, []);
  return { seen, tell, press };
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
