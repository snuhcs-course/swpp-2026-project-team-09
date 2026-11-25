/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { ANSWERED, change, type Held, heldBack, hold, replied, said } from '../support/shown-answer';

// Picking people in the time card (P04 ticket 64) on the answer on screen's state, with the API client stood in. The
// answer is the stored copy for "배고파, 민수랑 같이": 나 and 김민수 in five Plans. 김태현 is a Friend outside it.

jest.mock('@/api/client', () => ({ apiClient: { recalculateAnswer: jest.fn() } }));

const recalculate = jest.mocked(apiClient.recalculateAnswer);
const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
const TAEHYUN = 'taehyun';

beforeEach(() => {
  recalculate.mockReset();
});

async function pressFace(held: Held, userId: string): Promise<void> {
  await act(() => {
    held.shown().pick(userId);
  });
}

// Partitions: a face pressed on a Plan of a meal; on an answer without a Plan; on a kind that takes nobody; while a
// recalculation is under way.
describe('a Friend’s face pressed while an answer is up', () => {
  it('opens picking on a meal’s Plan with the Plan’s Friends and that Friend checked', async () => {
    const held = await hold(ANSWERED);

    await pressFace(held, TAEHYUN);

    expect(held.shown()).toMatchObject({ adding: true, picked: [MINSU, TAEHYUN] });
  });

  it('opens nothing on an answer without a Plan, or of a kind that takes nobody', async () => {
    const noPlan = await hold([said(1, '배고파'), replied(2, { ...MEAL_ANSWER, plans: [] })]);
    const events = await hold([said(1, '행사'), replied(2, EVENTS_ANSWER)]);

    await pressFace(noPlan, TAEHYUN);
    await pressFace(events, TAEHYUN);

    expect(noPlan.shown()).toMatchObject({ adding: false, picked: null });
    expect(events.shown()).toMatchObject({ adding: false, picked: null });
  });

  it('opens nothing while a new Plan is on its way, whose people are not yet those on screen', async () => {
    heldBack(recalculate);
    const held = await hold(ANSWERED);
    await change(held, MEAL_ANSWER_ALONE.input);

    await pressFace(held, TAEHYUN);

    expect(held.shown()).toMatchObject({ recalculating: true, adding: false, picked: null });
  });
});

// Partitions: picking left by 취소; picking ended by a reply that ends the list of Friends.
describe('picking left', () => {
  it('by 취소 clears the checks', async () => {
    const held = await hold(ANSWERED);
    await pressFace(held, TAEHYUN);

    await act(() => {
      held.shown().setAdding(false);
    });

    expect(held.shown()).toMatchObject({ adding: false, picked: null });
  });

  it('by a reply that ends the list of Friends clears the checks with it', async () => {
    const reply = heldBack(recalculate);
    const held = await hold(ANSWERED);
    await pressFace(held, TAEHYUN);

    await act(() => {
      held.shown().add(TAEHYUN);
    });
    await reply.come(MEAL_ANSWER_THREE);

    expect(held.shown()).toMatchObject({ adding: false, picked: null });
  });
});
