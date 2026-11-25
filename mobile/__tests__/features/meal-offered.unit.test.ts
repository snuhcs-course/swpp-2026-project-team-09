/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { crowdedMealAnswer, crowdedWithFriend } from '@/api/mock/data/crowded-meal';
import { FRIENDS } from '@/api/mock/data/friends';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { fadedPlan } from '@/features/assistant/answer-walks';
import { offeredAnswer } from '@/features/assistant/meal-offered';

// P04 ticket 71, the user's word of 2026-11-26 ("B로 진행해줘"): a meal answer offers only the places that can be done,
// in the list and on the map alike. Expected values: the crowded answer of 2026-10-07, asked on 10-06 at 13:00 UTC,
// whose 기숙사식당 cannot be done before the Class at 15:30, and the same answer with a Friend, which keeps 302동식당
// and drops the other ten.

const DATE = '2026-10-07';
const NOW = '2026-10-06T04:00:00Z';
const [FRIEND] = FRIENDS;

const labelsOf = (answer: AnswerReply): string[] => answer.plans.map(({ place }) => place.label);
const roles = (answer: AnswerReply): string[] =>
  answer.plans.flatMap(({ scene }) => scene.places.map(({ role, place }) => `${role}:${place.label}`));

// Partitions: a Plan that cannot be done; the Assistant's pick that cannot; places dropped; an answer of another kind.
describe('a meal answer as the app offers it', () => {
  it('leaves out a Plan that cannot be done in the time, from the Plans and from every Plan’s map', () => {
    const answer = crowdedMealAnswer(DATE, NOW);
    expect(labelsOf(answer)).toContain('기숙사식당 (관악사 919동)');

    const offered = offeredAnswer(answer);

    expect(labelsOf(offered)).not.toContain('기숙사식당 (관악사 919동)');
    expect(offered.plans.slice(1).some((plan) => fadedPlan(plan))).toBe(false);
    expect(roles(offered).filter((one) => one.endsWith(':기숙사식당 (관악사 919동)'))).toEqual([]);
    expect(offered.plans).toHaveLength(answer.plans.length - 1);
  });

  it('keeps the Assistant’s pick though it cannot be done', () => {
    const answer = crowdedMealAnswer(DATE, NOW);
    const late = answer.plans.find((plan) => fadedPlan(plan));
    const first: AnswerReply = {
      ...answer,
      plans: late === undefined ? [] : [late, ...answer.plans.filter((plan) => plan !== late)],
    };

    expect(labelsOf(offeredAnswer(first))[0]).toBe('기숙사식당 (관악사 919동)');
  });

  it('draws none of the places the main server dropped', () => {
    const answer = crowdedWithFriend(DATE, NOW, FRIEND?.id ?? '');
    expect(roles(answer).some((one) => one.startsWith('dropped:'))).toBe(true);

    expect(roles(offeredAnswer(answer)).some((one) => one.startsWith('dropped:'))).toBe(false);
    expect(offeredAnswer(answer).dropped).toEqual(answer.dropped);
  });

  it('leaves an answer of another kind as it came, a meet’s places dropped and all', () => {
    expect(offeredAnswer(MEET_ANSWER)).toBe(MEET_ANSWER);
  });
});
