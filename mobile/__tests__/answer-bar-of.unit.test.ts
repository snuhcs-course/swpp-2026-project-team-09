/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { barOf } from '@/screens/main/answer/reply-words';

// Which turn's band the time bar draws (P04 ticket 01), over the stored answer to "배고파, 민수랑 같이" on screen.

function bubble(id: number, role: ChatBubble['role'], text: string, more: Partial<ChatBubble> = {}): ChatBubble {
  return { id, role, text, cards: [], mapButtons: [], proposal: null, failure: null, ...more };
}

const ON_SCREEN = {
  shown: { source: MEAL_ANSWER, answer: MEAL_ANSWER, plan: MEAL_ANSWER.plans[0] ?? null },
  lookup: { lookup: null },
  invitation: { made: null },
  howAbout: { place: null },
};

const ASKED = bubble(1, 'user', '배고파, 민수랑 같이');
const REPLY = bubble(2, 'assistant', '12:15에 302동식당에서 민수와 만나 먹어요.', { answer: MEAL_ANSWER });

describe('barOf', () => {
  it("draws the Plan's band of the turn on screen", () => {
    expect(barOf([ASKED, REPLY], ON_SCREEN)).toEqual({ kind: 'plan' });
  });

  it("keeps the answer's band while a follow-up's reply is on its way", () => {
    expect(barOf([ASKED, REPLY, bubble(3, 'user', '3시로')], ON_SCREEN)).toEqual({ kind: 'plan' });
  });

  it('draws none for a reply of words after it', () => {
    const words = bubble(4, 'assistant', '네, 알겠어요.');
    expect(barOf([ASKED, REPLY, bubble(3, 'user', '고마워'), words], ON_SCREEN)).toBeNull();
  });
});
