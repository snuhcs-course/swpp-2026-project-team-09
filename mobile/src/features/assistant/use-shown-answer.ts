/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnswerReply, Plan, PlanInput } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { LatLng } from '@/api/types';
import type { Stretch } from './time-band';
import type { ChatBubble } from './use-chat';

export interface ShownAnswer {
  // The answer of the conversation's last reply, or null: the frame's card finds its bubble by it.
  source: AnswerReply | null;
  // The answer on screen: the source, or a recalculation that replaced it.
  answer: AnswerReply | null;
  // The Plan on screen: null for no answer and for an answer without a Plan.
  plan: Plan | null;
  index: number;
  // One Plan on or back, going round.
  browse: (step: 1 | -1) => void;
  show: (planId: string) => void;
  basisOpen: boolean;
  toggleBasis: () => void;
  // A recalculation is on its way: one runs at a time.
  recalculating: boolean;
  // Asks for the answer to changed conditions, which replaces the one on screen.
  change: (input: PlanInput, by?: 'drag') => void;
  // The band of the Plan shown before the last drag, while "되돌리기" can bring that answer back.
  ghost: Stretch | null;
  undo: () => void;
}

// Where the User is, which a recalculation sends, and what a failed one says.
export interface Recalculation {
  location: LatLng | null;
  onFailed: () => void;
}

interface Shown {
  answer: AnswerReply | null;
  index: number;
}

interface AnswerState extends Shown {
  source: AnswerReply | null;
  basisOpen: boolean;
  // What was shown before the last drag.
  kept: Shown | null;
  recalculating: boolean;
  // Counts the sources: an answer that comes for an earlier one is dropped.
  epoch: number;
}

function sayNothing(): void {
  // A holder that asks for no recalculation hears of no failure.
}

type SetStored = (update: (last: AnswerState) => AnswerState) => void;

const NO_RECALCULATION: Recalculation = { location: null, onFailed: sayNothing };

// A failure and the app's own bubble are no reply.
function sourceOf(bubbles: readonly ChatBubble[]): AnswerReply | null {
  const reply = bubbles.findLast(({ role, failure, own = false }) => role === 'assistant' && failure === null && !own);
  return reply?.answer ?? null;
}

function fresh(source: AnswerReply | null, epoch: number): AnswerState {
  return { source, answer: source, index: 0, basisOpen: false, kept: null, recalculating: false, epoch };
}

function withPlan(state: AnswerState, index: number): AnswerState {
  return index === state.index ? state : { ...state, index, basisOpen: false };
}

// The Plan with the id of the one on screen stays when the new answer has it, otherwise the first.
function replaced(last: AnswerState, next: AnswerReply, by: 'drag' | undefined): AnswerState {
  const shownId = last.answer?.plans[last.index]?.id;
  const index = Math.max(
    0,
    next.plans.findIndex(({ id }) => id === shownId),
  );
  const kept = by === 'drag' ? { answer: last.answer, index: last.index } : null;
  return { ...last, answer: next, index, basisOpen: false, kept, recalculating: false };
}

function ghostOf(kept: Shown | null): Stretch | null {
  const band = kept?.answer?.plans[kept.index]?.band;
  return band === undefined ? null : { startAt: band.startAt, endAt: band.endAt };
}

function useBrowsing(setStored: SetStored): {
  browse: ShownAnswer['browse'];
  show: ShownAnswer['show'];
  toggleBasis: ShownAnswer['toggleBasis'];
  undo: ShownAnswer['undo'];
} {
  const browse = useCallback(
    (step: 1 | -1): void => {
      setStored((last) => {
        const count = last.answer?.plans.length ?? 0;
        return count === 0 ? last : withPlan(last, (last.index + step + count) % count);
      });
    },
    [setStored],
  );
  const show = useCallback(
    (planId: string): void => {
      setStored((last) => {
        const index = last.answer?.plans.findIndex(({ id }) => id === planId) ?? -1;
        return index < 0 ? last : withPlan(last, index);
      });
    },
    [setStored],
  );
  const toggleBasis = useCallback((): void => {
    setStored((last) => ({ ...last, basisOpen: !last.basisOpen }));
  }, [setStored]);
  const undo = useCallback((): void => {
    setStored((last) =>
      last.kept === null || last.recalculating ? last : { ...last, ...last.kept, kept: null, basisOpen: false },
    );
  }, [setStored]);
  return { browse, show, toggleBasis, undo };
}

// Asks for a recalculation unless one of this epoch is on its way. Its answer, or its failure, counts only while the
// epoch it was asked in is still the one on screen.
function useChange(epoch: number, setStored: SetStored, { location, onFailed }: Recalculation): ShownAnswer['change'] {
  const live = useRef(epoch);
  const flight = useRef<number | null>(null);
  useEffect(() => {
    live.current = epoch;
  }, [epoch]);
  return (input, by) => {
    if (flight.current === epoch) {
      return;
    }
    flight.current = epoch;
    setStored((last) => ({ ...last, recalculating: true }));
    const settle = (update: (last: AnswerState) => AnswerState): boolean => {
      if (flight.current === epoch) {
        flight.current = null;
      }
      const late = live.current !== epoch;
      setStored((last) => (late || last.epoch !== epoch ? last : update(last)));
      return !late;
    };
    apiClient.recalculateAnswer(input, location).then(
      (next) => {
        settle((last) => replaced(last, next, by));
      },
      () => {
        if (settle((last) => ({ ...last, recalculating: false }))) {
          onFailed();
        }
      },
    );
  };
}

// The answer on screen and the Plan on screen, which the map and the card read. The conversation's last reply gives
// the source: a new one shows its first Plan with the basis closed and drops anything a recalculation brought. A
// recalculation's answer replaces the one on screen, unless the source changed while it was on its way.
export function useShownAnswer(
  bubbles: readonly ChatBubble[],
  { location, onFailed }: Recalculation = NO_RECALCULATION,
): ShownAnswer {
  const source = sourceOf(bubbles);
  const [stored, setStored] = useState<AnswerState>(() => fresh(source, 0));
  const current = stored.source === source ? stored : fresh(source, stored.epoch + 1);
  if (current !== stored) {
    setStored(current);
  }
  const change = useChange(current.epoch, setStored, { location, onFailed });
  return {
    source,
    answer: current.answer,
    plan: current.answer?.plans[current.index] ?? null,
    index: current.index,
    ...useBrowsing(setStored),
    basisOpen: current.basisOpen,
    recalculating: current.recalculating,
    change,
    ghost: ghostOf(current.kept),
  };
}
