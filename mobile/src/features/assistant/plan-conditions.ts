/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { peopleOf } from './plan-input';

// What makes a Plan the one its request was sent for: its id, its day, its start, its place, and its people.
function conditionsOf(answer: AnswerReply, planId: string): string | null {
  const plan = answer.plans.find(({ id }) => id === planId);
  if (plan === undefined) {
    return null;
  }
  const { input } = answer;
  const day = 'date' in input ? input.date : null;
  const people = peopleOf(input).map(({ userId }) => userId);
  return JSON.stringify([plan.id, day, plan.startAt, plan.place.placeId, people]);
}

// Whether the Plan of that id stands the same in both answers, though the answer objects differ, as after a kind chip
// that changed nothing of it (P04 ticket 17): a request kept for it, its key included, still holds.
export function samePlanConditions(one: AnswerReply | null, other: AnswerReply | null, planId: string | null): boolean {
  if (one === null || other === null || planId === null) {
    return false;
  }
  const kept = conditionsOf(one, planId);
  return kept !== null && kept === conditionsOf(other, planId);
}
