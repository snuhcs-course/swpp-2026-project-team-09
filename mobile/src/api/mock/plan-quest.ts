/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan } from '@/api/assistant-types';
import type { BetterPlan, MakePlanQuest, PlanQuest } from '@/api/plan-quest-types';
import type { Person, Quest } from '@/api/types';
import { BETTER_PLAN } from './data/better-plan';
import { CHANGED_PLAN_QUEST } from './data/changed-plan-quest';
import { ME } from './data/frame';
import { EVENTS_ANSWER } from './data/events-answer';
import { PLAN_QUEST } from './data/plan-quest';
import { MEAL_ANSWER_ALONE } from './data/meal-answers';
import { takenAloneOf } from './data/taken-alone';
import { mealTakenAloneOf } from './data/taken-alone-meal';

// The Quests the mock made, which its list of Quests holds after its own, as the main server lists the Quests the
// User holds. Empty at each start.
let made: Quest[] = [];

// The stored reply's Quest as the main server makes it for the mock's User: the asker, who leads it, is its one Holder,
// and is accepted among its `members`, is the mock's User.
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
// An events Plan of the stored answer, or a meal's Plan for the User alone, is taken alone, as the main server takes
// it, and listed in place of the party.
export function mockPlanQuest(making?: MakePlanQuest): PlanQuest {
  const plan = making?.input.kind === 'events' ? EVENTS_ANSWER.plans.find(({ id }) => id === making.planId) : undefined;
  if (plan !== undefined) {
    const taken = takenAloneOf(plan, { ...ME });
    made = [taken.quest];
    return taken;
  }
  const meal = aloneMeal(making);
  if (meal !== undefined) {
    const taken = mealTakenAloneOf(meal, { ...ME });
    made = [taken.quest];
    return taken;
  }
  made = [madeByMe(PLAN_QUEST.quest)];
  return PLAN_QUEST;
}

// A meal's Plan of the stored answer for the User alone, by its id.
function aloneMeal(making?: MakePlanQuest): Plan | undefined {
  if (making?.input.kind !== 'meal' || making.input.people.length !== 1) {
    return undefined;
  }
  return MEAL_ANSWER_ALONE.plans.find(({ id }) => id === making.planId);
}

// "다시 고르기": a Quest the mock made ends.
export function forgetMadeQuest(questId: string): void {
  made = made.filter(({ id }) => id !== questId);
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
