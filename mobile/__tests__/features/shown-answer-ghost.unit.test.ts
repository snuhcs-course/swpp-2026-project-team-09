/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { ANSWERED, change, heldBack, hold, replied, said } from '../support/shown-answer';

// What a drag keeps (P02 spec, "After a drag"): the band of the Plan shown before it as a ghost, and "되돌리기",
// which brings that answer back. The first Plan of the stored answer to "배고파, 민수랑 같이" runs from 12:15 to
// 12:43; the fixed start's first Plan from 12:40 to 12:59.

jest.mock('@/api/client', () => ({ apiClient: { recalculateAnswer: jest.fn() } }));

const recalculate = jest.mocked(apiClient.recalculateAnswer);
const FIRST_BAND = { startAt: '2026-11-17T12:15:00+09:00', endAt: '2026-11-17T12:43:00+09:00' };
const FIXED_BAND = { startAt: '2026-11-17T12:40:00+09:00', endAt: '2026-11-17T12:59:00+09:00' };

beforeEach(() => {
  recalculate.mockReset();
});

async function dragged(): Promise<Awaited<ReturnType<typeof hold>>> {
  const reply = heldBack(recalculate);
  const held = await hold(ANSWERED);
  await change(held, MEAL_ANSWER_FIXED_START.input, 'drag');
  await reply.come(MEAL_ANSWER_FIXED_START);
  return held;
}

// Partitions: before any drag; after a drag; "되돌리기"; a second drag.
describe('a drag', () => {
  it('leaves no ghost before any drag', async () => {
    const held = await hold(ANSWERED);

    expect(held.shown().ghost).toBeNull();
  });

  it('keeps the band of the Plan shown before it as the ghost', async () => {
    const held = await dragged();

    expect(held.shown().answer).toBe(MEAL_ANSWER_FIXED_START);
    expect(held.shown().ghost).toEqual(FIRST_BAND);
  });

  it('is undone without a request: the answer and the Plan before it, and no ghost', async () => {
    const held = await dragged();

    await act(() => {
      held.shown().undo();
    });

    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().plan?.id).toBe('302동식당');
    expect(held.shown().ghost).toBeNull();
    expect(recalculate).toHaveBeenCalledTimes(1);
  });

  it('a second time keeps what the first one showed', async () => {
    const held = await dragged();
    const reply = heldBack(recalculate);

    await change(held, MEAL_ANSWER_ALONE.input, 'drag');
    await reply.come(MEAL_ANSWER_ALONE);

    expect(held.shown().ghost).toEqual(FIXED_BAND);
    await act(() => {
      held.shown().undo();
    });
    expect(held.shown().answer).toBe(MEAL_ANSWER_FIXED_START);
  });
});

// Partitions: what drops the ghost (another change, a new reply) and what keeps it (the arrows, a candidate shown, a
// failed recalculation).
describe('the ghost', () => {
  it('is dropped by a change that is no drag', async () => {
    const held = await dragged();
    const reply = heldBack(recalculate);

    await change(held, MEAL_ANSWER_THREE.input);
    await reply.come(MEAL_ANSWER_THREE);

    expect(held.shown().ghost).toBeNull();
  });

  it("is dropped by a new reply's answer", async () => {
    const held = await dragged();

    await held.rerender([...ANSWERED, said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)]);

    expect(held.shown().ghost).toBeNull();
  });

  it('stays through the arrows and a candidate shown', async () => {
    const held = await dragged();

    await act(() => {
      held.shown().browse(1);
      held.shown().show('학생회관식당');
    });

    expect(held.shown().ghost).toEqual(FIRST_BAND);
  });

  it('stays after a failed recalculation', async () => {
    const held = await dragged();
    const reply = heldBack(recalculate);

    await change(held, MEAL_ANSWER_ALONE.input, 'drag');
    await reply.fail();

    expect(held.shown().ghost).toEqual(FIRST_BAND);
    expect(held.shown().answer).toBe(MEAL_ANSWER_FIXED_START);
  });
});
