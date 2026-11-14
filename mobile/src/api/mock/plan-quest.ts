/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanQuest } from '@/api/plan-quest-types';
import { PLAN_QUEST } from './data/plan-quest';

// A Plan made into a Quest without a main server: the mock does not calculate, so it answers with the stored copy of
// the main server's real reply, whatever Plan it is given.
export function mockPlanQuest(): PlanQuest {
  return PLAN_QUEST;
}
