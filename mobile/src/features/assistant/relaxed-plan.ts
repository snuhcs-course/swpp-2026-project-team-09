/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ConditionChip, Plan, PlanInput } from '@/api/assistant-types';
import type { RelaxOffer } from '@/api/relax-types';
import { withBound, withoutPerson } from './plan-input';

// Conditions that cannot be met (P02-14): what the card's buttons and chips do to the conditions of a meal 지금 that
// nothing fits (board n11) and of one eased from it (n11b), each change recalculated as any other, without the model.

type Change = (input: PlanInput) => PlanInput;

// A meal 지금 whose start was eased to a time.
export function easedFromNow(input: PlanInput): boolean {
  return input.kind === 'meal' && input.window.now === true && input.window.from !== null;
}

// The conditions with the one condition a button of board n11 eases.
export function relaxed(input: PlanInput, offer: RelaxOffer): PlanInput {
  return offer.kind === 'without' ? withoutPerson(input, offer.userId) : withBound(input, 'from', offer.time);
}

// The conditions before the start was eased: 지금 again.
export function backToNow(input: PlanInput): PlanInput {
  return easedFromNow(input) ? withBound(input, 'from', null) : input;
}

// What a press on a time chip does: the relaxed chip of a plan eased from 지금 goes back to it, and the 지금 chip of an
// answer that nothing fits takes the later start its button offers. Null for a chip that focuses the band.
export function timeChipChange(chip: ConditionChip, answer: AnswerReply | null): Change | null {
  if (answer === null) {
    return null;
  }
  if (chip.mark === 'relaxed' && easedFromNow(answer.input)) {
    return backToNow;
  }
  const later = answer.noPlan?.relax?.find(({ kind }) => kind === 'from');
  return chip.kind === 'from' && later !== undefined ? (input) => relaxed(input, later) : null;
}

// The basis of a Plan with a Friend whose position is unknown opens at first (board n23).
export function opensBasis(plan: Plan | null | undefined): boolean {
  return plan?.parts.some(({ me, origin }) => !me && origin === null) ?? false;
}
