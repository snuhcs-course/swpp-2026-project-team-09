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
  // Asks for the answer to the conditions of the answer on screen when it is called, as `alter` changes them; it
  // replaces the one on screen. Without an answer on screen, or when `alter` gives the same conditions back, it does
  // nothing.
  change: (alter: (input: PlanInput) => PlanInput, by?: 'drag') => void;
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
  // The id of the conversation's last reply bubble, or null without one.
  replyId: number | null;
  source: AnswerReply | null;
  basisOpen: boolean;
  // What was shown before the last drag.
  kept: Shown | null;
  recalculating: boolean;
  // Counts the replies: an answer that comes for an earlier one is dropped.
  epoch: number;
}

function sayNothing(): void {
  // A holder that asks for no recalculation hears of no failure.
}

type SetStored = (update: (last: AnswerState) => AnswerState) => void;

const NO_RECALCULATION: Recalculation = { location: null, onFailed: sayNothing };

// A failure and the app's own bubble are no reply.
function lastReply(bubbles: readonly ChatBubble[]): ChatBubble | undefined {
  return bubbles.findLast(({ role, failure, own = false }) => role === 'assistant' && failure === null && !own);
}

function fresh(reply: ChatBubble | undefined, epoch: number): AnswerState {
  const source = reply?.answer ?? null;
  return {
    replyId: reply?.id ?? null,
    source,
    answer: source,
    index: 0,
    basisOpen: false,
    kept: null,
    recalculating: false,
    epoch,
  };
}

function withPlan(state: AnswerState, index: number): AnswerState {
  return index === state.index ? state : { ...state, index, basisOpen: false };
}

// After a drag the Plan with the id of the one on screen stays when the new answer has it, otherwise the first: the
// User moved the time of the Plan they look at. Any other change changed who eats or where from, and so the order.
function replaced(last: AnswerState, next: AnswerReply, by: 'drag' | undefined): AnswerState {
  const shownId = last.answer?.plans[last.index]?.id;
  const index = by === 'drag' ? Math.max(0, next.plans.findIndex(({ id }) => id === shownId)) : 0;
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

// Asks for a recalculation of the answer on screen when it is called, unless one of that epoch is on its way: a
// control may call a `change` of an earlier render. Its answer, or its failure, counts only while the epoch it was
// asked in is still the one on screen.
function useChange(current: AnswerState, setStored: SetStored, recalculation: Recalculation): ShownAnswer['change'] {
  const live = useRef({ current, recalculation });
  const flight = useRef<number | null>(null);
  useEffect(() => {
    live.current = { current, recalculation };
  });
  return (alter, by) => {
    const {
      current: { answer, epoch },
      recalculation: { location, onFailed },
    } = live.current;
    const input = answer === null ? null : alter(answer.input);
    if (input === null || input === answer?.input || flight.current === epoch) {
      return;
    }
    flight.current = epoch;
    setStored((last) => (last.epoch === epoch ? { ...last, recalculating: true } : last));
    const settle = (update: (last: AnswerState) => AnswerState): boolean => {
      if (flight.current === epoch) {
        flight.current = null;
      }
      const late = live.current.current.epoch !== epoch;
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
// the source: a new one, told by its bubble since a reply may bring the same object again, shows its first Plan with
// the basis closed and drops anything a recalculation brought. A recalculation's answer replaces the one on screen,
// unless a new reply came while it was on its way.
export function useShownAnswer(
  bubbles: readonly ChatBubble[],
  { location, onFailed }: Recalculation = NO_RECALCULATION,
): ShownAnswer {
  const reply = lastReply(bubbles);
  const [stored, setStored] = useState<AnswerState>(() => fresh(reply, 0));
  const current = stored.replyId === (reply?.id ?? null) ? stored : fresh(reply, stored.epoch + 1);
  if (current !== stored) {
    setStored(current);
  }
  const change = useChange(current, setStored, { location, onFailed });
  const browsing = useBrowsing(setStored);
  return {
    source: current.source,
    answer: current.answer,
    plan: current.answer?.plans[current.index] ?? null,
    index: current.index,
    ...browsing,
    basisOpen: current.basisOpen,
    recalculating: current.recalculating,
    change,
    ghost: ghostOf(current.kept),
  };
}
