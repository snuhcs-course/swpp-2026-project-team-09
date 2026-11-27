/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { ChatBubble } from '@/features/assistant/use-chat';
import { contextAt } from '@/screens/main/use-context-chat';

// What a request of this app tells of the steps on screen while it does not say `answers` (P03 ticket 20): nothing, so
// that a main server before P05 tickets 73 and 74 never refuses it. An app that says it is checked against the fake
// main server (`answer-steps-context.integration`).

const LUNCH: AnswerReply = { ...MEAL_ANSWER, key: 'lunch' };
const DINNER: AnswerReply = { ...MEAL_ANSWER, input: { ...MEAL_ANSWER.input, meal: 'dinner' }, key: 'dinner' };

const stepOf = (key: string): ReplyStep => ({
  kind: 'meal',
  title: key,
  place: null,
  from: null,
  startAt: null,
  endAt: null,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

const REPLY: ChatBubble = {
  id: 2,
  role: 'assistant',
  text: '점심과 저녁을 짰어요.',
  cards: [],
  mapButtons: [],
  proposal: null,
  failure: null,
  answer: DINNER,
  answers: [LUNCH, DINNER],
  steps: [stepOf('lunch'), stepOf('dinner')],
};

describe('A request of this app with steps on screen', () => {
  it('tells nothing of them, since the app does not say answers yet', () => {
    const where = { position: null, locationMissing: null };

    const context = contextAt(where, null, { tapped: null, viewport: null }, [REPLY]);

    expect(context).not.toHaveProperty('answers');
    expect(context).not.toHaveProperty('steps');
  });
});
