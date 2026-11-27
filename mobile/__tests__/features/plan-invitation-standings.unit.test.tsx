/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as InvitationAnswers from '@/live/invitation-answers';
import { type InvitationAnswer, tellInvitationAnswer } from '@/live/invitation-answers';
import { hold, MINSU, onScreen, pressed } from '../support/plan-invitation';
import { settle } from '../support/queries';

// How each invited Friend stands while the User looks at the Quest made from the Plan on screen (P02 spec, "How each
// Friend stands"), with the API client stood in. The reply is the stored one to POST /plans, with 민수 invited.

jest.mock('@/api/client', () => ({ apiClient: { makePlanQuest: jest.fn(), listQuests: jest.fn() } }));

// Each listener the hook gives is wrapped, so that a test can see whether a signal still reaches it.
const listeners: jest.Mock<void, [InvitationAnswer]>[] = [];
jest.mock('@/live/invitation-answers', () => {
  const actual = jest.requireActual<typeof InvitationAnswers>('@/live/invitation-answers');
  return {
    ...actual,
    onInvitationAnswer: (listener: (answer: InvitationAnswer) => void): (() => void) => {
      const wrapped = jest.fn(listener);
      listeners.push(wrapped);
      return actual.onInvitationAnswer(wrapped);
    },
  };
});

const QUEST_ID = PLAN_QUEST.quest.id;
const ASKER = { id: '11ca538e-e4ef-48d9-9a1f-b7160c553bee', name: '유상', department: '컴퓨터공학부' };

async function heard(name: string, payload: object): Promise<void> {
  await act(() => {
    tellInvitationAnswer(name, payload);
  });
}

beforeEach(() => {
  listeners.length = 0;
  jest.useFakeTimers();
  jest.mocked(apiClient.makePlanQuest).mockReset().mockResolvedValue(PLAN_QUEST);
  jest.mocked(apiClient.listQuests).mockReset().mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

// Partitions: a signal for this Quest; one for another Quest; one after the Quest was dropped. Expected values: the
// spec's rule that a signal naming the Quest and the User changes the state at once.
describe('a signal of an answer to an invitation', () => {
  it('for this Quest changes that Friend at once', async () => {
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    await heard('invitation-accepted', { questId: QUEST_ID, userId: MINSU });

    expect(held.invitation().standings).toEqual(new Map([[MINSU, { state: 'accepted', lateMinutes: null }]]));
  });

  it('for another Quest changes nothing', async () => {
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    await heard('invitation-declined', { questId: 'f0000000-0000-4000-8000-000000000000', userId: MINSU });

    expect(held.invitation().standings).toEqual(new Map([[MINSU, { state: 'invited', lateMinutes: null }]]));
  });

  it('is no longer heard once the Quest is dropped with the answer', async () => {
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);
    expect(listeners).not.toHaveLength(0);
    await held.rerender(onScreen(null, null));

    await heard('invitation-accepted', { questId: QUEST_ID, userId: MINSU });

    for (const listener of listeners) {
      expect(listener).not.toHaveBeenCalled();
    }
  });
});

// Partitions: the User's Quests without the Quest; with it and its members. Expected values: the spec's rule that the
// states follow the Quest's members whenever the Quests are read again.
describe("the Quest's members", () => {
  it("follow the User's Quests once they hold the Quest", async () => {
    // The stored Quest with the members a later read gives once 민수 accepted, and the parts the app adds to a Quest
    // it reads.
    jest.mocked(apiClient.listQuests).mockResolvedValue([
      {
        ...PLAN_QUEST.quest,
        faces: [],
        members: [
          { user: ASKER, state: 'accepted', lateMinutes: null },
          { user: { id: MINSU, name: '민수', department: '컴퓨터공학부' }, state: 'accepted', lateMinutes: null },
        ],
      },
    ]);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await settle();

    expect(held.invitation().standings).toEqual(new Map([[MINSU, { state: 'accepted', lateMinutes: null }]]));
  });

  it("leave every Friend invited while the User's Quests do not hold the Quest", async () => {
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await settle();

    expect(jest.mocked(apiClient.listQuests)).toHaveBeenCalled();
    expect(held.invitation().standings).toEqual(new Map([[MINSU, { state: 'invited', lateMinutes: null }]]));
  });
});
