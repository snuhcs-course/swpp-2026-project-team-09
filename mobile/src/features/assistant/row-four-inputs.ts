/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan, PlanInput } from '@/api/assistant-types';
import type { NewQuestInput, QuestsInput } from '@/api/recruiting-plan-types';
import { koreaDateKey } from '@/korea-time';

// The conditions the buttons of an events Plan and a party's Plan recalculate with, with no model. An events Plan's id
// is its Global Event's.

// "같이 갈 파티": the parties going to the events Plan's event.
export function partiesOf(plan: Plan): QuestsInput {
  return { kind: 'quests', globalEventId: plan.id, questIds: null };
}

// "새로 모집": a new party for the event of an events Plan, or of the parties of an event, with the asker alone and
// nothing said. Null for the parties of a search, whose activity only the Assistant knows, and for any other kind.
export function newPartyOf(input: PlanInput, plan: Plan): NewQuestInput | null {
  const asker = plan.parts.find(({ me }) => me)?.userId;
  if (asker === undefined) {
    return null;
  }
  const people = [{ userId: asker, constraints: [] }];
  const blank = { kind: 'new-quest', title: null, placeId: null, time: null, people } as const;
  if (input.kind === 'events') {
    return { ...blank, date: input.date, globalEventId: plan.id };
  }
  if (input.kind === 'quests' && input.globalEventId !== null) {
    return { ...blank, date: koreaDateKey(new Date(plan.startAt)), globalEventId: input.globalEventId };
  }
  return null;
}
