/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { SubQuest } from '@/api/types';

// Where each step of a Quest's plan stands, the one rule for the room's grey and orange, the walk's destination and the
// 파티 form's step (P06 ticket 19). A Holder's mark of done is no part of it.

// `past`: grey. `now`: the orange step, the first that is not grey. `later`: after it.
export type StepStand = 'past' | 'now' | 'later';

export interface StandingStep {
  subQuest: SubQuest;
  stand: StepStand;
}

function startOf({ startsAt }: SubQuest): number {
  return startsAt === null ? Number.POSITIVE_INFINITY : new Date(startsAt).getTime();
}

// By their start, those without one last.
export function inPlanOrder(subQuests: readonly SubQuest[]): SubQuest[] {
  return subQuests.toSorted((one, other) => startOf(one) - startOf(other));
}

// A cancelled step never starts, so it greys nothing before it.
function started(subQuest: SubQuest, at: number): boolean {
  return !subQuest.cancelled && startOf(subQuest) <= at;
}

function endPassed({ ended, endsAt }: SubQuest, at: number): boolean {
  return ended || (endsAt !== null && new Date(endsAt).getTime() <= at);
}

// Grey: cancelled, its end passed, or a later step has started. A last step without an end stays orange.
export function standingsOf(subQuests: readonly SubQuest[], now: Date): StandingStep[] {
  const at = now.getTime();
  const steps = inPlanOrder(subQuests);
  const lastStarted = steps.findLastIndex((subQuest) => started(subQuest, at));
  const grey = steps.map((subQuest, index) => subQuest.cancelled || endPassed(subQuest, at) || index < lastStarted);
  const orange = grey.indexOf(false);
  return steps.map((subQuest, index) => ({
    subQuest,
    stand: index === orange ? 'now' : grey[index] ? 'past' : 'later',
  }));
}

// The steps not grey yet, the orange one first.
export function stepsAhead(subQuests: readonly SubQuest[], now: Date): SubQuest[] {
  return standingsOf(subQuests, now).flatMap(({ subQuest, stand }) => (stand === 'past' ? [] : [subQuest]));
}
