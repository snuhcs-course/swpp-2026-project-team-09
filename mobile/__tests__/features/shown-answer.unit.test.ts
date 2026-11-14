/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { type ShownAnswer, useShownAnswer } from '@/features/assistant/use-shown-answer';

// The answer on screen and the Plan on screen (P02 spec, "The answer on the map"), over the stored answers to
// "배고파, 민수랑 같이" (five Plans) and for three people.

function said(id: number, text: string): ChatBubble {
  return { id, role: 'user', text, cards: [], mapButtons: [], proposal: null, failure: null };
}

function replied(id: number, answer: AnswerReply | null): ChatBubble {
  return { id, role: 'assistant', text: '', cards: [], mapButtons: [], proposal: null, failure: null, answer };
}

function own(id: number): ChatBubble {
  return {
    id,
    role: 'assistant',
    text: '좌석 현황이에요.',
    cards: [],
    mapButtons: [],
    proposal: null,
    failure: null,
    own: true,
  };
}

async function hold(
  bubbles: readonly ChatBubble[],
): Promise<{ shown: () => ShownAnswer; rerender: (next: readonly ChatBubble[]) => Promise<void> }> {
  const { result, rerender } = await renderHook((given: readonly ChatBubble[]) => useShownAnswer(given), {
    initialProps: bubbles,
  });
  return {
    shown: () => result.current,
    rerender: async (next): Promise<void> => {
      await rerender(next);
    },
  };
}

const ASKED = said(1, '배고파, 민수랑 같이');

// Partitions: no turn; a turn waiting for its reply; a reply without an answer; a reply with an answer; the answer
// followed by the app's own bubble; a later turn with no answer.
describe('the answer on screen', () => {
  it('is none while nothing was said', async () => {
    const { shown } = await hold([]);

    expect(shown().answer).toBeNull();
    expect(shown().plan).toBeNull();
  });

  it('is none while the reply is on its way, and while the reply has no answer', async () => {
    const { shown, rerender } = await hold([ASKED]);
    expect(shown().answer).toBeNull();

    await rerender([ASKED, replied(2, null)]);

    expect(shown().answer).toBeNull();
  });

  it("is the reply's answer with its first Plan, and stays with the app's own bubble after it", async () => {
    const { shown, rerender } = await hold([ASKED, replied(2, MEAL_ANSWER)]);
    expect(shown().answer).toBe(MEAL_ANSWER);
    expect(shown().plan?.id).toBe('302동식당');

    await rerender([ASKED, replied(2, MEAL_ANSWER), own(3)]);

    expect(shown().answer).toBe(MEAL_ANSWER);
  });

  it('is none once the User asks again and the new reply has no answer', async () => {
    const { shown } = await hold([ASKED, replied(2, MEAL_ANSWER), said(3, '고마워'), replied(4, null)]);

    expect(shown().answer).toBeNull();
  });
});

// Partitions of the five Plans: one step forward, forward past the last, and back from the first. Expected Plans: the
// stored answer's order.
describe('the Plan on screen', () => {
  it('goes to the next Plan with a step forward', async () => {
    const { shown } = await hold([ASKED, replied(2, MEAL_ANSWER)]);

    await act(() => {
      shown().browse(1);
    });

    expect(shown().index).toBe(1);
    expect(shown().plan?.id).toBe('301동식당');
  });

  it('goes round: back from the first is the last, and forward from the last is the first', async () => {
    const { shown } = await hold([ASKED, replied(2, MEAL_ANSWER)]);

    await act(() => {
      shown().browse(-1);
    });
    expect(shown().index).toBe(4);

    await act(() => {
      shown().browse(1);
    });
    expect(shown().index).toBe(0);
  });
});

// Partitions: a Plan shown by its id, an id the answer does not hold, and a new answer.
describe('the Plan on screen, shown or replaced', () => {
  it('is the Plan of a candidate shown by its id, and stays for an id the answer does not hold', async () => {
    const { shown } = await hold([ASKED, replied(2, MEAL_ANSWER)]);

    await act(() => {
      shown().show('학생회관식당');
    });
    expect(shown().index).toBe(2);

    await act(() => {
      shown().show('없는 식당');
    });
    expect(shown().index).toBe(2);
  });

  it('is the first Plan of a new answer, and the basis is closed', async () => {
    const { shown, rerender } = await hold([ASKED, replied(2, MEAL_ANSWER)]);
    await act(() => {
      shown().browse(1);
      shown().toggleBasis();
    });
    expect(shown().basisOpen).toBe(true);

    await rerender([ASKED, replied(2, MEAL_ANSWER), said(3, '지은이도'), replied(4, MEAL_ANSWER_THREE)]);

    expect(shown().answer).toBe(MEAL_ANSWER_THREE);
    expect(shown().index).toBe(0);
    expect(shown().basisOpen).toBe(false);
  });
});

// Partitions: the basis opened, closed again, and closed by a change of the Plan on screen.
describe('the basis', () => {
  it('opens and closes', async () => {
    const { shown } = await hold([ASKED, replied(2, MEAL_ANSWER)]);
    expect(shown().basisOpen).toBe(false);

    await act(() => {
      shown().toggleBasis();
    });
    expect(shown().basisOpen).toBe(true);

    await act(() => {
      shown().toggleBasis();
    });
    expect(shown().basisOpen).toBe(false);
  });

  it('closes when the Plan on screen changes', async () => {
    const { shown } = await hold([ASKED, replied(2, MEAL_ANSWER)]);
    await act(() => {
      shown().toggleBasis();
    });

    await act(() => {
      shown().browse(1);
    });

    expect(shown().basisOpen).toBe(false);
  });
});
