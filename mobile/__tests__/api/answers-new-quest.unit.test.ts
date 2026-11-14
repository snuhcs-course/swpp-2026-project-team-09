/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// Partitions of the check of an answer of a new recruiting Quest: the stored copy of the main server's answer to the
// design's row 5, its input for a Global Event and for an activity, with and without a Board, a Plan with and without
// the Friends who could come, and those of the wrong shape. Expected values: main-server `assistant/dto/answer.dto.ts`
// and the design's section 6.4.

const [plan] = NEW_QUEST_ANSWER.plans;
const { input } = NEW_QUEST_ANSWER;

function withPlan(change: (shown: NonNullable<typeof plan>) => object): object {
  if (plan === undefined) {
    throw new Error('The copy has no plan');
  }
  return { ...NEW_QUEST_ANSWER, plans: [change(plan)] };
}

const withInput = (change: object): object => ({ ...NEW_QUEST_ANSWER, input: { ...input, ...change } });

describe('the stored copy of the real answer of a new recruiting Quest', () => {
  it('passes the check and holds badminton at 17:10 with 서준, the asker by shuttle', () => {
    expect(isAnswerReply(NEW_QUEST_ANSWER)).toBe(true);
    expect(input).toMatchObject({ kind: 'new-quest', title: '배드민턴', time: null, globalEventId: null });
    expect(plan?.startAt).toMatch(/T17:10:00\+09:00$/u);
    expect(plan?.parts.map(({ name, me }) => (me ? '나' : name))).toEqual(['나', '서준']);
    expect(plan?.parts[0]?.mode).toBe('shuttle');
    expect(plan?.subQuests.map(({ title }) => title)).toEqual(['유상, 서준: 체육관 앞에서 만나기', '배드민턴']);
    expect(plan?.candidates).toEqual([]);
  });
});

describe('the check of an answer of a new recruiting Quest', () => {
  it.each([
    ['a Global Event', withInput({ globalEventId: 'e1', title: null, placeId: null })],
    ['a time said', withInput({ time: '19:00' })],
    ['a Board', withInput({ board: 'career' })],
    [
      'a Friend who could come',
      withPlan((shown) => ({
        ...shown,
        candidates: [{ userId: 'u2', name: '지은', line: '지은 · 13:50 38동 수업 끝' }],
      })),
    ],
    ['a Plan without candidates', withPlan(({ candidates: _candidates, ...rest }) => rest)],
  ])('accepts %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });

  it.each([
    ['a Board that is no Board', withInput({ board: 'study' })],
    ['a time of a number', withInput({ time: 1900 })],
    ['no people', withInput({ people: null })],
    ['an input without its date', withInput({ date: undefined })],
    ['candidates that are no list', withPlan((shown) => ({ ...shown, candidates: '지은' }))],
    ['a candidate without a line', withPlan((shown) => ({ ...shown, candidates: [{ userId: 'u2', name: '지은' }] }))],
  ])('refuses %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});
