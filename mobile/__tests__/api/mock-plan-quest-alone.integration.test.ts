/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';

// The mock of "여기로" on a meal's Plan for the User alone (P05-14), where the app asks no main server: it answers as
// the main server does, a Quest held alone with the card's two lines, and lists it among the User's Quests.

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

function making(planId: string): Parameters<typeof mockClient.makePlanQuest>[0] {
  const plan = MEAL_ANSWER_ALONE.plans.find(({ id }) => id === planId);
  return { input: MEAL_ANSWER_ALONE.input, planId, startAt: plan?.startAt ?? '', location: null };
}

const words = (lines: readonly (readonly { text: string }[])[] | undefined): string[] =>
  (lines ?? []).map((line) => line.map(({ text }) => text).join(''));

// Partitions: the Plan where the User is, and one they walk to. Expected values: boards s4b and s4.
describe('the mock of a meal taken alone', () => {
  it('answers a Quest held alone with the lines of s4b, and lists it', async () => {
    const taken = await answered(mockClient.makePlanQuest(making('301동식당'), 'key'));
    const quests = await answered(mockClient.listQuests());

    expect(taken.quest).toMatchObject({ capacity: 1, joinPolicy: 'closed', globalEvent: null });
    expect(taken.invitations).toEqual([]);
    expect(words(taken.alone?.lines)).toEqual(['301동식당에서 먹어요', '12:45에 나설 시각을 알려 드릴게요']);
    expect(taken.alone?.remindAt).toBe('2026-11-17T03:45:00.000Z');
    expect(quests.some(({ id }) => id === taken.quest.id)).toBe(true);
  });

  it('says no leave-by is kept for the short walk on of s4', async () => {
    const taken = await answered(mockClient.makePlanQuest(making('학생회관식당'), 'key'));

    expect(words(taken.alone?.lines)).toEqual(['학생회관식당으로 가요', '수업까지 1분이라 나설 알림은 없어요']);
    expect(taken.alone?.remindAt).toBeNull();
  });
});
