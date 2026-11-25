/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, Cuisine, MealInput, Plan } from '@/api/assistant-types';

// The kinds of food in the order chips of the same count stand in.
const KINDS: readonly Cuisine[] = ['한식', '중식', '일식', '양식', '분식'];

export interface KindChip {
  kind: Cuisine;
  // The candidates that serve it.
  places: number;
}

// Whether a Plan's menu holds a dish of that kind.
export function serves(plan: Plan, kind: Cuisine): boolean {
  return (plan.menu?.dishes ?? []).some(({ cuisine }) => cuisine === kind);
}

// The kinds of food the candidates' dishes hold, each with the count of places that serve it, the most served first
// (P04 ticket 16, board 24). A dish without a kind joins none. Fewer than two kinds choose nothing: none then.
export function kindChipsOf(plans: readonly Plan[]): KindChip[] {
  const chips = KINDS.map((kind) => ({ kind, places: plans.filter((plan) => serves(plan, kind)).length }))
    .filter(({ places }) => places > 0)
    .toSorted((one, other) => other.places - one.places);
  return chips.length < 2 ? [] : chips;
}

// The kind of food on screen: the meal conditions' `cuisine`, which the next message carries.
export function kindOn(answer: AnswerReply | null): Cuisine | null {
  return answer?.input.kind === 'meal' ? (answer.input.cuisine ?? null) : null;
}

// The kind on screen that the map draws: only one the User sees as a chip and can clear (`kindChipsOf`). A kind the
// main server kept from words though no candidate serves it ("중식으로"), or one asked of menus whose dishes have no
// kind, recedes nothing (review of PR 441).
export function kindShown(answer: AnswerReply | null): Cuisine | null {
  const kind = kindOn(answer);
  if (answer === null || kind === null) {
    return null;
  }
  return kindChipsOf(answer.plans).some((chip) => chip.kind === kind) ? kind : null;
}

// What is on screen: an answer and the index of its Plan.
export interface OnScreen {
  answer: AnswerReply | null;
  index: number;
}

function inputWith(input: MealInput, kind: Cuisine | null): MealInput {
  if (kind !== null) {
    return { ...input, cuisine: kind };
  }
  const { cuisine, ...rest } = input;
  return cuisine === undefined ? input : rest;
}

// The answer with a kind chosen on the phone, or none for null, with no turn to the model (P04 ticket 16). A pick
// without a dish of that kind gives way to the first candidate that has one, as a press on its tag would; clearing
// the kind leaves the pick where it is.
export function withKind({ answer, index }: OnScreen, kind: Cuisine | null): OnScreen {
  if (answer?.input.kind !== 'meal' || kindOn(answer) === kind) {
    return { answer, index };
  }
  const next = { ...answer, input: inputWith(answer.input, kind) };
  const plan = answer.plans[index];
  if (kind === null || plan === undefined || serves(plan, kind)) {
    return { answer: next, index };
  }
  const first = answer.plans.findIndex((one) => serves(one, kind));
  return { answer: next, index: first < 0 ? index : first };
}

// The Plan at `index` shown: a candidate without the kind on screen, pressed in its grey tag, clears the kind.
export function showing({ answer }: OnScreen, index: number): OnScreen {
  const kind = kindOn(answer);
  const plan = answer?.plans[index];
  if (answer === null || kind === null || plan === undefined || serves(plan, kind)) {
    return { answer, index };
  }
  return { answer: withKind({ answer, index }, null).answer, index };
}
