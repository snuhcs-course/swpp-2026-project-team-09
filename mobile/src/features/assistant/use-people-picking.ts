/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { AnswerReply, PlanInput } from '@/api/assistant-types';
import { pickedOf, toggled, withPicked } from './people-picking';
import { hasPeople } from './plan-input';

interface PickingState {
  answer: AnswerReply | null;
  adding: boolean;
  picked: readonly string[] | null;
  // The rows' order, worked out as picking opened and kept until it ends (`openOrderOf`); null until it is.
  pickOrder: readonly string[] | null;
  recalculating: boolean;
}

// People are picked only in a Plan's time card, of a kind that takes people, and not while a new Plan is on its way:
// its people are not yet those of the answer on screen.
function pickableOf({ answer, recalculating }: PickingState): AnswerReply | null {
  return answer !== null && !recalculating && answer.plans.length > 0 && hasPeople(answer.input) ? answer : null;
}

interface Picking {
  setAdding: (open: boolean) => void;
  pick: (userId: string) => void;
  finishPicking: () => void;
  keepPickOrder: (order: readonly string[]) => void;
}

const NOT_PICKING = { adding: false, picked: null, pickOrder: null } as const;

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
        if (!open) {
          return last.adding || last.picked !== null ? { ...last, ...NOT_PICKING } : last;
        }
        const answer = pickableOf(last);
        return last.adding || answer === null
          ? last
          : { ...last, adding: true, picked: pickedOf(answer.input), pickOrder: null };
      });
    },
    [setStored],
  );
  const pick = useCallback(
    (userId: string): void => {
      setStored((last) => {
        const answer = pickableOf(last);
        if (answer === null) {
          return last;
        }
        const open = last.picked ?? pickedOf(answer.input);
        return {
          ...last,
          adding: true,
          picked: last.picked === null && open.includes(userId) ? open : toggled(open, userId),
          pickOrder: last.picked === null ? null : last.pickOrder,
        };
      });
    },
    [setStored],
  );
  const finishPicking = (): void => {
    if (picked !== null) {
      change((input) => withPicked(input, picked));
    }
    setStored((last) => ({ ...last, ...NOT_PICKING }));
  };
  return { setAdding, pick, finishPicking, keepPickOrder: useKeepPickOrder(setStored) };
}

// Keeps the rows' order once, as picking opens; a later order is not taken until picking opens again.
function useKeepPickOrder<S extends PickingState>(
  setStored: (update: (last: S) => S) => void,
): (order: readonly string[]) => void {
  return useCallback(
    (order: readonly string[]): void => {
      setStored((last) => (last.picked === null || last.pickOrder !== null ? last : { ...last, pickOrder: order }));
    },
    [setStored],
  );
}
