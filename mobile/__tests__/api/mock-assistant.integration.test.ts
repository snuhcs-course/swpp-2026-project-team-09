/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import type { ChatMessage, PlanInput, RequestContext } from '@/api/assistant-types';
import { mockClient } from '@/api/mock/client';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { FRIEND_LOOKUP_REPLY } from '@/api/mock/data/friend-lookup';
import { MENU_ANSWER_REPLY, MENU_CLOSED_REPLY } from '@/api/mock/data/menu-answer';
import { FRIENDS } from '@/api/mock/data/friends';
import { STUDY_LOOKUP_REPLY } from '@/api/mock/data/study-lookup';
import { FRIEND_TAPS, TAP_LOOKUPS } from '@/api/mock/data/tap-lookups';
import { WAY_LOOKUP_REPLY } from '@/api/mock/data/way-lookup';
import { LATE_LOOKUP_REPLY, LEAVE_LOOKUP_REPLY, SHUTTLE_LOOKUP_REPLY } from '@/api/mock/data/way-lookups';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START } from '@/api/mock/data/meal-answers';
import { replyWithOtherFriends, withOtherFriends } from '@/api/mock/other-friends';

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
    await expect(answered(mockClient.askAssistant(HUNGRY, CONTEXT))).resolves.toEqual(
      replyWithOtherFriends(MEAL_ANSWER_REPLY),
    );
  });

  it("answers where a Place is with a context by the main server's Lookup", async () => {
    await expect(answered(mockClient.askAssistant(WHERE, CONTEXT))).resolves.toEqual(WAY_LOOKUP_REPLY);
  });

  // P04 ticket 72: a menu question is the meal answer opened at the Restaurant, or, closed, the Restaurant's menu view.
  it("answers 301동식당's menu with a context by the meal answer opened at it", async () => {
    await expect(answered(mockClient.askAssistant(MENU, CONTEXT))).resolves.toEqual(
      replyWithOtherFriends(MENU_ANSWER_REPLY),
    );
  });

  it("answers 학생회관식당's menu on its holiday by its menu view with why", async () => {
    const closed: ChatMessage[] = [{ role: 'user', text: '학생회관식당 메뉴 뭐야?' }];

    await expect(answered(mockClient.askAssistant(closed, CONTEXT))).resolves.toEqual(MENU_CLOSED_REPLY);
  });

  it("answers where 민수 is with a context by the main server's Lookup", async () => {
    await expect(answered(mockClient.askAssistant(FRIEND, CONTEXT))).resolves.toEqual(FRIEND_LOOKUP_REPLY);
  });

  it("answers a place to study near here with a context by the main server's Lookup of board a9", async () => {
    const near: ChatMessage[] = [{ role: 'user', text: '이 근처 조용히 공부할 곳' }];

    await expect(answered(mockClient.askAssistant(near, CONTEXT))).resolves.toEqual(STUDY_LOOKUP_REPLY);
  });

  it.each([
    ['24동까지 몇 분?', LEAVE_LOOKUP_REPLY],
    ['24동까지 몇 분? 늦나', LATE_LOOKUP_REPLY],
    ['셔틀 탈까 걸을까', SHUTTLE_LOOKUP_REPLY],
  ])("answers %s with a context by the main server's Lookup", async (text, reply) => {
    await expect(answered(mockClient.askAssistant([{ role: 'user', text }], CONTEXT))).resolves.toEqual(reply);
  });
});

describe('the mock of a question answered with nothing drawn', () => {
  it('answers another question with no answer', async () => {
    await expect(answered(mockClient.askAssistant(MENUS, CONTEXT))).resolves.not.toHaveProperty('answer');
  });
});

describe('the mock of a recalculation', () => {
  it("answers with the main server's real answer, holding the input it was given", async () => {
    // The first copy's input with its date moved a day on, a field that chooses no other copy.
    const input: PlanInput = { ...MEAL_ANSWER.input, date: '2026-11-18' };

    await expect(answered(mockClient.recalculateAnswer(input, null))).resolves.toEqual(
      withOtherFriends({ ...MEAL_ANSWER, input }),
    );
  });

  it('answers a fixed start with the stored copy for a fixed start, holding the input it was given', async () => {
    const input: PlanInput = { ...MEAL_ANSWER.input, window: { from: '12:40', until: null } };

    await expect(answered(mockClient.recalculateAnswer(input, null))).resolves.toEqual(
      withOtherFriends({ ...MEAL_ANSWER_FIXED_START, input }),
    );
  });

  it('answers the User alone with the stored copy for the User alone', async () => {
    await expect(answered(mockClient.recalculateAnswer(MEAL_ANSWER_ALONE.input, null))).resolves.toEqual(
      withOtherFriends(MEAL_ANSWER_ALONE),
    );
  });
});

// Partitions: the Friends of a meal's band, with a place and without; one of them picked. Expected values: the mock's
// Friends, 서지우 (f11) with no place, and 김민준 (f1) picked (P04 ticket 64).
describe('the mock of the other Friends on a band', () => {
  it('adds the mock’s Friends not in the conditions, each with a walk or none', async () => {
    const reply = await answered(mockClient.askAssistant(HUNGRY, CONTEXT));
    const others = reply.answer?.plans[0]?.band.others ?? [];

    expect(others.map(({ name }) => name)).toEqual(FRIENDS.map(({ name }) => name));
    expect(others.find(({ userId }) => userId === 'f11')?.walkMinutes).toBeNull();
    expect(others.find(({ userId }) => userId === 'f1')?.walkMinutes).toBeGreaterThan(0);
  });

  it('puts a picked Friend in the recalculated Plan’s lanes and chips, out of its others', async () => {
    const people = [...MEAL_ANSWER.input.people, { userId: 'f1', constraints: [] }];
    const answer = await answered(mockClient.recalculateAnswer({ ...MEAL_ANSWER.input, people }, null));
    const band = answer.plans[0]?.band;

    expect(band?.lanes.map(({ userId }) => userId)).toContain('f1');
    expect(band?.others?.some(({ userId }) => userId === 'f1')).toBe(false);
    expect(answer.chips).toContainEqual({ kind: 'person', text: '김민준', userId: 'f1' });
  });
});

// Partitions: words near those of a way that ask something else. Expected values: the mock's replies without a
// context, and the boards' words of a way (q2 to q4).
describe('the mock of a question that is no way', () => {
  it('answers when the shuttle comes with a context by the shuttle layer, as without one', async () => {
    const reply = await answered(mockClient.askAssistant([{ role: 'user', text: '셔틀 몇 분 뒤에 와?' }], CONTEXT));

    expect(reply).toEqual({
      text: '셔틀이 어디 있는지 지도에서 볼 수 있어요.',
      mapButtons: ['shuttle'],
      cards: [],
      proposal: null,
    });
  });

  it('answers a question that says 늦게 of no way with no Lookup', async () => {
    const asked = mockClient.askAssistant([{ role: 'user', text: '늦게까지 여는 식당?' }], CONTEXT);

    await expect(answered(asked)).resolves.not.toHaveProperty('lookup');
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
