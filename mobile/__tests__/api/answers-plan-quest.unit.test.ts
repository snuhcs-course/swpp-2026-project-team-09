/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The checks of the replies of a Plan made into a Quest and of a better Plan after a decline: the main server's real
// replies pass, and replies of another shape do not. Expected values: main-server `plans/dto/plan-quest.dto.ts` and
// `plans/dto/better-plan.dto.ts`.

import { BETTER_PLAN } from '@/api/mock/data/better-plan';
import { CHANGED_PLAN_QUEST } from '@/api/mock/data/changed-plan-quest';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { isBetterPlan, isPlanQuest } from '@/api/server/plan-quest-client';
import { isQuest } from '@/api/server/quest-answers';

describe('isPlanQuest', () => {
  it("accepts the main server's reply for lunch with 민수", () => {
    expect(isPlanQuest(PLAN_QUEST)).toBe(true);
  });

  it.each([
    ['without the Quest', { invitations: PLAN_QUEST.invitations }],
    ['with a Quest without its Sub Quests', { ...PLAN_QUEST, quest: { ...PLAN_QUEST.quest, subQuests: undefined } }],
    ['without the invitations', { quest: PLAN_QUEST.quest }],
    ['with an invitation without its User', { ...PLAN_QUEST, invitations: [{ id: 'invitation' }] }],
  ])('refuses a reply %s', (_, reply) => {
    expect(isPlanQuest(reply)).toBe(false);
  });
});

describe('isBetterPlan', () => {
  it("accepts the main server's reply after 지은 declined", () => {
    expect(isBetterPlan(BETTER_PLAN)).toBe(true);
  });

  it('accepts a reply for a Quest with no step to plan from', () => {
    expect(isBetterPlan({ current: null, better: null, input: null })).toBe(true);
  });

  it.each([
    ['without the better Plan', { current: BETTER_PLAN.current, input: BETTER_PLAN.input }],
    [
      'with a current step without its minutes',
      { ...BETTER_PLAN, current: { ...BETTER_PLAN.current, togetherMinutes: '28' } },
    ],
    ['with a better Plan without its Place', { ...BETTER_PLAN, better: { ...BETTER_PLAN.better, place: null } }],
    ['with an input without its people', { ...BETTER_PLAN, input: { ...BETTER_PLAN.input, people: undefined } }],
  ])('refuses a reply %s', (_, reply) => {
    expect(isBetterPlan(reply)).toBe(false);
  });
});

describe("the main server's Quest changed to the better Plan", () => {
  it('passes the check of a Quest', () => {
    expect(isQuest(CHANGED_PLAN_QUEST)).toBe(true);
  });
});
