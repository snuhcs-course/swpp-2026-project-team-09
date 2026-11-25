/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { AnswerReply, PlanInput } from '@/api/assistant-types';
import { pickedOf, toggled, withPicked } from './people-picking';

interface PickingState {
  answer: AnswerReply | null;
  adding: boolean;
  picked: readonly string[] | null;
}

interface Picking {
  setAdding: (open: boolean) => void;
  pick: (userId: string) => void;
  finishPicking: () => void;
}

// Picking people in the time card (P04 ticket 64) over the answer on screen's state: opened with the Plan's people
// checked, each press checking or unchecking one, and ended by 완료, which asks once (`change`), or by leaving, which
// changes nothing.
export function usePeoplePicking<S extends PickingState>(
  setStored: (update: (last: S) => S) => void,
  picked: readonly string[] | null,
  change: (alter: (input: PlanInput) => PlanInput) => void,
): Picking {
  const setAdding = useCallback(
    (open: boolean): void => {
      setStored((last) => {
        if (last.adding === open) {
          return last;
        }
        return { ...last, adding: open, picked: open && last.answer !== null ? pickedOf(last.answer.input) : null };
      });
    },
    [setStored],
  );
  const pick = useCallback(
    (userId: string): void => {
      setStored((last) => {
        const open = last.picked ?? (last.answer === null ? [] : pickedOf(last.answer.input));
        return {
          ...last,
          adding: true,
          picked: last.picked === null && open.includes(userId) ? open : toggled(open, userId),
        };
      });
    },
    [setStored],
  );
  const finishPicking = (): void => {
    if (picked !== null) {
      change((input) => withPicked(input, picked));
    }
    setStored((last) => ({ ...last, adding: false, picked: null }));
  };
  return { setAdding, pick, finishPicking };
}
