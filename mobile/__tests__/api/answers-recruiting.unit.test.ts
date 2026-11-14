/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// Partitions of the check of an answer of recruiting Quests: the stored copy of the main server's answer to the
// design's row 5, its input of each kind, a Plan with and without its Quest, and a Quest or names of the wrong shape.
// Expected values: main-server `assistant/dto/answer.dto.ts` and the design's section 6.4.

const [plan] = QUESTS_ANSWER.plans;

function withPlan(change: (shown: NonNullable<typeof plan>) => object): object {
  if (plan === undefined) {
    throw new Error('The copy has no plan');
  }
  return { ...QUESTS_ANSWER, plans: [change(plan)] };
}

describe('the stored copy of the real answer of recruiting Quests', () => {
  it('passes the check and holds the 18:00 party by shuttle, and the 17:00 party dropped', () => {
    expect(isAnswerReply(QUESTS_ANSWER)).toBe(true);
    expect(plan?.lines.map((line) => line.map(({ text }) => text).join(''))).toEqual(['18:00 체육관 · 17:43에 나서요']);
    expect(plan?.parts[0]?.mode).toBe('shuttle');
    expect(plan?.quest?.holderCount).toBe(3);
    expect(plan?.friendNames).toEqual([]);
    expect(QUESTS_ANSWER.dropped.map(({ reason }) => reason)).toEqual(['17:00 파티는 17:02에야 도착해요']);
  });
});

describe('the check of an answer of recruiting Quests', () => {
  it.each([
    ['a Global Event', { ...QUESTS_ANSWER, input: { kind: 'quests', globalEventId: 'e1', questIds: null } }],
    ['a Plan without its Quest and names', withPlan(({ quest: _quest, friendNames: _names, ...rest }) => rest)],
    ['a Friend among the Holders', withPlan((shown) => ({ ...shown, friendNames: ['민수'] }))],
  ])('accepts %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });

  it.each([
    [
      'neither a Global Event nor Quests',
      { ...QUESTS_ANSWER, input: { kind: 'quests', globalEventId: null, questIds: null } },
    ],
    [
      'both a Global Event and Quests',
      { ...QUESTS_ANSWER, input: { kind: 'quests', globalEventId: 'e1', questIds: ['q1'] } },
    ],
    ['Quests that are no list', { ...QUESTS_ANSWER, input: { kind: 'quests', globalEventId: null, questIds: 'q1' } }],
    [
      'a Quest without its next step',
      withPlan((shown) => ({ ...shown, quest: { ...shown.quest, nextSubQuest: null } })),
    ],
    ['names that are no list', withPlan((shown) => ({ ...shown, friendNames: '민수' }))],
  ])('refuses %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});
