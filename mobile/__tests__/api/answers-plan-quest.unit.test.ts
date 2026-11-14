/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The check of the reply to a Plan made into a Quest: the main server's real reply for lunch with 민수 passes, and a
// reply without its Quest, with a Quest of another shape, or with an invitation without its User does not. Expected
// values: main-server `plans/dto/plan-quest.dto.ts`.

import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { isPlanQuest } from '@/api/server/plan-quest-client';

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
