/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import type { PlanInput } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type { Stretch } from '@/features/assistant/time-band';
import { ANSWERED, type Held, heldBack, hold, replied, said } from '../support/shown-answer';

// The band moved whole (P02 ticket 25): where it is drawn while its body is dragged and until the recalculation it
// asked for ends, and the answer that comes, whose first Plan is shown. Over the stored answer to "배고파, 민수랑
// 같이": its first Plan, 302동식당, runs from 12:15 to 12:43, its second, 301동식당, from 12:18 to 12:45.

jest.mock('@/api/client', () => ({ apiClient: { recalculateAnswer: jest.fn() } }));

const recalculate = jest.mocked(apiClient.recalculateAnswer);
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const MOVED: Stretch = { startAt: at('12:25'), endAt: at('12:53') };
// The conditions a band let go at 12:25 asks with.
const FROM_1225: PlanInput = { ...MEAL_ANSWER.input, window: { from: '12:25', until: null } };

beforeEach(() => {
  recalculate.mockReset();
});

async function moveTo(held: Held, to: Stretch | null): Promise<void> {
  await act(() => {
    held.shown().setMoving(to);
  });
}

async function letGo(held: Held, alter: (input: PlanInput) => PlanInput): Promise<void> {
  await act(() => {
    held.shown().change(alter, 'move');
  });
}

// The band of the second Plan moved to 12:25 and let go, with its reply held back: the stored answer again, as a new
// object, as every answer of the server is, so that it holds 301동식당 too.
async function movedFromSecond(): Promise<{ held: Held; come: () => Promise<void>; fail: () => Promise<void> }> {
  const reply = heldBack(recalculate);
  const held = await hold(ANSWERED);
  await act(() => {
    held.shown().browse(1);
  });
  await moveTo(held, MOVED);
  await letGo(held, () => FROM_1225);
  return { held, come: () => reply.come({ ...MEAL_ANSWER }), fail: reply.fail };
}

// Partitions: before any drag; while dragged; put back; let go, while the recalculation is on its way.
describe('the band moved whole', () => {
  it('is drawn nowhere before any drag', async () => {
    const held = await hold(ANSWERED);

    expect(held.shown().moving).toBeNull();
  });

  it('is drawn where its body is dragged, and put back', async () => {
    const held = await hold(ANSWERED);

    await moveTo(held, MOVED);
    expect(held.shown().moving).toEqual(MOVED);

    await moveTo(held, null);
    expect(held.shown().moving).toBeNull();
  });

  it('stays where it was let go while the recalculation is on its way', async () => {
    heldBack(recalculate);
    const held = await hold(ANSWERED);
    await moveTo(held, MOVED);

    await letGo(held, () => FROM_1225);

    expect(recalculate).toHaveBeenCalledWith(FROM_1225, expect.anything(), null);
    expect(held.shown().recalculating).toBe(true);
    expect(held.shown().moving).toEqual(MOVED);
  });
});

// Partitions: the answer that comes, though it holds the Plan shown; a failure.
describe('the answer to a band moved whole', () => {
  it("shows its first Plan and draws the band's own place, keeping nothing to undo: it is moved back (P04 ticket 86)", async () => {
    const { held, come } = await movedFromSecond();

    await come();

    expect(held.shown().plan?.id).toBe('302동식당');
    expect(held.shown().moving).toBeNull();
    expect(held.shown().undo).toBeNull();
  });

  it('puts the band back, and keeps the answer and its Plan, when the recalculation fails', async () => {
    const { held, fail } = await movedFromSecond();

    await fail();

    expect(held.shown().moving).toBeNull();
    expect(held.shown().answer).toBe(MEAL_ANSWER);
    expect(held.shown().plan?.id).toBe('301동식당');
  });
});

// Partitions: a change that asks nothing; a new reply.
describe('a band moved whole without its answer', () => {
  it('puts the band back when the change asks nothing', async () => {
    const held = await hold(ANSWERED);
    await moveTo(held, MOVED);

    await letGo(held, (input) => input);

    expect(recalculate).not.toHaveBeenCalled();
    expect(held.shown().moving).toBeNull();
  });

  it("puts the band back for a new reply's answer", async () => {
    const held = await hold(ANSWERED);
    await moveTo(held, MOVED);

    await held.rerender([...ANSWERED, said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)]);

    expect(held.shown().moving).toBeNull();
  });
});
