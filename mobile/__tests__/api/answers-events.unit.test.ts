/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// Partitions of the check of an answer of a day's events: the stored copy of the main server's answer to the design's
// worked example, its input of each kind of eventIds, an input of an unknown kind, and the mode of a part and of a
// route. Expected values: main-server `assistant/dto/answer.dto.ts` and the design's section 6.3.

const [first, concert] = EVENTS_ANSWER.plans;

function withConcert(change: (plan: NonNullable<typeof concert>) => object): object {
  if (first === undefined || concert === undefined) {
    throw new Error('The copy has no second plan');
  }
  return { ...EVENTS_ANSWER, plans: [first, change(concert)] };
}

describe('the stored copy of the real answer of events', () => {
  it('passes the check and holds the job fair, the concert, and the company session in order', () => {
    expect(isAnswerReply(EVENTS_ANSWER)).toBe(true);
    expect(EVENTS_ANSWER.plans.map(({ title }) => title)).toEqual(['채용박람회', '동아리 정기공연', '기업 설명회']);
    expect(concert?.parts[0]?.mode).toBe('shuttle');
    expect(concert?.scene.routes[0]?.mode).toBe('shuttle');
  });
});

describe('the check of an answer of events', () => {
  it.each([
    ['eventIds given', { ...EVENTS_ANSWER, input: { kind: 'events', date: '2026-11-20', eventIds: ['e1'] } }],
    ['a walk said', withConcert((plan) => ({ ...plan, parts: plan.parts.map((part) => ({ ...part, mode: 'walk' })) }))],
  ])('accepts %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });

  it.each([
    [
      'an input of an unknown kind',
      { ...EVENTS_ANSWER, input: { kind: 'quests', date: '2026-11-20', eventIds: null } },
    ],
    ['eventIds that are no list', { ...EVENTS_ANSWER, input: { kind: 'events', date: '2026-11-20', eventIds: 'e1' } }],
    ['eventIds of numbers', { ...EVENTS_ANSWER, input: { kind: 'events', date: '2026-11-20', eventIds: [1] } }],
    ['an input without its date', { ...EVENTS_ANSWER, input: { kind: 'events', eventIds: null } }],
    [
      'a part by bus',
      withConcert((plan) => ({ ...plan, parts: plan.parts.map((part) => ({ ...part, mode: 'bus' })) })),
    ],
    [
      'a route by bus',
      withConcert((plan) => ({
        ...plan,
        scene: { ...plan.scene, routes: plan.scene.routes.map((route) => ({ ...route, mode: 'bus' })) },
      })),
    ],
  ])('refuses %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});
