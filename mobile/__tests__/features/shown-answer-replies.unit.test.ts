/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { withoutPerson } from '@/features/assistant/plan-input';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { ANSWERED, change, failed, HERE, heldBack, hold, replied, said } from '../support/shown-answer';

// A new reply is told by its bubble, not by its answer's object (P02 spec, "Correcting the answer"): the mock, or a
// cache, may answer a follow-up with the same object as before; and a change works on the answer on screen when it
// is called, not when its control was drawn. The answers are the stored copies of the main
// server's replies to "배고파, 민수랑 같이" (302동식당 first), for the User alone, for three (지은 third), and for a fixed start.

jest.mock('@/api/client', () => ({ apiClient: { recalculateAnswer: jest.fn() } }));

const recalculate = jest.mocked(apiClient.recalculateAnswer);
// A follow-up answered with the very object of the first reply.
const ANSWERED_AGAIN: readonly ChatBubble[] = [...ANSWERED, said(3, '다시 찾아줘'), replied(4, MEAL_ANSWER)];

function own(id: number): ChatBubble {
  return { id, role: 'assistant', text: '좌석 현황이에요.', cards: [], mapButtons: [], proposal: null, failure: null, own: true };
}

beforeEach(() => {
  recalculate.mockReset();
});

// Partitions: a later reply with the same answer object after a recalculation and a drag; a recalculation on its way
// when it comes; the app's own bubble and a failure after the reply.
describe('a new reply with the same answer object', () => {
  it('replaces the recalculated answer: its first Plan, the basis closed, and no ghost', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await change(held, MEAL_ANSWER_FIXED_START.input, 'drag');
    await reply.come(MEAL_ANSWER_FIXED_START);
    await act(() => {
      held.shown().toggleBasis();
    });

    await held.rerender(ANSWERED_AGAIN);

    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().index).toBe(0);
    expect(held.shown().basisOpen).toBe(false);
    expect(held.shown().ghost).toBeNull();
  });

  it('drops a recalculation that was on its way', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await change(held, MEAL_ANSWER_ALONE.input);

    await held.rerender(ANSWERED_AGAIN);
    await reply.come(MEAL_ANSWER_ALONE);

    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().recalculating).toBe(false);
  });

  it("is not the app's own bubble nor a failure, which leave the recalculated answer", async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await change(held, MEAL_ANSWER_ALONE.input);
    await reply.come(MEAL_ANSWER_ALONE);

    await held.rerender([...ANSWERED, own(3)]);
    expect(held.shown().answer).toBe(MEAL_ANSWER_ALONE);

    await held.rerender([...ANSWERED, own(3), said(4, '다시 찾아줘'), failed(5)]);
    expect(held.shown().answer).toBe(MEAL_ANSWER_ALONE);
  });
});

// Partitions: a change kept from an earlier render and called after a new reply; one that changes nothing; one with
// no answer on screen.
describe('a change', () => {
  it("kept from before a new reply changes the new reply's conditions, and ends recalculating", async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    const kept = held.shown().change;
    const third = [...ANSWERED, said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)];
    await held.rerender(third);
    const jiEun = MEAL_ANSWER_THREE.input.people[2]?.userId ?? '';

    await act(() => {
      kept((input) => withoutPerson(input, jiEun));
    });
    expect(recalculate).toHaveBeenCalledWith(withoutPerson(MEAL_ANSWER_THREE.input, jiEun), HERE);
    expect(held.shown().recalculating).toBe(true);
    await reply.come(MEAL_ANSWER);

    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().recalculating).toBe(false);
  });

  it('asks for nothing when it gives the same conditions back', async () => {
    const held = await hold(ANSWERED);

    await act(() => {
      held.shown().change((input) => input);
    });

    expect(recalculate).not.toHaveBeenCalled();
    expect(held.shown().recalculating).toBe(false);
  });

  it('asks for nothing without an answer on screen', async () => {
    const held = await hold([said(1, '고마워'), replied(2, null)]);

    await change(held, MEAL_ANSWER.input);

    expect(recalculate).not.toHaveBeenCalled();
    expect(held.shown().recalculating).toBe(false);
  });
});
