/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { BetterPlan, PlanQuest } from '@/api/plan-quest-types';
import type { Person, Quest } from '@/api/types';
import { BETTER_PLAN } from './data/better-plan';
import { CHANGED_PLAN_QUEST } from './data/changed-plan-quest';
import { ME } from './data/frame';
import { PLAN_QUEST } from './data/plan-quest';

// The Quests the mock made, which its list of Quests holds after its own, as the main server lists the Quests the
// User holds. Empty at each start.
let made: Quest[] = [];

// The stored reply's Quest as the main server makes it for the mock's User: the asker, who leads it and is its one
// Holder and accepted member, is the mock's User.
function madeByMe(quest: Quest): Quest {
  const asker = quest.leader?.id;
  const me = (person: Person): Person => (person.id === asker ? { ...ME } : person);
  return {
    ...quest,
    leader: { ...ME },
    holders: quest.holders.map(me),
    members: quest.members?.map((member) => ({ ...member, user: me(member.user) })),
  };
}

// A Plan made into a Quest without a main server: the mock does not calculate, so it answers with the stored copy of
// the main server's real reply, whatever Plan it is given, and lists that Quest among the User's from then on.
export function mockPlanQuest(): PlanQuest {
  made = [madeByMe(PLAN_QUEST.quest)];
  return PLAN_QUEST;
}

export function mockMadeQuests(): Quest[] {
  return made;
}

// For the tests: a new start of the app.
export function resetMockPlanQuests(): void {
  made = [];
}

// The better Plan after 지은 declined, and the Quest changed to it, from the stored copies of the main server's real
// replies, whatever Quest is asked about.
export function mockBetterPlan(): BetterPlan {
  return BETTER_PLAN;
}

export function mockChangedPlanQuest(): Quest {
  return CHANGED_PLAN_QUEST;
}
