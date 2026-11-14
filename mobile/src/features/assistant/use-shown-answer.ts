/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { AnswerReply, Plan } from '@/api/assistant-types';
import { turnOf } from './turn';
import type { ChatBubble } from './use-chat';

export interface ShownAnswer {
  // The answer of the latest bubble of the turn that has one, or null.
  answer: AnswerReply | null;
  // The Plan on screen: null for no answer and for an answer without a Plan.
  plan: Plan | null;
  index: number;
  // One Plan on or back, going round.
  browse: (step: 1 | -1) => void;
  show: (planId: string) => void;
  basisOpen: boolean;
  toggleBasis: () => void;
}

// The answer, the index of its Plan on screen, and whether that Plan's basis is open.
interface AnswerState {
  answer: AnswerReply | null;
  index: number;
  basisOpen: boolean;
}

function answerOf(bubbles: readonly ChatBubble[]): AnswerReply | null {
  return turnOf(bubbles)?.after.findLast(({ answer }) => answer !== undefined && answer !== null)?.answer ?? null;
}

function withPlan(state: AnswerState, index: number): AnswerState {
  return index === state.index ? state : { ...state, index, basisOpen: false };
}

// The answer on screen and the Plan on screen, which the map and the card read. A new answer shows its first Plan
// with the basis closed, and a change of the Plan closes the basis.
export function useShownAnswer(bubbles: readonly ChatBubble[]): ShownAnswer {
  const answer = answerOf(bubbles);
  const [stored, setStored] = useState<AnswerState>({ answer, index: 0, basisOpen: false });
  const current = stored.answer === answer ? stored : { answer, index: 0, basisOpen: false };
  if (current !== stored) {
    setStored(current);
  }
  const browse = useCallback((step: 1 | -1): void => {
    setStored((last) => {
      const count = last.answer?.plans.length ?? 0;
      return count === 0 ? last : withPlan(last, (last.index + step + count) % count);
    });
  }, []);
  const show = useCallback((planId: string): void => {
    setStored((last) => {
      const index = last.answer?.plans.findIndex(({ id }) => id === planId) ?? -1;
      return index < 0 ? last : withPlan(last, index);
    });
  }, []);
  const toggleBasis = useCallback((): void => {
    setStored((last) => ({ ...last, basisOpen: !last.basisOpen }));
  }, []);
  return {
    answer,
    plan: answer?.plans[current.index] ?? null,
    index: current.index,
    browse,
    show,
    basisOpen: current.basisOpen,
    toggleBasis,
  };
}
