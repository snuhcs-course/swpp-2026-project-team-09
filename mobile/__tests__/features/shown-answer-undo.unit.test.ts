/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_FIXED_START, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { offeredAnswer } from '@/features/assistant/meal-offered';
import { ANSWERED, change, heldBack, hold, replied, said } from '../support/shown-answer';

// What a drag keeps (P04 ticket 86): nothing when its answer has a Plan, whose band is dragged back; "되돌리기" when it
// has none, which leaves no band, back to the answer before it. Over the stored answer to "배고파, 민수랑 같이" and its
// fixed start, the latter emptied of Plans for the boundary.

jest.mock('@/api/client', () => ({ apiClient: { recalculateAnswer: jest.fn() } }));

const recalculate = jest.mocked(apiClient.recalculateAnswer);
const NO_PLAN: AnswerReply = {
  ...MEAL_ANSWER_FIXED_START,
  plans: [],
  noPlan: { reason: 'no-shared-time', lines: [[{ text: '같이 먹을 시간이 없어요', strong: false }]] },
};

beforeEach(() => {
  recalculate.mockReset();
});

async function dragged(to: AnswerReply): Promise<Awaited<ReturnType<typeof hold>>> {
  const reply = heldBack(recalculate);
  const held = await hold(ANSWERED);
  await change(held, MEAL_ANSWER_FIXED_START.input, 'drag');
  await reply.come(to);
  return held;
}

// Partitions: before any drag; a drag that brings a Plan; one that brings none, and its undo.
describe('a drag', () => {
  it('leaves nothing to undo before any drag', async () => {
    const held = await hold(ANSWERED);

    expect(held.shown().undo).toBeNull();
  });

  it('that brings a Plan keeps nothing to undo', async () => {
    const held = await dragged(MEAL_ANSWER_FIXED_START);

    expect(held.shown().answer).toBe(offeredAnswer(MEAL_ANSWER_FIXED_START));
    expect(held.shown().undo).toBeNull();
  });

  it('that brings no Plan is undone without a request: the answer and the Plan before it', async () => {
    const held = await dragged(NO_PLAN);

    await act(() => {
      held.shown().undo?.();
    });

    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().plan?.id).toBe('302동식당');
    expect(held.shown().undo).toBeNull();
    expect(recalculate).toHaveBeenCalledTimes(1);
  });
});

// Partitions: what drops 되돌리기 (another change, a new reply).
describe('되돌리기 of a drag that brought no Plan', () => {
  it('is dropped by a change that is no drag', async () => {
    const held = await dragged(NO_PLAN);
    const reply = heldBack(recalculate);

    await change(held, MEAL_ANSWER_THREE.input);
    await reply.come(MEAL_ANSWER_THREE);

    expect(held.shown().undo).toBeNull();
  });

  it("is dropped by a new reply's answer", async () => {
    const held = await dragged(NO_PLAN);

    await held.rerender([...ANSWERED, said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)]);

    expect(held.shown().undo).toBeNull();
  });
});
