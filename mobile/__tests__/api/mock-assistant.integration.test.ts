/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import type { ChatMessage, PlanInput, RequestContext } from '@/api/assistant-types';
import { mockClient } from '@/api/mock/client';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { FRIEND_LOOKUP_REPLY } from '@/api/mock/data/friend-lookup';
import { MENU_LOOKUP_REPLY } from '@/api/mock/data/menu-lookup';
import { FRIENDS } from '@/api/mock/data/friends';
import { STUDY_LOOKUP_REPLY } from '@/api/mock/data/study-lookup';
import { FRIEND_TAPS, TAP_LOOKUPS } from '@/api/mock/data/tap-lookups';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';

// The mock of the Assistant, where the app asks no main server: asked to eat together with what the app knew, it
// answers with the main server's real answer drawn on the map, and asked where a Place is, with its real Lookup;
// anything else as it did before.

const HUNGRY: ChatMessage[] = [{ role: 'user', text: '배고파, 민수랑 같이' }];
const MENUS: ChatMessage[] = [{ role: 'user', text: '오늘 점심 뭐 나와?' }];
const WHERE: ChatMessage[] = [{ role: 'user', text: '문화관이 어디야?' }];
const MENU: ChatMessage[] = [{ role: 'user', text: '오늘 301동식당 메뉴 뭐야?' }];
const FRIEND: ChatMessage[] = [{ role: 'user', text: '민수 어디야?' }];

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

  it("answers where a Place is with a context by the main server's Lookup", async () => {
    await expect(answered(mockClient.askAssistant(WHERE, CONTEXT))).resolves.toEqual(WAY_LOOKUP_REPLY);
  });

  it("answers 301동식당's menu with a context by the main server's Lookup", async () => {
    await expect(answered(mockClient.askAssistant(MENU, CONTEXT))).resolves.toEqual(MENU_LOOKUP_REPLY);
  });

  it("answers where 민수 is with a context by the main server's Lookup", async () => {
    await expect(answered(mockClient.askAssistant(FRIEND, CONTEXT))).resolves.toEqual(FRIEND_LOOKUP_REPLY);
  });

  it("answers a place to study near here with a context by the main server's Lookup of board a9", async () => {
    const near: ChatMessage[] = [{ role: 'user', text: '이 근처 조용히 공부할 곳' }];

    await expect(answered(mockClient.askAssistant(near, CONTEXT))).resolves.toEqual(STUDY_LOOKUP_REPLY);
  });

  it('answers where a Place is without a context as before, with no Lookup', async () => {
    await expect(answered(mockClient.askAssistant(WHERE))).resolves.not.toHaveProperty('lookup');
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

// The copy's Place of 302동, by the id it holds.
const PLACE_302 = TAP_LOOKUPS.a14.scene.places[0]?.place.placeId ?? '';

describe('the mock of a press on the map', () => {
  it("answers a building with the main server's card of it", async () => {
    await expect(answered(mockClient.answerTap({ kind: 'place', placeId: PLACE_302 }, null))).resolves.toEqual(
      TAP_LOOKUPS.a14,
    );
  });

  it.each(FRIENDS.map(({ id, name }) => [name, id]))("answers %s's face with the card of %s", async (name, userId) => {
    const card = await answered(mockClient.answerTap({ kind: 'friend', userId }, null));

    expect(card.card?.title).toBe(name);
    expect(card.actions).toEqual([{ kind: 'meet', userId }]);
  });

  it("answers a building or a Friend it holds no copy of with 학생회관's or 김민준's", async () => {
    await expect(answered(mockClient.answerTap({ kind: 'place', placeId: 'place-301' }, null))).resolves.toEqual(
      TAP_LOOKUPS.a1,
    );
    await expect(answered(mockClient.answerTap({ kind: 'friend', userId: 'pm1' }, null))).resolves.toEqual(
      FRIEND_TAPS.f1,
    );
  });
});
