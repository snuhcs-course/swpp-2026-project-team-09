/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import type { ChatMessage, PlanInput, RequestContext } from '@/api/assistant-types';
import { mockClient } from '@/api/mock/client';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';

// The mock of the Assistant, where the app asks no main server: asked to eat together with what the app knew, it
// answers with the main server's real answer drawn on the map; anything else as it did before.

const HUNGRY: ChatMessage[] = [{ role: 'user', text: '배고파, 민수랑 같이' }];
const MENUS: ChatMessage[] = [{ role: 'user', text: '오늘 점심 뭐 나와?' }];

const CONTEXT: RequestContext = {
  location: { latitude: 37.45016, longitude: 126.95259 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the mock of an answer drawn on the map', () => {
  it("answers 배고파 with a context by the main server's reply", async () => {
    await expect(answered(mockClient.askAssistant(HUNGRY, CONTEXT))).resolves.toEqual(MEAL_ANSWER_REPLY);
  });

  it('answers 배고파 without a context as before, with no answer', async () => {
    const reply = await answered(mockClient.askAssistant(HUNGRY));

    expect(reply).toEqual({
      text: '데모에서는 오늘 메뉴와 셔틀, 행사, 파티만 답할 수 있어요. "오늘 점심 뭐 나와?"처럼 물어봐 주세요.',
      mapButtons: [],
      cards: [],
      proposal: null,
    });
  });

  it('answers another question with a context as it does without one', async () => {
    const withContext = await answered(mockClient.askAssistant(MENUS, CONTEXT));
    const without = await answered(mockClient.askAssistant(MENUS));

    expect(withContext).toEqual(without);
    expect(withContext).not.toHaveProperty('answer');
  });
});

describe('the mock of a recalculation', () => {
  it("answers with the main server's real answer, holding the input it was given", async () => {
    // The first copy's input with its date moved a day on, a field that chooses no other copy.
    const input: PlanInput = { ...MEAL_ANSWER.input, date: '2026-11-18' };

    await expect(answered(mockClient.recalculateAnswer(input, null))).resolves.toEqual({ ...MEAL_ANSWER, input });
  });

  it('answers a fixed start with the stored copy for a fixed start, holding the input it was given', async () => {
    const input: PlanInput = { ...MEAL_ANSWER.input, window: { from: '12:40', until: null } };

    await expect(answered(mockClient.recalculateAnswer(input, null))).resolves.toEqual({
      ...MEAL_ANSWER_FIXED_START,
      input,
    });
  });

  it('answers the User alone with the stored copy for the User alone', async () => {
    await expect(answered(mockClient.recalculateAnswer(MEAL_ANSWER_ALONE.input, null))).resolves.toEqual(
      MEAL_ANSWER_ALONE,
    );
  });
});
