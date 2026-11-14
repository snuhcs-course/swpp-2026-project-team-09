/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import type { AnswerReply, PlanInput } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { LatLng } from '@/api/types';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { type ShownAnswer, useShownAnswer } from '@/features/assistant/use-shown-answer';

// The answer on screen held over given bubbles, for the hook's own tests, with the API client stood in by the test.

export const HERE: LatLng = { latitude: 37.45016, longitude: 126.95259 };

export function said(id: number, text: string): ChatBubble {
  return { id, role: 'user', text, cards: [], mapButtons: [], proposal: null, failure: null };
}

export function replied(id: number, answer: AnswerReply | null): ChatBubble {
  return { id, role: 'assistant', text: '', cards: [], mapButtons: [], proposal: null, failure: null, answer };
}

export function failed(id: number): ChatBubble {
  return { id, role: 'assistant', text: '', cards: [], mapButtons: [], proposal: null, failure: 'unavailable' };
}

export const ANSWERED: readonly ChatBubble[] = [said(1, '배고파, 민수랑 같이'), replied(2, MEAL_ANSWER)];

export interface Held {
  shown: () => ShownAnswer;
  rerender: (next: readonly ChatBubble[]) => Promise<void>;
  onFailed: jest.Mock<void, []>;
}

export async function hold(bubbles: readonly ChatBubble[]): Promise<Held> {
  const onFailed = jest.fn<void, []>();
  const { result, rerender } = await renderHook(
    (given: readonly ChatBubble[]) => useShownAnswer(given, { location: HERE, onFailed }),
    { initialProps: bubbles },
  );
  return {
    shown: () => result.current,
    rerender: async (next): Promise<void> => {
      await rerender(next);
    },
    onFailed,
  };
}

type Recalculate = jest.MockedFunction<(input: PlanInput, location: LatLng | null) => Promise<AnswerReply>>;

// The next recalculation's reply, which the test lets come or fail when it chooses.
export function heldBack(recalculate: Recalculate): {
  come: (answer: AnswerReply) => Promise<void>;
  fail: () => Promise<void>;
} {
  let resolve: (answer: AnswerReply) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  recalculate.mockImplementationOnce(
    async () =>
      new Promise<AnswerReply>((given, refused) => {
        resolve = given;
        reject = refused;
      }),
  );
  return {
    come: async (answer): Promise<void> => {
      await act(async () => {
        resolve(answer);
        await Promise.resolve();
      });
    },
    fail: async (): Promise<void> => {
      await act(async () => {
        reject(new Error('refused'));
        await Promise.resolve();
      });
    },
  };
}

export async function change(held: Held, input: PlanInput, by?: 'drag'): Promise<void> {
  await act(() => {
    held.shown().change(input, by);
  });
}
