/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { offeredAnswer } from './meal-offered';
import { openedIndex } from './opened-menu';
import { newestOf, openedIfArrived } from './picking-on-arrival';
import { opensBasis } from './relaxed-plan';
import type { Stretch } from './time-band';
import type { ChatBubble } from './use-chat';

// The state of the answer on screen behind `useShownAnswer`, and its changes that need no hook: a new reply's, a Plan
// shown, and a recalculation's answer replacing the one on screen.

// A drag of a handle, or of the band's lanes, which moves it whole.
export type ChangeBy = 'drag' | 'move';

interface Shown {
  answer: AnswerReply | null;
  index: number;
}

export interface AnswerState extends Shown {
  // The id of the conversation's last reply bubble, or null without one.
  replyId: number | null;
  source: AnswerReply | null;
  basisOpen: boolean;
  adding: boolean;
  picked: readonly string[] | null;
  pickOrder: readonly string[] | null;
  asked: readonly string[] | null;
  // What was shown before the last drag.
  kept: Shown | null;
  recalculating: boolean;
  pendingAdd: string | null;
  moving: Stretch | null;
  // The Plan on screen's menu is open in the raised card; a new answer closes it.
  menu: boolean;
  // Counts the replies: an answer that comes for an earlier one is dropped.
  epoch: number;
  // The highest bubble id seen: a reply above it has just arrived (`openedIfArrived`).
  newest: number;
}

export type SetStored = (update: (last: AnswerState) => AnswerState) => void;

// A new reply's answer on screen: at its first Plan, at a menu question's Restaurant with its menu open (P04 ticket
// 72), or at the plan the reply chose in words, such as for a dish picked from the menus (P05 ticket 51).
function fresh(reply: ChatBubble | undefined, epoch: number): AnswerState {
  const given = reply?.answer ?? null;
  const source = given === null ? null : offeredAnswer(given);
  const opened = openedIndex(source);
  const chosen = source?.plans.findIndex(({ id }) => id === reply?.select) ?? -1;
  const index = Math.max(opened >= 0 ? opened : chosen, 0);
  return {
    replyId: reply?.id ?? null,
    source,
    answer: source,
    index,
    basisOpen: opensBasis(source?.plans[index]),
    adding: false,
    picked: null,
    pickOrder: null,
    asked: null,
    kept: null,
    recalculating: false,
    pendingAdd: null,
    moving: null,
    menu: opened >= 0,
    epoch,
    newest: reply?.id ?? 0,
  };
}

export function withPlan(state: AnswerState, index: number): AnswerState {
  return index === state.index ? state : { ...state, index, basisOpen: opensBasis(state.answer?.plans[index]) };
}

// After a drag of a handle the Plan with the id of the one on screen stays when the new answer has it, otherwise the
// first: the User moved the time of the Plan they look at. The band moved whole asked the server to plan again from a
// new start, and any other change changed who eats or where from, and so the order.
export function replaced(last: AnswerState, given: AnswerReply, by: ChangeBy | undefined): AnswerState {
  const next = offeredAnswer(given);
  const shownId = last.answer?.plans[last.index]?.id;
  const index =
    by === 'drag'
      ? Math.max(
          0,
          next.plans.findIndex(({ id }) => id === shownId),
        )
      : 0;
  const kept = by === undefined ? null : { answer: last.answer, index: last.index };
  const adding = last.adding && last.pendingAdd === null;
  // Picking ends with the list of Friends (P04 ticket 64), so that 취소, back, and the main button stay in step with it.
  const picking = adding ? { picked: last.picked, pickOrder: last.pickOrder } : { picked: null, pickOrder: null };
  const settled = { recalculating: false, pendingAdd: null, asked: null, moving: null, menu: false };
  return {
    ...last,
    answer: next,
    index,
    basisOpen: opensBasis(next.plans[index]),
    adding,
    ...picking,
    kept,
    ...settled,
  };
}

export function ghostOf(kept: Shown | null): Stretch | null {
  const band = kept?.answer?.plans[kept.index]?.band;
  return band === undefined ? null : { startAt: band.startAt, endAt: band.endAt };
}

// The state the hook starts with, the conversation's last reply shown as it is: it opens no picking by itself.
export function firstState(reply: ChatBubble | undefined, bubbles: readonly ChatBubble[]): AnswerState {
  return { ...fresh(reply, 0), newest: newestOf(bubbles) };
}

// A new reply on screen, which opens picking when it has just arrived and asks for it (P04 ticket 73).
export function arrivedState(
  reply: ChatBubble | undefined,
  last: AnswerState,
  bubbles: readonly ChatBubble[],
): AnswerState {
  return openedIfArrived(fresh(reply, last.epoch + 1), { replyId: reply?.id, seen: last.newest, bubbles });
}
