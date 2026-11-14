/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import {
  MEAL_ANSWER_ALONE,
  MEAL_ANSWER_FIXED_START,
  MEAL_ANSWER_OTHER_ORIGIN,
  MEAL_ANSWER_THREE,
} from '@/api/mock/data/meal-answers';
import { ANSWERED, change, failed, HERE, heldBack, hold, replied, said } from '../support/shown-answer';

// The answer on screen once the card corrects it (P02 spec, "Correcting the answer"), with the API client stood in.
// The answers are the stored copies of the main server's replies: five Plans for "배고파, 민수랑 같이" (302동식당,
// 301동식당, 학생회관식당, 3식당, 자하연식당 2층), the User alone (301동식당 first, 학생회관식당 second), another
// starting Place (the same five in the same order), and a fixed start (no 302동식당).

jest.mock('@/api/client', () => ({ apiClient: { recalculateAnswer: jest.fn() } }));

const recalculate = jest.mocked(apiClient.recalculateAnswer);
const ALONE_INPUT = MEAL_ANSWER_ALONE.input;

beforeEach(() => {
  recalculate.mockReset();
});

// Partitions: the last reply with an answer; a follow-up waiting; a follow-up failed; a later reply with an answer;
// a later reply without one; no bubbles.
describe('the answer on screen, by the last reply', () => {
  it('stays while a follow-up waits for its reply, and after the follow-up failed', async () => {
    const held = await hold([...ANSWERED, said(3, '지은이도')]);
    expect(held.shown().answer).toBe(MEAL_ANSWER);

    await held.rerender([...ANSWERED, said(3, '지은이도'), failed(4)]);

    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().source).toBe(MEAL_ANSWER);
  });

  it("is a later reply's answer, and none for a later reply without one or no bubbles", async () => {
    const held = await hold([...ANSWERED, said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)]);
    expect(held.shown().answer).toBe(MEAL_ANSWER_THREE);

    await held.rerender([
      ...ANSWERED,
      said(3, '지은이도'),
      replied(4, MEAL_ANSWER_THREE),
      said(5, '고마워'),
      replied(6, null),
    ]);
    expect(held.shown().answer).toBeNull();

    await held.rerender([]);
    expect(held.shown().answer).toBeNull();
  });
});

// Partitions: a change that is no drag; the Plan on screen in the new answer or not.
describe('a recalculation', () => {
  it('sends the input and the location, and is recalculating until its answer comes', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);

    await change(held, ALONE_INPUT);

    expect(recalculate).toHaveBeenCalledWith(ALONE_INPUT, HERE);
    expect(held.shown().recalculating).toBe(true);
    await reply.come(MEAL_ANSWER_ALONE);
    expect(held.shown().recalculating).toBe(false);
    expect(held.shown().answer).toBe(MEAL_ANSWER_ALONE);
    expect(held.shown().source).toBe(MEAL_ANSWER);
  });

  it('shows the first Plan, also when the new answer has the one on screen', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await act(() => {
      held.shown().show('학생회관식당');
    });

    await change(held, ALONE_INPUT);
    await reply.come(MEAL_ANSWER_ALONE);

    expect(held.shown().index).toBe(0);
    expect(held.shown().plan?.id).toBe('301동식당');
  });
});

// Partitions: the Plan on screen in the drag's answer at another index, at the same index, or not in it.
describe('a recalculation after a drag', () => {
  it('keeps the Plan on screen when the new answer has it, and closes the basis', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await act(() => {
      held.shown().show('학생회관식당');
      held.shown().toggleBasis();
    });

    await change(held, ALONE_INPUT, 'drag');
    await reply.come(MEAL_ANSWER_ALONE);

    expect(held.shown().plan?.id).toBe('학생회관식당');
    expect(held.shown().index).toBe(1);
    expect(held.shown().basisOpen).toBe(false);
  });

  it('keeps the third Plan on screen in an answer from another starting Place', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await act(() => {
      held.shown().show('학생회관식당');
    });

    await change(held, MEAL_ANSWER_OTHER_ORIGIN.input, 'drag');
    await reply.come(MEAL_ANSWER_OTHER_ORIGIN);

    expect(held.shown().answer).toBe(MEAL_ANSWER_OTHER_ORIGIN);
    expect(held.shown().plan?.id).toBe('학생회관식당');
    expect(held.shown().index).toBe(2);
  });

  it('shows the first Plan when the new answer does not have the one on screen', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);

    await change(held, MEAL_ANSWER_FIXED_START.input, 'drag');
    await reply.come(MEAL_ANSWER_FIXED_START);

    expect(held.shown().index).toBe(0);
    expect(held.shown().plan?.id).toBe('학생회관식당');
  });
});

// Partitions: a second change while one is on its way; a failure.
describe('a recalculation that is not shown', () => {
  it('ignores a second change while the first is on its way', async () => {
    heldBack(recalculate);
    const held = await hold(ANSWERED);

    await change(held, ALONE_INPUT);
    await change(held, MEAL_ANSWER_THREE.input);

    expect(recalculate).toHaveBeenCalledTimes(1);
  });

  it('says it failed and leaves the answer, the Plan, and the basis as they were', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await act(() => {
      held.shown().browse(1);
      held.shown().toggleBasis();
    });

    await change(held, ALONE_INPUT);
    await reply.fail();

    expect(held.onFailed).toHaveBeenCalledTimes(1);
    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().index).toBe(1);
    expect(held.shown().basisOpen).toBe(true);
    expect(held.shown().recalculating).toBe(false);
  });
});

// Partitions: the conversation forgotten, and a new reply's answer, while a recalculation is on its way; its answer
// or its failure coming late.
describe('a late recalculation', () => {
  it('is dropped when the conversation was forgotten', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await change(held, ALONE_INPUT);

    await held.rerender([]);
    await reply.come(MEAL_ANSWER_ALONE);

    expect(held.shown().answer).toBeNull();
    expect(held.shown().recalculating).toBe(false);
  });

  it("is dropped when a new reply's answer came, and its failure says nothing", async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await change(held, ALONE_INPUT);

    await held.rerender([...ANSWERED, said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)]);
    await reply.fail();

    expect(held.shown().answer).toBe(MEAL_ANSWER_THREE);
    expect(held.shown().recalculating).toBe(false);
    expect(held.onFailed).not.toHaveBeenCalled();
  });
});
