/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { BetterPlan, PlanQuest } from '@/api/plan-quest-types';
import type { Quest } from '@/api/types';
import { BETTER_PLAN } from './data/better-plan';
import { CHANGED_PLAN_QUEST } from './data/changed-plan-quest';
import { PLAN_QUEST } from './data/plan-quest';

// A Plan made into a Quest without a main server: the mock does not calculate, so it answers with the stored copy of
// the main server's real reply, whatever Plan it is given.
export function mockPlanQuest(): PlanQuest {
  return PLAN_QUEST;
}

// The better Plan after 지은 declined, and the Quest changed to it, from the stored copies of the main server's real
// replies, whatever Quest is asked about.
export function mockBetterPlan(): BetterPlan {
  return BETTER_PLAN;
}

export function mockChangedPlanQuest(): Quest {
  return CHANGED_PLAN_QUEST;
}
